from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session

from ecommerce.database import get_db
from ecommerce.models import User
from ecommerce.schemas import RefreshRequest, UserCreate
from ecommerce.security import get_current_user
from ecommerce.repositories import auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    return await auth.signup(user, db)


@router.post("/login")
async def login(user: UserCreate, db: Session = Depends(get_db)):
    return await auth.login(user, db)


@router.post("/{tenant_name}/login")
async def tenant_login(
    tenant_name: str, user: UserCreate, db: Session = Depends(get_db)
):
    return await auth.tenant_login(tenant_name, user, db)


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return auth.current_user_profile(current_user)


@router.post("/refresh")
async def refresh(body: RefreshRequest):
    return await auth.refresh(body.refresh_token)
