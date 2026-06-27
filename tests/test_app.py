import uuid

from fastapi.testclient import TestClient

from src import app as app_module


client = TestClient(app_module.app)


def test_activities_endpoint_prevents_browser_caching():
    response = client.get("/activities")

    assert response.status_code == 200
    assert "no-store" in response.headers.get("cache-control", "").lower()


def test_signup_updates_activity_participants_immediately():
    activity_name = "Chess Club"
    email = f"test-{uuid.uuid4().hex}@mergington.edu"

    signup_response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    assert signup_response.status_code == 200

    activities_response = client.get("/activities")
    assert activities_response.status_code == 200
    assert email in activities_response.json()[activity_name]["participants"]

    cleanup_response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )
    assert cleanup_response.status_code == 200
