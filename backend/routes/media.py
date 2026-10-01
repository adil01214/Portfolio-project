from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, request, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from extensions import db
from models import Media
from routes.common import error, success


bp = Blueprint("media", __name__)
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}


def image_signature_matches(extension, header):
    signatures = {
        "jpg": header.startswith(b"\xff\xd8\xff"),
        "jpeg": header.startswith(b"\xff\xd8\xff"),
        "png": header.startswith(b"\x89PNG\r\n\x1a\n"),
        "gif": header.startswith((b"GIF87a", b"GIF89a")),
        "webp": header.startswith(b"RIFF") and header[8:12] == b"WEBP",
    }
    return signatures.get(extension, False)


def serialize(item):
    return {
        "id": item.id,
        "original_filename": item.original_filename,
        "filename": item.filename,
        "mime_type": item.mime_type,
        "size": item.size,
        "url": f"{request.url_root.rstrip('/')}/uploads/{item.filename}",
        "created_at": item.created_at.isoformat(),
    }


@bp.post("/upload/image")
@jwt_required()
def upload_image():
    image = request.files.get("file")
    if image is None or not image.filename:
        return error("validation_error", "Choose an image file to upload.", 400)
    original = secure_filename(image.filename)
    extension = Path(original).suffix.lower().lstrip(".")
    if extension not in ALLOWED_EXTENSIONS:
        return error("unsupported_file", "Use a JPG, PNG, GIF, or WebP image.", 415)
    header = image.stream.read(12)
    image.stream.seek(0)
    if not image_signature_matches(extension, header):
        return error("unsupported_file", "The file contents do not match a supported image format.", 415)
    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    upload_folder.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}.{extension}"
    destination = upload_folder / filename
    image.save(destination)
    size = destination.stat().st_size
    if size == 0 or size > current_app.config["MAX_CONTENT_LENGTH"]:
        destination.unlink(missing_ok=True)
        return error("invalid_file_size", "Images must be smaller than 5 MB.", 413)
    mime_type = image.mimetype or "application/octet-stream"
    item = Media(
        original_filename=original[:255], filename=filename,
        mime_type=mime_type[:100], size=size, path=str(destination),
    )
    db.session.add(item)
    db.session.commit()
    return success(serialize(item), 201)


@bp.get("/media")
@jwt_required()
def list_media():
    items = Media.query.order_by(Media.created_at.desc()).limit(300).all()
    return success([serialize(item) for item in items])


@bp.put("/media/<int:item_id>")
@jwt_required()
def update_media(item_id):
    item = db.session.get(Media, item_id)
    payload = request.get_json(silent=True) or {}
    name = payload.get("original_filename")
    if item is None:
        return error("not_found", "Media was not found.", 404)
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 255:
        return error("validation_error", "A filename label is required (255 characters max).", 400)
    item.original_filename = name.strip()
    db.session.commit()
    return success(serialize(item))


@bp.delete("/media/<int:item_id>")
@jwt_required()
def delete_media(item_id):
    item = db.session.get(Media, item_id)
    if item is None:
        return error("not_found", "Media was not found.", 404)
    Path(item.path).unlink(missing_ok=True)
    db.session.delete(item)
    db.session.commit()
    return success({"deleted": True})


def register_upload_route(app):
    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)