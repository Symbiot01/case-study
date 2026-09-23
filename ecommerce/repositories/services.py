import hashlib

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ecommerce.models import Category, Order, Product, Role, Tenant, User


def _one(db: Session, model, *criteria, detail: str, code: int = status.HTTP_404_NOT_FOUND):
    row = db.query(model).filter(*criteria).first()
    if row is None:
        raise HTTPException(status_code=code, detail=detail)
    return row


def get_tenant(db: Session, tenant_name: str):
    return _one(db, Tenant, Tenant.name == tenant_name, detail="Tenant not found")


def get_user(db: Session, username):
    return _one(db, User, User.username == username, detail="User not found")


def get_role(db: Session, role_name: str):
    return _one(
        db,
        Role,
        Role.name == role_name,
        detail=f"{role_name} role has not been configured",
        code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def get_category(db: Session, category_id: int):
    return _one(db, Category, Category.id == category_id, detail="Category not found")


def get_product(db: Session, product_id: int):
    return _one(db, Product, Product.id == product_id, detail="Product not found")


def get_product_for_tenant(db: Session, tenant_id: int, product_id: int):
    return _one(
        db,
        Product,
        Product.id == product_id,
        Product.tenant_id == tenant_id,
        detail="Product not found",
    )


def get_tenant_user(db: Session, tenant_id: int, user_id: int):
    return _one(
        db,
        User,
        User.id == user_id,
        User.tenant_id == tenant_id,
        detail="Tenant user not found",
    )


def get_order_for_user(db: Session, user_id: int, order_id: int):
    return _one(
        db,
        Order,
        Order.id == order_id,
        Order.user_id == user_id,
        detail="Order not found",
    )


def validate_pagination(page: int, limit: int):
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page must be greater than 0",
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100",
        )


def verify_tenant_user(db: Session, user: User, tenant_name: str):
    tenant = get_tenant(db, tenant_name)

    if not user.role or user.role.name != "TENANT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant privileges required",
        )

    if user.tenant_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tenant",
        )

    return tenant


def serialize_product(product: Product) -> dict:
    image_key = product.image_key
    return {
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "quantity": product.quantity,
        "tenant_id": product.tenant_id,
        "category_id": product.category_id,
        "tenant_name": product.tenant.name if product.tenant is not None else None,
        "category_name": product.category.name if product.category is not None else None,
        "has_image": bool(image_key),
        "image_version": _image_version(image_key),
    }


def _image_version(image_key: str | None) -> str | None:
    if not image_key:
        return None
    return hashlib.sha256(image_key.encode("utf-8")).hexdigest()[:12]


def serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "total_quantity": order.total_quantity,
        "total_amount": order.total_amount,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product is not None else None,
                "quantity": item.quantity,
                "price": item.price,
            }
            for item in order.items
        ],
    }


def build_token_response(token_data: dict) -> dict:
    return {
        "access_token": token_data["access_token"],
        "refresh_token": token_data.get("refresh_token"),
        "expires_in": token_data.get("expires_in"),
        "token_type": token_data["token_type"],
    }
