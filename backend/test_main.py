from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def post(nodes, edges):
    return client.post("/pipelines/parse", json={"nodes": nodes, "edges": edges})


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_dag_ok():
    r = post([{"id": "a"}, {"id": "b"}], [{"source": "a", "target": "b"}])
    assert r.json() == {"num_nodes": 2, "num_edges": 1, "is_dag": True}


def test_cycle():
    r = post([{"id": "a"}, {"id": "b"}], [{"source": "a", "target": "b"}, {"source": "b", "target": "a"}])
    assert r.json()["is_dag"] is False


def test_self_loop():
    assert post([{"id": "a"}], [{"source": "a", "target": "a"}]).json()["is_dag"] is False


def test_empty_pipeline():
    assert post([], []).json() == {"num_nodes": 0, "num_edges": 0, "is_dag": True}


def test_missing_id_is_422_not_500():
    assert post([{"name": "x"}], []).status_code == 422


def test_cors_allows_configured_origin():
    r = client.options(
        "/pipelines/parse",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
