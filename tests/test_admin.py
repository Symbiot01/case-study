def test_admin_can_create_tenant(
    authenticated_admin_client,
):
    response = authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Apple"},
    )

    assert response.status_code == 201
    assert response.json()["tenant"]["name"] == "Apple"


def test_duplicate_tenant_rejected(
    authenticated_admin_client,
):
    authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Adidas"},
    )

    response = authenticated_admin_client.post(
        "/admin/tenants",
        json={"name": "Adidas"},
    )

    assert response.status_code == 409


def test_normal_user_cannot_create_tenant(
    authenticated_client,
):
    response = authenticated_client.post(
        "/admin/tenants",
        json={"name": "Dell"},
    )

    assert response.status_code == 403
