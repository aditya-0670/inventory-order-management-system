from decimal import Decimal

import pytest

from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.product_service import DuplicateSkuError, ProductNotFoundError, ProductService


def build_service(db_session) -> ProductService:
    return ProductService(ProductRepository(db_session))


def product_payload(sku: str = "SERVICE-001") -> ProductCreate:
    return ProductCreate(
        name="Service Laptop",
        sku=sku,
        price=Decimal("500.00"),
        quantity_in_stock=8,
    )


def test_service_creates_product(db_session):
    service = build_service(db_session)

    product = service.create_product(product_payload())

    assert product.id is not None
    assert product.sku == "SERVICE-001"
    assert product.is_active is True


def test_service_rejects_duplicate_sku(db_session):
    service = build_service(db_session)
    service.create_product(product_payload())

    with pytest.raises(DuplicateSkuError):
        service.create_product(product_payload())


def test_service_get_product_not_found(db_session):
    service = build_service(db_session)

    with pytest.raises(ProductNotFoundError):
        service.get_product(999)


def test_service_updates_product(db_session):
    service = build_service(db_session)
    product = service.create_product(product_payload())

    updated = service.update_product(
        product.id,
        ProductUpdate(name="Updated", price=Decimal("450.00"), quantity_in_stock=3),
    )

    assert updated.name == "Updated"
    assert updated.price == Decimal("450.00")
    assert updated.quantity_in_stock == 3


def test_service_soft_delete_hides_product(db_session):
    service = build_service(db_session)
    product = service.create_product(product_payload())

    service.delete_product(product.id)

    with pytest.raises(ProductNotFoundError):
        service.get_product(product.id)
