from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: ProductCreate) -> Product:
        product = Product(**payload.model_dump())
        self.db.add(product)
        self.db.flush()
        self.db.refresh(product)
        return product

    def list_active(self) -> Sequence[Product]:
        statement = select(Product).where(Product.is_active.is_(True)).order_by(Product.id)
        return self.db.scalars(statement).all()

    def get_by_id(self, product_id: int, *, active_only: bool = True) -> Product | None:
        statement = select(Product).where(Product.id == product_id)
        if active_only:
            statement = statement.where(Product.is_active.is_(True))
        return self.db.scalar(statement)

    def get_by_sku(self, sku: str) -> Product | None:
        statement = select(Product).where(Product.sku == sku)
        return self.db.scalar(statement)

    def sku_exists(self, sku: str, *, exclude_product_id: int | None = None) -> bool:
        statement = select(Product.id).where(Product.sku == sku)
        if exclude_product_id is not None:
            statement = statement.where(Product.id != exclude_product_id)
        return self.db.scalar(statement) is not None

    def list_existing_skus_by_prefix(self, prefix: str) -> Sequence[str]:
        statement = select(Product.sku).where(Product.sku.like(f"{prefix}%")).order_by(Product.sku)
        return self.db.scalars(statement).all()

    def update(self, product: Product, payload: ProductUpdate) -> Product:
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        self.db.flush()
        self.db.refresh(product)
        return product

    def soft_delete(self, product: Product) -> Product:
        product.is_active = False
        self.db.flush()
        self.db.refresh(product)
        return product
