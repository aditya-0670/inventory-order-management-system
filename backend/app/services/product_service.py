from collections.abc import Sequence

from app.core.exceptions import ConflictError, NotFoundError
from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate


class ProductNotFoundError(NotFoundError):
    code = "PRODUCT_NOT_FOUND"
    message = "Product not found"


class DuplicateSkuError(ConflictError):
    code = "DUPLICATE_SKU"
    message = "Product SKU already exists"


class ProductService:
    def __init__(self, repository: ProductRepository):
        self.repository = repository

    def create_product(self, payload: ProductCreate) -> Product:
        self._ensure_sku_available(payload.sku)
        product = self.repository.create(payload)
        self.repository.db.commit()
        self.repository.db.refresh(product)
        return product

    def list_products(self) -> Sequence[Product]:
        return self.repository.list_active()

    def get_product(self, product_id: int) -> Product:
        product = self.repository.get_by_id(product_id)
        if product is None:
            raise ProductNotFoundError()
        return product

    def update_product(self, product_id: int, payload: ProductUpdate) -> Product:
        product = self.get_product(product_id)

        if payload.sku is not None:
            self._ensure_sku_available(payload.sku, product_id=product.id)

        updated_product = self.repository.update(product, payload)
        self.repository.db.commit()
        self.repository.db.refresh(updated_product)
        return updated_product

    def delete_product(self, product_id: int) -> None:
        product = self.get_product(product_id)
        self.repository.soft_delete(product)
        self.repository.db.commit()

    def _ensure_sku_available(self, sku: str, *, product_id: int | None = None) -> None:
        existing_product = self.repository.get_by_sku(sku)
        if existing_product is not None and existing_product.id != product_id:
            raise DuplicateSkuError(details={"sku": sku})
