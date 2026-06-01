from collections.abc import Sequence

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.customer_repository import CustomerRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.order import OrderCreate, OrderRead
from app.services.inventory_service import InventoryService
from app.services.order_service import OrderService

router = APIRouter()


def get_order_service(db: Session = Depends(get_db)) -> OrderService:
    return OrderService(
        order_repository=OrderRepository(db),
        customer_repository=CustomerRepository(db),
        inventory_service=InventoryService(db),
    )


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    service: OrderService = Depends(get_order_service),
) -> OrderRead:
    return service.create_order(payload)


@router.get("", response_model=list[OrderRead])
def list_orders(
    service: OrderService = Depends(get_order_service),
) -> Sequence[OrderRead]:
    return service.list_orders()


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: int,
    service: OrderService = Depends(get_order_service),
) -> OrderRead:
    return service.get_order(order_id)


@router.delete("/{order_id}", response_model=OrderRead)
def cancel_order(
    order_id: int,
    service: OrderService = Depends(get_order_service),
) -> OrderRead:
    return service.cancel_order(order_id)
