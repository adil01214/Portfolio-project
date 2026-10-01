from flask import Blueprint, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required

from extensions import bcrypt, db
from models import User
from routes.common import error, success


bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = payload.get("email", "")
    password = payload.get("password", "")
    if not isinstance(email, str) or not isinstance(password, str):
        return error("invalid_credentials", "Email or password is incorrect.", 401)
    user = User.query.filter_by(email=email.strip().lower()).first()
    if not user or not user.is_active or not bcrypt.check_password_hash(user.password_hash, password):
        return error("invalid_credentials", "Email or password is incorrect.", 401)
    identity = str(user.id)
    return success({
        "access_token": create_access_token(identity=identity),
        "refresh_token": create_refresh_token(identity=identity),
        "user": {"id": user.id, "email": user.email},
    })


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    return success({"access_token": create_access_token(identity=get_jwt_identity())})


@bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.is_active:
        return error("unauthorized", "Admin account is unavailable.", 401)
    return success({"id": user.id, "email": user.email})