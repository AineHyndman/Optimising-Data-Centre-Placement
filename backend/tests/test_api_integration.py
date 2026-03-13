"""
Integration tests for the FastAPI routes.

Tests the HTTP layer: request parsing, response models, and error handling.
Note: /run-plan and /optimize are not tested here as they have a known
signature mismatch with SimulationEngine.fast_forward() that needs to be
addressed separately.
"""

import io
import json
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from main import app
    return TestClient(app)


# --- GET / ---

def test_health_check_returns_200(client):
    response = client.get("/")
    assert response.status_code == 200


def test_health_check_returns_expected_body(client):
    response = client.get("/")
    assert response.json() == {"Hello": "World"}


# --- POST /upload-plan ---

def test_upload_plan_invalid_json_returns_400(client):
    bad_content = b"this is not valid json {"
    response = client.post(
        "/upload-plan",
        files={"file": ("plan.json", io.BytesIO(bad_content), "application/json")},
    )
    assert response.status_code == 400


def test_upload_plan_valid_json_returns_200(client):
    plan = {
        "constraints": {
            "power_budget": 1000,
            "compute_range": {"min": 100.0, "max": 500.0},
            "storage_range": {"min": 100.0, "max": 500.0},
            "ai_range": {"min": 100.0, "max": 500.0},
            "generations": ["2023", "2025"],
        },
        "rack_types": [],
        "cluster_plans": [],
    }
    content = json.dumps(plan).encode()
    response = client.post(
        "/upload-plan",
        files={"file": ("plan.json", io.BytesIO(content), "application/json")},
    )
    assert response.status_code == 200


def test_upload_plan_response_matches_input(client):
    plan = {
        "constraints": {
            "power_budget": 2000,
            "compute_range": {"min": 50.0, "max": 300.0},
            "storage_range": {"min": 50.0, "max": 300.0},
            "ai_range": {"min": 50.0, "max": 300.0},
            "generations": ["2023"],
        },
        "rack_types": [],
        "cluster_plans": [],
    }
    content = json.dumps(plan).encode()
    response = client.post(
        "/upload-plan",
        files={"file": ("plan.json", io.BytesIO(content), "application/json")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["constraints"]["power_budget"] == 2000
    assert body["cluster_plans"] == []


def test_upload_plan_missing_required_fields_returns_422(client):
    incomplete = {"cluster_plans": []}
    content = json.dumps(incomplete).encode()
    response = client.post(
        "/upload-plan",
        files={"file": ("plan.json", io.BytesIO(content), "application/json")},
    )
    assert response.status_code == 422


def test_upload_plan_with_positions_parses_correctly(client):
    plan = {
        "constraints": {
            "power_budget": 1000,
            "compute_range": {"min": 100.0, "max": 500.0},
            "storage_range": {"min": 100.0, "max": 500.0},
            "ai_range": {"min": 100.0, "max": 500.0},
            "generations": ["2023", "2025"],
        },
        "rack_types": [
            {
                "name": "Compute 2025",
                "type": "Compute",
                "color": "blue",
                "generation": 2025,
                "power_need": 10,
                "resources": {"compute": 1.0, "storage": 0.0, "ai": 0.0},
            }
        ],
        "cluster_plans": [
            {
                "datacenter": "DC-1",
                "positions": [
                    {"rack_type": "c25", "row": "0", "position": "0"},
                    {"rack_type": "empty", "row": "0", "position": "1"},
                ],
            }
        ],
    }
    content = json.dumps(plan).encode()
    response = client.post(
        "/upload-plan",
        files={"file": ("plan.json", io.BytesIO(content), "application/json")},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["cluster_plans"][0]["positions"]) == 2
