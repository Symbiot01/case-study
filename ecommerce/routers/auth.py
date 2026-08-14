from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session

from ecommerce.database import get_db
from ecommerce.schemas import UserCreate
from ecommerce.repositories import auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Normal user signup
@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    return await auth.signup(user, db)


# Normal user login
@router.post("/login", status_code=status.HTTP_200_OK)
async def login(user: UserCreate, db: Session = Depends(get_db)):
    return await auth.login(user, db)


# Tenant user login
@router.post(
    "/{tenant_name}/login",
    status_code=status.HTTP_200_OK,
)
async def tenant_login(
    tenant_name: str, user: UserCreate, db: Session = Depends(get_db)
):
    return await auth.tenant_login(tenant_name, user, db)
