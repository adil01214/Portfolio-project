# Portfolio CMS

A CMS-managed portfolio with a Flask REST API, PostgreSQL persistence, a private React admin, and a public React portfolio. Starter records are clearly labeled and can be edited or removed; no personal information is assumed.

## Stack and folders

- `backend/`: Flask, SQLAlchemy, Flask-Migrate, JWT, local image uploads, pytest
- `admin/`: React, Vite, Tailwind CSS, custom CMS
- `frontend/`: React, Vite, Tailwind CSS, public portfolio

## Requirements

Python 3.9+, Node.js 22.12+ (or 20.19+), npm, and PostgreSQL 14+.

## Local setup

1. Create a PostgreSQL database. With a local Homebrew PostgreSQL server and matching role, for example:

   ```sh
   createdb portfolio_cms
   ```

   Set `DATABASE_URL` to the connection string for your local role/database. If that role has no password, `postgresql+psycopg://localhost/portfolio_cms` uses the local socket/current user.

2. Configure the backend. Copy `.env.example` to `backend/.env`, then set a private `JWT_SECRET_KEY` (at least 32 random characters) and the correct `DATABASE_URL`. Do not commit `.env`.

3. Install backend dependencies and initialize tables plus editable starter content:

   ```sh
   cd backend
   python3 -m venv ../.venv
   source ../.venv/bin/activate
   pip install -r requirements.txt
   flask --app app db upgrade
   flask --app app init-db
   flask --app app create-admin
   ```

   `db upgrade` applies the checked-in initial migration; `init-db` seeds only missing, clearly labeled starter records. The admin command securely prompts for an email and password (12 or more characters); passwords are bcrypt-hashed. For schema changes, use `flask --app app db migrate -m "describe change"` then `flask --app app db upgrade`.

4. Start the API from `backend/`:

   ```sh
   flask --app app run --debug --port 5000
   ```

   Check `http://localhost:5000/` and `http://localhost:5000/api/health`.

5. In a second terminal, start the admin:

   ```sh
   cd admin
   npm install
   npm run dev
   ```

   Open `http://localhost:5174` and sign in with the admin account created above.

6. In another terminal, start the public portfolio:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Both Vite apps use `VITE_API_URL` (defaults to `http://127.0.0.1:5000`, avoiding macOS services that may claim IPv6 `localhost:5000`). The admin's external portfolio link uses `VITE_SITE_URL` (defaults to `http://localhost:5173`). Set these in each app's deployment environment.

## API

Responses use `{ "data": ... }` or `{ "error": { "code": ..., "message": ... } }`.

- `GET /`, `GET /api/health`
- `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- `GET /about`, `PUT /about`
- `GET|POST /skills`, `/projects`, `/blogs`, `/experience`, `/testimonials`, `/services`
- `GET|PUT|DELETE /<collection>/<id>` for each content collection; create/update/delete and `?all=1` require admin JWT. Public lists include published entries only.
- `POST /upload/image`, `GET /media`, `PUT|DELETE /media/<id>` (admin JWT); public file URLs are served under `/uploads/<filename>`.
- `POST /contact`; admin inbox uses `GET /messages`, `PUT|DELETE /messages/<id>`.

## Checks

From the repository root:

```sh
.venv/bin/python -m pytest -q backend/tests
npm run build --prefix frontend
npm run build --prefix admin
```

The API tests use isolated SQLite for speed; set up PostgreSQL and use `/api/health` to verify the configured persistent database.

## Deployment

- Deploy `backend/` as a Python web service (Render blueprint at `backend/render.yaml` is included) with PostgreSQL. Set a strong `JWT_SECRET_KEY`, `CORS_ORIGINS` to the exact admin and frontend origins, and initialize/upgrade the database before creating the admin. Local uploads use the service filesystem; Render's ephemeral disk does not preserve uploads across deploys, so attach persistent storage or add object storage before relying on production media persistence.
- Deploy `frontend/` and `admin/` as separate Vercel projects (SPA rewrites are included in each `vercel.json`). Set `VITE_API_URL` on both and `VITE_SITE_URL` on admin. Netlify or another static host can use the `dist/` output and equivalent SPA fallback rules.
- Add the deployed site/admin origins to backend CORS configuration. Never put JWT secrets in either frontend environment.

## Troubleshooting

- `connection refused` or database authentication errors: check PostgreSQL is running, `DATABASE_URL`, and that the database exists for the configured role.
- CORS errors: set `CORS_ORIGINS` to the exact origins including scheme and port, restart Flask, and retry. The local defaults allow both `localhost` and `127.0.0.1` Vite origins.
- Login fails: run `flask --app app create-admin` from `backend/`; an existing email cannot be registered twice.
- Upload rejected: use a real JPG, PNG, GIF, or WebP file smaller than 5 MB. Local uploaded files are ignored by git.