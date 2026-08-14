from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ecommerce.models import Product, User
from ecommerce.repositories import services


def list_products(
    db: Session,
    search: str | None = None,
    category_id: int | None = None,
    page: int = 1,
    limit: int = 10,
):
    services.validate_pagination(page, limit)

    query = db.query(Product)

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    if category_id is not None:
        services.get_category(db, category_id)
        query = query.filter(Product.category_id == category_id)

    total = query.count()
    offset = (page - 1) * limit
    products_list = query.offset(offset).limit(limit).all()

    return {
        "products": products_list,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
    }


def list_favourite_products(current_user: User):
    return current_user.favourite_products


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
    return services.get_product(db, product_id)
