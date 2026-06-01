from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: CustomerCreate) -> Customer:
        customer = Customer(**payload.model_dump())
        self.db.add(customer)
        self.db.flush()
        self.db.refresh(customer)
        return customer

    def list_active(self) -> Sequence[Customer]:
        statement = select(Customer).where(Customer.is_active.is_(True)).order_by(Customer.id)
        return self.db.scalars(statement).all()

    def get_by_id(self, customer_id: int, *, active_only: bool = True) -> Customer | None:
        statement = select(Customer).where(Customer.id == customer_id)
        if active_only:
            statement = statement.where(Customer.is_active.is_(True))
        return self.db.scalar(statement)

    def get_by_email(self, email: str) -> Customer | None:
        statement = select(Customer).where(Customer.email == email.lower())
        return self.db.scalar(statement)

    def soft_delete(self, customer: Customer) -> Customer:
        customer.is_active = False
        self.db.flush()
        self.db.refresh(customer)
        return customer

    def update(self, customer: Customer, payload: CustomerUpdate) -> Customer:
        for field, value in payload.model_dump().items():
            setattr(customer, field, value)
        self.db.flush()
        self.db.refresh(customer)
        return customer
