from decimal import Decimal


def test_create_order_calculates_total_and_reduces_stock(client, create_customer_api, create_product_api):
    customer = create_customer_api(email="order-customer@example.com")
    product = create_product_api(sku="ORDER-PRODUCT-001", price="12.50", quantity_in_stock=10)

    response = client.post(
        "/api/v1/orders",
        json={
            "customer_id": customer["id"],
            "items": [{"product_id": product["id"], "quantity": 3}],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["customer_id"] == customer["id"]
    assert body["status"] == "PLACED"
    assert Decimal(body["total_amount"]) == Decimal("37.50")
    assert len(body["items"]) == 1
    assert body["items"][0]["product_id"] == product["id"]
    assert body["items"][0]["quantity"] == 3
    assert Decimal(body["items"][0]["unit_price"]) == Decimal("12.50")
    assert Decimal(body["items"][0]["line_total"]) == Decimal("37.50")

    product_response = client.get(f"/api/v1/products/{product['id']}")
    assert product_response.json()["quantity_in_stock"] == 7


def test_list_and_get_order(client, create_customer_api, create_product_api, create_order_api):
    customer = create_customer_api(email="order-list@example.com")
    product = create_product_api(sku="ORDER-LIST-001")
    created_order = create_order_api(customer_id=customer["id"], product_id=product["id"])

    list_response = client.get("/api/v1/orders")
    get_response = client.get(f"/api/v1/orders/{created_order['id']}")

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert get_response.status_code == 200
    assert get_response.json()["id"] == created_order["id"]


def test_create_order_missing_customer_returns_404(client, create_product_api):
    product = create_product_api(sku="ORDER-MISSING-CUSTOMER")

    response = client.post(
        "/api/v1/orders",
        json={
            "customer_id": 999,
            "items": [{"product_id": product["id"], "quantity": 1}],
        },
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"


def test_create_order_missing_product_returns_404(client, create_customer_api):
    customer = create_customer_api(email="missing-product@example.com")

    response = client.post(
        "/api/v1/orders",
        json={
            "customer_id": customer["id"],
            "items": [{"product_id": 999, "quantity": 1}],
        },
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_create_order_quantity_must_be_positive(client, create_customer_api, create_product_api):
    customer = create_customer_api(email="quantity-check@example.com")
    product = create_product_api(sku="ORDER-QUANTITY-001")

    response = client.post(
        "/api/v1/orders",
        json={
            "customer_id": customer["id"],
            "items": [{"product_id": product["id"], "quantity": 0}],
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_order_rejects_duplicate_product_ids(client, create_customer_api, create_product_api):
    customer = create_customer_api(email="duplicate-item@example.com")
    product = create_product_api(sku="ORDER-DUPLICATE-001")

    response = client.post(
        "/api/v1/orders",
        json={
            "customer_id": customer["id"],
            "items": [
                {"product_id": product["id"], "quantity": 1},
                {"product_id": product["id"], "quantity": 2},
            ],
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "DUPLICATE_ORDER_ITEM_PRODUCT"


def test_insufficient_stock_returns_409_and_rolls_back(client, create_customer_api, create_product_api):
    customer = create_customer_api(email="rollback@example.com")
    product_a = create_product_api(sku="ROLLBACK-A", price="10.00", quantity_in_stock=10)
    product_b = create_product_api(sku="ROLLBACK-B", price="20.00", quantity_in_stock=1)

    response = client.post(
        "/api/v1/orders",
        json={
            "customer_id": customer["id"],
            "items": [
                {"product_id": product_a["id"], "quantity": 2},
                {"product_id": product_b["id"], "quantity": 5},
            ],
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INSUFFICIENT_STOCK"
    assert client.get(f"/api/v1/products/{product_a['id']}").json()["quantity_in_stock"] == 10
    assert client.get(f"/api/v1/products/{product_b['id']}").json()["quantity_in_stock"] == 1
    assert client.get("/api/v1/orders").json() == []


def test_cancel_order_restores_stock(client, create_customer_api, create_product_api):
    customer = create_customer_api(email="cancel@example.com")
    product = create_product_api(sku="ORDER-CANCEL-001", quantity_in_stock=5)
    created_order = client.post(
        "/api/v1/orders",
        json={
            "customer_id": customer["id"],
            "items": [{"product_id": product["id"], "quantity": 2}],
        },
    ).json()
    assert client.get(f"/api/v1/products/{product['id']}").json()["quantity_in_stock"] == 3

    response = client.delete(f"/api/v1/orders/{created_order['id']}")

    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"
    assert client.get(f"/api/v1/products/{product['id']}").json()["quantity_in_stock"] == 5


def test_cancel_order_twice_returns_409(client, create_customer_api, create_product_api):
    customer = create_customer_api(email="cancel-twice@example.com")
    product = create_product_api(sku="ORDER-CANCEL-TWICE-001")
    created_order = client.post(
        "/api/v1/orders",
        json={
            "customer_id": customer["id"],
            "items": [{"product_id": product["id"], "quantity": 1}],
        },
    ).json()
    client.delete(f"/api/v1/orders/{created_order['id']}")

    response = client.delete(f"/api/v1/orders/{created_order['id']}")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORDER_ALREADY_CANCELLED"


def test_get_order_not_found_returns_404(client):
    response = client.get("/api/v1/orders/999")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ORDER_NOT_FOUND"
