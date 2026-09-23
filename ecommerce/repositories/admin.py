import logging

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ecommerce.keycloak import create_keycloak_user, delete_keycloak_user
from ecommerce.models import Product, Tenant, User
from ecommerce.repositories import services
from ecommerce.schemas import TenantCreate, UserCreate

logger = logging.getLogger(__name__)


def create_tenant(db: Session, tenant: TenantCreate):
    existing_tenant = (
        db.query(Tenant).filter(func.lower(Tenant.name) == tenant.name.lower()).first()
    )

    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tenant already exists",
        )

    db_tenant = Tenant(name=tenant.name)
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)

    return {
        "message": "Tenant created successfully",
        "tenant": {
            "id": db_tenant.id,
            "name": db_tenant.name,
        },
    }


def list_tenants(db: Session):
    tenants = db.query(Tenant).order_by(Tenant.name).all()
    product_counts = dict(
        db.query(Product.tenant_id, func.count(Product.id))
        .group_by(Product.tenant_id)
        .all()
    )
    staff_counts = dict(
        db.query(User.tenant_id, func.count(User.id))
        .group_by(User.tenant_id)
        .all()
    )
    return [
        {
            "id": tenant.id,
            "name": tenant.name,
            "product_count": product_counts.get(tenant.id, 0),
            "staff_count": staff_counts.get(tenant.id, 0),
        }
        for tenant in tenants
    ]


def delete_tenant(db: Session, tenant_name: str):
    tenant = services.get_tenant(db, tenant_name)
    db.delete(tenant)
    db.commit()
    return None


async def create_tenant_user(db: Session, tenant_name: str, user: UserCreate):
    tenant = services.get_tenant(db, tenant_name)

    existing_user = (
        db.query(User)
        .filter(func.lower(User.username) == user.username.lower())
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    tenant_role = services.get_role(db, "TENANT")

    keycloak_user_id = await create_keycloak_user(
        username=user.username,
        password=user.password,
    )

    db_user = User(
        username=user.username,
        keycloak_id=keycloak_user_id,
        role_id=tenant_role.id,
        tenant_id=tenant.id,
    )

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except Exception as exc:
        db.rollback()

        try:
            await delete_keycloak_user(keycloak_user_id)
        except Exception:
            pass

        logger.exception("Tenant user creation failed after Keycloak signup")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create tenant user",
        )

    return {
        "message": "Tenant user created successfully",
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "tenant": tenant.name,
            "role": "TENANT",
        },
        "keycloak_user_id": keycloak_user_id,
    }


def list_users(db: Session, tenant_name: str):
    tenant = services.get_tenant(db, tenant_name)
    users = db.query(User).filter(User.tenant_id == tenant.id).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "role": user.role.name if user.role is not None else None,
            "tenant_id": user.tenant_id,
        }
        for user in users
    ]


async def delete_user(db: Session, tenant_name: str, user_id: int):
    tenant = services.get_tenant(db, tenant_name)

    user = services.get_tenant_user(db, tenant.id, user_id)

    if user.keycloak_id:
        await delete_keycloak_user(user.keycloak_id)

    db.delete(user)
    db.commit()
    return None
