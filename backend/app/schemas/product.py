from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils.sku_generator import is_valid_sku_format, normalize_manual_sku


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=3, max_length=50)
    price: Decimal = Field(ge=0)
    quantity_in_stock: int = Field(ge=0)

    @field_validator("sku")
    @classmethod
    def normalize_and_validate_sku(cls, value: str) -> str:
        normalized = normalize_manual_sku(value)
        if not is_valid_sku_format(normalized):
            raise ValueError("SKU must be 3-50 characters using uppercase letters, digits, and single hyphens.")
        return normalized


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = Field(default=None, min_length=3, max_length=50)
    price: Decimal | None = Field(default=None, ge=0)
    quantity_in_stock: int | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @field_validator("sku")
    @classmethod
    def normalize_and_validate_sku(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = normalize_manual_sku(value)
        if not is_valid_sku_format(normalized):
            raise ValueError("SKU must be 3-50 characters using uppercase letters, digits, and single hyphens.")
        return normalized


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
