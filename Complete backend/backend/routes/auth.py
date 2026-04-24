from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
import jwt
from datetime import datetime, timedelta
import os
from pymongo import MongoClient
from bson.objectid import ObjectId

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def get_db():
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
            request.user_id = data['user_id']
            request.user_role = data['role']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

def generate_token(user_id, role):
    payload = {
        'user_id': str(user_id),
        'role': role,
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, os.getenv('JWT_SECRET', 'your-secret-key'), algorithm='HS256')

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _resolve_doctor_name(doc: dict) -> str:
    """
    Each hospital account has exactly ONE doctor.
    'doctor_name' is captured at signup; fall back to 'full_name' if missing.
    """
    return (doc.get('doctor_name') or doc.get('full_name') or 'Dr. Unknown').strip()

def _resolve_hospital_name(doc: dict) -> str:
    return (doc.get('full_name') or 'Unknown Hospital').strip()


# ---------------------------------------------------------------------------
# AUTH ROUTES
# ---------------------------------------------------------------------------

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    Patient signup: email, password, fullName, role='patient'
    Hospital signup: above + doctorName (the single doctor for this hospital)
    """
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['email', 'password', 'fullName', 'role']):
            return jsonify({'error': 'Missing required fields: email, password, fullName, role'}), 400

        email     = data['email'].strip().lower()
        password  = data['password']
        full_name = data['fullName'].strip()   # hospital / clinic name
        role      = data['role'].lower()

        if role not in ['patient', 'hospital']:
            return jsonify({'error': 'Invalid role. Must be patient or hospital'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        db = get_db()
        if db['users'].find_one({'email': email}):
            return jsonify({'error': 'Email already registered'}), 400

        user_data = {
            'email':            email,
            'password':         generate_password_hash(password),
            'full_name':        full_name,
            'role':             role,
            'profile_complete': False,
            'created_at':       datetime.utcnow(),
        }

        if role == 'hospital':
            # doctorName is REQUIRED for hospital signups
            doctor_name = data.get('doctorName', '').strip()
            if not doctor_name:
                return jsonify({'error': 'doctorName is required for hospital signup'}), 400
            user_data.update({
                'doctor_name':         doctor_name,
                'registration_number': data.get('registrationNumber', ''),
                'department':          data.get('department', ''),
                'license_number':      data.get('licenseNumber', ''),
                'address':             data.get('address', ''),
                'staff_position':      data.get('staffPosition', ''),
            })

        result = db['users'].insert_one(user_data)
        token  = generate_token(result.inserted_id, role)

        return jsonify({
            'message':          'User created successfully',
            'token':            token,
            'user_id':          str(result.inserted_id),
            'role':             role,
            'profile_complete': False,
        }), 201

    except Exception as e:
        print(f"[v0] Signup error: {str(e)}")
        return jsonify({'error': f'Error during signup: {str(e)}'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['email', 'password']):
            return jsonify({'error': 'Missing email or password'}), 400
        email    = data['email'].strip().lower()
        password = data['password']
        db       = get_db()
        user     = db['users'].find_one({'email': email})
        if not user or not check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        token = generate_token(user['_id'], user['role'])
        return jsonify({
            'message':          'Login successful',
            'token':            token,
            'user_id':          str(user['_id']),
            'role':             user['role'],
            'profile_complete': user.get('profile_complete', False),
            'is_login':         True,
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error during login: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# PROFILE ROUTES
# ---------------------------------------------------------------------------

@auth_bp.route('/update-patient-profile', methods=['POST'])
@token_required
def update_patient_profile():
    try:
        if request.user_role != 'patient':
            return jsonify({'error': 'Only patients can update profile'}), 403
        data = request.get_json()
        db   = get_db()
        update_data = {'profile_complete': True, 'updated_at': datetime.utcnow()}
        for field in ['date_of_birth', 'blood_type', 'address', 'phone',
                      'gender', 'emergency_contact', 'emergency_phone']:
            if field in data:
                update_data[field] = data[field]
        db['users'].update_one({'_id': ObjectId(request.user_id)}, {'$set': update_data})
        return jsonify({'message': 'Profile updated successfully', 'profile_complete': True}), 200
    except Exception as e:
        return jsonify({'error': f'Error updating profile: {str(e)}'}), 500


@auth_bp.route('/update-hospital-profile', methods=['POST'])
@token_required
def update_hospital_profile():
    try:
        if request.user_role != 'hospital':
            return jsonify({'error': 'Only hospitals can update hospital profile'}), 403
        data = request.get_json()
        db   = get_db()
        update_data = {'profile_complete': True, 'updated_at': datetime.utcnow()}
        for field in ['doctor_name', 'registration_number', 'department', 'license_number',
                      'address', 'staff_position', 'hospital_phone', 'hospital_email']:
            if field in data:
                update_data[field] = data[field]
        db['users'].update_one({'_id': ObjectId(request.user_id)}, {'$set': update_data})
        return jsonify({'message': 'Hospital profile updated successfully', 'profile_complete': True}), 200
    except Exception as e:
        return jsonify({'error': f'Error updating profile: {str(e)}'}), 500


@auth_bp.route('/get-patient-profile', methods=['GET'])
@token_required
def get_patient_profile():
    try:
        if request.user_role != 'patient':
            return jsonify({'error': 'Only patients can access patient profile'}), 403
        db   = get_db()
        user = db['users'].find_one({'_id': ObjectId(request.user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({
            'full_name':         user.get('full_name', ''),
            'email':             user.get('email', ''),
            'phone':             user.get('phone', ''),
            'date_of_birth':     user.get('date_of_birth', ''),
            'blood_type':        user.get('blood_type', ''),
            'emergency_contact': user.get('emergency_contact', ''),
            'emergency_phone':   user.get('emergency_phone', ''),
            'address':           user.get('address', ''),
            'profile_complete':  user.get('profile_complete', False),
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching profile: {str(e)}'}), 500


@auth_bp.route('/get-hospital-profile', methods=['GET'])
@token_required
def get_hospital_profile():
    try:
        if request.user_role != 'hospital':
            return jsonify({'error': 'Only hospitals can access hospital profile'}), 403
        db   = get_db()
        user = db['users'].find_one({'_id': ObjectId(request.user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({
            'full_name':           _resolve_hospital_name(user),
            'doctor_name':         _resolve_doctor_name(user),
            'email':               user.get('email', ''),
            'registration_number': user.get('registration_number', ''),
            'department':          user.get('department', ''),
            'license_number':      user.get('license_number', ''),
            'address':             user.get('address', ''),
            'staff_position':      user.get('staff_position', ''),
            'hospital_phone':      user.get('hospital_phone', ''),
            'hospital_email':      user.get('hospital_email', ''),
            'profile_complete':    user.get('profile_complete', False),
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching profile: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# DOCTOR / HOSPITAL LOOKUP ROUTES  (used by patient module)
# ---------------------------------------------------------------------------

@auth_bp.route('/doctors', methods=['GET'])
def get_all_doctors():
    try:
        db      = get_db()
        doctors = list(db['users'].find(
            {'role': 'hospital'},
            {'_id': 1, 'full_name': 1, 'doctor_name': 1, 'email': 1,
             'department': 1, 'staff_position': 1, 'registration_number': 1, 'address': 1}
        ))
        doctor_list = [{
            'id':                  str(doc['_id']),
            'name':                _resolve_doctor_name(doc),
            'hospital':            _resolve_hospital_name(doc),
            'specialty':           doc.get('department', 'General Practice'),
            'position':            doc.get('staff_position', 'Doctor'),
            'registration_number': doc.get('registration_number', ''),
            'email':               doc.get('email', ''),
            'rating':              4.8,
            'experience':          '5+ years',
            'image':               '/male-doctor.png',
        } for doc in doctors]
        return jsonify({'doctors': doctor_list, 'total': len(doctor_list)}), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching doctors: {str(e)}'}), 500


@auth_bp.route('/doctors/availability', methods=['GET'])
def get_doctors_availability():
    """
    Patient Availability page calls this to list all hospitals+doctors.
    Returns all future available dates and slots per doctor.
    """
    try:
        db                      = get_db()
        users_collection        = db['users']
        availability_collection = db['availability']

        # Use IST for date/time
        from datetime import timezone as tz
        IST = tz(timedelta(hours=5, minutes=30))
        now_ist  = datetime.now(IST)
        today    = now_ist.strftime("%Y-%m-%d")
        cur_time = now_ist.strftime("%H:%M")

        # Skip today entirely if past 6 PM
        if cur_time >= "18:00":
            date_filter = (now_ist + timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            date_filter = today

        selected_date = request.args.get('date')  # optional date filter from frontend

        doctors = list(users_collection.find(
            {'role': 'hospital'},
            {'_id': 1, 'full_name': 1, 'doctor_name': 1, 'email': 1,
             'department': 1, 'staff_position': 1, 'address': 1}
        ))

        doctor_list = []
        for doc in doctors:
            doctor_id = str(doc['_id'])

            # Build availability query
            avail_query = {'doctor_id': doctor_id, 'status': 'available'}
            if selected_date:
                avail_query['date'] = selected_date
            else:
                avail_query['date'] = {'$gte': date_filter}

            all_avail = list(availability_collection.find(
                avail_query
            ).sort('date', 1).limit(14))

            # Collect all dates with their available slots
            dates_data = []
            flat_slots = []
            for avail in all_avail:
                avail_date = avail.get('date', '')
                raw_slots  = avail.get('available_slots', [])
                safe_slots = []
                for slot in raw_slots:
                    if isinstance(slot, dict) and slot.get('available', True):
                        t = slot.get('time', '')
                        # Filter past slots for today
                        if avail_date == today and t <= cur_time:
                            continue
                        safe_slots.append({'time': t, 'end': slot.get('end', ''), 'available': True})
                    elif isinstance(slot, str):
                        if avail_date == today and slot <= cur_time:
                            continue
                        safe_slots.append({'time': slot, 'end': '', 'available': True})

                if safe_slots:
                    dates_data.append({
                        'date': avail_date,
                        'slots': safe_slots,
                        'total_slots': len(raw_slots),
                        'available_slots': len(safe_slots),
                    })
                    flat_slots.extend(safe_slots)

            first_avail = all_avail[0] if all_avail else None

            doctor_list.append({
                'id':                doctor_id,
                'name':              _resolve_doctor_name(doc),
                'hospital':          _resolve_hospital_name(doc),
                'specialty':         doc.get('department', 'General Practice'),
                'position':          doc.get('staff_position', 'Doctor'),
                'email':             doc.get('email', ''),
                'rating':            4.8,
                'experience':        '5+ years',
                'image':             '/male-doctor.png',
                'nextAvailable':     (
                    f"{first_avail.get('date')} {first_avail.get('start_time', '')}"
                    if first_avail else 'Not set'
                ),
                'slots':             flat_slots[:8],          # first 8 for quick display
                'dates':             dates_data,              # all dates grouped
                'availability_date': first_avail.get('date') if first_avail else None,
            })

        return jsonify({'doctors': doctor_list, 'total': len(doctor_list)}), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': f'Error fetching doctors: {str(e)}'}), 500


@auth_bp.route('/doctor/<doctor_id>', methods=['GET'])
@token_required
def get_doctor(doctor_id):
    try:
        db   = get_db()
        doc  = None
        try:
            doc = db['users'].find_one({'_id': ObjectId(doctor_id)})
        except Exception:
            pass
        if not doc:
            doc = db['users'].find_one({'full_name': doctor_id, 'role': 'hospital'})
        if not doc:
            return jsonify({'error': 'Doctor not found'}), 404
        return jsonify({
            'id':                  str(doc['_id']),
            'doctor_name':         _resolve_doctor_name(doc),
            'hospital_name':       _resolve_hospital_name(doc),
            'full_name':           doc.get('full_name', ''),
            'email':               doc.get('email', ''),
            'department':          doc.get('department', ''),
            'staff_position':      doc.get('staff_position', ''),
            'registration_number': doc.get('registration_number', ''),
            'address':             doc.get('address', ''),
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching doctor: {str(e)}'}), 500


@auth_bp.route('/patient/<patient_id>', methods=['GET'])
@token_required
def get_patient(patient_id):
    try:
        db      = get_db()
        patient = None
        try:
            patient = db['users'].find_one({'_id': ObjectId(patient_id)})
        except Exception:
            pass
        if not patient:
            patient = db['users'].find_one({'full_name': patient_id, 'role': 'patient'})
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        return jsonify({
            'id':                str(patient['_id']),
            'full_name':         patient.get('full_name', ''),
            'email':             patient.get('email', ''),
            'phone':             patient.get('phone', ''),
            'blood_type':        patient.get('blood_type', ''),
            'address':           patient.get('address', ''),
            'date_of_birth':     patient.get('date_of_birth', ''),
            'emergency_contact': patient.get('emergency_contact', ''),
            'emergency_phone':   patient.get('emergency_phone', ''),
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching patient: {str(e)}'}), 500


@auth_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Auth backend is running'}), 200