from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.order import OrderStatus
from app.schemas.common import StrictModel


class OrderItemCreate(StrictModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class OrderCreate(StrictModel):
    customer_id: int = Field(gt=0)
    # Note: there is deliberately no total_amount field here. The total is always
    # computed by the server from live product prices, never accepted from the
    # client. extra="forbid" means a client that tries to send one gets a 422.
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    customer_name: str = ""
    status: OrderStatus
    total_amount: Decimal
    items: list[OrderItemRead]
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def pull_customer_name(cls, data: Any) -> Any:
        # When deserialising from an ORM instance the customer relationship is
        # already selectin-loaded; grab the name so the API response includes it
        # without requiring a separate customer lookup on the client.
        if hasattr(data, "customer") and data.customer:
            data.__dict__.setdefault("customer_name", data.customer.full_name)
        return data
