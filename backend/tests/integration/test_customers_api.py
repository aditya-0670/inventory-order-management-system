from app.models.customer import Customer
from tests.builders.customer_builder import CustomerBuilder


def test_create_customer_success(client):
    payload = CustomerBuilder().build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["full_name"] == payload["full_name"]
    assert body["email"] == payload["email"]
    assert body["phone_number"] == payload["phone_number"]
    assert body["is_active"] is True
    assert body["created_at"]
    assert body["updated_at"]


def test_create_customer_normalizes_email(client):
    payload = CustomerBuilder().with_email("AVERY@EXAMPLE.COM").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 201
    assert response.json()["email"] == "avery@example.com"


def test_create_customer_duplicate_email_returns_409(client):
    payload = CustomerBuilder().build()
    client.post("/api/v1/customers", json=payload)

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_EMAIL"


def test_create_customer_duplicate_email_is_case_insensitive(client):
    client.post("/api/v1/customers", json=CustomerBuilder().with_email("avery@example.com").build())

    response = client.post(
        "/api/v1/customers",
        json=CustomerBuilder().with_email("AVERY@EXAMPLE.COM").build(),
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_EMAIL"


def test_create_customer_invalid_email_returns_422(client):
    payload = CustomerBuilder().with_email("not-an-email").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_customer_accepts_valid_india_e164_number(client):
    payload = CustomerBuilder().with_phone_number("+919876543210").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 201
    assert response.json()["phone_number"] == "+919876543210"


def test_create_customer_accepts_valid_seychelles_e164_number(client):
    payload = CustomerBuilder().with_phone_number("+2482512345").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 201
    assert response.json()["phone_number"] == "+2482512345"


def test_create_customer_rejects_raw_national_number_without_country_code(client):
    payload = CustomerBuilder().with_phone_number("9876543210").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_customer_rejects_raw_seven_digit_number_without_country_code(client):
    payload = CustomerBuilder().with_phone_number("2512345").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_customer_rejects_alphabetic_phone_number(client):
    payload = CustomerBuilder().with_phone_number("+91ABCDEF").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_customer_rejects_very_short_phone_number(client):
    payload = CustomerBuilder().with_phone_number("+91987").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_customer_normalizes_phone_number_to_e164(client):
    payload = CustomerBuilder().with_phone_number("+91 98765 43210").build()

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 201
    assert response.json()["phone_number"] == "+919876543210"


def test_phone_number_is_not_unique(client):
    phone_number = "+12025550143"
    first_payload = CustomerBuilder().with_email("first-phone@example.com").with_phone_number(phone_number).build()
    second_payload = CustomerBuilder().with_email("second-phone@example.com").with_phone_number(phone_number).build()

    first_response = client.post("/api/v1/customers", json=first_payload)
    second_response = client.post("/api/v1/customers", json=second_payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["phone_number"] == phone_number
    assert second_response.json()["phone_number"] == phone_number


def test_list_customers_returns_only_active_customers(client, db_session):
    inactive_customer = Customer(
        full_name="Archived Customer",
        email="archived@example.com",
        phone_number="+15550000000",
        is_active=False,
    )
    db_session.add(inactive_customer)
    db_session.commit()
    active_payload = CustomerBuilder().with_email("active@example.com").build()
    client.post("/api/v1/customers", json=active_payload)

    response = client.get("/api/v1/customers")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["email"] == "active@example.com"


def test_list_customers_does_not_fail_on_legacy_invalid_phone_number(client, db_session):
    legacy_customer = Customer(
        full_name="Legacy Customer",
        email="legacy@example.com",
        phone_number="2512345",
    )
    db_session.add(legacy_customer)
    db_session.commit()

    response = client.get("/api/v1/customers")

    assert response.status_code == 200
    assert response.json()[0]["phone_number"] == "2512345"


def test_get_customer_by_id_success(client):
    create_response = client.post("/api/v1/customers", json=CustomerBuilder().build())
    customer_id = create_response.json()["id"]

    response = client.get(f"/api/v1/customers/{customer_id}")

    assert response.status_code == 200
    assert response.json()["id"] == customer_id


def test_update_customer_success(client):
    create_response = client.post("/api/v1/customers", json=CustomerBuilder().build())
    customer_id = create_response.json()["id"]
    payload = (
        CustomerBuilder()
        .with_full_name("Updated Customer")
        .with_email("updated@example.com")
        .with_phone_number("+2482512345")
        .build()
    )

    response = client.put(f"/api/v1/customers/{customer_id}", json=payload)

    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Customer"
    assert response.json()["email"] == "updated@example.com"
    assert response.json()["phone_number"] == "+2482512345"


def test_update_customer_duplicate_email_returns_409(client):
    first_customer = client.post(
        "/api/v1/customers",
        json=CustomerBuilder().with_email("first@example.com").build(),
    ).json()
    client.post(
        "/api/v1/customers",
        json=CustomerBuilder().with_email("second@example.com").build(),
    )
    payload = CustomerBuilder().with_email("second@example.com").build()

    response = client.put(f"/api/v1/customers/{first_customer['id']}", json=payload)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_EMAIL"


def test_get_customer_by_id_not_found_returns_404(client):
    response = client.get("/api/v1/customers/999")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"


def test_delete_customer_soft_deletes(client):
    create_response = client.post("/api/v1/customers", json=CustomerBuilder().build())
    customer_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/customers/{customer_id}")
    get_response = client.get(f"/api/v1/customers/{customer_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_email_remains_unique_after_soft_delete(client):
    payload = CustomerBuilder().build()
    customer_id = client.post("/api/v1/customers", json=payload).json()["id"]
    client.delete(f"/api/v1/customers/{customer_id}")

    response = client.post("/api/v1/customers", json=payload)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_EMAIL"
