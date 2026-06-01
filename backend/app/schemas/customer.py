from datetime import datetime

import phonenumbers
from phonenumbers import NumberParseException
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CustomerBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone_number: str = Field(min_length=1, max_length=20)

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        try:
            parsed = phonenumbers.parse(value, None)
        except NumberParseException as exc:
            raise ValueError("Enter a valid phone number in international format.") from exc

        if not phonenumbers.is_possible_number(parsed):
            raise ValueError("Phone number length is not possible.")

        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("Phone number is not valid for the selected country.")

        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone_number: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
