from fastapi import status

from app.core.exceptions import AppError
from app.repositories.product_repository import ProductRepository
from app.schemas.sku import SkuAvailabilityResponse, SkuSuggestionItem, SkuSuggestionsResponse
from app.utils.sku_generator import (
    MAX_SKU_LENGTH,
    generate_sequential_skus,
    is_valid_sku_format,
    normalize_manual_sku,
    normalize_sku_base,
)

DEFAULT_SUGGESTION_LIMIT = 5
MAX_SUGGESTION_LIMIT = 10
MAX_SCAN_COUNT = 250
SUGGESTION_REASON = "Name-based sequential suggestion"


class SkuValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "VALIDATION_ERROR"
    message = "Request validation failed"


class SkuService:
    def __init__(self, product_repository: ProductRepository):
        self.product_repository = product_repository

    def generate_sku_suggestions(self, name: str, limit: int = DEFAULT_SUGGESTION_LIMIT) -> SkuSuggestionsResponse:
        suggestion_limit = min(max(limit, 1), MAX_SUGGESTION_LIMIT)
        base_sku = self._normalize_or_raise(name, field="name")
        suggestions: list[SkuSuggestionItem] = []
        suffix = 1

        while len(suggestions) < suggestion_limit and suffix <= MAX_SCAN_COUNT:
            candidate = generate_sequential_skus(base_sku, suffix)[-1]
            if len(candidate) <= MAX_SKU_LENGTH and not self.product_repository.sku_exists(candidate):
                suggestions.append(
                    SkuSuggestionItem(
                        sku=candidate,
                        available=True,
                        reason=SUGGESTION_REASON,
                    )
                )
            suffix += 1

        return SkuSuggestionsResponse(base_sku=base_sku, suggestions=suggestions)

    def check_sku_availability(self, sku: str, *, exclude_product_id: int | None = None) -> SkuAvailabilityResponse:
        normalized_sku = self._normalize_or_raise(sku, field="sku")
        return SkuAvailabilityResponse(
            sku=normalized_sku,
            available=not self.product_repository.sku_exists(
                normalized_sku,
                exclude_product_id=exclude_product_id,
            ),
        )

    def _normalize_or_raise(self, value: str, *, field: str) -> str:
        try:
            normalized = normalize_manual_sku(value) if field == "sku" else normalize_sku_base(value)
        except ValueError as exc:
            raise SkuValidationError(
                details=[{"field": field, "message": str(exc)}],
            ) from exc

        if not is_valid_sku_format(normalized):
            raise SkuValidationError(
                details=[
                    {
                        "field": field,
                        "message": "SKU must be 3-50 characters using uppercase letters, digits, and single hyphens.",
                    }
                ],
            )

        return normalized
