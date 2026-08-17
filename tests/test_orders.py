def test_create_order(
    authenticated_client,
):
    response = authenticated_client.post(
        "/orders/",
        json={
            "items": [
                {
                    "product_id": 1,
                    "quantity": 2,
                }
            ]
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["total_quantity"] == 2


def test_order_quantity_cannot_exceed_stock(
    authenticated_client,
):
    response = authenticated_client.post(
        "/orders/",
        json={
            "items": [
                {
                    "product_id": 1,
                    "quantity": 999999,
                }
            ]
        },
    )

    assert response.status_code == 400


def test_order_nonexistent_product(
    authenticated_client,
):
    response = authenticated_client.post(
        "/orders/",
        json={
            "items": [
                {
                    "product_id": 99999,
                    "quantity": 1,
                }
            ]
        },
    )

    assert response.status_code == 404


def test_order_history(
    authenticated_client,
):
    response = authenticated_client.get("/orders/")

    assert response.status_code == 200


def test_user_cannot_access_other_users_order(
    authenticated_client,
):
    response = authenticated_client.get("/orders/999")

    assert response.status_code == 404
