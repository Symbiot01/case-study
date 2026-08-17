def test_search_products(
    client,
):
    response = client.get("/products/?search=iphone")

    assert response.status_code == 200

    assert len(response.json()["products"]) == 2


def test_filter_products_by_category(
    client,
):
    response = client.get("/products/?category_id=1")

    assert response.status_code == 200


def test_product_pagination(
    client,
):
    response = client.get("/products/?page=1&limit=10")

    assert response.status_code == 200

    data = response.json()

    assert data["page"] == 1
    assert data["limit"] == 10


def test_invalid_page(
    client,
):
    response = client.get("/products/?page=0")

    assert response.status_code == 400


def test_add_favourite(
    authenticated_client,
):
    response = authenticated_client.post("/products/1/favourite")

    assert response.status_code == 201


def test_duplicate_favourite(
    authenticated_client,
):
    authenticated_client.post("/products/1/favourite")

    response = authenticated_client.post("/products/1/favourite")

    assert response.status_code == 409


def test_remove_favourite(
    authenticated_client,
):
    authenticated_client.post("/products/1/favourite")

    response = authenticated_client.delete("/products/1/favourite")

    assert response.status_code == 204
