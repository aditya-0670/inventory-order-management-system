from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.order import Order
from app.models.order_item import OrderItem


class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_order(self, customer_id: int, total_amount: Decimal) -> Order:
        order = Order(customer_id=customer_id, total_amount=total_amount)
        self.db.add(order)
        self.db.flush()
        return order

    def create_order_item(
        self,
        *,
        order_id: int,
        product_id: int,
        quantity: int,
        unit_price: Decimal,
        line_total: Decimal,
    ) -> OrderItem:
        order_item = OrderItem(
            order_id=order_id,
            product_id=product_id,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
        )
        self.db.add(order_item)
        self.db.flush()
        return order_item

    def list_orders(self) -> Sequence[Order]:
        statement = select(Order).options(selectinload(Order.items)).order_by(Order.id)
        return self.db.scalars(statement).all()

    def get_by_id(self, order_id: int, *, for_update: bool = False) -> Order | None:
        statement = (
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.items))
        )
        if for_update:
            statement = statement.with_for_update()
        return self.db.scalar(statement)

    def mark_cancelled(self, order: Order) -> Order:
        order.status = "CANCELLED"
        self.db.flush()
        return order
