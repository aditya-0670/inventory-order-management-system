import pytest

from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.customer_service import CustomerNotFoundError, CustomerService, DuplicateEmailError


def build_service(db_session) -> CustomerService:
    return CustomerService(CustomerRepository(db_session))


def customer_payload(email: str = "service@example.com") -> CustomerCreate:
    return CustomerCreate(
        full_name="Service Customer",
        email=email,
        phone_number="+12025550143",
    )


def test_service_creates_customer(db_session):
    service = build_service(db_session)

    customer = service.create_customer(customer_payload())

    assert customer.id is not None
    assert customer.email == "service@example.com"
    assert customer.is_active is True


def test_service_normalizes_email(db_session):
    service = build_service(db_session)

    customer = service.create_customer(customer_payload("SERVICE@EXAMPLE.COM"))

    assert customer.email == "service@example.com"


def test_service_rejects_duplicate_email(db_session):
    service = build_service(db_session)
    service.create_customer(customer_payload())

    with pytest.raises(DuplicateEmailError):
        service.create_customer(customer_payload())


def test_service_rejects_duplicate_email_case_insensitive(db_session):
    service = build_service(db_session)
    service.create_customer(customer_payload("service@example.com"))

    with pytest.raises(DuplicateEmailError):
        service.create_customer(customer_payload("SERVICE@EXAMPLE.COM"))


def test_service_get_customer_not_found(db_session):
    service = build_service(db_session)

    with pytest.raises(CustomerNotFoundError):
        service.get_customer(999)


def test_service_soft_delete_hides_customer(db_session):
    service = build_service(db_session)
    customer = service.create_customer(customer_payload())

    service.delete_customer(customer.id)

    with pytest.raises(CustomerNotFoundError):
        service.get_customer(customer.id)


def test_service_updates_customer_with_normalized_phone(db_session):
    service = build_service(db_session)
    customer = service.create_customer(customer_payload())

    updated = service.update_customer(
        customer.id,
        CustomerUpdate(
            full_name="Updated Customer",
            email="updated@example.com",
            phone_number="+91 98765 43210",
        ),
    )

    assert updated.full_name == "Updated Customer"
    assert updated.email == "updated@example.com"
    assert updated.phone_number == "+919876543210"
