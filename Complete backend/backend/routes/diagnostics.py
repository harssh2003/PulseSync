# routes/diagnostics.py
"""
Diagnostics module for PulseSync.

Endpoints (all under /api/diagnostics):
  POST   /schedule                      — Hospital schedules a diagnostic test for a patient
  GET    /hospital                      — Hospital fetches all diagnostics for their patients
  GET    /patient                       — Patient fetches their own diagnostics
  POST   /<test_id>/upload              — Hospital uploads PDF report for a test
  GET    /<test_id>/report              — Download / view the PDF report
  PUT    /<test_id>/status              — Hospital updates test status
  POST   /<test_id>/upload-prescription — Hospital uploads prescription (PDF/image)
  GET    /<test_id>/prescription        — Patient/hospital downloads prescription
"""

from flask import Blueprint, request, jsonify, send_file
from functools import wraps
from datetime import datetime, timedelta, timezone
from bson.objectid import ObjectId
import jwt, os, io, base64

# ── Optional Twilio (for WhatsApp) ────────────────────────────────────────────
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

diagnostics_bp = Blueprint("diagnostics", __name__, url_prefix="/api/diagnostics")

IST = timezone(timedelta(hours=5, minutes=30))

# ── Pre-defined test catalogue ─────────────────────────────────────────────────
TEST_CATALOGUE = [
    "MRI Scan",
    "CT Scan",
    "X-Ray",
    "Ultrasound",
    "Complete Blood Count (CBC)",
    "Blood Glucose Test",
    "Lipid Profile",
    "Liver Function Test (LFT)",
    "Kidney Function Test (KFT)",
    "Thyroid Profile (TSH/T3/T4)",
    "ECG / EKG",
    "Echocardiogram",
    "Urine Routine",
    "Urine Culture",
    "COVID-19 RT-PCR",
    "HbA1c",
    "Bone Density Scan (DEXA)",
    "PET Scan",
    "Mammography",
    "Pap Smear",
    "Colonoscopy",
    "Endoscopy",
    "Pulmonary Function Test (PFT)",
    "Stress Test (TMT)",
    "24-hr Holter Monitor",
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def get_db():
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017/")
    return client["pulsesync"]

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            try:
                token = request.headers["Authorization"].split(" ")[1]
            except IndexError:
                return jsonify({"error": "Invalid token format"}), 401
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        try:
            data = jwt.decode(
                token,
                os.getenv("JWT_SECRET", "your-secret-key"),
                algorithms=["HS256"],
            )
            request.user_id   = data["user_id"]
            request.user_role = data["role"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


def now_ist():
    return datetime.now(IST)


def safe_str(v):
    if v is None:
        return ""
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


def serialize_test(doc: dict) -> dict:
    """Convert a diagnostics document to a JSON-safe dict (no file bytes)."""
    return {
        "id":                      safe_str(doc.get("_id")),
        "patient_id":              safe_str(doc.get("patient_id")),
        "patient_name":            doc.get("patient_name", ""),
        "patient_phone":           doc.get("patient_phone", ""),
        "hospital_id":             safe_str(doc.get("hospital_id")),
        "hospital_name":           doc.get("hospital_name", ""),
        "appointment_id":          safe_str(doc.get("appointment_id", "")),
        "test_name":               doc.get("test_name", ""),
        "notes":                   doc.get("notes", ""),
        "status":                  doc.get("status", "scheduled"),
        "scheduled_date":          safe_str(doc.get("scheduled_date", "")),
        "has_report":              bool(doc.get("report_pdf")),
        "report_filename":         doc.get("report_filename", ""),
        "has_prescription":        bool(doc.get("prescription_file")),
        "prescription_filename":   doc.get("prescription_filename", ""),
        "created_at":              safe_str(doc.get("created_at", "")),
        "updated_at":              safe_str(doc.get("updated_at", "")),
    }


def _send_whatsapp(to_number: str, message: str):
    """Best-effort WhatsApp via Twilio — fails silently."""
    if not TWILIO_AVAILABLE:
        print("[diagnostics] Twilio not installed; skipping WhatsApp.")
        return
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token  = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_number = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    if not account_sid or not auth_token:
        print("[diagnostics] Twilio credentials missing; skipping WhatsApp.")
        return
    if not to_number.startswith("whatsapp:"):
        to_number = f"whatsapp:{to_number}"
    try:
        client = TwilioClient(account_sid, auth_token)
        msg = client.messages.create(body=message, from_=from_number, to=to_number)
        print(f"[diagnostics] WhatsApp sent SID={msg.sid}")
    except Exception as e:
        print(f"[diagnostics] WhatsApp error: {e}")


def _push_notification(user_id: str, message: str, notif_type: str = "info"):
    """Push in-app notification using the existing notification system."""
    try:
        from routes.notifications import push_notification
        push_notification(user_id, {"message": message, "type": notif_type})
    except Exception as e:
        print(f"[diagnostics] In-app notification error: {e}")


# ── Routes ─────────────────────────────────────────────────────────────────────

@diagnostics_bp.route("/catalogue", methods=["GET"])
@token_required
def get_catalogue():
    """Return the list of available tests for dropdowns."""
    return jsonify({"tests": TEST_CATALOGUE}), 200


@diagnostics_bp.route("/schedule", methods=["POST"])
@token_required
def schedule_test():
    """
    Hospital schedules a diagnostic test for a patient.
    Body: { patient_id, patient_name, test_name, scheduled_date, notes?, appointment_id? }
    """
    if request.user_role != "hospital":
        return jsonify({"error": "Only hospitals can schedule diagnostic tests"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    patient_id     = data.get("patient_id", "").strip()
    patient_name   = data.get("patient_name", "").strip()
    test_name      = data.get("test_name", "").strip()
    scheduled_date = data.get("scheduled_date", "").strip()
    notes          = data.get("notes", "").strip()
    appointment_id = data.get("appointment_id", "").strip()

    if not patient_id or not test_name or not scheduled_date:
        return jsonify({"error": "patient_id, test_name, and scheduled_date are required"}), 400

    db = get_db()

    try:
        hospital_doc = db["users"].find_one({"_id": ObjectId(request.user_id)})
        hospital_name = (hospital_doc or {}).get("full_name", "Hospital")
    except Exception:
        hospital_name = "Hospital"

    patient_phone = ""
    try:
        patient_doc = db["users"].find_one({"_id": ObjectId(patient_id)})
        patient_phone = (patient_doc or {}).get("phone", "") or (patient_doc or {}).get("contact_number", "")
    except Exception:
        pass

    ts = now_ist()
    doc = {
        "patient_id":            patient_id,
        "patient_name":          patient_name,
        "patient_phone":         patient_phone,
        "hospital_id":           request.user_id,
        "hospital_name":         hospital_name,
        "appointment_id":        appointment_id,
        "test_name":             test_name,
        "notes":                 notes,
        "status":                "scheduled",
        "scheduled_date":        scheduled_date,
        "report_pdf":            None,
        "report_filename":       "",
        "prescription_file":     None,
        "prescription_filename": "",
        "prescription_mimetype": "",
        "created_at":            ts,
        "updated_at":            ts,
    }

    result = db["diagnostics"].insert_one(doc)
    test_id = str(result.inserted_id)

    notif_msg = (
        f"🔬 {hospital_name} has scheduled a {test_name} for you on {scheduled_date}. "
        f"{'Notes: ' + notes if notes else 'Please arrive 15 minutes early.'}"
    )
    _push_notification(patient_id, notif_msg, "info")

    if patient_phone:
        wa_msg = (
            f"Hello {patient_name}! 👋\n\n"
            f"*PulseSync Health Alert*\n\n"
            f"Your doctor at *{hospital_name}* has ordered a diagnostic test for you:\n\n"
            f"🔬 *Test:* {test_name}\n"
            f"📅 *Scheduled Date:* {scheduled_date}\n"
            + (f"📝 *Notes:* {notes}\n" if notes else "")
            + f"\nPlease arrive 15 minutes before your appointment. "
            f"Your results will be uploaded to PulseSync when ready.\n\n"
            f"For questions, contact {hospital_name} directly."
        )
        _send_whatsapp(patient_phone, wa_msg)

    return jsonify({"message": "Test scheduled successfully", "test_id": test_id}), 201


@diagnostics_bp.route("/hospital", methods=["GET"])
@token_required
def get_hospital_diagnostics():
    """Hospital fetches all diagnostic tests ordered for their patients."""
    if request.user_role != "hospital":
        return jsonify({"error": "Only hospitals can access this endpoint"}), 403

    db     = get_db()
    status = request.args.get("status", "all")

    query = {"hospital_id": request.user_id}
    if status != "all":
        query["status"] = status

    docs = list(db["diagnostics"].find(query).sort("created_at", -1))
    return jsonify({"tests": [serialize_test(d) for d in docs], "total": len(docs)}), 200


@diagnostics_bp.route("/patient", methods=["GET"])
@token_required
def get_patient_diagnostics():
    """Patient fetches their own diagnostic tests."""
    if request.user_role != "patient":
        return jsonify({"error": "Only patients can access this endpoint"}), 403

    db   = get_db()
    docs = list(db["diagnostics"].find({"patient_id": request.user_id}).sort("created_at", -1))
    return jsonify({"tests": [serialize_test(d) for d in docs], "total": len(docs)}), 200


@diagnostics_bp.route("/<test_id>/upload", methods=["POST"])
@token_required
def upload_report(test_id):
    """
    Hospital uploads a PDF report for a completed diagnostic test.
    Accepts multipart/form-data with field 'report' (PDF file).
    """
    if request.user_role != "hospital":
        return jsonify({"error": "Only hospitals can upload reports"}), 403

    db  = get_db()
    try:
        doc = db["diagnostics"].find_one({"_id": ObjectId(test_id)})
    except Exception:
        return jsonify({"error": "Invalid test ID"}), 400

    if not doc:
        return jsonify({"error": "Diagnostic test not found"}), 404
    if doc.get("hospital_id") != request.user_id:
        return jsonify({"error": "Unauthorized — this test does not belong to your hospital"}), 403

    pdf_bytes    = None
    pdf_filename = ""

    if "report" in request.files:
        f = request.files["report"]
        if f.filename == "":
            return jsonify({"error": "No file selected"}), 400
        if not f.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are accepted"}), 400
        pdf_bytes    = f.read()
        pdf_filename = f.filename
    elif request.is_json:
        body = request.get_json()
        b64  = body.get("report_base64", "")
        if not b64:
            return jsonify({"error": "No report_base64 in body"}), 400
        try:
            pdf_bytes    = base64.b64decode(b64)
            pdf_filename = body.get("filename", "report.pdf")
        except Exception:
            return jsonify({"error": "Invalid base64 data"}), 400
    else:
        return jsonify({"error": "Send PDF as multipart/form-data field 'report' or JSON with 'report_base64'"}), 400

    if len(pdf_bytes) > 10 * 1024 * 1024:
        return jsonify({"error": "File too large (max 10 MB)"}), 400

    ts = now_ist()
    db["diagnostics"].update_one(
        {"_id": ObjectId(test_id)},
        {"$set": {"report_pdf": pdf_bytes, "report_filename": pdf_filename, "status": "completed", "updated_at": ts}},
    )

    patient_id    = doc.get("patient_id", "")
    patient_name  = doc.get("patient_name", "Patient")
    test_name     = doc.get("test_name", "Diagnostic Test")
    hospital_name = doc.get("hospital_name", "Hospital")

    notif_msg = f"📋 Your {test_name} report is now available on PulseSync. Open the app to view it."
    _push_notification(patient_id, notif_msg, "success")

    patient_phone = doc.get("patient_phone", "")
    if patient_phone:
        wa_msg = (
            f"Hello {patient_name}! 👋\n\n"
            f"*PulseSync – Report Ready*\n\n"
            f"Your *{test_name}* report from *{hospital_name}* is now available.\n\n"
            f"📱 Open the PulseSync app → My Diagnostics to download and view your report.\n\n"
            f"If you have questions about your results, please contact your doctor."
        )
        _send_whatsapp(patient_phone, wa_msg)

    return jsonify({"message": "Report uploaded successfully", "test_id": test_id}), 200


@diagnostics_bp.route("/<test_id>/report", methods=["GET"])
@token_required
def get_report(test_id):
    """Stream the PDF report back to the caller (hospital or the patient who owns it)."""
    db = get_db()
    try:
        doc = db["diagnostics"].find_one({"_id": ObjectId(test_id)})
    except Exception:
        return jsonify({"error": "Invalid test ID"}), 400

    if not doc:
        return jsonify({"error": "Test not found"}), 404

    if request.user_role == "hospital" and doc.get("hospital_id") != request.user_id:
        return jsonify({"error": "Unauthorized"}), 403
    if request.user_role == "patient" and doc.get("patient_id") != request.user_id:
        return jsonify({"error": "Unauthorized"}), 403

    pdf_bytes = doc.get("report_pdf")
    if not pdf_bytes:
        return jsonify({"error": "No report uploaded yet"}), 404

    filename = doc.get("report_filename") or "report.pdf"
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=False,
        download_name=filename,
    )


@diagnostics_bp.route("/<test_id>/upload-prescription", methods=["POST"])
@token_required
def upload_prescription(test_id):
    """
    Hospital uploads a prescription (PDF, JPG, or PNG) for a diagnostic test.
    Accepts multipart/form-data with field 'prescription'.
    """
    if request.user_role != "hospital":
        return jsonify({"error": "Only hospitals can upload prescriptions"}), 403

    db = get_db()
    try:
        doc = db["diagnostics"].find_one({"_id": ObjectId(test_id)})
    except Exception:
        return jsonify({"error": "Invalid test ID"}), 400

    if not doc:
        return jsonify({"error": "Diagnostic test not found"}), 404
    if doc.get("hospital_id") != request.user_id:
        return jsonify({"error": "Unauthorized — this test does not belong to your hospital"}), 403

    ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
    MIME_MAP = {
        ".pdf":  "application/pdf",
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png":  "image/png",
    }

    file_bytes    = None
    file_name     = ""
    file_mimetype = "application/octet-stream"

    if "prescription" in request.files:
        f = request.files["prescription"]
        if f.filename == "":
            return jsonify({"error": "No file selected"}), 400
        ext = os.path.splitext(f.filename.lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({"error": "Only PDF, JPG, or PNG files are accepted"}), 400
        file_bytes    = f.read()
        file_name     = f.filename
        file_mimetype = MIME_MAP.get(ext, "application/octet-stream")
    elif request.is_json:
        body = request.get_json()
        b64  = body.get("prescription_base64", "")
        if not b64:
            return jsonify({"error": "No prescription_base64 in body"}), 400
        try:
            file_bytes = base64.b64decode(b64)
            file_name  = body.get("filename", "prescription.pdf")
            ext        = os.path.splitext(file_name.lower())[1]
            if ext not in ALLOWED_EXTENSIONS:
                return jsonify({"error": "Only PDF, JPG, or PNG files are accepted"}), 400
            file_mimetype = MIME_MAP.get(ext, "application/octet-stream")
        except Exception:
            return jsonify({"error": "Invalid base64 data"}), 400
    else:
        return jsonify({"error": "Send file as multipart/form-data field 'prescription'"}), 400

    if len(file_bytes) > 10 * 1024 * 1024:
        return jsonify({"error": "File too large (max 10 MB)"}), 400

    ts = now_ist()
    db["diagnostics"].update_one(
        {"_id": ObjectId(test_id)},
        {
            "$set": {
                "prescription_file":     file_bytes,
                "prescription_filename": file_name,
                "prescription_mimetype": file_mimetype,
                "updated_at":            ts,
            }
        },
    )

    patient_id    = doc.get("patient_id", "")
    patient_name  = doc.get("patient_name", "Patient")
    test_name     = doc.get("test_name", "Diagnostic Test")
    hospital_name = doc.get("hospital_name", "Hospital")

    notif_msg = (
        f"💊 Your prescription for {test_name} from {hospital_name} is now available. "
        f"Open My Diagnostics to view and download it."
    )
    _push_notification(patient_id, notif_msg, "success")

    patient_phone = doc.get("patient_phone", "")
    if patient_phone:
        wa_msg = (
            f"Hello {patient_name}! 👋\n\n"
            f"*PulseSync – Prescription Ready*\n\n"
            f"Your prescription for *{test_name}* from *{hospital_name}* is now available.\n\n"
            f"📱 Open the PulseSync app → My Diagnostics to download and view your prescription.\n\n"
            f"Please follow the instructions given by your doctor. "
            f"Contact {hospital_name} if you have any questions."
        )
        _send_whatsapp(patient_phone, wa_msg)

    return jsonify({"message": "Prescription uploaded successfully", "test_id": test_id}), 200


@diagnostics_bp.route("/<test_id>/prescription", methods=["GET"])
@token_required
def get_prescription(test_id):
    """Stream the prescription file back to the caller (hospital or the patient who owns it)."""
    db = get_db()
    try:
        doc = db["diagnostics"].find_one({"_id": ObjectId(test_id)})
    except Exception:
        return jsonify({"error": "Invalid test ID"}), 400

    if not doc:
        return jsonify({"error": "Test not found"}), 404

    if request.user_role == "hospital" and doc.get("hospital_id") != request.user_id:
        return jsonify({"error": "Unauthorized"}), 403
    if request.user_role == "patient" and doc.get("patient_id") != request.user_id:
        return jsonify({"error": "Unauthorized"}), 403

    file_bytes = doc.get("prescription_file")
    if not file_bytes:
        return jsonify({"error": "No prescription uploaded yet"}), 404

    filename = doc.get("prescription_filename") or "prescription.pdf"
    mimetype = doc.get("prescription_mimetype") or "application/pdf"

    return send_file(
        io.BytesIO(file_bytes),
        mimetype=mimetype,
        as_attachment=False,
        download_name=filename,
    )


@diagnostics_bp.route("/<test_id>/status", methods=["PUT"])
@token_required
def update_status(test_id):
    """Hospital updates the status of a diagnostic test."""
    if request.user_role != "hospital":
        return jsonify({"error": "Only hospitals can update test status"}), 403

    data   = request.get_json() or {}
    status = data.get("status", "").strip()
    if status not in ("scheduled", "in-progress", "completed"):
        return jsonify({"error": "status must be 'scheduled', 'in-progress', or 'completed'"}), 400

    db = get_db()
    try:
        doc = db["diagnostics"].find_one({"_id": ObjectId(test_id)})
    except Exception:
        return jsonify({"error": "Invalid test ID"}), 400

    if not doc:
        return jsonify({"error": "Test not found"}), 404
    if doc.get("hospital_id") != request.user_id:
        return jsonify({"error": "Unauthorized"}), 403

    db["diagnostics"].update_one(
        {"_id": ObjectId(test_id)},
        {"$set": {"status": status, "updated_at": now_ist()}},
    )
    return jsonify({"message": f"Status updated to {status}"}), 200


@diagnostics_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "Diagnostics service running"}), 200