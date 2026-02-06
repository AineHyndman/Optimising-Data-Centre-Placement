# CI/CD

## Overview
This repository uses GitLab CI for continuous integration. The current pipeline focuses on linting and code-quality checks for the frontend and backend. Deployment stages are declared but not enabled.

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
