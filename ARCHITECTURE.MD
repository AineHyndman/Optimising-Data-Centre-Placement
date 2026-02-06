# Architecture

Last updated: 04/02/2026, 18:21

## Purpose
This document explains how the application is structured, how the pieces run together, and where to extend the system. It complements `README.md` with deeper architectural context.

## System Overview
The repository contains two primary services managed together:

- Frontend: React + TypeScript, built with Vite.
- Backend: Python FastAPI application.

Both services are containerized and run together via Docker Compose for a consistent developer experience.

## Runtime Topology
When running with Docker Compose, two containers are started:

- `frontend` container
  - Build: `frontend/Dockerfile`
  - Dev server: Vite
  - Port: 5173
- `backend` container
  - Build: `backend/Dockerfile`
  - API server: Uvicorn serving FastAPI
  - Port: 8000

Local code is mounted into each container using volumes so file changes are picked up immediately (hot reload).

## Request and Data Flow
Current flow is simple and minimal:

1. Browser loads the frontend from `http://localhost:5173`.
2. Frontend can call backend endpoints on `http://localhost:8000`.
3. The backend exposes a root health endpoint at `/` that returns a small JSON payload.

There is no persistence layer or external service integration yet.

## Code Structure and Entry Points
Key files that define the application shape:

- `docker-compose.yml`: Orchestrates both services, ports, and volumes.
- `backend/main.py`: FastAPI app entry point and current API routes.
- `frontend/src/main.tsx`: React entry point and root rendering.
- `frontend/src/App.tsx`: Current UI surface.

## Container Build Details

### Backend
- Base image: `python:3.11-slim`
- Dependency installation: `backend/requirements.txt`
- Runtime command: `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

### Frontend
- Base image: `node:20-alpine`
- Dependency installation: `frontend/package.json` and `frontend/package-lock.json`
- Runtime command: `npm run dev -- --host`

## Development Workflow

### Docker-based (recommended)
- `docker compose up` starts both services with hot reload.
- `docker compose up --build` rebuilds images when dependencies change.

### Local (non-Docker)
- Backend can be started with a local virtualenv and `uvicorn`.
- Frontend can be started with `npm run dev`.

The README covers exact command sequences.

## Architecture Constraints and Notes
- The repository currently favors a simple, two-service layout.
- Environment configuration is minimal and defined in `docker-compose.yml`.
- Hot reload relies on bind mounts; keep them in place for fast iteration.
