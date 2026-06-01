from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import InsufficientStockError
from app.models.product import Product
from app.schemas.order import OrderItemCreate
from app.services.product_service import ProductNotFoundError


class InventoryService:
    def __init__(self, db: Session):
        self.db = db

    def lock_products_for_order(self, product_ids: list[int]) -> dict[int, Product]:
        ordered_ids = sorted(set(product_ids))
        statement = (
            select(Product)
            .where(Product.id.in_(ordered_ids), Product.is_active.is_(True))
            .order_by(Product.id)
            .with_for_update()
        )
        products = self.db.scalars(statement).all()
        return {product.id: product for product in products}

    def lock_products_for_stock_restore(self, product_ids: list[int]) -> dict[int, Product]:
        ordered_ids = sorted(set(product_ids))
        statement = (
            select(Product)
            .where(Product.id.in_(ordered_ids))
            .order_by(Product.id)
            .with_for_update()
        )
        products = self.db.scalars(statement).all()
        return {product.id: product for product in products}

    def reserve_stock_and_price_items(
        self,
        items: list[OrderItemCreate],
        products_by_id: dict[int, Product],
    ) -> tuple[list[dict[str, object]], Decimal]:
        for item in items:
            if item.product_id not in products_by_id:
                raise ProductNotFoundError(
                    message=f"Product {item.product_id} not found",
                    details={"product_id": item.product_id},
                )

        order_items: list[dict[str, object]] = []
        total_amount = Decimal("0.00")

        for item in items:
            product = products_by_id[item.product_id]
            if product.quantity_in_stock < item.quantity:
                raise InsufficientStockError(
                    message=f"Insufficient stock for product {product.sku}",
                    details={
                        "product_id": product.id,
                        "sku": product.sku,
                        "available": product.quantity_in_stock,
                        "requested": item.quantity,
                    },
                )

            unit_price = product.price
            line_total = unit_price * item.quantity
            product.quantity_in_stock -= item.quantity
            total_amount += line_total

            order_items.append(
                {
                    "product_id": product.id,
                    "quantity": item.quantity,
                    "unit_price": unit_price,
                    "line_total": line_total,
                }
            )

        return order_items, total_amount

    def restore_stock(self, product_id: int, quantity: int, products_by_id: dict[int, Product]) -> None:
        product = products_by_id.get(product_id)
        if product is None:
            raise ProductNotFoundError(
                message=f"Product {product_id} not found",
                details={"product_id": product_id},
            )
        product.quantity_in_stock += quantity
        self.db.flush()
