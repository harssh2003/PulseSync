"""
appointment_prescriptions.py
─────────────────────────────
Allows a hospital/doctor to attach a prescription image or PDF to any
completed appointment, and automatically notifies the patient via the
existing SSE notification system so they can trigger the AI analysis +
reminder pipeline from their notification tray.

Blueprint prefix: /api/appointment-prescriptions
"""

import os
import base64
import logging
from datetime import datetime, timedelta, timezone

from bson.objectid import ObjectId
from flask import Blueprint, request, jsonify, Response
import jwt

logger = logging.getLogger(__name__)

apt_prescriptions_bp = Blueprint(
    "appointment_prescriptions",
    __name__,
    url_prefix="/api/appointment-prescriptions",
)

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-this")

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
MIME_MAP = {
    ".pdf":  "application/pdf",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_db():
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017/")
    return client["pulsesync"]


def now_ist():
    IST = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(IST)


def token_required(f):
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "")
        if not token:
            return jsonify({"error": "Missing authorization token"}), 401
        try:
            if token.startswith("Bearer "):
                token = token[7:]
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user_id   = data["user_id"]
            request.user_role = data.get("role", "patient")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)

    return decorated


def _push_notification(user_id: str, message: str, notif_type: str = "info", extra: dict = None):
    """Persist notification and push it over SSE to any live connections."""
    try:
        from routes.notifications import push_notification
        payload = {
            "message": message,
            "type": notif_type,
        }
        if extra:
            payload.update(extra)
        push_notification(str(user_id), payload)
    except Exception as e:
        logger.warning("Could not push SSE notification: %s", e)


# ── Routes ────────────────────────────────────────────────────────────────────

@apt_prescriptions_bp.route("/<appointment_id>/upload", methods=["POST"])
@token_required
def upload_prescription(appointment_id):
    """
    Hospital/doctor uploads a prescription file for an appointment.

    Accepts multipart/form-data with field 'prescription' (image or PDF).
    On success:
      • Stores the file (as binary + metadata) in a new 'apt_prescriptions' collection.
      • Pushes an SSE notification to the patient with type='prescription_uploaded'
        so the patient can trigger AI analysis directly from their notification bell.

    Returns JSON with the stored prescription record id.
    """
    if request.user_role not in ("hospital", "doctor"):
        return jsonify({"error": "Only hospitals or doctors can upload prescriptions"}), 403

    db = get_db()

    # ── Resolve appointment ──────────────────────────────────────────────────
    try:
        apt = db["appointments"].find_one({"_id": ObjectId(appointment_id)})
    except Exception:
        return jsonify({"error": "Invalid appointment ID"}), 400

    if not apt:
        return jsonify({"error": "Appointment not found"}), 404

    patient_id    = str(apt.get("patient_id", ""))
    patient_name  = apt.get("patient_name", "Patient")
    doctor_name   = apt.get("doctor_name", "Your doctor")
    hospital_name = apt.get("hospital_name", "The hospital")

    # ── Read uploaded file ───────────────────────────────────────────────────
    file_bytes    = None
    file_name     = "prescription"
    file_mimetype = "application/octet-stream"

    if "prescription" in request.files:
        f = request.files["prescription"]
        if f.filename == "":
            return jsonify({"error": "No file selected"}), 400
        ext = os.path.splitext(f.filename.lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({"error": "Only PDF, JPG, PNG, or WEBP files are accepted"}), 400
        file_bytes    = f.read()
        file_name     = f.filename
        file_mimetype = MIME_MAP.get(ext, "application/octet-stream")

    elif request.is_json:
        body = request.get_json() or {}
        b64  = body.get("prescription_base64", "")
        if not b64:
            return jsonify({"error": "No prescription_base64 in body"}), 400
        try:
            file_bytes    = base64.b64decode(b64)
            file_name     = body.get("filename", "prescription.jpg")
            ext           = os.path.splitext(file_name.lower())[1]
            if ext not in ALLOWED_EXTENSIONS:
                return jsonify({"error": "Only PDF, JPG, PNG, or WEBP files are accepted"}), 400
            file_mimetype = MIME_MAP.get(ext, "application/octet-stream")
        except Exception:
            return jsonify({"error": "Invalid base64 data"}), 400
    else:
        return jsonify({"error": "Send file as multipart/form-data field 'prescription'"}), 400

    if len(file_bytes) > 15 * 1024 * 1024:
        return jsonify({"error": "File too large (max 15 MB)"}), 400

    # ── Store in DB ──────────────────────────────────────────────────────────
    ts = now_ist()
    doc = {
        "appointment_id": appointment_id,
        "patient_id":     patient_id,
        "uploaded_by":    request.user_id,
        "doctor_name":    doctor_name,
        "hospital_name":  hospital_name,
        "file":           file_bytes,
        "filename":       file_name,
        "mimetype":       file_mimetype,
        "created_at":     ts,
    }
    result = db["apt_prescriptions"].insert_one(doc)
    prescription_id = str(result.inserted_id)

    # ── Notify patient via SSE ───────────────────────────────────────────────
    notif_message = (
        f"💊 {doctor_name} from {hospital_name} has uploaded your prescription. "
        f"Tap to analyze it with AI and set up medicine reminders automatically."
    )
    _push_notification(
        patient_id,
        notif_message,
        "prescription_uploaded",
        extra={
            "prescription_id":  prescription_id,
            "appointment_id":   appointment_id,
            "doctor_name":      doctor_name,
            "hospital_name":    hospital_name,
        },
    )

    return jsonify({
        "message":         "Prescription uploaded successfully",
        "prescription_id": prescription_id,
        "patient_id":      patient_id,
        "appointment_id":  appointment_id,
    }), 201


@apt_prescriptions_bp.route("/<prescription_id>/file", methods=["GET"])
@token_required
def get_prescription_file(prescription_id):
    """
    Serve the raw prescription file so the frontend can pass it to the
    AI analyzer as a Blob/File object.
    Only the patient it belongs to (or the uploading hospital) may fetch it.
    """
    db = get_db()
    try:
        doc = db["apt_prescriptions"].find_one({"_id": ObjectId(prescription_id)})
    except Exception:
        return jsonify({"error": "Invalid prescription ID"}), 400

    if not doc:
        return jsonify({"error": "Prescription not found"}), 404

    # Authorization: patient or the uploader
    if request.user_id not in (str(doc.get("patient_id", "")), str(doc.get("uploaded_by", ""))):
        return jsonify({"error": "Unauthorized"}), 403

    return Response(
        doc["file"],
        mimetype=doc.get("mimetype", "application/octet-stream"),
        headers={
            "Content-Disposition": f'inline; filename="{doc.get("filename", "prescription")}"',
            "Cache-Control": "private, max-age=3600",
        },
    )


@apt_prescriptions_bp.route("/for-appointment/<appointment_id>", methods=["GET"])
@token_required
def list_for_appointment(appointment_id):
    """Return metadata (no binary) for all prescriptions attached to an appointment."""
    db = get_db()
    docs = list(db["apt_prescriptions"].find(
        {"appointment_id": appointment_id},
        {"file": 0},  # exclude the binary blob
    ))
    results = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["created_at"] = d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else ""
        results.append(d)
    return jsonify({"prescriptions": results, "count": len(results)}), 200
