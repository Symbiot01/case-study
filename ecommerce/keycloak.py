import os

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, status

load_dotenv()


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


# Get service-account token


async def get_admin_token():
    data = {
        "grant_type": "client_credentials",
        "client_id": KEYCLOAK_CLIENT_ID,
        "client_secret": KEYCLOAK_CLIENT_SECRET,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            KEYCLOAK_TOKEN_URL,
            data=data,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Could not authenticate with Keycloak: "
                f"status={response.status_code}, "
                f"response={response.text}"
            ),
        )

    return response.json()["access_token"]


async def get_user_token(username: str, password: str):
    data = {
        "grant_type": "password",
        "client_id": KEYCLOAK_CLIENT_ID,
        "username": username,
        "password": password,
    }

    if KEYCLOAK_CLIENT_SECRET:
        data["client_secret"] = KEYCLOAK_CLIENT_SECRET

    async with httpx.AsyncClient() as client:
        response = await client.post(
            KEYCLOAK_TOKEN_URL,
            data=data,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Keycloak login failed: "
                f"status={response.status_code}, "
                f"response={response.text}"
            ),
        )

    return response.json()


# Create user in Keycloak


async def create_keycloak_user(
    username: str,
    password: str,
    tenant_name: str | None = None,
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

    if tenant_name is not None:
        user_data["attributes"] = {"tenant_name": [tenant_name]}

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
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Could not create user in Keycloak: "
                f"status={response.status_code}, "
                f"response={response.text}"
            ),
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
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Could not delete user from Keycloak: "
                f"status={response.status_code}, "
                f"response={response.text}"
            ),
        )
