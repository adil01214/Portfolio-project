import re

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import Message
from routes.common import error, success


bp = Blueprint("contact", __name__)
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@bp.post("/contact")
def create_message():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("validation_error", "A JSON object is required.", 400)
    fields = {key: payload.get(key) for key in ("name", "email", "subject", "message")}
    limits = {"name": 120, "email": 254, "subject": 180, "message": 10000}
    for key, value in fields.items():
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > limits[key]:
            return error("validation_error", f"{key.title()} is required and must be within its length limit.", 400)
        fields[key] = value.strip()
    if not EMAIL_PATTERN.match(fields["email"]):
        return error("validation_error", "Enter a valid email address.", 400)
    item = Message(**fields)
    db.session.add(item)
    db.session.commit()
    return success({"id": item.id, "message": "Your message has been received."}, 201)


@bp.get("/messages")
@jwt_required()
def list_messages():
    items = Message.query.order_by(Message.created_at.desc()).limit(300).all()
    return success([{
        "id": item.id,
        "name": item.name,
        "email": item.email,
        "subject": item.subject,
        "message": item.message,
        "status": item.status,
        "created_at": item.created_at.isoformat(),
    } for item in items])


@bp.put("/messages/<int:item_id>")
@jwt_required()
def update_message(item_id):
    item = db.session.get(Message, item_id)
    payload = request.get_json(silent=True) or {}
    if item is None:
        return error("not_found", "Message was not found.", 404)
    status = payload.get("status")
    if status not in ("new", "read", "archived"):
        return error("validation_error", "Status must be new, read, or archived.", 400)
    item.status = status
    db.session.commit()
    return success({"id": item.id, "status": item.status})


@bp.delete("/messages/<int:item_id>")
@jwt_required()
def delete_message(item_id):
    item = db.session.get(Message, item_id)
    if item is None:
        return error("not_found", "Message was not found.", 404)
    db.session.delete(item)
    db.session.commit()
    return success({"deleted": True})