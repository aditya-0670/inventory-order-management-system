from decimal import Decimal

from app.models.customer import Customer
from app.models.order import Order
from app.models.product import Product
from app.repositories.dashboard_repository import DashboardRepository
from app.services.dashboard_service import DashboardService


def test_dashboard_service_uses_configured_low_stock_threshold(db_session):
    customer = Customer(
        full_name="Dashboard Service Customer",
        email="dashboard-service@example.com",
        phone_number="+15551234567",
    )
    product_below_threshold = Product(
        name="Below Threshold",
        sku="SERVICE-DASH-LOW",
        price=Decimal("10.00"),
        quantity_in_stock=4,
    )
    product_above_threshold = Product(
        name="Above Threshold",
        sku="SERVICE-DASH-HIGH",
        price=Decimal("10.00"),
        quantity_in_stock=5,
    )
    db_session.add_all([customer, product_below_threshold, product_above_threshold])
    db_session.commit()
    db_session.add(Order(customer_id=customer.id, total_amount=Decimal("10.00")))
    db_session.commit()
    service = DashboardService(DashboardRepository(db_session), low_stock_threshold=4)

    summary = service.get_summary()

    assert summary.total_products == 2
    assert summary.total_customers == 1
    assert summary.total_orders == 1
    assert summary.low_stock_count == 1
    assert summary.low_stock_products[0].sku == "SERVICE-DASH-LOW"
