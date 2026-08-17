def test_list_products_default_pagination(client):
    response = client.get("/products/")

    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["limit"] == 10
    assert data["total"] >= 2


def test_search_products(client):
    response = client.get("/products/?search=iphone")

    assert response.status_code == 200
    assert len(response.json()["products"]) == 2


def test_filter_products_by_category(client):
    response = client.get("/products/?category_id=1")

    assert response.status_code == 200
    assert len(response.json()["products"]) >= 1


def test_invalid_page(client):
    response = client.get("/products/?page=0")

    assert response.status_code == 400


def test_invalid_limit(client):
    response = client.get("/products/?limit=0")

    assert response.status_code == 400


def test_category_not_found(client):
    response = client.get("/products/?category_id=9999")

    assert response.status_code == 404


def test_add_favourite(authenticated_client):
    response = authenticated_client.post("/products/1/favourite")

    assert response.status_code == 201
    assert response.json()["product_id"] == 1


def test_list_favourite_products(authenticated_client):
    authenticated_client.post("/products/1/favourite")

    response = authenticated_client.get("/products/favourites")

    assert response.status_code == 200
    assert any(product["id"] == 1 for product in response.json())


def test_duplicate_favourite(authenticated_client):
    authenticated_client.post("/products/1/favourite")

    response = authenticated_client.post("/products/1/favourite")

    assert response.status_code == 409


def test_remove_favourite(authenticated_client):
    authenticated_client.post("/products/1/favourite")

    response = authenticated_client.delete("/products/1/favourite")

    assert response.status_code == 204


def test_remove_missing_favourite_returns_404(authenticated_client):
    response = authenticated_client.delete("/products/1/favourite")

    assert response.status_code == 404
