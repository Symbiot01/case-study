from typing import List, Optional

from pydantic import BaseModel, field_validator


class UserCreate(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        username = value.strip()
        if not username:
            raise ValueError("Username cannot be empty")
        return username


class RefreshRequest(BaseModel):
    refresh_token: str

    @field_validator("refresh_token")
    @classmethod
    def validate_refresh_token(cls, value: str) -> str:
        token = value.strip()
        if not token or len(token) > 8192:
            raise ValueError("Refresh token is invalid")
        return token


class TenantCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_tenant_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Tenant name cannot be empty")
        return name


class CategoryCreate(BaseModel):
    name: str


class ProductCreate(BaseModel):
    name: str
    price: float
    quantity: int
    category_id: int


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    category_id: Optional[int] = None


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
