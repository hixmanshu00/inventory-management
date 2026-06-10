def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_stats_aggregates(client):
    customer = client.post(
        "/customers", json={"full_name": "S", "email": "s@example.com", "phone": None}
    ).json()
    low = client.post(
        "/products",
        json={"name": "Low", "sku": "LOW-1", "price": "5.00", "quantity_in_stock": 2},
    ).json()
    client.post(
        "/products",
        json={"name": "High", "sku": "HIGH-1", "price": "5.00", "quantity_in_stock": 500},
    )
    client.post(
        "/orders",
        json={"customer_id": customer["id"], "items": [{"product_id": low["id"], "quantity": 1}]},
    )

    stats = client.get("/stats").json()
    assert stats["total_products"] == 2
    assert stats["total_customers"] == 1
    assert stats["total_orders"] == 1
    assert stats["total_revenue"] == "5.00"
    low_skus = {p["sku"] for p in stats["low_stock_products"]}
    assert "LOW-1" in low_skus
    assert "HIGH-1" not in low_skus
