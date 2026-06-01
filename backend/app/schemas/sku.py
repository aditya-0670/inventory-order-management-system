from pydantic import BaseModel, ConfigDict


class SkuSuggestionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sku: str
    available: bool
    reason: str


class SkuSuggestionsResponse(BaseModel):
    base_sku: str
    suggestions: list[SkuSuggestionItem]


class SkuAvailabilityResponse(BaseModel):
    sku: str
    available: bool
