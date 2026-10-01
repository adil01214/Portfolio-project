from io import BytesIO
from unittest.mock import patch

import pytest

from app import create_app
from extensions import bcrypt, db
from models import User


RESOURCES = ("skills", "projects", "blogs", "experience", "testimonials", "services")


@pytest.fixture
def client(tmp_path):
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "JWT_SECRET_KEY": "test-secret-key-that-is-at-least-thirty-two-bytes",
        "SECRET_KEY": "test-flask-secret-key-that-is-at-least-thirty-two-bytes",
        "UPLOAD_FOLDER": str(tmp_path),
        "CORS_ORIGINS": ["http://localhost:5173", "http://localhost:5174"],
    })
    with app.app_context():
        db.create_all()
        db.session.add(User(
            email="admin@example.test",
            password_hash=bcrypt.generate_password_hash("correct-horse-battery").decode("utf-8"),
        ))
        db.session.commit()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


@pytest.fixture
def tokens(client):
    response = client.post("/auth/login", json={
        "email": "admin@example.test", "password": "correct-horse-battery",
    })
    assert response.status_code == 200
    return response.get_json()["data"]


@pytest.mark.parametrize("resource", RESOURCES)
def test_content_crud_is_protected_and_persists(client, tokens, resource):
    url = f"/{resource}"
    assert client.post(url, json={"title": "Example"}).status_code == 401
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    payload = {
        "title": "Example item",
        "summary": "A test record",
        "data": {"description": "Saved in JSON content."},
    }
    created = client.post(url, json=payload, headers=headers)
    assert created.status_code == 201
    item = created.get_json()["data"]
    assert item["slug"] == "example-item"
    assert client.get(url).get_json()["data"][0]["id"] == item["id"]
    assert client.get(f"{url}?all=1").status_code == 401
    assert client.get(f"{url}?all=1", headers=headers).status_code == 200

    payload.update({"title": "Updated item", "slug": "updated-item"})
    updated = client.put(f"{url}/{item['id']}", json=payload, headers=headers)
    assert updated.status_code == 200
    assert updated.get_json()["data"]["title"] == "Updated item"
    assert client.delete(f"{url}/{item['id']}", headers=headers).status_code == 200
    assert client.get(url).get_json()["data"] == []


def test_login_refresh_and_protected_me(client, tokens):
    assert client.post("/auth/login", json={
        "email": "admin@example.test", "password": "incorrect-password",
    }).status_code == 401
    assert client.get("/auth/me").status_code == 401
    access = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.get("/auth/me", headers=access).get_json()["data"]["email"] == "admin@example.test"
    refreshed = client.post("/auth/refresh", headers={
        "Authorization": f"Bearer {tokens['refresh_token']}"
    })
    assert refreshed.status_code == 200
    assert client.get("/auth/me", headers={
        "Authorization": f"Bearer {refreshed.get_json()['data']['access_token']}"
    }).status_code == 200


def test_about_upsert_and_contact_persistence(client, tokens):
    assert client.get("/about").get_json()["data"] == {}
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.put("/about", json={"data": {"name": "Your Name"}}, headers=headers).status_code == 200
    assert client.get("/about").get_json()["data"]["name"] == "Your Name"
    assert client.post("/contact", json={"name": "A", "email": "bad", "subject": "Hi", "message": "Test"}).status_code == 400
    response = client.post("/contact", json={
        "name": "Site visitor", "email": "visitor@example.test",
        "subject": "Question", "message": "Hello there",
    })
    assert response.status_code == 201
    admin_headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    messages = client.get("/messages", headers=admin_headers).get_json()["data"]
    assert messages[0]["email"] == "visitor@example.test"
    assert client.put(f"/messages/{messages[0]['id']}", json={"status": "read"}, headers=admin_headers).status_code == 200
    assert client.delete(f"/messages/{messages[0]['id']}", headers=admin_headers).status_code == 200


def test_upload_media_crud_and_rejects_mislabeled_file(client, tokens):
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    invalid = client.post("/upload/image", headers=headers, data={
        "file": (BytesIO(b"not really an image"), "photo.png", "image/png"),
    }, content_type="multipart/form-data")
    assert invalid.status_code == 415

    uploaded = client.post("/upload/image", headers=headers, data={
        "file": (BytesIO(b"\x89PNG\r\n\x1a\n" + b"test"), "photo.png", "image/png"),
    }, content_type="multipart/form-data")
    assert uploaded.status_code == 201
    media = uploaded.get_json()["data"]
    assert client.get(media["url"].replace("http://localhost", "")).status_code == 200
    items = client.get("/media", headers=headers).get_json()["data"]
    assert len(items) == 1
    assert client.put(f"/media/{media['id']}", json={"original_filename": "Portrait.png"}, headers=headers).status_code == 200
    assert client.delete(f"/media/{media['id']}", headers=headers).status_code == 200


def test_health_root_and_validation(client):
    assert client.get("/").status_code == 200
    assert client.get("/api/health").get_json()["data"]["database"] == "connected"
    assert client.post("/skills", json={}).status_code == 401


def test_create_admin_cli_hashes_password(client):
    password = "first-admin-test-password"
    with patch("app.getpass.getpass", side_effect=[password, password]):
        result = client.application.test_cli_runner().invoke(
            args=["create-admin", "--email", "first-admin@example.test"]
        )
    assert result.exit_code == 0
    with client.application.app_context():
        user = User.query.filter_by(email="first-admin@example.test").one()
        assert user.password_hash != password
        assert bcrypt.check_password_hash(user.password_hash, password)