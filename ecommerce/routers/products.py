from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import get_current_user
from ecommerce.repositories import categories, products

router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


# List, search, filter and paginate products
@router.get("/", status_code=status.HTTP_200_OK)
def list_products(
    search: str | None = None,
    category_id: int | None = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    return products.list_products(db, search, category_id, page, limit)


# Favourite products
@router.get("/favourites", status_code=status.HTTP_200_OK)
def list_favourite_products(current_user: User = Depends(get_current_user)):
    return products.list_favourite_products(current_user)


@router.post("/{product_id}/favourite", status_code=status.HTTP_201_CREATED)
def favourite_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return products.favourite_product(db, current_user, product_id)


@router.delete("/{product_id}/favourite", status_code=status.HTTP_204_NO_CONTENT)
def unfavourite_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return products.unfavourite_product(db, current_user, product_id)


@router.get("/categories", status_code=status.HTTP_200_OK)
def list_categories(db: Session = Depends(get_db)):
    return categories.list_categories(db)


@router.get("/categories/{category_id}", status_code=status.HTTP_200_OK)
def list_products_by_category(category_id: int, db: Session = Depends(get_db)):
    return categories.list_by_category(category_id, db)


# Get details of a particular product
@router.get("/{product_id}", status_code=status.HTTP_200_OK)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return products.get_product(db, product_id)
