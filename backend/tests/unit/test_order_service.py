from decimal import Decimal

import pytest
from sqlalchemy import select

from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.repositories.customer_repository import CustomerRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.inventory_service import InventoryService
from app.services.order_service import OrderAlreadyCancelledError, OrderService
from app.core.exceptions import InsufficientStockError


def build_service(db_session) -> OrderService:
    return OrderService(
        order_repository=OrderRepository(db_session),
        customer_repository=CustomerRepository(db_session),
        inventory_service=InventoryService(db_session),
    )


def create_customer(db_session, email: str = "service-order@example.com") -> Customer:
    customer = Customer(full_name="Service Customer", email=email, phone_number="+15551234567")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


def create_product(
    db_session,
    *,
    sku: str = "SERVICE-ORDER-PRODUCT",
    price: Decimal = Decimal("15.00"),
    quantity_in_stock: int = 10,
) -> Product:
    product = Product(
        name="Service Product",
        sku=sku,
        price=price,
        quantity_in_stock=quantity_in_stock,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_service_create_order_calculates_total_and_reduces_stock(db_session):
    service = build_service(db_session)
    customer = create_customer(db_session)
    product = create_product(db_session, price=Decimal("7.25"), quantity_in_stock=6)

    order = service.create_order(
        OrderCreate(
            customer_id=customer.id,
            items=[OrderItemCreate(product_id=product.id, quantity=4)],
        )
    )

    refreshed_product = db_session.get(Product, product.id)
    assert order.status == OrderStatus.PLACED.value
    assert order.total_amount == Decimal("29.00")
    assert len(order.items) == 1
    assert order.items[0].unit_price == Decimal("7.25")
    assert refreshed_product.quantity_in_stock == 2


def test_service_insufficient_stock_rolls_back(db_session):
    service = build_service(db_session)
    customer = create_customer(db_session)
    product_a = create_product(db_session, sku="SERVICE-A", price=Decimal("5.00"), quantity_in_stock=10)
    product_b = create_product(db_session, sku="SERVICE-B", price=Decimal("6.00"), quantity_in_stock=1)

    with pytest.raises(InsufficientStockError):
        service.create_order(
            OrderCreate(
                customer_id=customer.id,
                items=[
                    OrderItemCreate(product_id=product_a.id, quantity=2),
                    OrderItemCreate(product_id=product_b.id, quantity=5),
                ],
            )
        )

    assert db_session.get(Product, product_a.id).quantity_in_stock == 10
    assert db_session.get(Product, product_b.id).quantity_in_stock == 1
    assert db_session.scalars(select(Order)).all() == []


def test_service_cancel_order_restores_stock(db_session):
    service = build_service(db_session)
    customer = create_customer(db_session)
    product = create_product(db_session, quantity_in_stock=5)
    order = service.create_order(
        OrderCreate(
            customer_id=customer.id,
            items=[OrderItemCreate(product_id=product.id, quantity=2)],
        )
    )

    cancelled_order = service.cancel_order(order.id)

    assert cancelled_order.status == OrderStatus.CANCELLED.value
    assert db_session.get(Product, product.id).quantity_in_stock == 5


def test_service_cancel_order_twice_raises_conflict(db_session):
    service = build_service(db_session)
    customer = create_customer(db_session)
    product = create_product(db_session)
    order = service.create_order(
        OrderCreate(
            customer_id=customer.id,
            items=[OrderItemCreate(product_id=product.id, quantity=1)],
        )
    )
    service.cancel_order(order.id)

    with pytest.raises(OrderAlreadyCancelledError):
        service.cancel_order(order.id)
