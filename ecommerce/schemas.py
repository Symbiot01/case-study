from pydantic import BaseModel, ConfigDict
from typing import List, Optional

# ROLE


class RoleResponse(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


# USER


class UserCreate(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    role_id: int
    tenant_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# TENANT


class TenantCreate(BaseModel):
    name: str


class TenantResponse(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


# CATEGORY


class CategoryCreate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


# PRODUCT


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


class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    tenant_id: int
    category_id: int

    model_config = ConfigDict(from_attributes=True)


# ORDER ITEM


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: float

    model_config = ConfigDict(from_attributes=True)


# ORDER


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]


class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_quantity: int
    total_amount: float
    items: List[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)


# FAVOURITES


class FavouriteProductResponse(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    tenant_id: int
    category_id: int

    model_config = ConfigDict(from_attributes=True)
