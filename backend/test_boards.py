import pytest
from fastapi.testclient import TestClient

import db
from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_boards():
    # Each test starts from an empty table so results are deterministic.
    for b in db.list_boards():
        db.delete_board(b["id"])
    yield


SAMPLE_CANVAS = {
    "elements": [
        {"id": "a1", "type": "rectangle", "x": 10, "y": 20, "w": 120, "h": 80,
         "stroke": "#1e293b", "fill": "#ffffff", "label": "Service", "fontSize": 14},
        {"id": "t1", "type": "text", "x": 50, "y": 200, "w": 160, "h": 20,
         "stroke": "#3b82f6", "fill": "#3b82f6", "label": "note\nline two", "fontSize": 16},
    ]
}


def test_boards_start_empty():
    assert client.get("/boards").json() == []


def test_create_persists_full_canvas_and_returns_id():
    r = client.post("/boards", json={"title": "My Board", "category": "HLD", "canvas_data": SAMPLE_CANVAS})
    assert r.status_code == 201
    body = r.json()
    assert body["id"]
    assert body["title"] == "My Board"
    assert body["category"] == "HLD"

    # Reopen: the complete canvas state comes back exactly as saved.
    got = client.get(f"/boards/{body['id']}").json()
    assert got["canvas_data"] == SAMPLE_CANVAS
    assert got["title"] == "My Board"


def test_create_requires_title():
    assert client.post("/boards", json={"canvas_data": SAMPLE_CANVAS}).status_code == 422
    assert client.post("/boards", json={"title": "", "canvas_data": SAMPLE_CANVAS}).status_code == 422


def test_update_edits_in_place_without_duplicates():
    created = client.post("/boards", json={"title": "V1", "canvas_data": {"elements": []}}).json()
    board_id = created["id"]

    updated = client.put(
        f"/boards/{board_id}",
        json={"title": "V2", "category": "LLD", "canvas_data": SAMPLE_CANVAS},
    ).json()

    assert updated["id"] == board_id            # same row, not a new one
    assert updated["title"] == "V2"
    assert updated["created_at"] == created["created_at"]  # creation time preserved
    assert updated["updated_at"] >= created["updated_at"]

    # Still exactly one board, and it holds the edited canvas.
    listing = client.get("/boards").json()
    assert len(listing) == 1
    assert client.get(f"/boards/{board_id}").json()["canvas_data"] == SAMPLE_CANVAS


def test_list_orders_newest_first():
    a = client.post("/boards", json={"title": "A", "canvas_data": {}}).json()
    b = client.post("/boards", json={"title": "B", "canvas_data": {}}).json()
    ids = [row["id"] for row in client.get("/boards").json()]
    assert ids[0] == b["id"] and a["id"] in ids


def test_delete_removes_board():
    board_id = client.post("/boards", json={"title": "Temp", "canvas_data": {}}).json()["id"]
    assert client.delete(f"/boards/{board_id}").status_code == 204
    assert client.get(f"/boards/{board_id}").status_code == 404
    assert client.get("/boards").json() == []


def test_missing_board_returns_404():
    assert client.get("/boards/does-not-exist").status_code == 404
    assert client.put("/boards/nope", json={"title": "X", "canvas_data": {}}).status_code == 404
    assert client.delete("/boards/nope").status_code == 404
