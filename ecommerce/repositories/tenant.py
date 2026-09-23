import logging

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from ecommerce.images import build_object_key, prepare_image, read_upload
from ecommerce.models import Product, User
from ecommerce.repositories import services
from ecommerce.schemas import ProductCreate, ProductUpdate
from ecommerce.storage import ObjectStore, StorageError

logger = logging.getLogger(__name__)


def create_product(
    db: Session, tenant_name: str, current_user: User, product: ProductCreate
):
    tenant = services.verify_tenant_user(db, current_user, tenant_name)
    services.get_category(db, product.category_id)

    db_product = Product(
        name=product.name,
        price=product.price,
        quantity=product.quantity,
        category_id=product.category_id,
        tenant_id=tenant.id,
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    return {
        "message": "Product created successfully",
        "product": services.serialize_product(db_product),
    }


def list_products(
    db: Session, tenant_name: str, current_user: User, skip: int = 0, limit: int = 10
):
    tenant = services.verify_tenant_user(db, current_user, tenant_name)

    products = (
        db.query(Product)
        .options(selectinload(Product.category), selectinload(Product.tenant))
        .filter(Product.tenant_id == tenant.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [services.serialize_product(product) for product in products]


def update_product(
    db: Session,
    tenant_name: str,
    current_user: User,
    product_id: int,
    product: ProductUpdate,
):
    tenant = services.verify_tenant_user(db, current_user, tenant_name)

    db_product = services.get_product_for_tenant(db, tenant.id, product_id)

    update_data = product.model_dump(exclude_unset=True)

    if "category_id" in update_data:
        services.get_category(db, update_data["category_id"])

    for field, value in update_data.items():
        setattr(db_product, field, value)

    db.commit()
    db.refresh(db_product)

    return {
        "message": "Product updated successfully",
        "product": services.serialize_product(db_product),
    }


def delete_product(
    db: Session,
    tenant_name: str,
    current_user: User,
    product_id: int,
    store: ObjectStore,
):
    tenant = services.verify_tenant_user(db, current_user, tenant_name)

    db_product = services.get_product_for_tenant(db, tenant.id, product_id)
    image_key = db_product.image_key

    db.delete(db_product)
    db.commit()
    _delete_stored_image(store, image_key, product_id)

    return None


def save_product_image(
    db: Session,
    tenant_name: str,
    current_user: User,
    product_id: int,
    upload: UploadFile,
    store: ObjectStore,
):
    tenant = services.verify_tenant_user(db, current_user, tenant_name)
    product = services.get_product_for_tenant(db, tenant.id, product_id)
    encoded, content_type, ext = prepare_image(read_upload(upload))
    key = build_object_key(tenant.id, product.id, ext)
    previous = product.image_key

    try:
        store.put(key, encoded, content_type)
    except StorageError:
        logger.exception("failed to store product image")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage is unavailable",
        )

    product.image_key = key
    product.image_content_type = content_type
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("failed to save product image")
        _delete_stored_image(store, key, product.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the image.",
        )

    db.refresh(product)
    if previous:
        _delete_stored_image(store, previous, product.id)

    return {
        "message": "Product image saved",
        "product": services.serialize_product(product),
    }


def delete_product_image(
    db: Session,
    tenant_name: str,
    current_user: User,
    product_id: int,
    store: ObjectStore,
):
    tenant = services.verify_tenant_user(db, current_user, tenant_name)
    product = services.get_product_for_tenant(db, tenant.id, product_id)
    previous = product.image_key
    if not previous:
        return None

    product.image_key = None
    product.image_content_type = None
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("failed to remove product image")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not remove the image.",
        )

    _delete_stored_image(store, previous, product.id)
    return None


def _delete_stored_image(store: ObjectStore, key: str | None, product_id: int) -> None:
    if not key:
        return
    try:
        store.delete(key)
    except StorageError:
        logger.exception("failed to delete stored image for product %s", product_id)
