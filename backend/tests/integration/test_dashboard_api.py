from decimal import Decimal

from app.models.customer import Customer
from app.models.order import Order
from app.models.product import Product


def seed_dashboard_data(db_session):
    active_customer = Customer(
        full_name="Active Customer",
        email="active-dashboard@example.com",
        phone_number="+15551234567",
    )
    inactive_customer = Customer(
        full_name="Inactive Customer",
        email="inactive-dashboard@example.com",
        phone_number="+15557654321",
        is_active=False,
    )
    healthy_product = Product(
        name="Healthy Stock",
        sku="DASH-HEALTHY",
        price=Decimal("25.00"),
        quantity_in_stock=12,
    )
    low_product = Product(
        name="Low Stock",
        sku="DASH-LOW",
        price=Decimal("25.00"),
        quantity_in_stock=2,
    )
    threshold_product = Product(
        name="Threshold Stock",
        sku="DASH-THRESHOLD",
        price=Decimal("25.00"),
        quantity_in_stock=5,
    )
    inactive_low_product = Product(
        name="Inactive Low Stock",
        sku="DASH-INACTIVE",
        price=Decimal("25.00"),
        quantity_in_stock=1,
        is_active=False,
    )
    db_session.add_all(
        [
            active_customer,
            inactive_customer,
            healthy_product,
            low_product,
            threshold_product,
            inactive_low_product,
        ]
    )
    db_session.commit()
    db_session.add_all(
        [
            Order(customer_id=active_customer.id, total_amount=Decimal("10.00")),
            Order(customer_id=active_customer.id, total_amount=Decimal("15.00")),
        ]
    )
    db_session.commit()


def test_dashboard_summary_counts_and_low_stock_products(client, db_session):
    seed_dashboard_data(db_session)

    response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_products"] == 3
    assert body["total_customers"] == 1
    assert body["total_orders"] == 2
    assert body["low_stock_count"] == 2
    assert body["low_stock_products"] == [
        {
            "id": 2,
            "name": "Low Stock",
            "sku": "DASH-LOW",
            "quantity_in_stock": 2,
        },
        {
            "id": 3,
            "name": "Threshold Stock",
            "sku": "DASH-THRESHOLD",
            "quantity_in_stock": 5,
        },
    ]


def test_dashboard_summary_empty_state(client):
    response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    assert response.json() == {
        "total_products": 0,
        "total_customers": 0,
        "total_orders": 0,
        "low_stock_count": 0,
        "low_stock_products": [],
    }

