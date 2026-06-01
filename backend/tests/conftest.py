from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from tests.builders.customer_builder import CustomerBuilder
from tests.builders.order_builder import OrderPayloadBuilder
from tests.builders.product_builder import ProductBuilder


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(db_session) -> TestClient:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def create_product_api(client):
    def _create_product(
        *,
        sku: str = "PRODUCT-001",
        name: str = "Laptop",
        price: str = "999.99",
        quantity_in_stock: int = 10,
    ) -> dict[str, object]:
        payload = (
            ProductBuilder()
            .with_sku(sku)
            .with_name(name)
            .with_price(price)
            .with_quantity(quantity_in_stock)
            .build()
        )
        response = client.post("/api/v1/products", json=payload)
        assert response.status_code == 201
        return response.json()

    return _create_product


@pytest.fixture
def create_customer_api(client):
    def _create_customer(
        *,
        email: str = "customer@example.com",
        full_name: str = "Avery Johnson",
        phone_number: str = "+12025550143",
    ) -> dict[str, object]:
        payload = (
            CustomerBuilder()
            .with_email(email)
            .with_full_name(full_name)
            .with_phone_number(phone_number)
            .build()
        )
        response = client.post("/api/v1/customers", json=payload)
        assert response.status_code == 201
        return response.json()

    return _create_customer


@pytest.fixture
def create_order_api(client):
    def _create_order(
        *,
        customer_id: int,
        product_id: int,
        quantity: int = 1,
    ) -> dict[str, object]:
        payload = (
            OrderPayloadBuilder()
            .with_customer_id(customer_id)
            .with_single_item(product_id, quantity)
            .build()
        )
        response = client.post("/api/v1/orders", json=payload)
        assert response.status_code == 201
        return response.json()

    return _create_order
