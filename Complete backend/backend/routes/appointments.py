from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime
from bson.objectid import ObjectId
import os
import jwt
from models.appointment import AppointmentModel
from routes.notifications import push_notification

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')

def get_db():
    from pymongo import MongoClient
    client = MongoClient('mongodb://localhost:27017/')
    return client['pulsesync']

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, os.getenv('JWT_SECRET', 'your-secret-key'), algorithms=['HS256'])
            request.user_id   = data['user_id']
            request.user_role = data['role']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# SERIALIZATION HELPER  ← fixes "ObjectId is not JSON serializable"
# ---------------------------------------------------------------------------

def safe_str(value) -> str:
    """
    Convert any MongoDB value to a plain string safely.
    Handles ObjectId, datetime, None, and regular strings.
    """
    if value is None:
        return ''
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)

def serialize_doc(doc: dict) -> dict:
    """
    Recursively convert all ObjectId / datetime values in a MongoDB document
    to plain Python types so Flask's jsonify never chokes.
    """
    if not isinstance(doc, dict):
        return doc
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = serialize_doc(v)
        elif isinstance(v, list):
            out[k] = [serialize_doc(i) if isinstance(i, dict) else
                      (str(i) if isinstance(i, ObjectId) else i) for i in v]
        else:
            out[k] = v
    return out


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _resolve_doctor_name(doc: dict) -> str:
    return (doc.get('doctor_name') or doc.get('full_name') or 'Dr. Unknown').strip()

def _resolve_hospital_name(doc: dict) -> str:
    return (doc.get('full_name') or 'Unknown Hospital').strip()

def _lookup_hospital_user(db, doctor_id_str: str):
    """
    Given the string stored in appointment.doctor_id return the hospital user document.
    """
    users = db['users']
    doc = None
    try:
        doc = users.find_one({'_id': ObjectId(doctor_id_str)})
    except Exception:
        pass
    if not doc:
        doc = users.find_one({'full_name': doctor_id_str, 'role': 'hospital'})
    return doc

def _enrich_appointment(apt: dict, db) -> dict:
    """
    Resolve doctor_id → doctor_name + hospital_name and patient_id → patient_name.
    All ObjectId / datetime fields are converted to plain strings before returning,
    so jsonify() never raises "ObjectId is not JSON serializable".
    """
    users = db['users']

    # ── Resolve doctor / hospital names ──────────────────────────────────────
    doctor_id_str   = safe_str(apt.get('doctor_id', ''))
    hospital_id_str = safe_str(apt.get('hospital_id', ''))

    hospital_doc = _lookup_hospital_user(db, doctor_id_str)
    if not hospital_doc and hospital_id_str and hospital_id_str != doctor_id_str:
        hospital_doc = _lookup_hospital_user(db, hospital_id_str)

    doctor_name   = _resolve_doctor_name(hospital_doc)   if hospital_doc else doctor_id_str
    hospital_name = _resolve_hospital_name(hospital_doc) if hospital_doc else hospital_id_str
    department_raw = hospital_doc.get('department', 'Specialist') if hospital_doc else 'Specialist'
    specialty = department_raw.capitalize() if department_raw else 'Specialist'

    # ── Resolve patient name ──────────────────────────────────────────────────
    patient_id_str = safe_str(apt.get('patient_id', ''))
    patient_name   = patient_id_str
    try:
        patient_doc  = users.find_one({'_id': ObjectId(patient_id_str)})
        patient_name = patient_doc.get('full_name', patient_id_str) if patient_doc else patient_id_str
    except Exception:
        pass

    # ── Build the response dict — every value is a plain Python type ──────────
    return {
        'id':               safe_str(apt.get('_id') or apt.get('id', '')),
        # enriched display fields
        'doctor_name':      doctor_name,
        'hospital_name':    hospital_name,
        'patient_name':     patient_name,
        'specialty':        specialty,
        # raw ids (plain strings)
        'doctor_id':        doctor_id_str,
        'hospital_id':      hospital_id_str,
        'patient_id':       patient_id_str,
        # scheduling
        'appointment_date': apt.get('appointment_date', ''),
        'appointment_time': apt.get('appointment_time', ''),
        'reason':           apt.get('reason', ''),
        'notes':            apt.get('notes', ''),
        'status':           apt.get('status', 'pending'),
        # timestamps — safe_str handles datetime objects too
        'created_at':       safe_str(apt.get('created_at', '')),
        'updated_at':       safe_str(apt.get('updated_at', '')),
    }


# ---------------------------------------------------------------------------
# APPOINTMENT ROUTES
# ---------------------------------------------------------------------------

@appointments_bp.route('/create', methods=['POST'])
@token_required
def create_appointment():
    """Create a new appointment — Patient only."""
    try:
        data = request.get_json()
        required = ['doctor_id', 'hospital_id', 'appointment_date', 'appointment_time', 'reason']
        if not data or not all(k in data for k in required):
            return jsonify({'error': f'Missing required fields: {", ".join(required)}'}), 400
        if request.user_role != 'patient':
            return jsonify({'error': 'Only patients can book appointments'}), 403

        db         = get_db()
        patient_id = request.user_id

        appointment = AppointmentModel.create_appointment(
            db,
            patient_id       = patient_id,
            doctor_id        = data['doctor_id'],
            hospital_id      = data['hospital_id'],
            appointment_date = data['appointment_date'],
            appointment_time = data['appointment_time'],
            reason           = data['reason'],
            notes            = data.get('notes', ''),
        )

        # Mark that slot as booked
        try:
            db['availability'].update_one(
                {
                    'doctor_id':       data['doctor_id'],
                    'date':            data['appointment_date'],
                    'available_slots': {
                        '$elemMatch': {'time': data['appointment_time'], 'available': True}
                    }
                },
                {'$set': {'available_slots.$.available': False, 'updated_at': datetime.utcnow()}}
            )
        except Exception as slot_err:
            print(f"[appointments] Warning: Could not mark slot unavailable: {slot_err}")

        # Notify the hospital / doctor
        try:
            users_collection = db['users']
            patient          = users_collection.find_one({'_id': ObjectId(patient_id)})
            hospital_doc     = _lookup_hospital_user(db, data['doctor_id'])
            if hospital_doc:
                push_notification(safe_str(hospital_doc['_id']), {
                    'appointment_id': appointment['id'],
                    'message': (
                        f"New appointment from {patient.get('full_name', 'Patient')} "
                        f"on {data.get('appointment_date')} at {data.get('appointment_time')} "
                        f"— {data.get('reason')}"
                    ),
                    'type': 'info',
                })
        except Exception as notif_err:
            print(f"[appointments] Warning: Could not send notification: {notif_err}")

        return jsonify({'message': 'Appointment created successfully', 'appointment': appointment}), 201

    except Exception as e:
        print(f"[appointments] Create appointment error: {str(e)}")
        return jsonify({'error': f'Error creating appointment: {str(e)}'}), 500


@appointments_bp.route('/patient/appointments', methods=['GET'])
@token_required
def get_patient_appointments():
    """Get all appointments for the logged-in patient, fully enriched."""
    try:
        if request.user_role != 'patient':
            return jsonify({'error': 'Only patients can view their appointments'}), 403

        db = get_db()
        raw_appointments = AppointmentModel.get_patient_appointments(db, request.user_id)
        appointments     = [_enrich_appointment(apt, db) for apt in raw_appointments]

        today    = datetime.utcnow().date().isoformat()
        upcoming = []
        past     = []

        for apt in appointments:
            apt_date = apt['appointment_date']
            if apt_date >= today and apt['status'] not in ['completed', 'cancelled']:
                upcoming.append(apt)
            else:
                past.append(apt)

        return jsonify({
            'upcoming':        upcoming,
            'past':            past,
            'total':           len(appointments),
            'total_completed': len([a for a in appointments if a['status'] == 'completed']),
            'total_upcoming':  len(upcoming),
        }), 200

    except Exception as e:
        print(f"[appointments] Get patient appointments error: {str(e)}")
        return jsonify({'error': f'Error fetching appointments: {str(e)}'}), 500


@appointments_bp.route('/hospital/appointments', methods=['GET'])
@token_required
def get_hospital_appointments():
    """Get all appointments for the logged-in hospital, fully enriched."""
    try:
        if request.user_role != 'hospital':
            return jsonify({'error': 'Only hospitals can view their appointments'}), 403

        db           = get_db()
        users        = db['users']
        hospital_doc = users.find_one({'_id': ObjectId(request.user_id)})
        if not hospital_doc:
            return jsonify({'error': 'Hospital user not found'}), 404

        hospital_name   = _resolve_hospital_name(hospital_doc)
        hospital_obj_id = str(hospital_doc['_id'])   # plain string, safe to compare

        raw = list(db['appointments'].find({
            '$or': [
                {'hospital_id': hospital_name},
                {'hospital_id': hospital_obj_id},
                {'doctor_id':   hospital_obj_id},
            ]
        }).sort('appointment_date', -1))

        # _enrich_appointment converts every ObjectId / datetime → plain string
        appointments = [_enrich_appointment(apt, db) for apt in raw]

        today              = datetime.utcnow().date().isoformat()
        today_appointments = []
        upcoming           = []
        past               = []

        for apt in appointments:
            apt_date = apt['appointment_date']
            if apt_date == today and apt['status'] != 'cancelled':
                today_appointments.append(apt)
            elif apt_date > today and apt['status'] != 'cancelled':
                upcoming.append(apt)
            else:
                past.append(apt)

        return jsonify({
            'today':       today_appointments,
            'upcoming':    upcoming,
            'past':        past,
            'total':       len(appointments),
            'total_today': len(today_appointments),
        }), 200

    except Exception as e:
        print(f"[appointments] Get hospital appointments error: {str(e)}")
        return jsonify({'error': f'Error fetching appointments: {str(e)}'}), 500


@appointments_bp.route('/<appointment_id>/status', methods=['PUT'])
@token_required
def update_appointment_status(appointment_id):
    try:
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({'error': 'Status field is required'}), 400
        db          = get_db()
        appointment = AppointmentModel.get_appointment_by_id(db, appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        if request.user_role == 'patient' and appointment['patient_id'] != request.user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        new_status     = data['status'].lower()
        valid_statuses = ['pending', 'confirmed', 'completed', 'cancelled']
        if new_status not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
        success = AppointmentModel.update_appointment_status(db, appointment_id, new_status)
        if success:
            return jsonify({'message': f'Status updated to {new_status}', 'appointment_id': appointment_id, 'status': new_status}), 200
        return jsonify({'error': 'Failed to update appointment'}), 500
    except Exception as e:
        return jsonify({'error': f'Error updating appointment: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# AVAILABILITY ROUTES
# ---------------------------------------------------------------------------

@appointments_bp.route('/availability/create', methods=['POST'])
@token_required
def create_availability():
    """Hospital creates / updates its availability for a given date."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        hospital_id = request.user_id
        doctor_id   = data.get('doctor_id') or hospital_id

        db            = get_db()
        hospital_doc  = db['users'].find_one({'_id': ObjectId(hospital_id)})
        doctor_name   = _resolve_doctor_name(hospital_doc)   if hospital_doc else 'Unknown'
        hospital_name = _resolve_hospital_name(hospital_doc) if hospital_doc else 'Unknown'

        start_time_str   = data.get('start_time', '')
        end_time_str     = data.get('end_time', '')
        duration_minutes = int(data.get('duration_minutes', 30))

        slots = []
        if start_time_str and end_time_str:
            from datetime import datetime as dt, timedelta
            start_dt = dt.strptime(start_time_str, '%H:%M')
            end_dt   = dt.strptime(end_time_str,   '%H:%M')
            current  = start_dt
            while current < end_dt:
                slot_end = min(current + timedelta(minutes=duration_minutes), end_dt)
                slots.append({'time': current.strftime('%H:%M'), 'end': slot_end.strftime('%H:%M'), 'available': True})
                current = slot_end

        avail_data = {
            'doctor_id':        doctor_id,
            'hospital_id':      hospital_id,
            'doctor_name':      doctor_name,
            'hospital_name':    hospital_name,
            'date':             data.get('date'),
            'start_time':       start_time_str,
            'end_time':         end_time_str,
            'duration_minutes': duration_minutes,
            'available_slots':  slots,
            'next_available':   f"{data.get('date')} {start_time_str}" if data.get('date') else None,
            'status':           'available',
            'created_at':       datetime.utcnow(),
            'updated_at':       datetime.utcnow(),
        }

        result = db['availability'].update_one(
            {'doctor_id': doctor_id, 'date': data.get('date')},
            {'$set': avail_data},
            upsert=True
        )

        return jsonify({
            'message':   'Availability slot created successfully',
            'doctor_id': doctor_id,
            'slots':     slots,
            'id':        safe_str(result.upserted_id) if result.upserted_id else None,
        }), 200

    except Exception as e:
        print(f"[appointments] Create availability error: {str(e)}")
        return jsonify({'error': f'Error creating availability: {str(e)}'}), 500


@appointments_bp.route('/availability/hospital/<hospital_id>/slots', methods=['GET'])
@token_required
def get_hospital_availability_slots(hospital_id):
    """Return all availability slots for this hospital."""
    try:
        db           = get_db()
        hospital_doc = db['users'].find_one({'_id': ObjectId(hospital_id)})
        if not hospital_doc:
            return jsonify({'error': 'Hospital not found'}), 404

        slots = list(db['availability'].find({'hospital_id': hospital_id}))

        availabilities = [{
            'id':               safe_str(s['_id']),
            'doctor_id':        safe_str(s.get('doctor_id', '')),
            'doctor_name':      s.get('doctor_name', _resolve_doctor_name(hospital_doc)),
            'hospital_name':    s.get('hospital_name', _resolve_hospital_name(hospital_doc)),
            'date':             s.get('date', ''),
            'start_time':       s.get('start_time', ''),
            'end_time':         s.get('end_time', ''),
            'duration_minutes': s.get('duration_minutes', 30),
            'is_available':     s.get('status') == 'available',
            'slots':            s.get('available_slots', []),
            'created_at':       safe_str(s.get('created_at', '')),
        } for s in slots]

        return jsonify({'availabilities': availabilities, 'total': len(availabilities)}), 200

    except Exception as e:
        return jsonify({'error': f'Error fetching slots: {str(e)}'}), 500


@appointments_bp.route('/availability/<slot_id>/toggle', methods=['PUT'])
@token_required
def toggle_availability(slot_id):
    try:
        db   = get_db()
        slot = db['availability'].find_one({'_id': ObjectId(slot_id)})
        if not slot:
            return jsonify({'error': 'Slot not found'}), 404
        new_status = 'unavailable' if slot.get('status') == 'available' else 'available'
        db['availability'].update_one(
            {'_id': ObjectId(slot_id)},
            {'$set': {'status': new_status, 'updated_at': datetime.utcnow()}}
        )
        return jsonify({'message': f'Availability toggled to {new_status}', 'slot_id': slot_id, 'status': new_status}), 200
    except Exception as e:
        return jsonify({'error': f'Error toggling availability: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# APPOINTMENT ACTIONS  (confirm / cancel)
# ---------------------------------------------------------------------------

@appointments_bp.route('/<appointment_id>/confirm', methods=['POST'])
@token_required
def confirm_appointment(appointment_id):
    try:
        db           = get_db()
        appointments = db['appointments']
        apt          = appointments.find_one({'_id': ObjectId(appointment_id)})
        if not apt:
            return jsonify({'error': 'Appointment not found'}), 404

        appointments.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': {'status': 'confirmed', 'updated_at': datetime.utcnow()}}
        )

        hospital_doc = db['users'].find_one({'_id': ObjectId(request.user_id)})
        doctor_name  = _resolve_doctor_name(hospital_doc) if hospital_doc else 'Doctor'

        push_notification(safe_str(apt['patient_id']), {
            'appointment_id': appointment_id,
            'message': (
                f"Your appointment with {doctor_name} has been confirmed "
                f"for {apt.get('appointment_date')} at {apt.get('appointment_time')}"
            ),
            'type': 'success',
        })

        return jsonify({'message': 'Appointment confirmed', 'appointment_id': appointment_id}), 200

    except Exception as e:
        return jsonify({'error': f'Error confirming appointment: {str(e)}'}), 500


@appointments_bp.route('/<appointment_id>/cancel', methods=['POST'])
@token_required
def cancel_appointment(appointment_id):
    try:
        db            = get_db()
        appointments  = db['appointments']
        notifs        = db['notifications']
        data          = request.get_json() or {}
        cancel_reason = data.get('reason', 'No reason provided')

        try:
            apt = appointments.find_one({'_id': ObjectId(appointment_id)})
        except Exception as e:
            return jsonify({'error': f'Invalid appointment ID: {str(e)}'}), 400

        if not apt:
            return jsonify({'error': 'Appointment not found'}), 404

        appointments.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': {
                'status':        'cancelled',
                'cancel_reason': cancel_reason,
                'cancelled_by':  request.user_id,
                'updated_at':    datetime.utcnow(),
            }}
        )

        is_hospital  = request.user_role == 'hospital'
        # safe_str handles ObjectId fields stored in patient_id / doctor_id
        recipient_id = safe_str(apt['patient_id']) if is_hospital else safe_str(apt.get('doctor_id', ''))
        msg          = (
            f"Your appointment on {apt.get('appointment_date')} at {apt.get('appointment_time')} "
            f"has been cancelled. Reason: {cancel_reason}"
        ) if is_hospital else (
            f"Appointment on {apt.get('appointment_date')} at {apt.get('appointment_time')} "
            f"was cancelled by the patient. Reason: {cancel_reason}"
        )

        if recipient_id:
            notifs.insert_one({
                'user_id':        recipient_id,
                # Store appointment_id as a plain string — avoids ObjectId in the
                # notification document causing serialization issues later
                'appointment_id': appointment_id,
                'message':        msg,
                'type':           'warning',
                'read':           False,
                'cleared':        False,
                'created_at':     datetime.utcnow(),
                'updated_at':     datetime.utcnow(),
            })

        return jsonify({'message': 'Appointment cancelled', 'appointment_id': appointment_id}), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': f'Error cancelling appointment: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# NOTIFICATION ROUTES
# ---------------------------------------------------------------------------

@appointments_bp.route('/notifications', methods=['GET'])
@token_required
def get_notifications():
    try:
        db    = get_db()
        notifs = list(db['notifications'].find(
            {'user_id': str(request.user_id), 'cleared': False}
        ).sort('created_at', -1))

        data = [{
            'id':             safe_str(n['_id']),
            # appointment_id may be stored as ObjectId or string — safe_str handles both
            'appointment_id': safe_str(n.get('appointment_id', '')),
            'message':        n.get('message', ''),
            'type':           n.get('type', 'info'),
            'read':           n.get('read', False),
            'created_at':     safe_str(n.get('created_at', '')),
        } for n in notifs]

        return jsonify({'notifications': data, 'total': len(data)}), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching notifications: {str(e)}'}), 500


@appointments_bp.route('/notifications/<notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(notification_id):
    try:
        db     = get_db()
        result = db['notifications'].update_one(
            {'_id': ObjectId(notification_id)},
            {'$set': {'read': True}}
        )
        if result.modified_count > 0:
            return jsonify({'message': 'Notification marked as read'}), 200
        return jsonify({'error': 'Notification not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Error marking notification: {str(e)}'}), 500


@appointments_bp.route('/notifications/<notification_id>/clear', methods=['POST'])
@token_required
def clear_notification(notification_id):
    try:
        db     = get_db()
        result = db['notifications'].update_one(
            {'_id': ObjectId(notification_id), 'user_id': request.user_id},
            {'$set': {'cleared': True, 'read': True, 'updated_at': datetime.utcnow()}}
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Notification not found'}), 404
        return jsonify({'message': 'Notification cleared', 'notification_id': notification_id}), 200
    except Exception as e:
        return jsonify({'error': f'Error clearing notification: {str(e)}'}), 500


@appointments_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Appointments backend is running'}), 200