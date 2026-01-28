# Welcome to Optimising Data Centre Placement

## Getting started

1. To get started, open **Docker** on your device
2. Run either:

*   **docker compose up** for general startup. This starts the containers. It will only build the images if they do not already exist

*   **docker compose up --build** if you add a new Python or Node library, to ensure the container installs the new dependency. This forces Docker to check for changes in your requirements.txt, package.json, or Dockerfiles and rebuild the images before starting

### 1. Project Architecture
I split the codebase into two distinct directories under one root folder:
*   **Frontend:** A React application using TypeScript and Vite (a modern build tool).
*   **Backend:** A Python API using FastAPI (a high-performance web framework).

### 2. Containerisation (Docker)
Instead of forcing a developer to install Node.js and Python manually on their machine, I "dockerised" the application.
*   I created a **Dockerfile** for the frontend to install dependencies and run the development server.
*   I created a **Dockerfile** for the backend to install Python requirements and run the API server.

### 3. Orchestration and Workflow
I used **Docker Compose** to manage both services simultaneously. This provides two massive benefits:
*   **Unified Start:** Running `docker compose up` starts both the frontend and backend with a single command.
*   **Hot Reloading:** You configured "volumes," which sync your local code folder with the container. This ensures that when you save a file in your text editor, the running app updates immediately without needing to restart the containers.

## Local development (without Docker)

If you prefer running services natively for debugging or faster iteration (I don't recommend):

Backend:
- cd into `backend`
- Create and activate a virtualenv:
  - `python -m venv .venv`
  - macOS / Linux (bash or zsh): `source .venv/bin/activate`
  - Windows PowerShell: `.\.venv\Scripts\Activate.ps1`
  - Windows (Command Prompt): `.\.venv\Scripts\activate.bat`
- Install dependencies:
  - `pip install -r requirements.txt`
- Run the API (uvicorn):
  - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

Frontend:
- cd into `frontend`
- Install packages:
  - `npm install` (or `pnpm`/`yarn` if you prefer)
- Run Vite dev server:
  - `npm run dev`
- Open the app at: http://localhost:5173

---

## Ports & common endpoints

- Frontend: 5173
- Backend: 8000
- FastAPI docs (interactive): `/docs` (e.g. http://localhost:8000/docs)
- Health / root endpoint: `/` (returns a small JSON payload from `backend/main.py`)

---

## Volumes, hot reload and notes about `node_modules`

- The `./backend:/app` and `./frontend:/app` volumes in `docker-compose.yml` sync your host code into the containers so changes are picked up immediately (hot reload).
- The `- /app/node_modules` entry in the frontend service prevents the host `node_modules` directory from overwriting the container's `node_modules`. Keep this to avoid platform-specific binary issues and missing native modules.
- `WATCHFILES_FORCE_POLLING=true` is set for the backend to help file change detection in some Docker + host filesystem setups (especially macOS / WSL).

---

## Adding dependencies

- Backend (Python): add to `backend/requirements.in`, then run `pip-compile backend/requirements.in --output-file=backend/requirements.txt` to generate the locked `requirements.txt`. (Alternatively, use `backend/compile_requirements.sh`.) Then rebuild the backend image or run `docker compose up --build` so the container installs the new dependencies.
- Frontend (Node): add via `npm install <pkg>` (or modify `frontend/package.json`) and then rebuild the frontend image or run `docker compose up --build`.

Note: If you're running services locally (not in Docker), just install dependencies in the appropriate local environment and restart the dev server.

---

## Useful files & locations

- `docker-compose.yml` — Compose orchestration and ports/volumes
- `frontend/Dockerfile` — Frontend container build
- `frontend/README.md` — Vite + React + TypeScript notes and ESLint guidance
- `frontend/package.json`, `vite.config.ts` — Frontend config & scripts
- `backend/Dockerfile` — Backend container build
- `backend/main.py` — FastAPI app entrypoint
- `backend/requirements.txt` — Python dependencies
- `.gitlab-ci.yml` — GitLab CI template currently included at repo root

---
