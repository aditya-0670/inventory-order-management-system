from collections.abc import Sequence

from app.core.exceptions import ConflictError, NotFoundError
from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerNotFoundError(NotFoundError):
    code = "CUSTOMER_NOT_FOUND"
    message = "Customer not found"


class DuplicateEmailError(ConflictError):
    code = "DUPLICATE_EMAIL"
    message = "Customer email already exists"


class CustomerService:
    def __init__(self, repository: CustomerRepository):
        self.repository = repository

    def create_customer(self, payload: CustomerCreate) -> Customer:
        self._ensure_email_available(payload.email)
        customer = self.repository.create(payload)
        self.repository.db.commit()
        self.repository.db.refresh(customer)
        return customer

    def list_customers(self) -> Sequence[Customer]:
        return self.repository.list_active()

    def get_customer(self, customer_id: int) -> Customer:
        customer = self.repository.get_by_id(customer_id)
        if customer is None:
            raise CustomerNotFoundError()
        return customer

    def update_customer(self, customer_id: int, payload: CustomerUpdate) -> Customer:
        customer = self.get_customer(customer_id)
        self._ensure_email_available(payload.email, customer_id=customer.id)
        updated_customer = self.repository.update(customer, payload)
        self.repository.db.commit()
        self.repository.db.refresh(updated_customer)
        return updated_customer

    def delete_customer(self, customer_id: int) -> None:
        customer = self.get_customer(customer_id)
        self.repository.soft_delete(customer)
        self.repository.db.commit()

    def _ensure_email_available(self, email: str, *, customer_id: int | None = None) -> None:
        existing_customer = self.repository.get_by_email(email)
        if existing_customer is not None and existing_customer.id != customer_id:
            raise DuplicateEmailError(details={"email": email})
