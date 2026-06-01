from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.order import Order
from app.models.product import Product


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def count_active_products(self) -> int:
        statement = select(func.count()).select_from(Product).where(Product.is_active.is_(True))
        return self.db.scalar(statement) or 0

    def count_active_customers(self) -> int:
        statement = select(func.count()).select_from(Customer).where(Customer.is_active.is_(True))
        return self.db.scalar(statement) or 0

    def count_orders(self) -> int:
        statement = select(func.count()).select_from(Order)
        return self.db.scalar(statement) or 0

    def list_low_stock_products(self, threshold: int) -> Sequence[Product]:
        statement = (
            select(Product)
            .where(
                Product.is_active.is_(True),
                Product.quantity_in_stock <= threshold,
            )
            .order_by(Product.quantity_in_stock.asc(), Product.name.asc(), Product.id.asc())
        )
        return self.db.scalars(statement).all()
