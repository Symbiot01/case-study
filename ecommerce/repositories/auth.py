from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ecommerce.keycloak import (
    create_keycloak_user,
    delete_keycloak_user,
    get_user_token,
)
from ecommerce.models import User
from ecommerce.schemas import UserCreate
from . import services


async def signup(user, db):
    # Check whether username already exists locally
    existing_user = db.query(User).filter(User.username == user.username).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    user_role = services.get_role(db, "USER")

    # Create user in Keycloak
    keycloak_user_id = await create_keycloak_user(
        username=user.username,
        password=user.password,
    )

    db_user = User(
        username=user.username,
        keycloak_id=keycloak_user_id,
        role_id=user_role.id,
        tenant_id=None,
    )

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except Exception as exc:
        db.rollback()

        # Delete Keycloak user because local creation failed
        try:
            await delete_keycloak_user(keycloak_user_id)
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create local user: {str(exc)}",
        ) from exc

    return {
        "message": "User signed up successfully",
        "user_id": db_user.id,
        "username": db_user.username,
    }


async def login(user, db: Session):
    services.get_user(db, user.username)
    token_data = await get_user_token(user.username, user.password)
    return services.build_token_response(token_data)


async def tenant_login(tenant_name: str, user: UserCreate, db: Session):
    services.get_tenant(db, tenant_name)
    db_user = services.get_user(db, user.username)
    services.verify_tenant_user(db, db_user, tenant_name)

    token_data = await get_user_token(user.username, user.password)
    return services.build_token_response(token_data)
