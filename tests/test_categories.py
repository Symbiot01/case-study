def test_admin_can_create_category(authenticated_admin_client):
    response = authenticated_admin_client.post(
        "/admin/categories",
        json={"name": "Accessories"},
    )

    assert response.status_code == 201
    assert response.json()["category"]["name"] == "Accessories"


def test_admin_can_list_categories(authenticated_admin_client, seed_catalog):
    response = authenticated_admin_client.get("/products/categories")

    assert response.status_code == 200
    names = [category["name"] for category in response.json()]
    assert seed_catalog["category"].name in names


def test_duplicate_category_rejected(authenticated_admin_client):
    authenticated_admin_client.post(
        "/admin/categories",
        json={"name": "Home"},
    )

    response = authenticated_admin_client.post(
        "/admin/categories",
        json={"name": "Home"},
    )

    assert response.status_code == 409


def test_non_admin_cannot_create_category(authenticated_client):
    response = authenticated_client.post(
        "/admin/categories",
        json={"name": "Gaming"},
    )

    assert response.status_code == 403
