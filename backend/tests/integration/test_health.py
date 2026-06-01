def test_health_returns_ok(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_reuses_request_id_header(client):
    response = client.get("/health", headers={"X-Request-ID": "test-request-id"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "test-request-id"


def test_ready_returns_ok_when_database_is_available(client, monkeypatch):
    monkeypatch.setattr("app.api.v1.endpoints.health.check_database_ready", lambda: True)

    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "available"}


def test_ready_returns_503_when_database_is_unavailable(client, monkeypatch):
    monkeypatch.setattr("app.api.v1.endpoints.health.check_database_ready", lambda: False)

    response = client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {"status": "not_ready", "database": "unavailable"}


def test_metrics_returns_prometheus_output(client):
    response = client.get("/metrics")

    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
