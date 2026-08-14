from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ecommerce.models import Category, Product
from ecommerce.repositories import services
from ecommerce.schemas import CategoryCreate


def create(category: CategoryCreate, db: Session):
    existing_category = (
        db.query(Category).filter(Category.name == category.name).first()
    )

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )

    db_category = Category(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)

    return {
        "message": "Category created successfully",
        "category": db_category,
    }


def list_by_category(category_id: int, db: Session):
    category = services.get_category(db, category_id)
    products = db.query(Product).filter(Product.category_id == category_id).all()

    return {
        "category": category,
        "products": products,
    }


def list_categories(db: Session):
    return db.query(Category).all()
