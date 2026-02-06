# CI/CD

## Overview
This repository uses GitLab CI for continuous integration. The current pipeline focuses on linting and code-quality checks for the frontend and backend. Deployment stages are declared but not enabled.

## Rationale
The current CI/CD shape is intentionally lightweight to deliver quick feedback while keeping risk low:

- **Fast signal on every change:** Linting and code-quality checks catch regressions early without slowing the team down.
- **Consistent standards:** Centralized checks enforce formatting and basic quality across both services.
- **Low operational overhead:** Limited stages reduce maintenance while the project is still evolving.
- **Clear path to expand:** Declared build/test/deploy stages make it straightforward to add automation when needed.

## Pipeline Stages
Active stages in `.gitlab-ci.yml`:

- `lint`
- `quality`
- `build` (declared but no jobs yet)
- `test` (declared but no jobs yet)

Additional stages are listed but commented out (deploy and other environments).

## Jobs

### Frontend Lint
- Job: `run_frontend_lint`
- Stage: `lint`
- Image: `node:20-alpine`
- Tags: `docker`
- Steps:
  - `cd frontend`
  - `npm install`
  - `npm run lint`

### Backend Lint
- Job: `run_backend_lint`
- Stage: `lint`
- Image: `python:3.11-slim`
- Tags: `docker`
- Steps:
  - `cd backend`
  - `python -m pip install --no-cache-dir -r requirements.txt`
  - `python test_app.py`

### Code Quality
- Job: `code_quality`
- Stage: `quality`
- Image: `python:3.11-slim`
- Tags: `docker`
- Tools: `black`, `isort`
- Steps:
  - Install tools
  - `cd backend`
  - `isort --check-only .`
  - `black --check .`
- Note: `allow_failure: true` (non-blocking)

## Security and Templates
The GitLab Auto DevOps include is present but commented out. A SAST job placeholder is also commented out. No security scans are currently enabled.
