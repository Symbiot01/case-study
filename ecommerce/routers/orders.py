from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import OrderCreate
from ..security import get_current_user
from ecommerce.repositories import orders

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


# Create an order
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return orders.create_order(db, current_user, order)


# Get current user's order history
@router.get("/", status_code=status.HTTP_200_OK)
def list_orders(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return orders.list_orders(db, current_user, page, limit)


# Get details of a specific order
@router.get(
    "/{order_id}",
    status_code=status.HTTP_200_OK,
)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return orders.get_order(db, current_user, order_id)
