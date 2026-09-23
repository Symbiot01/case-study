import logging
import os

import httpx
from fastapi import HTTPException, status

from ecommerce.env import load_app_env

load_app_env()

logger = logging.getLogger(__name__)


# Keycloak configuration

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET")


if not all(
    [
        KEYCLOAK_URL,
        KEYCLOAK_REALM,
        KEYCLOAK_CLIENT_ID,
        KEYCLOAK_CLIENT_SECRET,
    ]
):
    raise RuntimeError("Keycloak environment variables are not configured")


# Keycloak URLs

KEYCLOAK_TOKEN_URL = (
    f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}" "/protocol/openid-connect/token"
)

KEYCLOAK_ADMIN_URL = f"{KEYCLOAK_URL}/admin/realms/{KEYCLOAK_REALM}"


async def _token_request(form: dict, on_error) -> dict:
    payload = {"client_id": KEYCLOAK_CLIENT_ID, **form}
    if KEYCLOAK_CLIENT_SECRET:
        payload.setdefault("client_secret", KEYCLOAK_CLIENT_SECRET)

    async with httpx.AsyncClient() as client:
        response = await client.post(KEYCLOAK_TOKEN_URL, data=payload)

    if response.status_code != 200:
        on_error(response.status_code)
    return response.json()


def _reject_admin_token(code: int) -> None:
    logger.warning("Keycloak admin authentication failed with status %s", code)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Could not authenticate with Keycloak",
    )


def _reject_user_token(code: int) -> None:
    if code in (400, 401):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Could not authenticate with Keycloak",
    )


def _reject_refresh(_code: int) -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired",
    )


async def get_admin_token():
    token = await _token_request(
        {"grant_type": "client_credentials", "client_secret": KEYCLOAK_CLIENT_SECRET},
        _reject_admin_token,
    )
    return token["access_token"]


async def get_user_token(username: str, password: str):
    return await _token_request(
        {"grant_type": "password", "username": username, "password": password},
        _reject_user_token,
    )


async def refresh_user_token(refresh_token: str):
    return await _token_request(
        {"grant_type": "refresh_token", "refresh_token": refresh_token},
        _reject_refresh,
    )


# Create user in Keycloak


async def create_keycloak_user(
    username: str,
    password: str,
):
    admin_token = await get_admin_token()

    user_data = {
        "username": username,
        "enabled": True,
        "credentials": [
            {
                "type": "password",
                "value": password,
                "temporary": False,
            }
        ],
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{KEYCLOAK_ADMIN_URL}/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    if response.status_code == 409:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists in Keycloak",
        )

    if response.status_code != 201:
        logger.warning(
            "Keycloak user creation failed with status %s",
            response.status_code,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not create user in Keycloak",
        )

    location = response.headers.get("Location")
    if not location:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Keycloak did not return the created user ID",
        )

    return location.rstrip("/").split("/")[-1]


# Delete user from Keycloak


async def delete_keycloak_user(
    keycloak_user_id: str,
    admin_token: str | None = None,
):

    if admin_token is None:
        admin_token = await get_admin_token()

    async with httpx.AsyncClient() as client:

        response = await client.delete(
            f"{KEYCLOAK_ADMIN_URL}/users/{keycloak_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    if response.status_code not in (204, 404):
        logger.warning(
            "Keycloak user deletion failed with status %s",
            response.status_code,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not delete user from Keycloak",
        )
