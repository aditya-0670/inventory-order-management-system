from pydantic import BaseModel, ConfigDict


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorEnvelope(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    error: dict[str, object]

