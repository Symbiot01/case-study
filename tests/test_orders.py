def test_create_order(authenticated_client):
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
    assert response.json()["total_quantity"] == 2


def test_order_requires_at_least_one_item(authenticated_client):
    response = authenticated_client.post(
        "/orders/",
        json={"items": []},
    )

    assert response.status_code == 400


def test_order_quantity_must_be_positive(authenticated_client):
    response = authenticated_client.post(
        "/orders/",
        json={
            "items": [
                {
                    "product_id": 1,
                    "quantity": 0,
                }
            ]
        },
    )

    assert response.status_code == 400


def test_order_quantity_cannot_exceed_stock(authenticated_client):
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


def test_order_nonexistent_product(authenticated_client):
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


def test_order_history(authenticated_client):
    response = authenticated_client.get("/orders/")

    assert response.status_code == 200
    assert isinstance(response.json()["orders"], list)


def test_order_history_invalid_pagination(authenticated_client):
    response = authenticated_client.get("/orders/?page=0")

    assert response.status_code == 400


def test_user_can_get_own_order(authenticated_client):
    create_response = authenticated_client.post(
        "/orders/",
        json={"items": [{"product_id": 1, "quantity": 1}]},
    )
    order_id = create_response.json()["order_id"]

    response = authenticated_client.get(f"/orders/{order_id}")

    assert response.status_code == 200
    assert response.json()["id"] == order_id


def test_user_cannot_access_other_users_order(authenticated_client):
    response = authenticated_client.get("/orders/999")

    assert response.status_code == 404
