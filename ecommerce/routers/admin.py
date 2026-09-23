from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session

from ecommerce.database import get_db
from ecommerce.schemas import TenantCreate, UserCreate, CategoryCreate
from ecommerce.security import require_admin
from ecommerce.repositories import admin, categories

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.post("/tenants", status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant: TenantCreate,
    db: Session = Depends(get_db),
    credentials=Depends(require_admin),
):
    return admin.create_tenant(db, tenant)


@router.get("/tenants")
def list_tenants(db: Session = Depends(get_db), credentials=Depends(require_admin)):
    return admin.list_tenants(db)


@router.delete("/tenants/{tenant_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_name: str, db: Session = Depends(get_db), credentials=Depends(require_admin)
):
    return admin.delete_tenant(db, tenant_name)


@router.post("/tenants/{tenant_name}/users", status_code=status.HTTP_201_CREATED)
async def create_tenant_user(
    tenant_name: str,
    user: UserCreate,
    db: Session = Depends(get_db),
    credentials=Depends(require_admin),
):
    return await admin.create_tenant_user(db, tenant_name, user)


@router.get("/tenants/{tenant_name}/users")
def list_users(
    tenant_name: str, db: Session = Depends(get_db), credentials=Depends(require_admin)
):
    return admin.list_users(db, tenant_name)


@router.delete(
    "/tenants/{tenant_name}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_user(
    tenant_name: str,
    user_id: int,
    db: Session = Depends(get_db),
    credentials=Depends(require_admin),
):
    return await admin.delete_user(db, tenant_name, user_id)


@router.post(
    "/categories",
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return categories.create(category, db)
