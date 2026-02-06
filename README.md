# Welcome to Optimising Data Centre Placement

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

## Further Reading

See 'ARCHITECTURE.MD' for a breakdown of the structure of the application
SEE 'CICD.MD' for an outline of testing and deployment services
