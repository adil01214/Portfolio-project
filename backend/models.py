from datetime import datetime, timezone

from extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(254), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="admin")
    is_active = db.Column(db.Boolean, nullable=False, default=True)


class About(TimestampMixin, db.Model):
    __tablename__ = "about"

    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.JSON, nullable=False, default=dict)


class ContentMixin(TimestampMixin):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    slug = db.Column(db.String(180), nullable=False, unique=True, index=True)
    summary = db.Column(db.String(500), nullable=False, default="")
    data = db.Column(db.JSON, nullable=False, default=dict)
    is_published = db.Column(db.Boolean, nullable=False, default=True, index=True)


class Skill(ContentMixin, db.Model):
    __tablename__ = "skills"


class Project(ContentMixin, db.Model):
    __tablename__ = "projects"


class Blog(ContentMixin, db.Model):
    __tablename__ = "blogs"


class Experience(ContentMixin, db.Model):
    __tablename__ = "experience"


class Testimonial(ContentMixin, db.Model):
    __tablename__ = "testimonials"


class Service(ContentMixin, db.Model):
    __tablename__ = "services"


class Message(TimestampMixin, db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(254), nullable=False, index=True)
    subject = db.Column(db.String(180), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="new", index=True)


class Media(TimestampMixin, db.Model):
    __tablename__ = "media"

    id = db.Column(db.Integer, primary_key=True)
    original_filename = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255), unique=True, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    size = db.Column(db.Integer, nullable=False)
    path = db.Column(db.String(500), nullable=False)