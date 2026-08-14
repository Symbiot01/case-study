from sqlalchemy.orm import Session

from ecommerce.models import Product, User
from ecommerce.repositories import services
from ecommerce.schemas import ProductCreate, ProductUpdate


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
        "product": db_product,
    }


def list_products(
    db: Session, tenant_name: str, current_user: User, skip: int = 0, limit: int = 10
):
    tenant = services.verify_tenant_user(db, current_user, tenant_name)

    return (
        db.query(Product)
        .filter(Product.tenant_id == tenant.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


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
        "product": db_product,
    }


def delete_product(db: Session, tenant_name: str, current_user: User, product_id: int):
    tenant = services.verify_tenant_user(db, current_user, tenant_name)

    db_product = services.get_product_for_tenant(db, tenant.id, product_id)

    db.delete(db_product)
    db.commit()

    return None
