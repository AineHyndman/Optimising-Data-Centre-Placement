# Welcome to Optimising Data Centre Placement

## Documentation

- `ARCHITECTURE.MD`
- `CICD.MD`

## Getting started

1. Open **Docker** on your device
2. Run `docker compose up` (use `docker compose up --build` if dependencies changed)

## Local development (without Docker)

Backend:
- `python -m venv .venv`
- activate the virtualenv
- `pip install -r requirements.txt`
- `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

Frontend:
- `npm install`
- `npm run dev`
- Open http://localhost:5173

---

## Ports & common endpoints

- Frontend: 5173
- Backend: 8000
- FastAPI docs (interactive): `/docs` (e.g. http://localhost:8000/docs)
- Health / root endpoint: `/` (returns a small JSON payload from `backend/main.py`)

---

## Useful files & locations

- `ARCHITECTURE.MD` — Detailed system architecture
- `CICD.MD` — CI/CD pipeline details
- `docker-compose.yml` — Compose orchestration and ports/volumes
- `frontend/Dockerfile` — Frontend container build
- `frontend/README.md` — Vite + React + TypeScript notes and ESLint guidance
- `frontend/package.json`, `vite.config.ts` — Frontend config & scripts
- `backend/Dockerfile` — Backend container build
- `backend/main.py` — FastAPI app entrypoint
- `backend/requirements.txt` — Python dependencies
- `.gitlab-ci.yml` — GitLab CI pipeline configuration
