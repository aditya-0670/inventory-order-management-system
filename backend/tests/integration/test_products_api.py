from decimal import Decimal

from app.models.product import Product
from tests.builders.product_builder import ProductBuilder


def test_create_product_success(client):
    payload = ProductBuilder().build()

    response = client.post("/api/v1/products", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["name"] == payload["name"]
    assert body["sku"] == payload["sku"]
    assert Decimal(body["price"]) == Decimal(payload["price"])
    assert body["quantity_in_stock"] == payload["quantity_in_stock"]
    assert body["is_active"] is True
    assert body["created_at"]
    assert body["updated_at"]


def test_create_product_duplicate_sku_returns_409(client):
    payload = ProductBuilder().build()
    client.post("/api/v1/products", json=payload)

    response = client.post("/api/v1/products", json=payload)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_SKU"


def test_create_product_normalizes_manual_sku(client):
    payload = ProductBuilder().with_sku("wireless mouse 001").build()

    response = client.post("/api/v1/products", json=payload)

    assert response.status_code == 201
    assert response.json()["sku"] == "WIRELESS-MOUSE-001"


def test_create_product_negative_price_returns_422(client):
    payload = ProductBuilder().build()
    payload["price"] = "-1.00"

    response = client.post("/api/v1/products", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_product_negative_quantity_returns_422(client):
    payload = ProductBuilder().build()
    payload["quantity_in_stock"] = -1

    response = client.post("/api/v1/products", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_list_products_returns_only_active_products(client, db_session):
    active_payload = ProductBuilder().with_sku("ACTIVE-001").build()
    inactive_product = Product(
        name="Archived",
        sku="ARCHIVED-001",
        price=Decimal("25.00"),
        quantity_in_stock=5,
        is_active=False,
    )
    db_session.add(inactive_product)
    db_session.commit()
    client.post("/api/v1/products", json=active_payload)

    response = client.get("/api/v1/products")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["sku"] == "ACTIVE-001"


def test_get_product_by_id_success(client):
    create_response = client.post("/api/v1/products", json=ProductBuilder().build())
    product_id = create_response.json()["id"]

    response = client.get(f"/api/v1/products/{product_id}")

    assert response.status_code == 200
    assert response.json()["id"] == product_id


def test_get_product_by_id_not_found_returns_404(client):
    response = client.get("/api/v1/products/999")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_update_product_success(client):
    create_response = client.post("/api/v1/products", json=ProductBuilder().build())
    product_id = create_response.json()["id"]

    response = client.put(
        f"/api/v1/products/{product_id}",
        json={
            "name": "Updated Laptop",
            "sku": "LAPTOP-UPDATED",
            "price": "899.99",
            "quantity_in_stock": 15,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Updated Laptop"
    assert body["sku"] == "LAPTOP-UPDATED"
    assert Decimal(body["price"]) == Decimal("899.99")
    assert body["quantity_in_stock"] == 15


def test_update_product_with_same_sku_and_quantity_change_succeeds(client):
    product = client.post(
        "/api/v1/products",
        json=ProductBuilder().with_sku("IPHONE-16-001").build(),
    ).json()

    response = client.put(
        f"/api/v1/products/{product['id']}",
        json={
            "name": product["name"],
            "sku": "IPHONE-16-001",
            "price": product["price"],
            "quantity_in_stock": 20,
        },
    )

    assert response.status_code == 200
    assert response.json()["sku"] == "IPHONE-16-001"
    assert response.json()["quantity_in_stock"] == 20


def test_update_product_duplicate_sku_returns_409(client):
    client.post("/api/v1/products", json=ProductBuilder().with_sku("SKU-001").build())
    second = client.post("/api/v1/products", json=ProductBuilder().with_sku("SKU-002").build())

    response = client.put(
        f"/api/v1/products/{second.json()['id']}",
        json={"sku": "SKU-001"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_SKU"


def test_update_product_negative_price_returns_422(client):
    product_id = client.post("/api/v1/products", json=ProductBuilder().build()).json()["id"]

    response = client.put(f"/api/v1/products/{product_id}", json={"price": "-1.00"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_update_product_negative_quantity_returns_422(client):
    product_id = client.post("/api/v1/products", json=ProductBuilder().build()).json()["id"]

    response = client.put(f"/api/v1/products/{product_id}", json={"quantity_in_stock": -1})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_delete_product_soft_deletes(client):
    create_response = client.post("/api/v1/products", json=ProductBuilder().build())
    product_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/products/{product_id}")
    get_response = client.get(f"/api/v1/products/{product_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_sku_remains_unique_after_soft_delete(client):
    payload = ProductBuilder().build()
    product_id = client.post("/api/v1/products", json=payload).json()["id"]
    client.delete(f"/api/v1/products/{product_id}")

    response = client.post("/api/v1/products", json=payload)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_SKU"


def test_sku_suggestions_return_available_skus_for_new_name(client):
    response = client.get("/api/v1/products/sku-suggestions", params={"name": "Wireless Mouse", "limit": 3})

    assert response.status_code == 200
    assert response.json() == {
        "base_sku": "WIRELESS-MOUSE",
        "suggestions": [
            {
                "sku": "WIRELESS-MOUSE-001",
                "available": True,
                "reason": "Name-based sequential suggestion",
            },
            {
                "sku": "WIRELESS-MOUSE-002",
                "available": True,
                "reason": "Name-based sequential suggestion",
            },
            {
                "sku": "WIRELESS-MOUSE-003",
                "available": True,
                "reason": "Name-based sequential suggestion",
            },
        ],
    }


def test_sku_suggestions_route_is_not_treated_as_product_id(client):
    response = client.get("/api/v1/products/sku-suggestions", params={"name": "Wireless erp", "limit": 2})

    assert response.status_code == 200
    assert response.json()["base_sku"] == "WIRELESS-ERP"


def test_sku_suggestions_skip_existing_skus(client):
    client.post("/api/v1/products", json=ProductBuilder().with_sku("WIRELESS-MOUSE-001").build())
    client.post("/api/v1/products", json=ProductBuilder().with_sku("WIRELESS-MOUSE-002").build())

    response = client.get("/api/v1/products/sku-suggestions", params={"name": "Wireless Mouse", "limit": 3})

    assert response.status_code == 200
    assert [item["sku"] for item in response.json()["suggestions"]] == [
        "WIRELESS-MOUSE-003",
        "WIRELESS-MOUSE-004",
        "WIRELESS-MOUSE-005",
    ]
    assert all(item["available"] for item in response.json()["suggestions"])


def test_sku_suggestions_respect_limit(client):
    response = client.get("/api/v1/products/sku-suggestions", params={"name": "Wireless Mouse", "limit": 2})

    assert response.status_code == 200
    assert len(response.json()["suggestions"]) == 2


def test_sku_suggestions_reject_empty_name(client):
    response = client.get("/api/v1/products/sku-suggestions", params={"name": "!!!", "limit": 3})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_sku_availability_returns_true_for_unused_sku(client):
    response = client.get("/api/v1/products/sku-availability", params={"sku": "WIRELESS-MOUSE-001"})

    assert response.status_code == 200
    assert response.json() == {"sku": "WIRELESS-MOUSE-001", "available": True}


def test_sku_availability_returns_false_for_existing_sku(client):
    client.post("/api/v1/products", json=ProductBuilder().with_sku("WIRELESS-MOUSE-001").build())

    response = client.get("/api/v1/products/sku-availability", params={"sku": "WIRELESS-MOUSE-001"})

    assert response.status_code == 200
    assert response.json() == {"sku": "WIRELESS-MOUSE-001", "available": False}


def test_sku_availability_returns_true_for_existing_sku_with_same_product_excluded(client):
    product = client.post(
        "/api/v1/products",
        json=ProductBuilder().with_sku("IPHONE-16-001").build(),
    ).json()

    response = client.get(
        "/api/v1/products/sku-availability",
        params={"sku": "IPHONE-16-001", "exclude_product_id": product["id"]},
    )

    assert response.status_code == 200
    assert response.json() == {"sku": "IPHONE-16-001", "available": True}


def test_sku_availability_returns_false_for_existing_sku_when_different_product_excluded(client):
    first = client.post(
        "/api/v1/products",
        json=ProductBuilder().with_sku("IPHONE-16-001").build(),
    ).json()
    second = client.post(
        "/api/v1/products",
        json=ProductBuilder().with_sku("MOUSE-001").build(),
    ).json()

    response = client.get(
        "/api/v1/products/sku-availability",
        params={"sku": first["sku"], "exclude_product_id": second["id"]},
    )

    assert response.status_code == 200
    assert response.json() == {"sku": "IPHONE-16-001", "available": False}


def test_sku_availability_rejects_invalid_sku_format(client):
    response = client.get("/api/v1/products/sku-availability", params={"sku": "!!"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
