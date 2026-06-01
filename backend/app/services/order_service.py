from collections.abc import Sequence

from fastapi import status

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models.order import Order, OrderStatus
from app.repositories.customer_repository import CustomerRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.order import OrderCreate
from app.services.customer_service import CustomerNotFoundError
from app.services.inventory_service import InventoryService


class OrderNotFoundError(NotFoundError):
    code = "ORDER_NOT_FOUND"
    message = "Order not found"


class OrderAlreadyCancelledError(ConflictError):
    code = "ORDER_ALREADY_CANCELLED"
    message = "Order is already cancelled"


class DuplicateOrderItemProductError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "DUPLICATE_ORDER_ITEM_PRODUCT"
    message = "Duplicate product IDs are not allowed in an order"


class OrderService:
    def __init__(
        self,
        order_repository: OrderRepository,
        customer_repository: CustomerRepository,
        inventory_service: InventoryService,
    ):
        self.order_repository = order_repository
        self.customer_repository = customer_repository
        self.inventory_service = inventory_service
        self.db = order_repository.db

    def create_order(self, payload: OrderCreate) -> Order:
        self._ensure_unique_products(payload)
        try:
            customer = self.customer_repository.get_by_id(payload.customer_id)
            if customer is None:
                raise CustomerNotFoundError(
                    message=f"Customer {payload.customer_id} not found",
                    details={"customer_id": payload.customer_id},
                )

            product_ids = [item.product_id for item in payload.items]
            products_by_id = self.inventory_service.lock_products_for_order(product_ids)
            order_items, total_amount = self.inventory_service.reserve_stock_and_price_items(
                payload.items,
                products_by_id,
            )

            order = self.order_repository.create_order(payload.customer_id, total_amount)
            for order_item in order_items:
                self.order_repository.create_order_item(order_id=order.id, **order_item)

            order_id = order.id
            self.db.commit()
            created_order = self.order_repository.get_by_id(order_id)
            if created_order is None:
                raise OrderNotFoundError()
            return created_order
        except Exception:
            self.db.rollback()
            raise

    def list_orders(self) -> Sequence[Order]:
        return self.order_repository.list_orders()

    def get_order(self, order_id: int) -> Order:
        order = self.order_repository.get_by_id(order_id)
        if order is None:
            raise OrderNotFoundError()
        return order

    def cancel_order(self, order_id: int) -> Order:
        try:
            order = self.order_repository.get_by_id(order_id, for_update=True)
            if order is None:
                raise OrderNotFoundError()

            if order.status == OrderStatus.CANCELLED.value:
                raise OrderAlreadyCancelledError()

            product_ids = [item.product_id for item in order.items]
            products_by_id = self.inventory_service.lock_products_for_stock_restore(product_ids)
            for item in order.items:
                self.inventory_service.restore_stock(item.product_id, item.quantity, products_by_id)

            self.order_repository.mark_cancelled(order)
            order_id = order.id
            self.db.commit()
            cancelled_order = self.order_repository.get_by_id(order_id)
            if cancelled_order is None:
                raise OrderNotFoundError()
            return cancelled_order
        except Exception:
            self.db.rollback()
            raise

    def _ensure_unique_products(self, payload: OrderCreate) -> None:
        product_ids = [item.product_id for item in payload.items]
        if len(product_ids) != len(set(product_ids)):
            raise DuplicateOrderItemProductError()
