def test_admin_can_create_tenant(authenticated_admin_client):
    response = authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Apple"},
    )

    assert response.status_code == 201
    assert response.json()["tenant"]["name"] == "Apple"


def test_admin_can_list_tenants(authenticated_admin_client):
    response = authenticated_admin_client.get("/admin/tenants")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_admin_can_delete_tenant(authenticated_admin_client):
    authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Lenovo"},
    )

    response = authenticated_admin_client.delete("/admin/tenants/Lenovo")
    assert response.status_code == 204

    tenants = authenticated_admin_client.get("/admin/tenants")
    assert all(tenant["name"] != "Lenovo" for tenant in tenants.json())


def test_duplicate_tenant_rejected(authenticated_admin_client):
    authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Adidas"},
    )

    response = authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Adidas"},
    )

    assert response.status_code == 409


def test_admin_can_create_tenant_user(authenticated_admin_client, monkeypatch):
    async def fake_create_keycloak_user(username, password, tenant_name=None):
        return "fake-tenant-keycloak-id"

    monkeypatch.setattr(
        "ecommerce.repositories.admin.create_keycloak_user",
        fake_create_keycloak_user,
    )

    authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Nike"},
    )

    response = authenticated_admin_client.post(
        "/admin/tenants/Nike/users",
        json={"username": "tenant_user", "password": "password123"},
    )

    assert response.status_code == 201
    assert response.json()["user"]["username"] == "tenant_user"


def test_duplicate_tenant_user_rejected(authenticated_admin_client, monkeypatch):
    async def fake_create_keycloak_user(username, password, tenant_name=None):
        return "fake-keycloak-id"

    monkeypatch.setattr(
        "ecommerce.repositories.admin.create_keycloak_user",
        fake_create_keycloak_user,
    )

    authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Tesla"},
    )

    authenticated_admin_client.post(
        "/admin/tenants/Tesla/users",
        json={"username": "tenant_user_2", "password": "password123"},
    )

    response = authenticated_admin_client.post(
        "/admin/tenants/Tesla/users",
        json={"username": "tenant_user_2", "password": "password123"},
    )

    assert response.status_code == 409


def test_normal_user_cannot_create_tenant(authenticated_client):
    response = authenticated_client.post(
        "/admin/tenants",
        json={"name": "Dell"},
    )

    assert response.status_code == 403
