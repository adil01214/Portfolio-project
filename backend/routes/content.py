import re
import unicodedata

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, verify_jwt_in_request

from extensions import db
from models import About, Blog, Experience, Project, Service, Skill, Testimonial
from routes.common import error, success


bp = Blueprint("content", __name__)
RESOURCES = {
    "skills": Skill,
    "projects": Project,
    "blogs": Blog,
    "experience": Experience,
    "testimonials": Testimonial,
    "services": Service,
}


def slugify(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"-+", "-", re.sub(r"[^a-zA-Z0-9]+", "-", value.lower())).strip("-")


def serialize(item):
    return {
        "id": item.id,
        "title": item.title,
        "slug": item.slug,
        "summary": item.summary,
        "data": item.data or {},
        "is_published": item.is_published,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def validate_payload(model, payload, current_item=None):
    if not isinstance(payload, dict):
        return None, error("validation_error", "A JSON object is required.", 400)
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip() or len(title.strip()) > 160:
        return None, error("validation_error", "Title is required (160 characters max).", 400)
    data = payload.get("data", {})
    summary = payload.get("summary", "")
    published = payload.get("is_published", True)
    if not isinstance(data, dict):
        return None, error("validation_error", "Data must be a JSON object.", 400)
    if not isinstance(summary, str) or len(summary) > 500:
        return None, error("validation_error", "Summary must be 500 characters or fewer.", 400)
    if not isinstance(published, bool):
        return None, error("validation_error", "is_published must be a boolean.", 400)
    slug = payload.get("slug") or slugify(title)
    if not isinstance(slug, str) or not slug.strip() or len(slug.strip()) > 180:
        return None, error("validation_error", "A valid slug is required.", 400)
    slug = slug.strip()
    existing = model.query.filter_by(slug=slug).first()
    if existing is not None and existing.id != getattr(current_item, "id", None):
        return None, error("duplicate_slug", "That slug is already in use.", 409)
    return {
        "title": title.strip(),
        "slug": slug,
        "summary": summary.strip(),
        "data": data,
        "is_published": published,
    }, None


@bp.get("/about")
def get_about():
    about = db.session.get(About, 1)
    return success(about.data if about else {})


@bp.put("/about")
@jwt_required()
def put_about():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("validation_error", "A JSON object is required.", 400)
    content = payload.get("data", payload)
    if not isinstance(content, dict):
        return error("validation_error", "About content must be a JSON object.", 400)
    about = db.session.get(About, 1)
    if about is None:
        about = About(id=1, data=content)
        db.session.add(about)
    else:
        about.data = content
    db.session.commit()
    return success(about.data)


def register_collection(resource, model):
    def list_items():
        query = model.query
        if request.args.get("all") == "1":
            verify_jwt_in_request()
        else:
            query = query.filter_by(is_published=True)
        items = query.order_by(model.id.desc()).limit(200).all()
        return success([serialize(item) for item in items])

    @jwt_required()
    def create_item():
        payload = request.get_json(silent=True)
        values, response = validate_payload(model, payload)
        if response:
            return response
        item = model(**values)
        db.session.add(item)
        db.session.commit()
        return success(serialize(item), 201)

    @jwt_required()
    def update_item(item_id):
        item = db.session.get(model, item_id)
        if item is None:
            return error("not_found", "Content was not found.", 404)
        values, response = validate_payload(model, request.get_json(silent=True), item)
        if response:
            return response
        for key, value in values.items():
            setattr(item, key, value)
        db.session.commit()
        return success(serialize(item))

    @jwt_required()
    def delete_item(item_id):
        item = db.session.get(model, item_id)
        if item is None:
            return error("not_found", "Content was not found.", 404)
        db.session.delete(item)
        db.session.commit()
        return success({"deleted": True})

    bp.add_url_rule(f"/{resource}", f"list_{resource}", list_items, methods=["GET"])
    bp.add_url_rule(f"/{resource}", f"create_{resource}", create_item, methods=["POST"])
    bp.add_url_rule(f"/{resource}/<int:item_id>", f"update_{resource}", update_item, methods=["PUT"])
    bp.add_url_rule(f"/{resource}/<int:item_id>", f"delete_{resource}", delete_item, methods=["DELETE"])


for resource_name, resource_model in RESOURCES.items():
    register_collection(resource_name, resource_model)