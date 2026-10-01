import getpass
import re
from pathlib import Path

import click
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException

from config import BASE_DIR, Config
from extensions import bcrypt, db, jwt, migrate
from models import About, User
from routes import auth, contact, content, media
from routes.common import error, success


load_dotenv(BASE_DIR / ".env")


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})

    app.register_blueprint(auth.bp)
    app.register_blueprint(content.bp, url_prefix="")
    app.register_blueprint(contact.bp)
    app.register_blueprint(media.bp)
    media.register_upload_route(app)

    @app.get("/")
    def index():
        return success({"name": "Portfolio CMS API", "health": "/api/health"})

    @app.get("/api/health")
    def health():
        db.session.execute(db.text("SELECT 1"))
        return success({"status": "ok", "database": "connected"})

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(exception):
        db.session.rollback()
        return error("conflict", "That record conflicts with existing data.", 409)

    @app.errorhandler(HTTPException)
    def handle_http_error(exception):
        return error(exception.name.lower().replace(" ", "_"), exception.description, exception.code)

    @app.errorhandler(Exception)
    def handle_unexpected_error(exception):
        app.logger.exception("Unhandled application error", exc_info=exception)
        return error("internal_error", "An unexpected server error occurred.", 500)

    @jwt.unauthorized_loader
    def missing_token(_reason):
        return error("unauthorized", "Authentication is required.", 401)

    @jwt.invalid_token_loader
    def invalid_token(_reason):
        return error("invalid_token", "The authentication token is invalid.", 401)

    @jwt.expired_token_loader
    def expired_token(_header, _payload):
        return error("token_expired", "The authentication token has expired.", 401)

    @app.cli.command("init-db")
    def init_db():
        db.create_all()
        about = db.session.get(About, 1)
        if about is None:
            db.session.add(About(id=1, data={
                "name": "Your Name",
                "headline": "Add your professional focus",
                "bio": "Replace this placeholder with a short introduction in the CMS.",
                "email": "",
                "location": "",
            }))
            db.session.commit()
        starter_entries = {
            "skills": [
                ("Add a skill", "Replace this starter entry with a skill you want to highlight.", {"category": "Starter content"}),
            ],
            "projects": [
                ("Your first project", "Replace this starter entry with a project you want to feature.", {"category": "Starter content", "image_url": ""}),
            ],
            "blogs": [
                ("A note in your own words", "Replace this starter entry with a post or remove it.", {"category": "Starter content"}),
            ],
            "experience": [
                ("Add an experience", "Replace this starter entry with a role, study, or project milestone.", {"period": "Add dates", "organization": "Add an organization", "description": "Starter content: replace or remove this entry."}),
            ],
            "testimonials": [
                ("Add a testimonial", "Starter content: replace this with an approved quote or remove it.", {"role": "Add attribution"}),
            ],
            "services": [
                ("Add a service", "Replace this starter entry with a way you would like to collaborate.", {"category": "Starter content"}),
            ],
        }
        for resource_name, entries in starter_entries.items():
            model = content.RESOURCES[resource_name]
            if model.query.count() == 0:
                for title, summary, data in entries:
                    db.session.add(model(
                        title=title,
                        slug=content.slugify(title),
                        summary=summary,
                        data=data,
                        is_published=True,
                    ))
        db.session.commit()
        click.echo("Database tables are ready. Starter entries are labeled and editable in the CMS.")

    @app.cli.command("create-admin")
    @click.option("--email", prompt=True)
    def create_admin(email):
        email = email.strip().lower()
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            raise click.ClickException("Enter a valid email address.")
        if User.query.filter_by(email=email).first():
            raise click.ClickException("An account with this email already exists.")
        password = getpass.getpass("Admin password (12+ characters): ")
        confirmation = getpass.getpass("Confirm password: ")
        if len(password) < 12 or password != confirmation:
            raise click.ClickException("Passwords must match and be at least 12 characters.")
        user = User(email=email, password_hash=bcrypt.generate_password_hash(password).decode("utf-8"))
        db.session.add(user)
        db.session.commit()
        click.echo(f"Admin account created for {email}.")

    return app


app = create_app()