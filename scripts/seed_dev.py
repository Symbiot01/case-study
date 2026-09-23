"""Create the local Keycloak realm and matching application records.

Reads and, on first run, writes .env.dev. Safe to run again.
"""

import secrets
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env.dev"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def generate(nbytes: int = 18) -> str:
    return secrets.token_urlsafe(nbytes)


def read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key] = value
    return values


def write_env(values: dict[str, str]) -> None:
    lines = [
        "# Local development only. Gitignored.",
        f"KEYCLOAK_URL={values['KEYCLOAK_URL']}",
        f"KEYCLOAK_REALM={values['KEYCLOAK_REALM']}",
        f"KEYCLOAK_CLIENT_ID={values['KEYCLOAK_CLIENT_ID']}",
        f"KEYCLOAK_CLIENT_SECRET={values['KEYCLOAK_CLIENT_SECRET']}",
        f"CORS_ORIGINS={values['CORS_ORIGINS']}",
        "",
        f"KEYCLOAK_ADMIN={values['KEYCLOAK_ADMIN']}",
        f"KEYCLOAK_ADMIN_PASSWORD={values['KEYCLOAK_ADMIN_PASSWORD']}",
        "",
        f"SEED_ADMIN_USERNAME={values['SEED_ADMIN_USERNAME']}",
        f"SEED_ADMIN_PASSWORD={values['SEED_ADMIN_PASSWORD']}",
        f"SEED_SHOPPER_USERNAME={values['SEED_SHOPPER_USERNAME']}",
        f"SEED_SHOPPER_PASSWORD={values['SEED_SHOPPER_PASSWORD']}",
        f"SEED_TENANT_USERNAME={values['SEED_TENANT_USERNAME']}",
        f"SEED_TENANT_PASSWORD={values['SEED_TENANT_PASSWORD']}",
        f"SEED_TENANT_NAME={values['SEED_TENANT_NAME']}",
        "",
    ]
    ENV_PATH.write_text("\n".join(lines))


def ensure_env() -> dict[str, str]:
    current = read_env(ENV_PATH)
    values = {
        "KEYCLOAK_URL": current.get("KEYCLOAK_URL") or "http://localhost:8080",
        "KEYCLOAK_REALM": current.get("KEYCLOAK_REALM") or "ecommerce",
        "KEYCLOAK_CLIENT_ID": current.get("KEYCLOAK_CLIENT_ID") or "ecommerce-api",
        "KEYCLOAK_CLIENT_SECRET": current.get("KEYCLOAK_CLIENT_SECRET") or generate(32),
        "CORS_ORIGINS": current.get("CORS_ORIGINS") or "http://localhost:5173",
        "KEYCLOAK_ADMIN": current.get("KEYCLOAK_ADMIN") or "admin",
        "KEYCLOAK_ADMIN_PASSWORD": current.get("KEYCLOAK_ADMIN_PASSWORD") or generate(),
        "SEED_ADMIN_USERNAME": current.get("SEED_ADMIN_USERNAME") or "admin",
        "SEED_ADMIN_PASSWORD": current.get("SEED_ADMIN_PASSWORD") or generate(),
        "SEED_SHOPPER_USERNAME": current.get("SEED_SHOPPER_USERNAME") or "shopper",
        "SEED_SHOPPER_PASSWORD": current.get("SEED_SHOPPER_PASSWORD") or generate(),
        "SEED_TENANT_USERNAME": current.get("SEED_TENANT_USERNAME") or "ilse",
        "SEED_TENANT_PASSWORD": current.get("SEED_TENANT_PASSWORD") or generate(),
        "SEED_TENANT_NAME": current.get("SEED_TENANT_NAME") or "Studio Ilse",
    }
    write_env(values)
    return values


def wait_until_ready(base_url: str) -> None:
    url = f"{base_url}/realms/master/.well-known/openid-configuration"
    deadline = time.time() + 180
    last_error = "Keycloak did not respond"
    while time.time() < deadline:
        try:
            response = httpx.get(url, timeout=5)
            if response.status_code == 200:
                return
            last_error = f"status {response.status_code}"
        except httpx.HTTPError as exc:
            last_error = str(exc)
        time.sleep(3)
    raise RuntimeError(f"Keycloak did not become ready: {last_error}")


def admin_token(client: httpx.Client, base_url: str, username: str, password: str) -> str:
    response = client.post(
        f"{base_url}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": username,
            "password": password,
        },
    )
    if response.status_code != 200:
        raise RuntimeError("Could not sign in to the Keycloak admin console")
    return response.json()["access_token"]


def request(client: httpx.Client, method: str, url: str, token: str, **kwargs) -> httpx.Response:
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    response = client.request(method, url, headers=headers, **kwargs)
    if response.status_code >= 400:
        raise RuntimeError(f"Keycloak admin call failed: {method} {url} -> {response.status_code}")
    return response


def ensure_realm(client: httpx.Client, base_url: str, token: str, realm: str) -> None:
    existing = client.get(
        f"{base_url}/admin/realms/{realm}",
        headers={"Authorization": f"Bearer {token}"},
    )
    if existing.status_code == 200:
        return
    if existing.status_code != 404:
        raise RuntimeError(f"Could not read realm {realm}")
    request(
        client,
        "POST",
        f"{base_url}/admin/realms",
        token,
        json={"realm": realm, "enabled": True},
    )


def find_client(client: httpx.Client, base_url: str, token: str, realm: str, client_id: str) -> dict | None:
    response = request(
        client,
        "GET",
        f"{base_url}/admin/realms/{realm}/clients",
        token,
        params={"clientId": client_id},
    )
    matches = [item for item in response.json() if item.get("clientId") == client_id]
    return matches[0] if matches else None


def relax_user_profile(client: httpx.Client, base_url: str, token: str, realm: str) -> None:
    """Signup only collects a username and password, so profile fields stay optional."""
    profile = request(client, "GET", f"{base_url}/admin/realms/{realm}/users/profile", token).json()
    for attribute in profile.get("attributes", []):
        if attribute.get("name") in {"email", "firstName", "lastName"}:
            attribute["required"] = None
    request(client, "PUT", f"{base_url}/admin/realms/{realm}/users/profile", token, json=profile)


def ensure_api_client(
    client: httpx.Client,
    base_url: str,
    token: str,
    realm: str,
    client_id: str,
    secret: str,
) -> str:
    payload = {
        "clientId": client_id,
        "enabled": True,
        "protocol": "openid-connect",
        "publicClient": False,
        "secret": secret,
        "serviceAccountsEnabled": True,
        "directAccessGrantsEnabled": True,
        "standardFlowEnabled": True,
        "implicitFlowEnabled": False,
        "fullScopeAllowed": True,
        "redirectUris": ["http://localhost:5173/*"],
        "webOrigins": ["http://localhost:5173"],
    }
    current = find_client(client, base_url, token, realm, client_id)
    if current is None:
        request(client, "POST", f"{base_url}/admin/realms/{realm}/clients", token, json=payload)
        current = find_client(client, base_url, token, realm, client_id)
    else:
        payload["id"] = current["id"]
        request(
            client,
            "PUT",
            f"{base_url}/admin/realms/{realm}/clients/{current['id']}",
            token,
            json=payload,
        )
    if current is None:
        raise RuntimeError("Keycloak did not return the API client")
    return current["id"]


def ensure_service_account_roles(
    client: httpx.Client,
    base_url: str,
    token: str,
    realm: str,
    api_client_uuid: str,
) -> None:
    account = request(
        client,
        "GET",
        f"{base_url}/admin/realms/{realm}/clients/{api_client_uuid}/service-account-user",
        token,
    ).json()
    realm_management = find_client(client, base_url, token, realm, "realm-management")
    if realm_management is None:
        raise RuntimeError("realm-management client is missing")
    role_names = ["manage-users", "view-users", "query-users"]
    roles = []
    for name in role_names:
        role = request(
            client,
            "GET",
            f"{base_url}/admin/realms/{realm}/clients/{realm_management['id']}/roles/{name}",
            token,
        ).json()
        roles.append(role)
    request(
        client,
        "POST",
        (
            f"{base_url}/admin/realms/{realm}/users/{account['id']}"
            f"/role-mappings/clients/{realm_management['id']}"
        ),
        token,
        json=roles,
    )


def ensure_user(
    client: httpx.Client,
    base_url: str,
    token: str,
    realm: str,
    username: str,
    password: str,
) -> str:
    response = client.get(
        f"{base_url}/admin/realms/{realm}/users",
        headers={"Authorization": f"Bearer {token}"},
        params={"username": username, "exact": "true"},
    )
    if response.status_code != 200:
        raise RuntimeError(f"Could not look up user {username}")
    matches = response.json()
    if matches:
        user_id = matches[0]["id"]
    else:
        created = request(
            client,
            "POST",
            f"{base_url}/admin/realms/{realm}/users",
            token,
            json={"username": username, "enabled": True, "emailVerified": True},
        )
        location = created.headers.get("Location", "")
        user_id = location.rstrip("/").split("/")[-1]
        if not user_id:
            raise RuntimeError(f"Keycloak did not return an id for {username}")
    request(
        client,
        "PUT",
        f"{base_url}/admin/realms/{realm}/users/{user_id}/reset-password",
        token,
        json={"type": "password", "value": password, "temporary": False},
    )
    return user_id


def seed_database(env: dict[str, str], user_ids: dict[str, str]) -> None:
    from ecommerce.database import SessionLocal
    from ecommerce.models import Category, Product, Role, Tenant, User

    db = SessionLocal()
    try:
        roles = {}
        for name in ("ADMIN", "TENANT", "USER"):
            role = db.query(Role).filter(Role.name == name).one_or_none()
            if role is None:
                role = Role(name=name)
                db.add(role)
                db.flush()
            roles[name] = role

        tenant_name = env["SEED_TENANT_NAME"]
        tenant = db.query(Tenant).filter(Tenant.name == tenant_name).one_or_none()
        if tenant is None:
            tenant = Tenant(name=tenant_name)
            db.add(tenant)
            db.flush()

        category = db.query(Category).filter(Category.name == "Ceramics").one_or_none()
        if category is None:
            category = Category(name="Ceramics")
            db.add(category)
            db.flush()

        existing_product = (
            db.query(Product)
            .filter(Product.name == "Form No. 04 Vessel", Product.tenant_id == tenant.id)
            .one_or_none()
        )
        if existing_product is None:
            db.add(
                Product(
                    name="Form No. 04 Vessel",
                    price=180,
                    quantity=4,
                    category_id=category.id,
                    tenant_id=tenant.id,
                )
            )

        accounts = [
            (env["SEED_ADMIN_USERNAME"], "ADMIN", None),
            (env["SEED_SHOPPER_USERNAME"], "USER", None),
            (env["SEED_TENANT_USERNAME"], "TENANT", tenant.id),
        ]
        for username, role_name, tenant_id in accounts:
            user = db.query(User).filter(User.username == username).one_or_none()
            if user is None:
                user = User(
                    username=username,
                    role_id=roles[role_name].id,
                    tenant_id=tenant_id,
                    keycloak_id=user_ids[username],
                )
                db.add(user)
            else:
                user.role_id = roles[role_name].id
                user.tenant_id = tenant_id
                user.keycloak_id = user_ids[username]
        db.commit()
    finally:
        db.close()


def check_password_grant(base_url: str, env: dict[str, str]) -> None:
    response = httpx.post(
        f"{base_url}/realms/{env['KEYCLOAK_REALM']}/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": env["KEYCLOAK_CLIENT_ID"],
            "client_secret": env["KEYCLOAK_CLIENT_SECRET"],
            "username": env["SEED_SHOPPER_USERNAME"],
            "password": env["SEED_SHOPPER_PASSWORD"],
        },
        timeout=20,
    )
    if response.status_code != 200 or "access_token" not in response.json():
        raise RuntimeError("Seeded shopper could not sign in")


def main() -> None:
    env = ensure_env()
    base_url = env["KEYCLOAK_URL"].rstrip("/")
    wait_until_ready(base_url)
    with httpx.Client(timeout=30) as client:
        token = admin_token(client, base_url, env["KEYCLOAK_ADMIN"], env["KEYCLOAK_ADMIN_PASSWORD"])
        ensure_realm(client, base_url, token, env["KEYCLOAK_REALM"])
        relax_user_profile(client, base_url, token, env["KEYCLOAK_REALM"])
        client_uuid = ensure_api_client(
            client,
            base_url,
            token,
            env["KEYCLOAK_REALM"],
            env["KEYCLOAK_CLIENT_ID"],
            env["KEYCLOAK_CLIENT_SECRET"],
        )
        ensure_service_account_roles(client, base_url, token, env["KEYCLOAK_REALM"], client_uuid)
        user_ids = {
            env["SEED_ADMIN_USERNAME"]: ensure_user(
                client,
                base_url,
                token,
                env["KEYCLOAK_REALM"],
                env["SEED_ADMIN_USERNAME"],
                env["SEED_ADMIN_PASSWORD"],
            ),
            env["SEED_SHOPPER_USERNAME"]: ensure_user(
                client,
                base_url,
                token,
                env["KEYCLOAK_REALM"],
                env["SEED_SHOPPER_USERNAME"],
                env["SEED_SHOPPER_PASSWORD"],
            ),
            env["SEED_TENANT_USERNAME"]: ensure_user(
                client,
                base_url,
                token,
                env["KEYCLOAK_REALM"],
                env["SEED_TENANT_USERNAME"],
                env["SEED_TENANT_PASSWORD"],
            ),
        }
    seed_database(env, user_ids)
    check_password_grant(base_url, env)
    print("Local Keycloak realm, client, and application users are ready.")
    print(f"Settings written to {ENV_PATH.name}")


if __name__ == "__main__":
    main()
