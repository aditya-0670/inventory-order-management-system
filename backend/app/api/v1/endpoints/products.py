from collections.abc import Sequence

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.schemas.sku import SkuAvailabilityResponse, SkuSuggestionsResponse
from app.services.product_service import ProductService
from app.services.sku_service import SkuService

router = APIRouter()


def get_product_service(db: Session = Depends(get_db)) -> ProductService:
    return ProductService(ProductRepository(db))


def get_sku_service(db: Session = Depends(get_db)) -> SkuService:
    return SkuService(ProductRepository(db))


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    service: ProductService = Depends(get_product_service),
) -> ProductRead:
    return service.create_product(payload)


@router.get("", response_model=list[ProductRead])
def list_products(
    service: ProductService = Depends(get_product_service),
) -> Sequence[ProductRead]:
    return service.list_products()


@router.get("/sku-suggestions", response_model=SkuSuggestionsResponse)
def get_sku_suggestions(
    name: str,
    limit: int = 5,
    service: SkuService = Depends(get_sku_service),
) -> SkuSuggestionsResponse:
    return service.generate_sku_suggestions(name, limit)


@router.get("/sku-availability", response_model=SkuAvailabilityResponse)
def get_sku_availability(
    sku: str,
    exclude_product_id: int | None = None,
    service: SkuService = Depends(get_sku_service),
) -> SkuAvailabilityResponse:
    return service.check_sku_availability(sku, exclude_product_id=exclude_product_id)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    service: ProductService = Depends(get_product_service),
) -> ProductRead:
    return service.get_product(product_id)


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    service: ProductService = Depends(get_product_service),
) -> ProductRead:
    return service.update_product(product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    service: ProductService = Depends(get_product_service),
) -> None:
    service.delete_product(product_id)
