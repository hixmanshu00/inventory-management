def _customer_payload(**overrides):
    payload = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+1-555-0100",
    }
    payload.update(overrides)
    return payload


def test_create_customer_returns_201(client):
    resp = client.post("/customers", json=_customer_payload())
    assert resp.status_code == 201
    assert resp.json()["email"] == "jane@example.com"


def test_duplicate_email_returns_409(client):
    client.post("/customers", json=_customer_payload())
    resp = client.post("/customers", json=_customer_payload(full_name="Other Jane"))
    assert resp.status_code == 409
    assert resp.json()["code"] == "conflict"


def test_invalid_email_returns_422(client):
    resp = client.post("/customers", json=_customer_payload(email="not-an-email"))
    assert resp.status_code == 422


def test_empty_name_returns_422(client):
    resp = client.post("/customers", json=_customer_payload(full_name=""))
    assert resp.status_code == 422


def test_delete_customer_returns_204(client):
    created = client.post("/customers", json=_customer_payload()).json()
    assert client.delete(f"/customers/{created['id']}").status_code == 204
    assert client.get(f"/customers/{created['id']}").status_code == 404
