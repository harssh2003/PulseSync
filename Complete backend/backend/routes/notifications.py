# routes/notifications.py
from flask import Blueprint, Response, request, jsonify
from functools import wraps
from datetime import datetime
from bson.objectid import ObjectId
import jwt, os, json, time, queue, threading

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

# ── In-memory subscriber registry ─────────────────────────────────────────────
# Maps user_id (str) → list of Queue objects (one per open SSE connection)
_subscribers: dict[str, list[queue.Queue]] = {}
_subscribers_lock = threading.Lock()

def get_db():
    from pymongo import MongoClient
    client = MongoClient('mongodb://localhost:27017/')
    return client['pulsesync']

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        # SSE also sends token as query param (EventSource can't set headers)
        if not token:
            token = request.args.get('token')
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


# ── Public helper: call this from anywhere to push a notification ──────────────
def push_notification(user_id: str, notification: dict):
    """
    Save notification to DB and push to any live SSE connections for that user.
    Call this from appointments routes instead of inserting directly.
    """
    db = get_db()
    
    doc = {
        'user_id': str(user_id),
        'appointment_id': notification.get('appointment_id'),
        'message': notification.get('message', ''),
        'type': notification.get('type', 'info'),   # info | success | warning | error
        'read': False,
        'cleared': False,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    result = db['notifications'].insert_one(doc)
    doc['_id'] = result.inserted_id

    # Build the SSE payload
    payload = {
        'id': str(doc['_id']),
        'appointment_id': str(doc.get('appointment_id', '')),
        'message': doc['message'],
        'type': doc['type'],
        'read': False,
        'created_at': doc['created_at'].isoformat(),
    }

    # Push to every queue subscribed for this user
    with _subscribers_lock:
        queues = _subscribers.get(str(user_id), [])
        dead = []
        for q in queues:
            try:
                q.put_nowait(payload)
            except queue.Full:
                dead.append(q)
        # Clean up full / dead queues
        for q in dead:
            queues.remove(q)

    return payload


# ── SSE stream endpoint ────────────────────────────────────────────────────────
@notifications_bp.route('/stream', methods=['GET'])
@token_required
def stream():
    """
    SSE endpoint. Frontend connects once; server pushes events as they happen.
    Token passed as query param: /api/notifications/stream?token=<jwt>
    """
    user_id = str(request.user_id)
    q = queue.Queue(maxsize=50)

    # Register this connection
    with _subscribers_lock:
        _subscribers.setdefault(user_id, []).append(q)

    print(f"[SSE] Client connected: user_id={user_id}  "
          f"total_connections={len(_subscribers.get(user_id, []))}")

    def event_stream():
        try:
            # 1. Send any unread, uncleared notifications immediately on connect
            db = get_db()
            existing = list(db['notifications'].find(
                {'user_id': user_id, 'cleared': False}
            ).sort('created_at', -1))

            for notif in existing:
                payload = {
                    'id': str(notif['_id']),
                    'appointment_id': str(notif.get('appointment_id', '')),
                    'message': notif.get('message', ''),
                    'type': notif.get('type', 'info'),
                    'read': notif.get('read', False),
                    'created_at': notif['created_at'].isoformat()
                        if isinstance(notif.get('created_at'), datetime)
                        else notif.get('created_at', ''),
                }
                yield f"data: {json.dumps(payload)}\n\n"

            # 2. Keep connection alive; yield new notifications as they arrive
            while True:
                try:
                    # Block for up to 25 s, then send a keep-alive comment
                    payload = q.get(timeout=25)
                    yield f"data: {json.dumps(payload)}\n\n"
                except queue.Empty:
                    # SSE keep-alive (comment line — browsers ignore it)
                    yield ": keep-alive\n\n"

        except GeneratorExit:
            pass
        finally:
            # Unregister on disconnect
            with _subscribers_lock:
                queues = _subscribers.get(user_id, [])
                if q in queues:
                    queues.remove(q)
                if not queues:
                    _subscribers.pop(user_id, None)
            print(f"[SSE] Client disconnected: user_id={user_id}")

    return Response(
        event_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',   # Disable nginx buffering
            'Connection': 'keep-alive',
        }
    )


# ── REST helpers (still needed for mark-read / clear) ─────────────────────────
@notifications_bp.route('/', methods=['GET'])
@token_required
def get_notifications():
    """Fallback REST fetch (used on first load before SSE connects)."""
    db = get_db()
    notifications = list(db['notifications'].find(
        {'user_id': str(request.user_id), 'cleared': False}
    ).sort('created_at', -1))

    data = [{
        'id': str(n['_id']),
        'appointment_id': str(n.get('appointment_id', '')),
        'message': n.get('message', ''),
        'type': n.get('type', 'info'),
        'read': n.get('read', False),
        'created_at': n['created_at'].isoformat()
            if isinstance(n.get('created_at'), datetime) else n.get('created_at', ''),
    } for n in notifications]

    return jsonify({'notifications': data, 'total': len(data)}), 200


@notifications_bp.route('/<notification_id>/read', methods=['PUT'])
@token_required
def mark_read(notification_id):
    db = get_db()
    result = db['notifications'].update_one(
        {'_id': ObjectId(notification_id), 'user_id': str(request.user_id)},
        {'$set': {'read': True, 'updated_at': datetime.utcnow()}}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'Notification not found'}), 404
    return jsonify({'message': 'Marked as read'}), 200


@notifications_bp.route('/<notification_id>/clear', methods=['POST'])
@token_required
def clear_notification(notification_id):
    db = get_db()
    result = db['notifications'].update_one(
        {'_id': ObjectId(notification_id), 'user_id': str(request.user_id)},
        {'$set': {'cleared': True, 'read': True, 'updated_at': datetime.utcnow()}}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'Notification not found'}), 404
    return jsonify({'message': 'Cleared'}), 200


@notifications_bp.route('/clear-all', methods=['POST'])
@token_required
def clear_all():
    db = get_db()
    db['notifications'].update_many(
        {'user_id': str(request.user_id), 'cleared': False},
        {'$set': {'cleared': True, 'read': True, 'updated_at': datetime.utcnow()}}
    )
    return jsonify({'message': 'All cleared'}), 200


@notifications_bp.route('/mark-all-read', methods=['POST'])
@token_required
def mark_all_read():
    db = get_db()
    db['notifications'].update_many(
        {'user_id': str(request.user_id), 'read': False},
        {'$set': {'read': True, 'updated_at': datetime.utcnow()}}
    )
    return jsonify({'message': 'All marked as read'}), 200