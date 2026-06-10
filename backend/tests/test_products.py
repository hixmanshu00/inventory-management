def _product_payload(**overrides):
    payload = {
        "name": "Widget",
        "sku": "WID-001",
        "price": "12.50",
        "quantity_in_stock": 100,
    }
    payload.update(overrides)
    return payload


def test_create_product_returns_201(client):
    resp = client.post("/products", json=_product_payload())
    assert resp.status_code == 201
    body = resp.json()
    assert body["sku"] == "WID-001"
    assert body["id"] > 0


def test_duplicate_sku_returns_409(client):
    client.post("/products", json=_product_payload())
    resp = client.post("/products", json=_product_payload(name="Other"))
    assert resp.status_code == 409
    assert resp.json()["code"] == "conflict"
    assert "WID-001" in resp.json()["detail"]


def test_non_positive_price_returns_422(client):
    resp = client.post("/products", json=_product_payload(price="0"))
    assert resp.status_code == 422


def test_negative_stock_returns_422(client):
    resp = client.post("/products", json=_product_payload(quantity_in_stock=-1))
    assert resp.status_code == 422


def test_extra_field_is_rejected_422(client):
    resp = client.post("/products", json=_product_payload(surprise="nope"))
    assert resp.status_code == 422


def test_get_missing_product_returns_404(client):
    resp = client.get("/products/999")
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


def test_update_product(client):
    created = client.post("/products", json=_product_payload()).json()
    resp = client.put(
        f"/products/{created['id']}",
        json=_product_payload(price="19.99", quantity_in_stock=50),
    )
    assert resp.status_code == 200
    assert resp.json()["price"] == "19.99"
    assert resp.json()["quantity_in_stock"] == 50


def test_delete_product_returns_204(client):
    created = client.post("/products", json=_product_payload()).json()
    resp = client.delete(f"/products/{created['id']}")
    assert resp.status_code == 204
    assert client.get(f"/products/{created['id']}").status_code == 404
