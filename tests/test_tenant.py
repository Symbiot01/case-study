def test_tenant_can_create_product(
    authenticated_tenant_client,
):
    response = authenticated_tenant_client.post(
        "/Nike/products",
        json={
            "name": "Air Max",
            "price": 12000,
            "quantity": 20,
            "category_id": 1,
        },
    )

    assert response.status_code == 201


def test_tenant_cannot_access_another_tenant(
    authenticated_tenant_client,
):
    response = authenticated_tenant_client.post(
        "/Samsung/products",
        json={
            "name": "Galaxy",
            "price": 50000,
            "quantity": 10,
            "category_id": 1,
        },
    )

    assert response.status_code == 403


def test_tenant_cannot_update_other_tenant_product(
    authenticated_tenant_client,
):
    response = authenticated_tenant_client.put(
        "/Nike/products/999",
        json={
            "price": 100,
        },
    )

    assert response.status_code == 404
