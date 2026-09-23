import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from ecommerce.models import Product, Tenant, User
from ecommerce.repositories import services
from ecommerce.storage import ALLOWED_CONTENT_TYPES, ObjectNotFound, ObjectStore, StorageError

logger = logging.getLogger(__name__)


def list_products(
    db: Session,
    search: str | None = None,
    category_id: int | None = None,
    tenant_id: int | None = None,
    page: int = 1,
    limit: int = 10,
):
    services.validate_pagination(page, limit)

    query = db.query(Product).options(
        selectinload(Product.tenant),
        selectinload(Product.category),
    )

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    if category_id is not None:
        services.get_category(db, category_id)
        query = query.filter(Product.category_id == category_id)

    if tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if tenant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found",
            )
        query = query.filter(Product.tenant_id == tenant_id)

    total = query.count()
    offset = (page - 1) * limit
    products_list = query.offset(offset).limit(limit).all()

    return {
        "products": [services.serialize_product(product) for product in products_list],
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
    }


def list_favourite_products(current_user: User):
    return [services.serialize_product(product) for product in current_user.favourite_products]


def favourite_product(db: Session, current_user: User, product_id: int):
    product = services.get_product(db, product_id)

    if product in current_user.favourite_products:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product is already in favourites",
        )

    current_user.favourite_products.append(product)
    db.commit()

    return {
        "message": "Product added to favourites",
        "product_id": product.id,
    }


def unfavourite_product(db: Session, current_user: User, product_id: int):
    product = services.get_product(db, product_id)

    if product not in current_user.favourite_products:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product is not in your favourites",
        )

    current_user.favourite_products.remove(product)
    db.commit()
    return None


def get_product(db: Session, product_id: int):
    return services.serialize_product(services.get_product(db, product_id))


def get_product_image(db: Session, product_id: int, store: ObjectStore) -> tuple[bytes, str]:
    product = services.get_product(db, product_id)
    media_type = product.image_content_type
    if not product.image_key or media_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )
    try:
        body, _stored_type = store.get(product.image_key)
    except ObjectNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )
    except StorageError:
        logger.exception("failed to read product image")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage is unavailable",
        )
    return body, media_type


def list_brands(db: Session):
    tenants = db.query(Tenant).order_by(Tenant.name).all()
    return [{"id": tenant.id, "name": tenant.name} for tenant in tenants]
