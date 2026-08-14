from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import ProductCreate, ProductUpdate
from ..security import get_current_user
from ecommerce.repositories import tenant

router = APIRouter(
    prefix="/{tenant_name}",
    tags=["Tenant"],
)


# Create a product
@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(
    tenant_name: str,
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return tenant.create_product(db, tenant_name, current_user, product)


# List products belonging to this tenant
@router.get("/products", status_code=status.HTTP_200_OK)
def list_products(
    tenant_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 10,
):
    return tenant.list_products(db, tenant_name, current_user, skip, limit)


# Update a product
@router.put("/products/{product_id}", status_code=status.HTTP_200_OK)
def update_product(
    tenant_name: str,
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return tenant.update_product(db, tenant_name, current_user, product_id, product)


# Delete a product
@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    tenant_name: str,
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return tenant.delete_product(db, tenant_name, current_user, product_id)
