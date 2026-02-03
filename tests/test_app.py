import copy
import pytest
from fastapi.testclient import TestClient
from src.app import app, activities


@pytest.fixture
def client():
    # Preserve original activities state and restore after each test
    original = copy.deepcopy(activities)
    with TestClient(app) as c:
        yield c
    activities.clear()
    activities.update(copy.deepcopy(original))


def test_root_redirect(client):
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code == 307
    assert resp.headers["location"] == "/static/index.html"


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert "michael@mergington.edu" in data["Chess Club"]["participants"]


def test_signup_success(client):
    email = "test_user@example.com"
    resp = client.post("/activities/Chess%20Club/signup", params={"email": email})
    assert resp.status_code == 200
    assert email in activities["Chess Club"]["participants"]
    assert resp.json()["message"] == f"Signed up {email} for Chess Club"


def test_signup_duplicate(client):
    resp = client.post("/activities/Chess%20Club/signup", params={"email": "michael@mergington.edu"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Student already signed up"


def test_signup_activity_not_found(client):
    resp = client.post("/activities/Nonexistent/signup", params={"email": "someone@example.com"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Activity not found"


def test_remove_participant_success(client):
    email = "remove_me@example.com"
    activities["Chess Club"]["participants"].append(email)
    resp = client.delete("/activities/Chess%20Club/participants", params={"email": email})
    assert resp.status_code == 200
    assert email not in activities["Chess Club"]["participants"]
    assert resp.json()["message"] == f"Removed {email} from Chess Club"


def test_remove_participant_not_found(client):
    resp = client.delete("/activities/Chess%20Club/participants", params={"email": "notfound@example.com"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Participant not found"


def test_remove_activity_not_found(client):
    resp = client.delete("/activities/Nonexistent/participants", params={"email": "x@y.com"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Activity not found"
