import threading

from app.models.product import Product


def _make_customer(client, email="buyer@example.com"):
    return client.post(
        "/customers", json={"full_name": "Buyer", "email": email, "phone": None}
    ).json()


def _make_product(client, sku="SKU-1", price="10.00", stock=10):
    return client.post(
        "/products",
        json={"name": f"Product {sku}", "sku": sku, "price": price, "quantity_in_stock": stock},
    ).json()


def test_order_computes_total_server_side(client):
    customer = _make_customer(client)
    p1 = _make_product(client, sku="A", price="10.00", stock=5)
    p2 = _make_product(client, sku="B", price="2.50", stock=20)

    resp = client.post(
        "/orders",
        json={
            "customer_id": customer["id"],
            "items": [
                {"product_id": p1["id"], "quantity": 2},  # 20.00
                {"product_id": p2["id"], "quantity": 4},  # 10.00
            ],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["total_amount"] == "30.00"
    # unit prices are snapshotted from the product at order time
    assert {i["unit_price"] for i in body["items"]} == {"10.00", "2.50"}


def test_client_cannot_inject_total(client):
    customer = _make_customer(client)
    product = _make_product(client, sku="C", price="10.00", stock=5)
    resp = client.post(
        "/orders",
        json={
            "customer_id": customer["id"],
            "total_amount": "0.01",  # not an allowed field
            "items": [{"product_id": product["id"], "quantity": 1}],
        },
    )
    assert resp.status_code == 422


def test_stock_is_decremented(client, db):
    customer = _make_customer(client)
    product = _make_product(client, sku="D", price="5.00", stock=10)

    client.post(
        "/orders",
        json={"customer_id": customer["id"], "items": [{"product_id": product["id"], "quantity": 3}]},
    )

    refreshed = db.get(Product, product["id"])
    assert refreshed.quantity_in_stock == 7


def test_insufficient_stock_rejects_whole_order(client, db):
    customer = _make_customer(client)
    ok = _make_product(client, sku="E-OK", price="5.00", stock=10)
    short = _make_product(client, sku="E-SHORT", price="5.00", stock=1)

    resp = client.post(
        "/orders",
        json={
            "customer_id": customer["id"],
            "items": [
                {"product_id": ok["id"], "quantity": 2},
                {"product_id": short["id"], "quantity": 5},  # only 1 available
            ],
        },
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "insufficient_stock"
    assert resp.json()["product_id"] == str(short["id"])

    # The whole order was rejected: the OK product's stock is untouched and no
    # order was created.
    assert db.get(Product, ok["id"]).quantity_in_stock == 10
    assert client.get("/orders").json() == []


def test_order_for_missing_product_returns_404(client):
    customer = _make_customer(client)
    resp = client.post(
        "/orders",
        json={"customer_id": customer["id"], "items": [{"product_id": 9999, "quantity": 1}]},
    )
    assert resp.status_code == 404


def test_order_for_missing_customer_returns_404(client):
    product = _make_product(client, sku="F", stock=5)
    resp = client.post(
        "/orders",
        json={"customer_id": 9999, "items": [{"product_id": product["id"], "quantity": 1}]},
    )
    assert resp.status_code == 404


def test_delete_order_restores_stock(client, db):
    customer = _make_customer(client)
    product = _make_product(client, sku="G", price="5.00", stock=10)
    order = client.post(
        "/orders",
        json={"customer_id": customer["id"], "items": [{"product_id": product["id"], "quantity": 4}]},
    ).json()

    assert db.get(Product, product["id"]).quantity_in_stock == 6

    assert client.delete(f"/orders/{order['id']}").status_code == 204

    db.expire_all()
    assert db.get(Product, product["id"]).quantity_in_stock == 10  # restored
    assert client.get(f"/orders/{order['id']}").status_code == 404


def test_concurrent_orders_do_not_oversell(client):
    """Two orders racing for the last unit: exactly one wins, never both.

    Exercises the SELECT ... FOR UPDATE row lock in OrderService.create. Without
    it, both transactions could read stock=1 and oversell.
    """
    customer = _make_customer(client)
    product = _make_product(client, sku="RACE", price="5.00", stock=1)

    results = []
    barrier = threading.Barrier(2)

    def place_order():
        barrier.wait()  # maximise overlap
        r = client.post(
            "/orders",
            json={
                "customer_id": customer["id"],
                "items": [{"product_id": product["id"], "quantity": 1}],
            },
        )
        results.append(r.status_code)

    threads = [threading.Thread(target=place_order) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sorted(results) == [201, 409]
    assert client.get(f"/products/{product['id']}").json()["quantity_in_stock"] == 0
