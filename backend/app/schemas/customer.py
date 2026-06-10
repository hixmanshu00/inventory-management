from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.common import StrictModel


class CustomerCreate(StrictModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    # Phone is optional; when present it must be non-trivial.
    phone: str | None = Field(default=None, max_length=40)


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str | None
    created_at: datetime
    updated_at: datetime
