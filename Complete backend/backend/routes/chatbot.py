# routes/chatbot.py  –  Hybrid Pulse Assistant
# ─────────────────────────────────────────────
# Architecture:
#   Step 1  Symptom collection  → pure Python / no API
#   Step 2  Severity check      → rule-based (no API)
#   Step 3  Doctor search       → MongoDB query (no API)
#   Step 4  Appointment booking → direct DB insert (no API)
#   Step 5  Natural language    → Gemini (1 small call per turn)

import os, requests
from datetime import datetime
from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from pymongo import MongoClient
import jwt

chatbot_bp = Blueprint("chatbot", __name__)

# ── Config ────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-1.5-flash"          # stable, fast, cheap
GEMINI_URL     = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

def get_db():
    client = MongoClient(os.environ.get("MONGODB_URI", "mongodb://localhost:27017/"))
    return client["pulsesync"]

def get_patient_id():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        token = auth.split(" ")[1]
        data  = jwt.decode(token, os.environ.get("JWT_SECRET", "your-secret-key"), algorithms=["HS256"])
        return data.get("user_id")
    except Exception:
        return None

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — RULE-BASED SEVERITY ENGINE  (zero API calls)
# ═══════════════════════════════════════════════════════════════════════════

SYMPTOM_RULES = [
    # EMERGENCY
    (["chest pain", "chest tightness", "heart attack", "can't breathe", "cannot breathe",
      "difficulty breathing", "stroke", "unconscious", "seizure", "severe bleeding",
      "coughing blood", "vomiting blood", "choking", "anaphylaxis", "collapsed",
      "no pulse", "not breathing", "overdose", "poisoning", "suicidal"],
     "emergency", "Emergency Medicine"),

    # HIGH
    (["high fever", "fever above 103", "fever above 104", "severe headache", "worst headache",
      "sudden vision loss", "sudden numbness", "slurred speech", "confusion",
      "severe abdominal pain", "appendix", "kidney stone", "severe chest", "blood in stool",
      "blood in urine", "severe allergic", "severe burn", "deep cut", "heavy bleeding",
      "head injury", "concussion", "severe vomiting", "dehydration", "high blood pressure"],
     "high", "Internal Medicine"),

    # MEDIUM — mapped to specialist
    (["palpitation", "irregular heartbeat", "heart", "chest discomfort"],
     "medium", "Cardiologist"),
    (["headache", "migraine", "dizziness", "fainting", "memory", "numbness", "tingling",
      "vertigo", "brain fog"],
     "medium", "Neurologist"),
    (["stomach ache", "stomach pain", "abdominal", "nausea", "vomiting", "diarrhea",
      "constipation", "bloating", "acid reflux", "heartburn", "indigestion", "food poisoning",
      "gastritis", "ulcer"],
     "medium", "Gastroenterologist"),
    (["joint pain", "back pain", "muscle pain", "swelling", "arthritis", "knee pain",
      "shoulder pain", "neck pain", "bone", "fracture", "broken", "sprain", "twisted",
      "ligament", "tendon", "ankle", "wrist", "hip pain", "stiffness", "cramp",
      "pulled muscle", "dislocation", "injury", "hurt", "hurting"],
     "medium", "Orthopedist"),
    (["rash", "acne", "itching", "eczema", "hives", "skin allergy", "fungal", "ringworm",
      "boil", "abscess", "skin infection", "psoriasis", "dermatitis", "wart", "mole"],
     "medium", "Dermatologist"),
    (["eye pain", "blurred vision", "red eye", "eye discharge", "watery eyes",
      "eye strain", "double vision", "dry eyes"],
     "medium", "Ophthalmologist"),
    (["ear pain", "hearing loss", "sore throat", "nose bleed", "sinusitis", "tonsils",
      "ear infection", "ringing in ear", "tinnitus", "nasal congestion", "throat infection",
      "voice hoarse"],
     "medium", "ENT Specialist"),
    (["anxiety", "depression", "panic attack", "mental health", "insomnia", "mood",
      "stress", "burnout", "overthinking", "sleep problem", "can't sleep",
      "feeling low", "lonely", "grief", "trauma", "ptsd"],
     "medium", "Psychiatrist"),
    (["child", "baby", "infant", "toddler", "pediatric"],
     "medium", "Pediatrician"),
    (["pregnancy", "pregnant", "menstrual", "period", "pelvic", "cramps", "irregular period",
      "missed period", "vaginal", "ovary", "uterus", "fertility"],
     "medium", "Gynecologist"),
    (["diabetes", "blood sugar", "thyroid", "hormonal", "weight gain", "weight loss",
      "hormone imbalance", "pcos"],
     "medium", "Endocrinologist"),
    (["urination", "kidney", "bladder", "urinary", "uti", "burning urination",
      "frequent urination", "prostate"],
     "medium", "Urologist"),
    (["cough", "asthma", "lung", "shortness of breath", "wheezing", "bronchitis",
      "pneumonia", "chest congestion", "breathing difficulty", "oxygen"],
     "medium", "Pulmonologist"),
    # catch-all medium for injuries/general medical
    (["wound", "cut", "burn", "bite", "sting", "infection", "fever", "allergic reaction",
      "allergy", "swollen", "lump", "bruise", "scar", "abscess"],
     "medium", "General Physician"),

    # LOW
    (["cold", "runny nose", "sneezing", "mild fever", "fatigue", "tired", "weakness",
      "body ache", "flu", "general checkup", "checkup", "routine", "feeling unwell",
      "not feeling well", "under the weather", "slight pain", "minor", "mild"],
     "low", "General Physician"),
]

# Words that indicate high severity regardless of base match
SEVERITY_MODIFIERS = [
    "severe", "extreme", "intense", "unbearable", "worst", "very bad", "terrible",
    "excruciating", "agonizing", "sharp", "acute", "sudden", "critical", "serious",
    "really bad", "so much pain", "can't bear", "overwhelming", "debilitating",
]

HOME_REMEDIES = {
    "Cardiologist": [
        "Sit upright and try slow, deep breathing",
        "Avoid caffeine and stimulants",
        "Stay calm and rest — avoid physical exertion",
        "Drink a glass of cool water slowly",
    ],
    "Neurologist": [
        "Rest in a quiet, dark room",
        "Apply a cold compress to your forehead",
        "Stay hydrated and drink plenty of water",
        "Try gentle neck and shoulder stretches",
    ],
    "Gastroenterologist": [
        "Drink clear fluids and stay hydrated",
        "Eat bland foods (rice, toast, bananas)",
        "Avoid spicy, fatty, or dairy-heavy foods",
        "Try ginger or peppermint tea for nausea",
    ],
    "Orthopedist": [
        "Apply ice to the affected area for 15-20 min",
        "Rest and avoid putting strain on the joint",
        "Use an over-the-counter pain reliever if needed",
        "Elevate the affected limb to reduce swelling",
    ],
    "Dermatologist": [
        "Keep the area clean and dry",
        "Apply a gentle, fragrance-free moisturizer",
        "Avoid scratching — use a cold compress for itch",
        "Try an over-the-counter antihistamine for allergies",
    ],
    "Ophthalmologist": [
        "Rest your eyes and avoid screens for a while",
        "Apply a warm compress over closed eyes",
        "Use preservative-free artificial tears if dry",
        "Avoid rubbing your eyes",
    ],
    "ENT Specialist": [
        "Gargle with warm salt water for a sore throat",
        "Inhale steam to relieve nasal congestion",
        "Stay hydrated with warm fluids like soup or tea",
        "Use a saline nasal spray for sinus relief",
    ],
    "Psychiatrist": [
        "Practice slow, deep breathing (4-7-8 technique)",
        "Take a short walk or do light stretching",
        "Limit screen time and try a calming activity",
        "Reach out to a trusted friend or family member",
    ],
    "Pediatrician": [
        "Keep the child hydrated with small sips of fluid",
        "Ensure plenty of rest in a comfortable space",
        "Monitor temperature — use a lukewarm compress",
        "Offer bland, easy-to-digest foods",
    ],
    "Gynecologist": [
        "Use a heating pad on the lower abdomen",
        "Stay hydrated and get adequate rest",
        "Try light stretching or yoga for cramp relief",
        "Take an OTC pain reliever like ibuprofen",
    ],
    "Endocrinologist": [
        "Maintain a consistent meal schedule",
        "Stay hydrated and avoid sugary drinks",
        "Monitor symptoms and keep a daily log",
        "Get adequate sleep and manage stress",
    ],
    "Urologist": [
        "Drink plenty of water throughout the day",
        "Avoid caffeine and alcohol temporarily",
        "Use a warm compress for discomfort",
        "Don't delay bathroom visits — go when needed",
    ],
    "Pulmonologist": [
        "Sit upright to ease breathing",
        "Use steam inhalation to loosen congestion",
        "Stay hydrated with warm liquids",
        "Avoid smoke, dust, and strong odors",
    ],
    "General Physician": [
        "Get plenty of rest and sleep",
        "Stay hydrated — drink water, herbal tea, or broth",
        "Eat nutritious, light meals",
        "Monitor symptoms and rest at home for a day",
    ],
}

def assess_severity(text: str) -> dict:
    t = text.lower()
    has_modifier = any(mod in t for mod in SEVERITY_MODIFIERS)

    for keywords, urgency, specialist in SYMPTOM_RULES:
        if any(kw in t for kw in keywords):
            # Apply severity modifier bump
            if has_modifier and urgency == "low":
                urgency = "medium"
            elif has_modifier and urgency == "medium":
                urgency = "high"
            # emergency stays emergency, high stays high

            score_map = {"emergency": 4, "high": 3, "medium": 2, "low": 1}
            return {"urgency": urgency, "urgency_score": score_map[urgency],
                    "specialist": specialist, "matched": True,
                    "remedies": HOME_REMEDIES.get(specialist, HOME_REMEDIES["General Physician"])}
    return {"urgency": "low", "urgency_score": 1,
            "specialist": "General Physician", "matched": False,
            "remedies": HOME_REMEDIES["General Physician"]}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — DOCTOR SEARCH  (MongoDB only)
# ═══════════════════════════════════════════════════════════════════════════

def _now_ist():
    """Return current datetime in IST (Asia/Kolkata = UTC+5:30)."""
    from datetime import timedelta, timezone
    IST = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(IST)


def find_doctors(specialist: str, urgency: str) -> list:
    try:
        db    = get_db()
        now_ist = _now_ist()
        today   = now_ist.strftime("%Y-%m-%d")
        cur_time = now_ist.strftime("%H:%M")

        # Find hospital users matching the specialist type
        users_col = db["users"]
        spec_word = specialist.split()[0]  # e.g. "Cardiologist" → "Cardiologist"
        matching_users = list(users_col.find({
            "role": "hospital",
            "$or": [
                {"specialty":      {"$regex": spec_word, "$options": "i"}},
                {"specialization": {"$regex": spec_word, "$options": "i"}},
                {"department":     {"$regex": spec_word, "$options": "i"}},
                {"doctor_name":    {"$regex": spec_word, "$options": "i"}},
            ]
        }).limit(5))

        matching_ids = [str(u["_id"]) for u in matching_users]

        # If it's past 6 PM, no point showing today's slots — start from tomorrow
        from datetime import timedelta
        if cur_time >= "18:00":
            date_filter = (now_ist + timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            date_filter = today

        # Query availability collection
        avail_col = db["availability"]
        avail_query = {
            "status": "available",
            "date":   {"$gte": date_filter}
        }
        if matching_ids:
            avail_query["$or"] = [
                {"hospital_id": {"$in": matching_ids}},
                {"doctor_id":   {"$in": matching_ids}},
            ]

        avail_docs = list(avail_col.find(avail_query).sort("date", 1).limit(30))

        # Fallback: any available doctor
        if not avail_docs:
            avail_docs = list(avail_col.find({
                "status": "available", "date": {"$gte": date_filter}
            }).sort("date", 1).limit(20))

        # Group availability by doctor across multiple dates
        doctor_map = {}
        for doc in avail_docs:
            doc_id  = str(doc.get("doctor_id", doc.get("hospital_id", "")))
            hosp_id = str(doc.get("hospital_id", doc_id))

            is_today = doc.get("date") == today
            free = [s for s in doc.get("available_slots", []) if s.get("available", True)]
            # Filter out past time slots for today
            if is_today:
                free = [s for s in free if s.get("time", "00:00") > cur_time]
            slots = [{"date": doc["date"], "time": s["time"]} for s in free]

            if not slots:
                continue

            if doc_id not in doctor_map:
                doc_name = doc.get("doctor_name", "Doctor")
                doctor_map[doc_id] = {
                    "doctor_id":   doc_id,
                    "hospital_id": hosp_id,
                    "doctor_name": doc_name if doc_name.startswith("Dr") else f"Dr. {doc_name}",
                    "hospital":    doc.get("hospital_name", "Hospital"),
                    "specialist":  specialist,
                    "slots":       []
                }
            doctor_map[doc_id]["slots"].extend(slots)

        # Limit to 6 slots per doctor and 4 doctors total
        results = []
        for d in doctor_map.values():
            d["slots"] = d["slots"][:6]
            results.append(d)
            if len(results) >= 4:
                break

        return results
    except Exception as e:
        print(f"[chatbot] find_doctors error: {e}")
        return []

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4 — BOOKING  (direct DB insert)
# ═══════════════════════════════════════════════════════════════════════════

def _send_whatsapp(to_number: str, body: str):
    """Send a WhatsApp message via Twilio. Fails silently."""
    try:
        from twilio.rest import Client as TwilioClient
    except ImportError:
        print("[chatbot] Twilio not installed — skipping WhatsApp notification")
        return

    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    auth_token  = os.environ.get("TWILIO_AUTH_TOKEN", "")
    from_number = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    if not account_sid or not auth_token or not to_number:
        return

    if not to_number.startswith("whatsapp:"):
        to_number = f"whatsapp:{to_number}"

    try:
        client = TwilioClient(account_sid, auth_token)
        client.messages.create(body=body, from_=from_number, to=to_number)
        print(f"[chatbot] WhatsApp sent to {to_number}")
    except Exception as e:
        print(f"[chatbot] WhatsApp error: {e}")


def _get_patient_phone(db, patient_id) -> str:
    """Look up a patient's phone from their user profile."""
    try:
        user = db["users"].find_one({"_id": ObjectId(patient_id)})
        if user:
            return user.get("phone", "") or user.get("contact_whatsapp", "") or ""
    except Exception:
        pass
    return ""


def _urgency_swap(db, new_appointment_id, doctor_id, date, new_urgency, new_patient_id):
    """
    If the newly booked patient has a higher urgency score than someone with
    an earlier slot on the same doctor + date, swap their times so the more
    urgent patient is seen first. Sends WhatsApp notifications to both.
    """
    try:
        # Find all appointments for this doctor on this date (excluding cancelled)
        same_day = list(db["appointments"].find({
            "doctor_id":        doctor_id,
            "appointment_date": date,
            "status":           {"$in": ["pending", "confirmed"]},
            "_id":              {"$ne": ObjectId(new_appointment_id)},
        }))

        if not same_day:
            return

        new_apt = db["appointments"].find_one({"_id": ObjectId(new_appointment_id)})
        if not new_apt:
            return

        new_time = new_apt["appointment_time"]

        # Find the lowest-urgency appointment that has an earlier time slot
        candidates = [
            a for a in same_day
            if a["appointment_time"] < new_time
            and a.get("urgency_score", 1) < new_urgency
        ]

        if not candidates:
            return

        # Pick the one with the earliest time AND lowest urgency
        candidates.sort(key=lambda a: (a.get("urgency_score", 1), a["appointment_time"]))
        target = candidates[0]

        target_time = target["appointment_time"]

        # Swap times in the database
        now = datetime.utcnow()
        db["appointments"].update_one(
            {"_id": ObjectId(new_appointment_id)},
            {"$set": {"appointment_time": target_time, "updated_at": now}}
        )
        db["appointments"].update_one(
            {"_id": target["_id"]},
            {"$set": {"appointment_time": new_time, "updated_at": now}}
        )

        print(f"[urgency_swap] Swapped: new patient → {target_time}, bumped patient → {new_time}")

        # ── In-app notifications ──
        from routes.notifications import push_notification

        bumped_patient_id = str(target.get("patient_id", ""))

        # Only notify the NEW (urgent) patient if they are different from the bumped one
        if str(new_patient_id) != bumped_patient_id:
            push_notification(str(new_patient_id), {
                "appointment_id": new_appointment_id,
                "message": (
                    f"Great news! Your appointment on {date} has been "
                    f"preponed to an earlier slot: {target_time} "
                    f"due to urgency prioritisation."
                ),
                "type": "success",
            })

        push_notification(bumped_patient_id, {
            "appointment_id": str(target["_id"]),
            "message": (
                f"Your appointment on {date} has been postponed from "
                f"{target_time} to {new_time} to accommodate a higher-urgency case. "
                f"We apologise for the inconvenience."
            ),
            "type": "warning",
        })

        # ── WhatsApp notifications via Twilio ──
        new_phone    = _get_patient_phone(db, new_patient_id)
        bumped_phone = _get_patient_phone(db, bumped_patient_id)

        if new_phone and str(new_patient_id) != bumped_patient_id:
            _send_whatsapp(new_phone, (
                f"🏥 *PulseSync Appointment Update*\n\n"
                f"Great news! Your appointment on *{date}* has been "
                f"preponed to an earlier slot: *{target_time}* "
                f"due to urgency prioritisation.\n\n"
                f"_Thank you for using PulseSync._"
            ))

        if bumped_phone:
            _send_whatsapp(bumped_phone, (
                f"🏥 *PulseSync Appointment Update*\n\n"
                f"Your appointment on *{date}* has been postponed from "
                f"*{target_time}* to *{new_time}* to accommodate a higher-urgency case.\n\n"
                f"We sincerely apologise for the inconvenience.\n\n"
                f"_Thank you for your understanding._"
            ))


        return True  # swap occurred
    except Exception as e:
        print(f"[urgency_swap] error: {e}")
        return False


def book_appointment(patient_id, doctor_id, hospital_id, date, time, reason, urgency_score):
    try:
        if not patient_id:
            return {"status": "auth_required", "message": "Please log in to book an appointment."}

        db  = get_db()
        now = datetime.utcnow()

        result = db["appointments"].insert_one({
            "patient_id":       ObjectId(patient_id),
            "doctor_id":        doctor_id,
            "hospital_id":      hospital_id,
            "appointment_date": date,
            "appointment_time": time,
            "reason":           reason,
            "notes":            "Booked via Pulse AI Assistant",
            "status":           "pending",
            "urgency_score":    urgency_score,
            "booked_by_agent":  True,
            "created_at":       now,
            "updated_at":       now,
        })

        # Mark slot unavailable
        try:
            db["availability"].update_one(
                {"doctor_id": doctor_id, "date": date,
                 "available_slots": {"$elemMatch": {"time": time, "available": True}}},
                {"$set": {"available_slots.$.available": False, "updated_at": now}}
            )
        except Exception:
            pass

        # ── Urgency-based slot swap ──
        swapped = False
        original_time = time
        if urgency_score >= 3:
            swapped = _urgency_swap(
                db,
                new_appointment_id = str(result.inserted_id),
                doctor_id          = doctor_id,
                date               = date,
                new_urgency        = urgency_score,
                new_patient_id     = patient_id,
            )
            # Re-read the appointment to get the (possibly swapped) time
            updated = db["appointments"].find_one({"_id": result.inserted_id})
            final_time = updated["appointment_time"] if updated else time
        else:
            final_time = time

        return {
            "status":            "booked",
            "appointment_id":    str(result.inserted_id),
            "appointment_date":  date,
            "appointment_time":  final_time,
            "swapped":           bool(swapped),
            "original_time":     original_time if swapped else None,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# STEP 5 — GEMINI  (language only, small prompt, last 6 messages)
# ═══════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = (
    "You are 'Pulse', a warm, empathetic, and knowledgeable AI health assistant for PulseSync. "
    "You are a REAL health chatbot — not just an appointment booker. "
    "Your primary role is to LISTEN to patients, understand their symptoms, provide helpful health advice, "
    "suggest practical home remedies, and have genuine back-and-forth conversations about their health concerns. "
    "\n\nRules: "
    "1. NEVER diagnose. Use cautious phrases like 'this could indicate', 'it might be helpful to'. "
    "2. Provide SPECIFIC, practical health advice and home remedies relevant to what the user describes. "
    "3. Ask follow-up questions to better understand their situation (duration, severity, triggers, etc). "
    "4. Keep replies conversational — 2 to 5 sentences. Be warm and human. "
    "5. Only suggest booking a doctor appointment when symptoms sound serious enough to need professional attention, "
    "   or when the patient explicitly asks for a doctor. Don't push booking on every interaction. "
    "6. For emergencies, urgently tell the patient to call 108 immediately. "
    "7. If context says doctors were found or appointment booked, acknowledge it warmly. "
    "8. Use simple HTML: <p>, <strong>, <ul>, <li>. "
    "9. If the user describes an injury (broken bone, sprain, twisted ankle, wound, burn), "
    "   provide RICE protocol or first-aid advice immediately instead of asking generic follow-ups. "
    "10. Be helpful even for general health questions — diet, exercise, sleep, wellness, prevention."
)

def gemini_reply(history: list, context: str = "", user_text: str = "") -> str:
    if not GEMINI_API_KEY:
        return _smart_fallback(user_text, context)

    system = SYSTEM_PROMPT + (f"\n\nContext: {context}" if context else "")

    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={
                "contents": history[-6:],  # only last 6 messages → small prompt
                "systemInstruction": {"role": "system", "parts": [{"text": system}]},
                "generationConfig":  {"maxOutputTokens": 350, "temperature": 0.7}
            },
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"[chatbot] Gemini error: {e}")
        return _smart_fallback(user_text, context)


# ── Keyword-based smart fallback (no API needed) ──────────────────────────

_FALLBACK_ADVICE = {
    "broken|fracture|fractured": (
        "<p>That sounds painful! Here's what you can do right now:</p>"
        "<ul><li><strong>Immobilize</strong> the area — don't try to move it</li>"
        "<li>Apply <strong>ice wrapped in cloth</strong> to reduce swelling</li>"
        "<li>Elevate the limb if possible</li>"
        "<li>Take an OTC pain reliever like ibuprofen</li></ul>"
        "<p>A fracture or break <strong>does need medical attention</strong> — I'd recommend seeing an orthopedist. "
        "Would you like me to find an available doctor for you? 🏥</p>"
    ),
    "sprain|twisted|twist|ankle|wrist": (
        "<p>A sprain or twist can be really uncomfortable. Try the <strong>RICE method</strong>:</p>"
        "<ul><li><strong>R</strong>est — avoid putting weight on it</li>"
        "<li><strong>I</strong>ce — apply for 15-20 min every few hours</li>"
        "<li><strong>C</strong>ompression — use an elastic bandage</li>"
        "<li><strong>E</strong>levation — keep it raised above heart level</li></ul>"
        "<p>If swelling doesn't improve in 24-48 hours or you can't bear weight, "
        "you should see a doctor. Would you like me to help you book an appointment? 💙</p>"
    ),
    "burn|burned|scalded": (
        "<p>I'm sorry to hear that! For a burn:</p>"
        "<ul><li>Run <strong>cool (not cold) water</strong> over it for 10-20 minutes</li>"
        "<li>Don't apply ice, butter, or toothpaste</li>"
        "<li>Cover with a sterile, non-stick bandage</li>"
        "<li>Take ibuprofen for pain if needed</li></ul>"
        "<p>If the burn is larger than your palm, blistered, or on the face/hands/joints, "
        "please seek medical care. Want me to find a doctor? 🩺</p>"
    ),
    "cut|wound|bleeding": (
        "<p>Here's how to handle that:</p>"
        "<ul><li>Apply <strong>firm pressure</strong> with a clean cloth to stop bleeding</li>"
        "<li>Clean the wound with clean water</li>"
        "<li>Apply an antiseptic ointment</li>"
        "<li>Cover with a sterile bandage</li></ul>"
        "<p>If the cut is deep, won't stop bleeding, or shows signs of infection, "
        "you should see a doctor. Want me to help? 💙</p>"
    ),
    "headache|migraine|head pain": (
        "<p>I understand headaches can be really disruptive. Here are some things that might help:</p>"
        "<ul><li>Rest in a <strong>quiet, dark room</strong></li>"
        "<li>Apply a cold compress to your forehead or temples</li>"
        "<li>Stay hydrated — dehydration is a common trigger</li>"
        "<li>Try gentle neck and shoulder stretches</li>"
        "<li>An OTC pain reliever like ibuprofen or acetaminophen can help</li></ul>"
        "<p>If headaches are frequent, unusually severe, or come with vision changes, "
        "it's worth seeing a neurologist. Would you like me to find one? 🩺</p>"
    ),
    "cold|flu|runny nose|sneezing|congestion": (
        "<p>Common colds are no fun! Here's what can help:</p>"
        "<ul><li>Get plenty of <strong>rest</strong></li>"
        "<li>Stay hydrated with warm fluids — soup, tea, or warm water with honey</li>"
        "<li>Use steam inhalation to relieve congestion</li>"
        "<li>Gargle with warm salt water for sore throat</li>"
        "<li>A saline nasal spray can help with stuffiness</li></ul>"
        "<p>Most colds resolve in 7-10 days. If symptoms worsen or fever persists beyond 3 days, "
        "consider seeing a doctor. I'm here if you need help! 💙</p>"
    ),
    "fever": (
        "<p>A fever is your body's way of fighting infection. Here's what you can do:</p>"
        "<ul><li>Rest and stay hydrated</li>"
        "<li>Take <strong>paracetamol or ibuprofen</strong> as directed</li>"
        "<li>Use a lukewarm compress on your forehead</li>"
        "<li>Wear light clothing and keep the room comfortable</li></ul>"
        "<p>If your fever is above 103°F (39.4°C), lasts more than 3 days, or comes with "
        "severe symptoms, please see a doctor. Want me to help book one? 🩺</p>"
    ),
    "stomach|nausea|vomit|diarrhea|indigestion": (
        "<p>Stomach issues are uncomfortable. Here are some tips:</p>"
        "<ul><li>Stick to the <strong>BRAT diet</strong> — bananas, rice, applesauce, toast</li>"
        "<li>Stay hydrated with clear fluids and ORS</li>"
        "<li>Avoid spicy, fatty, or dairy-heavy foods</li>"
        "<li>Ginger or peppermint tea can help with nausea</li></ul>"
        "<p>If symptoms persist beyond 48 hours or you notice blood, please see a doctor. 💙</p>"
    ),
    "anxiety|stress|panic|depressed|depression|mental|sleep|insomnia": (
        "<p>I hear you, and your feelings are completely valid. Here are some things that might help:</p>"
        "<ul><li>Try <strong>deep breathing</strong> — breathe in for 4 counts, hold for 7, out for 8</li>"
        "<li>Take a gentle walk or do light stretching</li>"
        "<li>Limit caffeine and screen time before bed</li>"
        "<li>Talk to someone you trust about how you're feeling</li></ul>"
        "<p>If you've been feeling this way for more than two weeks, speaking with a mental health professional "
        "can make a real difference. Would you like me to find one? 💙</p>"
    ),
    "back pain|neck pain|shoulder|muscle": (
        "<p>Here are some things that can help with that:</p>"
        "<ul><li>Apply <strong>ice</strong> for the first 48 hours, then switch to <strong>heat</strong></li>"
        "<li>Gentle stretching and movement (avoid staying still too long)</li>"
        "<li>Maintain good posture — especially if you sit for long periods</li>"
        "<li>An OTC pain reliever can help</li></ul>"
        "<p>If pain radiates down your legs, causes numbness, or doesn't improve in a week, "
        "you should see a specialist. Want me to find an orthopedist? 🩺</p>"
    ),
    "cough|breathing|wheeze|asthma": (
        "<p>For your cough/breathing concern, try these:</p>"
        "<ul><li>Stay hydrated with warm fluids</li>"
        "<li>Use <strong>steam inhalation</strong> to ease congestion</li>"
        "<li>Honey with warm water can soothe a cough</li>"
        "<li>Avoid smoke, dust, and strong odors</li></ul>"
        "<p>If you're having significant difficulty breathing, wheezing that won't stop, "
        "or coughing up blood, seek medical care immediately. 🏥</p>"
    ),
    "skin|rash|itch|allergy": (
        "<p>For skin issues, here's what can help:</p>"
        "<ul><li>Keep the area <strong>clean and dry</strong></li>"
        "<li>Apply a gentle, fragrance-free moisturizer</li>"
        "<li>A cold compress can relieve itching</li>"
        "<li>An OTC antihistamine (like cetirizine) may help for allergic reactions</li></ul>"
        "<p>If the rash is spreading, painful, or accompanied by fever, "
        "it's best to see a dermatologist. Let me know if you'd like help! 💙</p>"
    ),
    "eye|vision|blurred": (
        "<p>For eye concerns:</p>"
        "<ul><li>Rest your eyes and take a break from screens (20-20-20 rule)</li>"
        "<li>Apply a warm compress for dry/tired eyes</li>"
        "<li>Use preservative-free artificial tears</li>"
        "<li>Avoid rubbing your eyes</li></ul>"
        "<p>If you have sudden vision changes, severe pain, or discharge, "
        "please see an eye doctor promptly. 👁️</p>"
    ),
    "ear|throat|sinus|tonsil": (
        "<p>Here are some remedies for ear/throat/sinus issues:</p>"
        "<ul><li>Gargle with <strong>warm salt water</strong> for sore throat</li>"
        "<li>Steam inhalation helps with sinus congestion</li>"
        "<li>Stay hydrated with warm fluids</li>"
        "<li>A warm compress against the ear can ease earache</li></ul>"
        "<p>If symptoms are severe or last more than a week, consider seeing an ENT specialist. 🩺</p>"
    ),
}

def _smart_fallback(user_text: str, context: str = "") -> str:
    """Generate a relevant response based on user's words when Gemini is unavailable."""
    import re

    # First check context-based responses (booking, confirmation, etc.)
    ctx = context.lower() if context else ""

    if "emergency" in ctx:
        return (
            "<p><strong>⚠️ This sounds urgent!</strong> Please call <strong>108</strong> immediately. "
            "I've also found specialists below who can help you right away.</p>"
        )
    if "booked" in ctx or "congratulat" in ctx:
        return (
            "<p>✅ <strong>Your appointment has been booked successfully!</strong> "
            "You'll receive a confirmation shortly. Please arrive 10 minutes early. "
            "Wishing you a speedy recovery! 💙</p>"
        )
    if "not logged in" in ctx or "log in" in ctx:
        return "<p>It looks like you're not logged in. Please log in to book an appointment. 🔐</p>"
    if "booking failed" in ctx or "failed" in ctx:
        return "<p>I'm sorry, the booking didn't go through. Could you try selecting another slot? 🙏</p>"
    if "declined" in ctx or "chose not to" in ctx:
        return (
            "<p>No worries! Take care of yourself and try the remedies above. "
            "If symptoms persist or worsen, don't hesitate to come back. 💙</p>"
        )
    if "home remed" in ctx or "remedies" in ctx:
        return (
            "<p>I understand your concern. I've listed some helpful home remedies below. "
            "If you'd still like to see a specialist, just tap the button below. 👇</p>"
        )
    if "high" in ctx and "doctor" in ctx:
        return (
            "<p>Based on your symptoms, this needs <strong>prompt attention</strong>. "
            "I've found specialists who can help. Please select a time slot that works for you. 🏥</p>"
        )
    if "found" in ctx and "doctor" in ctx:
        return (
            "<p>Great news! I've found available doctors for you. "
            "Please choose a time slot from the options below. 📅</p>"
        )
    if "still waiting" in ctx or "confirm" in ctx:
        return "<p>Would you like to confirm this appointment? Say <strong>yes</strong> to book or <strong>no</strong> to see other options. 😊</p>"
    if "pick a slot" in ctx:
        return "<p>I found some available doctors for you! Please tap on a time slot to book. 📋</p>"

    # Now check user's actual words for keyword-based advice
    t = user_text.lower() if user_text else ""
    for pattern, response in _FALLBACK_ADVICE.items():
        if any(re.search(r'\b' + kw + r'\b', t) or kw in t for kw in pattern.split("|")):
            return response

    # Greeting detection
    if any(g in t for g in ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]):
        return (
            "<p>Hello! 👋 I'm <strong>Pulse</strong>, your AI health assistant. "
            "I can help you with health advice, home remedies, and booking doctor appointments. "
            "How are you feeling today? Tell me what's on your mind! 😊</p>"
        )

    # Thank you detection
    if any(g in t for g in ["thank", "thanks", "appreciate"]):
        return (
            "<p>You're welcome! 😊 Take care of yourself. "
            "If you need any more health advice or want to book an appointment, I'm always here. 💙</p>"
        )

    # General health questions
    if any(g in t for g in ["diet", "nutrition", "exercise", "workout", "weight", "healthy", "wellness"]):
        return (
            "<p>Great that you're thinking about your health! Here are some general tips:</p>"
            "<ul><li>Aim for a <strong>balanced diet</strong> with plenty of fruits, vegetables, and whole grains</li>"
            "<li>Stay hydrated — aim for 8 glasses of water daily</li>"
            "<li>Get at least <strong>30 minutes of physical activity</strong> most days</li>"
            "<li>Prioritize 7-9 hours of quality sleep</li></ul>"
            "<p>Would you like more specific advice about something? I'm happy to help! 💪</p>"
        )

    # Fallback for truly unrecognized input
    if t:
        return (
            "<p>I understand you're concerned about your health. Could you describe your symptoms "
            "in a bit more detail? For example:</p>"
            "<ul><li>What exactly are you experiencing?</li>"
            "<li>How long has this been going on?</li>"
            "<li>How severe is it on a scale of 1-10?</li></ul>"
            "<p>This will help me give you the best advice and find the right specialist if needed. 🩺</p>"
        )

    return (
        "<p>Hello! I'm <strong>Pulse</strong>, your health assistant. "
        "Tell me about any symptoms or health concerns you have, and I'll do my best to help — "
        "from home remedies to booking a doctor appointment. 💙</p>"
    )


# ═══════════════════════════════════════════════════════════════════════════
# INTENT DETECTION  (pure Python)
# ═══════════════════════════════════════════════════════════════════════════

def detect_intent(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ["yes", "yeah", "sure", "ok", "okay", "please", "book",
                             "confirm", "go ahead", "do it", "find", "let's", "lets"]):
        return "confirm"
    if any(w in t for w in ["no", "nope", "cancel", "don't", "not now", "later", "skip"]):
        return "deny"
    if any(w in t for w in ["pain", "ache", "fever", "cough", "feel", "hurt", "hurting",
                             "sick", "ill", "symptom", "sharp", "dull", "constant", "bleed",
                             "swollen", "dizzy", "nausea", "vomit", "breathe", "broken",
                             "fracture", "sprain", "twisted", "burn", "wound", "cut",
                             "rash", "itching", "headache", "stomach", "chest",
                             "infection", "allergy", "injury", "sore", "stiff",
                             "tired", "fatigue", "anxiety", "depression", "insomnia"]):
        return "symptom"
    if any(w in t for w in ["appointment", "book", "doctor", "schedule", "slot"]):
        return "booking"
    # Health-related general queries
    if any(w in t for w in ["health", "diet", "exercise", "medicine", "remedy", "treatment",
                             "wellness", "nutrition", "sleep", "vitamin", "supplement"]):
        return "health_query"
    return "general"

# ═══════════════════════════════════════════════════════════════════════════
# MAIN ROUTE
# ═══════════════════════════════════════════════════════════════════════════

@chatbot_bp.route("/api/chatbot", methods=["POST"])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing request body"}), 400

    history     = data.get("history", [])
    chat_state  = data.get("state", {})
    patient_id  = get_patient_id()

    # Extract latest user message
    user_message = ""
    for msg in reversed(history):
        if msg.get("role") == "user":
            user_message = " ".join(
                p.get("text", "") for p in msg.get("parts", []) if isinstance(p, dict)
            )
            break

    if not user_message:
        return jsonify({"error": "No user message found"}), 400

    intent = detect_intent(user_message)
    action = None
    stage  = chat_state.get("stage", "symptom_collection")

    # ── Stage: waiting for booking confirmation ──────────────────────────
    if stage == "awaiting_booking_confirm":
        selected = chat_state.get("selected_slot")

        if intent == "confirm" and selected:
            result = book_appointment(
                patient_id    = patient_id,
                doctor_id     = selected["doctor_id"],
                hospital_id   = selected["hospital_id"],
                date          = selected["date"],
                time          = selected["time"],
                reason        = chat_state.get("symptoms_summary", "Consultation"),
                urgency_score = chat_state.get("urgency_score", 1)
            )
            if result["status"] == "booked":
                action     = {"type": "appointment_booked", "data": result}
                if result.get("swapped"):
                    context = (
                        f"Appointment successfully booked. Due to the urgency of your condition, "
                        f"your appointment has been moved to an earlier slot at {result['appointment_time']} "
                        f"(originally you were booked at {result['original_time']}). "
                        "Tell the patient their slot was preponed to an earlier time due to urgency prioritisation. "
                        "Mention they can reschedule if the new time is not suitable. Congratulate them warmly."
                    )
                else:
                    context = "Appointment successfully booked. Congratulate the patient warmly."
                next_stage = "done"
            elif result["status"] == "auth_required":
                action     = {"type": "auth_required"}
                context    = "Patient is not logged in. Ask them to log in first."
                next_stage = "symptom_collection"
            else:
                context    = f"Booking failed: {result.get('message')}. Apologise and suggest they try again."
                next_stage = "doctors_shown"
        elif intent == "deny":
            context    = "Patient declined. Ask if they want to see other options or need more information."
            next_stage = "doctors_shown"
        else:
            context    = "Still waiting for patient to confirm or cancel the booking."
            next_stage = "awaiting_booking_confirm"

        return jsonify({
            "response":  gemini_reply(history, context, user_message),
            "action":    action,
            "new_state": {**chat_state, "stage": next_stage}
        })

    # ── Stage: slot was selected by frontend → book immediately ─────────
    if chat_state.get("selected_slot") and stage == "doctors_shown":
        selected = chat_state["selected_slot"]

        result = book_appointment(
            patient_id    = patient_id,
            doctor_id     = selected["doctor_id"],
            hospital_id   = selected["hospital_id"],
            date          = selected["date"],
            time          = selected["time"],
            reason        = chat_state.get("symptoms_summary", "Consultation"),
            urgency_score = chat_state.get("urgency_score", 1)
        )

        if result["status"] == "booked":
            if result.get("swapped"):
                context = (
                    f"Appointment successfully booked with {selected.get('doctor_name')} "
                    f"on {result['appointment_date']}. "
                    f"IMPORTANT: Due to the urgency of their condition, the smart queuing system has "
                    f"preponed their appointment from {result['original_time']} to an earlier slot at "
                    f"{result['appointment_time']}. "
                    "Explicitly tell the patient: their appointment slot has been moved earlier due to their high-priority condition. "
                    "Mention that if the new time is not suitable, they can reschedule. "
                    "Be warm and reassuring."
                )
            else:
                context = (
                    f"Appointment successfully booked with {selected.get('doctor_name')} "
                    f"on {selected['date']} at {selected['time']}. "
                    "Congratulate the patient warmly and remind them of their appointment."
                )
            return jsonify({
                "response":  gemini_reply(history, context, user_message),
                "action":    {"type": "appointment_booked", "data": result},
                "new_state": {**chat_state, "stage": "done", "selected_slot": None}
            })
        elif result["status"] == "auth_required":
            return jsonify({
                "response":  gemini_reply(history, "Patient is not logged in. Ask them to log in first.", user_message),
                "action":    {"type": "auth_required"},
                "new_state": {**chat_state, "stage": "doctors_shown", "selected_slot": None}
            })
        else:
            context = f"Booking failed: {result.get('message')}. Apologise and suggest they try another slot."
            return jsonify({
                "response":  gemini_reply(history, context, user_message),
                "action":    None,
                "new_state": {**chat_state, "stage": "doctors_shown", "selected_slot": None}
            })

    # ── Stage: remedies were shown, user wants to book ──────────────────
    if stage == "remedies_shown" and intent == "confirm":
        specialist = chat_state.get("specialist", "General Physician")
        urgency    = chat_state.get("urgency", "low")
        doctors    = find_doctors(specialist, urgency)
        context    = (
            f"Patient wants to book after seeing home remedies. "
            f"Found {len(doctors)} {specialist} doctor(s). "
            "Tell the patient what you found and ask them to pick a slot."
        )
        return jsonify({
            "response":  gemini_reply(history, context, user_message),
            "action":    {"type": "assessment_complete",
                          "data": {"urgency": urgency,
                                   "urgency_score": chat_state.get("urgency_score", 1),
                                   "specialist": specialist,
                                   "doctors": doctors}},
            "new_state": {
                **chat_state,
                "stage": "doctors_shown" if doctors else "symptom_collection",
            }
        })

    if stage == "remedies_shown" and intent == "deny":
        context = "Patient chose not to book. Wish them well and remind them to see a doctor if symptoms worsen."
        return jsonify({
            "response":  gemini_reply(history, context, user_message),
            "action":    None,
            "new_state": {**chat_state, "stage": "done"}
        })

    # ── Health queries (diet, exercise, wellness, etc.) ──────────────────
    if intent == "health_query":
        context = (
            "The patient is asking a general health/wellness question. "
            "Provide helpful, practical advice about their topic. "
            "Be warm and informative. Don't push for appointment booking."
        )
        return jsonify({
            "response":  gemini_reply(history, context, user_message),
            "action":    None,
            "new_state": {**chat_state, "stage": "conversation"}
        })

    # ── Symptom collection + severity + doctor search ────────────────────
    if intent in ("symptom", "general", "booking") or stage in ("symptom_collection", "remedies_shown"):
        # Build full symptom text from conversation history
        all_text = " ".join(
            " ".join(p.get("text", "") for p in msg.get("parts", []) if isinstance(p, dict))
            for msg in history if msg.get("role") == "user"
        )

        severity = assess_severity(all_text)

        # Found a match — search doctors and show results
        if severity["matched"] and stage != "doctors_shown":

            new_state_base = {
                **chat_state,
                "urgency":          severity["urgency"],
                "urgency_score":    severity["urgency_score"],
                "specialist":       severity["specialist"],
                "symptoms_summary": user_message[:200],
            }

            # ── Emergency / High → show doctors immediately ──────────
            if severity["urgency"] in ("emergency", "high"):
                doctors = find_doctors(severity["specialist"], severity["urgency"])

                if severity["urgency"] == "emergency":
                    context = (
                        f"EMERGENCY. Advise the patient to call 108 immediately for urgent assistance. "
                        f"However, we also found {len(doctors)} {severity['specialist']} doctor(s). "
                        "Offer to book an emergency appointment with them if they are able."
                    )
                else:
                    context = (
                        f"Urgency: HIGH. Specialist: {severity['specialist']}. "
                        f"Found {len(doctors)} doctor(s). "
                        "Tell the patient this needs prompt attention and ask if they'd like to book."
                    )

                return jsonify({
                    "response":  gemini_reply(history, context, user_message),
                    "action":    {"type": "assessment_complete",
                                  "data": {**severity, "doctors": doctors}},
                    "new_state": {
                        **new_state_base,
                        "stage": "doctors_shown" if doctors else "symptom_collection",
                    }
                })

            # ── Medium / Low → home remedies first, booking optional ─
            else:
                context = (
                    f"Urgency: {severity['urgency']}. Likely specialist: {severity['specialist']}. "
                    "Provide 3-4 practical home remedies or self-care tips for the patient's symptoms "
                    "using a short bullet list in HTML (<ul><li>). "
                    "Then ask if they would still like to book an appointment with a specialist."
                )
                return jsonify({
                    "response":  gemini_reply(history, context, user_message),
                    "action":    {"type": "remedies_offered", "data": severity},
                    "new_state": {
                        **new_state_base,
                        "stage": "remedies_shown",
                    }
                })

        # Not enough info yet — provide conversational response
        context = (
            "The patient has described some health concerns but no specific symptom was matched yet. "
            "Provide relevant health advice based on what they said. Ask a specific follow-up question "
            "to understand their symptoms better. Be helpful, not just a symptom collector."
        )
        return jsonify({
            "response":  gemini_reply(history, context, user_message),
            "action":    None,
            "new_state": {**chat_state, "stage": "symptom_collection"}
        })

    # ── User wants to book but no slot selected yet ───────────────────────
    if intent == "confirm" and stage == "doctors_shown":
        specialist  = chat_state.get("specialist", "General Physician")
        urgency     = chat_state.get("urgency", "low")
        doctors     = find_doctors(specialist, urgency)
        context     = "Patient wants to book. Show them available doctors and ask them to pick a slot."
        return jsonify({
            "response":  gemini_reply(history, context, user_message),
            "action":    {"type": "show_doctors", "data": {"doctors": doctors}},
            "new_state": {**chat_state, "stage": "doctors_shown"}
        })

    # ── Default: general conversation ────────────────────────────────────
    context = (
        "The patient is having a general conversation. "
        "Respond helpfully and naturally. Provide health advice if relevant. "
        "Don't force appointment booking unless the patient asks."
    )
    return jsonify({
        "response":  gemini_reply(history, context, user_message),
        "action":    None,
        "new_state": {**chat_state, "stage": "conversation"}
    })