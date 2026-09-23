def test_product_catalogue_includes_brand_and_category(client):
    response = client.get("/products/")

    assert response.status_code == 200
    product = response.json()["products"][0]
    assert product["tenant_name"] == "Nike"
    assert product["category_name"] == "Electronics"


def test_product_detail_includes_brand_and_category(client):
    response = client.get("/products/1")

    assert response.status_code == 200
    assert response.json()["tenant_name"] == "Nike"
    assert response.json()["category_name"] == "Electronics"


def test_filter_products_by_brand(client, seed_catalog):
    response = client.get(f"/products/?tenant_id={seed_catalog['tenant'].id}")

    assert response.status_code == 200
    assert response.json()["products"]
    assert all(product["tenant_name"] == "Nike" for product in response.json()["products"])


def test_unknown_brand_filter_returns_404(client):
    response = client.get("/products/?tenant_id=9999")

    assert response.status_code == 404


def test_public_brand_directory_returns_names_only(client):
    response = client.get("/brands")

    assert response.status_code == 200
    brands = response.json()
    assert {"id", "name"} <= set(brands[0].keys())
    assert "users" not in brands[0]
    assert any(brand["name"] == "Nike" for brand in brands)


def test_auth_me_returns_role(authenticated_client, normal_user):
    response = authenticated_client.get("/auth/me")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == normal_user.id
    assert body["username"] == "testuser"
    assert body["role"] == "USER"
    assert body["tenant_id"] is None
    assert body["tenant_name"] is None


def test_auth_me_returns_tenant_for_brand_staff(authenticated_tenant_client):
    response = authenticated_tenant_client.get("/auth/me")

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "TENANT"
    assert body["tenant_name"] == "Nike"


def test_refresh_returns_token_shape(client, monkeypatch):
    async def fake_refresh(refresh_token):
        assert refresh_token == "refresh-token"
        return {
            "access_token": "new-access",
            "refresh_token": "new-refresh",
            "expires_in": 300,
            "token_type": "bearer",
        }

    monkeypatch.setattr(
        "ecommerce.repositories.auth.refresh_user_token",
        fake_refresh,
    )

    response = client.post("/auth/refresh", json={"refresh_token": "refresh-token"})

    assert response.status_code == 200
    assert response.json()["access_token"] == "new-access"
    assert response.json()["refresh_token"] == "new-refresh"


def test_refresh_rejects_blank_token(client):
    response = client.post("/auth/refresh", json={"refresh_token": "   "})

    assert response.status_code == 422


def test_admin_tenant_list_includes_counts(authenticated_admin_client, seed_catalog):
    response = authenticated_admin_client.get("/admin/tenants")

    assert response.status_code == 200
    nike = next(tenant for tenant in response.json() if tenant["name"] == "Nike")
    assert nike["product_count"] == 2
    assert nike["staff_count"] == 0
    assert "keycloak_id" not in nike


def test_order_history_includes_line_names(authenticated_client):
    created = authenticated_client.post(
        "/orders/",
        json={"items": [{"product_id": 1, "quantity": 1}]},
    )
    order_id = created.json()["order_id"]

    response = authenticated_client.get("/orders/")

    assert response.status_code == 200
    order = next(item for item in response.json()["orders"] if item["id"] == order_id)
    assert order["items"][0]["product_name"] == "iPhone 14"
    assert order["items"][0]["quantity"] == 1
