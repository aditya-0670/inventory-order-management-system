from collections.abc import Sequence

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate
from app.services.customer_service import CustomerService

router = APIRouter()


def get_customer_service(db: Session = Depends(get_db)) -> CustomerService:
    return CustomerService(CustomerRepository(db))


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerRead:
    return service.create_customer(payload)


@router.get("", response_model=list[CustomerRead])
def list_customers(
    service: CustomerService = Depends(get_customer_service),
) -> Sequence[CustomerRead]:
    return service.list_customers()


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: int,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerRead:
    return service.get_customer(customer_id)


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerRead:
    return service.update_customer(customer_id, payload)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    service: CustomerService = Depends(get_customer_service),
) -> None:
    service.delete_customer(customer_id)
