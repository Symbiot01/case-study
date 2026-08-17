def test_admin_can_create_category(authenticated_admin_client):
    response = authenticated_admin_client.post(
        "/admin/categories",
        json={"name": "Accessories"},
    )

    assert response.status_code == 201


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
