from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import get_current_user
from ..storage import ObjectStore, get_object_store
from ecommerce.repositories import categories, products

router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.get("/")
def list_products(
    search: str | None = None,
    category_id: int | None = None,
    tenant_id: int | None = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    return products.list_products(db, search, category_id, tenant_id, page, limit)


@router.get("/favourites")
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


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return categories.list_categories(db)


@router.get("/{product_id}/image")
def get_product_image(
    product_id: int,
    db: Session = Depends(get_db),
    store: ObjectStore = Depends(get_object_store),
):
    body, media_type = products.get_product_image(db, product_id, store)
    return Response(
        content=body,
        media_type=media_type,
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
        },
    )


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    return products.get_product(db, product_id)
