from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime

class AppointmentModel:
    """Appointment model for MongoDB operations"""
    
    def __init__(self, db):
        self.db = db
        self.collection = db['appointments']
    
    @staticmethod
    def create_appointment(db, patient_id, doctor_id, hospital_id, appointment_date, appointment_time, reason, notes, urgency_score=1):
        """
        Create a new appointment in the database.
        """
        appointment_data = {
            'patient_id': ObjectId(patient_id) if patient_id != 'default_patient' else patient_id,
            'doctor_id': doctor_id,
            'hospital_id': hospital_id,
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
            'reason': reason,
            'notes': notes,
            'status': 'pending',
            'urgency_score': urgency_score,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        collection = db['appointments']
        result = collection.insert_one(appointment_data)
        
        return {
            'id': str(result.inserted_id),
            'patient_id': str(appointment_data['patient_id']),
            'doctor_id': appointment_data['doctor_id'],
            'hospital_id': appointment_data['hospital_id'],
            'appointment_date': appointment_data['appointment_date'],
            'appointment_time': appointment_data['appointment_time'],
            'reason': appointment_data['reason'],
            'notes': appointment_data['notes'],
            'status': appointment_data['status'],
            'urgency_score': appointment_data.get('urgency_score', 1),
            'created_at': appointment_data['created_at'].isoformat(),
            'updated_at': appointment_data['updated_at'].isoformat()
        }
    
    @staticmethod
    def get_patient_appointments(db, patient_id):
        """Get all appointments for a patient"""
        collection = db['appointments']
        query = {'patient_id': ObjectId(patient_id)} if patient_id != 'default_patient' else {'patient_id': patient_id}
        appointments = list(collection.find(query).sort('appointment_date', -1))
        
        return [
            {
                'id': str(apt['_id']),
                'patient_id': str(apt['patient_id']),
                'doctor_id': apt['doctor_id'],
                'hospital_id': apt['hospital_id'],
                'appointment_date': apt['appointment_date'],
                'appointment_time': apt['appointment_time'],
                'reason': apt['reason'],
                'notes': apt['notes'],
                'status': apt['status'],
                'urgency_score': apt.get('urgency_score', 1),
                'created_at': apt['created_at'].isoformat(),
                'updated_at': apt['updated_at'].isoformat()
            }
            for apt in appointments
        ]
    
    @staticmethod
    def get_doctor_appointments(db, doctor_id):
        """Get all appointments for a doctor"""
        collection = db['appointments']
        appointments = list(collection.find({'doctor_id': doctor_id}).sort('appointment_date', -1))
        
        return [
            {
                'id': str(apt['_id']),
                'patient_id': str(apt['patient_id']),
                'doctor_id': apt['doctor_id'],
                'hospital_id': apt['hospital_id'],
                'appointment_date': apt['appointment_date'],
                'appointment_time': apt['appointment_time'],
                'reason': apt['reason'],
                'notes': apt['notes'],
                'status': apt['status'],
                'urgency_score': apt.get('urgency_score', 1),
                'created_at': apt['created_at'].isoformat(),
                'updated_at': apt['updated_at'].isoformat()
            }
            for apt in appointments
        ]
    
    @staticmethod
    def get_hospital_appointments(db, hospital_id):
        """Get all appointments for a hospital"""
        collection = db['appointments']
        appointments = list(collection.find({'hospital_id': hospital_id}).sort('appointment_date', -1))
        
        return [
            {
                'id': str(apt['_id']),
                'patient_id': str(apt['patient_id']),
                'doctor_id': apt['doctor_id'],
                'hospital_id': apt['hospital_id'],
                'appointment_date': apt['appointment_date'],
                'appointment_time': apt['appointment_time'],
                'reason': apt['reason'],
                'notes': apt['notes'],
                'status': apt['status'],
                'urgency_score': apt.get('urgency_score', 1),
                'created_at': apt['created_at'].isoformat(),
                'updated_at': apt['updated_at'].isoformat()
            }
            for apt in appointments
        ]
    
    @staticmethod
    def update_appointment_status(db, appointment_id, new_status):
        """Update appointment status"""
        collection = db['appointments']
        result = collection.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': {
                'status': new_status,
                'updated_at': datetime.utcnow()
            }}
        )
        return result.modified_count > 0
    
    @staticmethod
    def cancel_appointment(db, appointment_id):
        """Cancel an appointment"""
        return AppointmentModel.update_appointment_status(db, appointment_id, 'cancelled')
    
    @staticmethod
    def confirm_appointment(db, appointment_id):
        """Confirm an appointment"""
        return AppointmentModel.update_appointment_status(db, appointment_id, 'confirmed')
    
    @staticmethod
    def get_appointment_by_id(db, appointment_id):
        """Get appointment by ID"""
        collection = db['appointments']
        apt = collection.find_one({'_id': ObjectId(appointment_id)})
        
        if not apt:
            return None
        
        return {
            'id': str(apt['_id']),
            'patient_id': str(apt['patient_id']),
            'doctor_id': apt['doctor_id'],
            'hospital_id': apt['hospital_id'],
            'appointment_date': apt['appointment_date'],
            'appointment_time': apt['appointment_time'],
            'reason': apt['reason'],
            'notes': apt['notes'],
            'status': apt['status'],
            'urgency_score': apt.get('urgency_score', 1),
            'created_at': apt['created_at'].isoformat(),
            'updated_at': apt['updated_at'].isoformat(),
            'reschedule_reason': apt.get('reschedule_reason', ''),
            'reschedule_history': apt.get('reschedule_history', []),
        }

    @staticmethod
    def reschedule_appointment(db, appointment_id, new_date, new_time, reschedule_reason):
        """
        Reschedule an existing appointment to a new date/time.
        Stores the reason and appends to reschedule_history.
        Resets status to 'pending' so the hospital can re-confirm.
        """
        collection = db['appointments']
        apt = collection.find_one({'_id': ObjectId(appointment_id)})
        if not apt:
            return None

        # Build history entry from the current (old) values
        history_entry = {
            'previous_date': apt.get('appointment_date', ''),
            'previous_time': apt.get('appointment_time', ''),
            'reason': reschedule_reason,
            'rescheduled_at': datetime.utcnow().isoformat(),
        }

        existing_history = apt.get('reschedule_history', [])
        existing_history.append(history_entry)

        result = collection.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': {
                'appointment_date': new_date,
                'appointment_time': new_time,
                'status': 'pending',
                'reschedule_reason': reschedule_reason,
                'reschedule_history': existing_history,
                'updated_at': datetime.utcnow(),
            }}
        )

        if result.modified_count > 0:
            updated = collection.find_one({'_id': ObjectId(appointment_id)})
            return {
                'id': str(updated['_id']),
                'patient_id': str(updated['patient_id']),
                'doctor_id': updated['doctor_id'],
                'hospital_id': updated['hospital_id'],
                'appointment_date': updated['appointment_date'],
                'appointment_time': updated['appointment_time'],
                'reason': updated['reason'],
                'notes': updated['notes'],
                'status': updated['status'],
                'urgency_score': updated.get('urgency_score', 1),
                'reschedule_reason': updated.get('reschedule_reason', ''),
                'reschedule_history': updated.get('reschedule_history', []),
                'created_at': updated['created_at'].isoformat(),
                'updated_at': updated['updated_at'].isoformat(),
            }
        return None
