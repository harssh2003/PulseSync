from dotenv import load_dotenv
load_dotenv()
from flask import Flask
from flask_cors import CORS
from datetime import datetime
import os
from pymongo import MongoClient
from routes.notifications import notifications_bp


app = Flask(__name__)


MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/pulsesync')
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-this')
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173').split(',')
PORT = int(os.getenv('FLASK_PORT', 5000))

cors_config = {
    'origins': [origin.strip() for origin in CORS_ORIGINS],
    'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    'allow_headers': ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control'],
    'expose_headers': ['Content-Type', 'Authorization', 'Cache-Control'],
    'supports_credentials': True,
    'max_age': 3600
}

CORS(app, resources={"/*": cors_config})

# Global database connection
db = None

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client['pulsesync']
    print("✓ Connected to MongoDB successfully")
except Exception as e:
    print(f"✗ Failed to connect to MongoDB: {e}")
    print("Make sure MongoDB is running on localhost:27017")

app.db = db

# Register blueprints
from routes.auth import auth_bp
from routes.appointments import appointments_bp
from routes.prescriptions import prescriptions_bp
from routes.diagnostics import diagnostics_bp   # ← NEW

app.register_blueprint(auth_bp)
app.register_blueprint(appointments_bp)
app.register_blueprint(prescriptions_bp)
app.register_blueprint(notifications_bp)
app.register_blueprint(diagnostics_bp)          # ← NEW

# Health check route
@app.route('/health', methods=['GET'])
def health():
    return {
    'status': 'Backend is running',
    'database': 'connected' if db is not None else 'disconnected'
}, 200

@app.errorhandler(404)
def not_found(error):
    return {'error': 'Route not found', 'path': error.description}, 404

@app.errorhandler(500)
def server_error(error):
    return {'error': 'Internal server error'}, 500

@app.errorhandler(400)
def bad_request(error):
    return {'error': 'Bad request'}, 400

from routes.places import places_bp
app.register_blueprint(places_bp)
from routes.chatbot import chatbot_bp
app.register_blueprint(chatbot_bp)
from routes.reminders import reminders_bp
app.register_blueprint(reminders_bp)
from routes.appointment_prescriptions import apt_prescriptions_bp
app.register_blueprint(apt_prescriptions_bp)

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Starting PulseSync Backend...")
    print("="*60)
    print(f"📍 MongoDB URI: {MONGO_URI}")
    print(f"🔐 JWT Secret: {'*' * 15}...")
    print(f"🌐 CORS Origins: {CORS_ORIGINS}")
    print(f"🚀 Server Port: {PORT}")
    print("="*60)
    print("✓ Press Ctrl+C to stop the server\n")

    app.run(host='0.0.0.0', port=PORT, debug=True)
