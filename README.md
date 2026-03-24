# Welcome to Optimising Data Centre Placement

## Getting started

1. Open **Docker** on your device
2. Run `docker compose up` (use `docker compose up --build` if dependencies changed)

## Local development (without Docker)

Backend (from `backend/`):
- `python -m venv .venv`
- `source .venv/bin/activate` (macOS/Linux) or `.venv\Scripts\activate` (Windows)
- `pip install -r requirements.txt`
- `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

Frontend (from `frontend/`):
- `npm install`
- `npm run dev`

Open http://localhost:5173 (frontend) and http://localhost:8000 (backend API).

---

## Further Reading

See [ARCHITECTURE.MD](docs/ARCHITECTURE.MD) for a breakdown of the structure of the application.

See [CICD.MD](docs/CICD.MD) for an outline of testing and deployment services.

See [REQUIREMENTS.MD](docs/REQUIREMENTS.MD) for our product requirements document.
