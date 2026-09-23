import io

from PIL import Image


def _png(color: tuple[int, int, int]) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buffer, format="PNG")
    return buffer.getvalue()


def _store(client):
    return client.app.state.image_store


def _create_product(client) -> int:
    response = client.post(
        "/Nike/products",
        json={
            "name": "Air Max",
            "price": 12000,
            "quantity": 20,
            "category_id": 1,
        },
    )
    assert response.status_code == 201
    body = response.json()["product"]
    assert body["has_image"] is False
    assert body["image_version"] is None
    assert "image_key" not in body
    return body["id"]


def test_tenant_can_upload_image_and_public_get_returns_it(authenticated_tenant_client):
    product_id = _create_product(authenticated_tenant_client)
    response = authenticated_tenant_client.post(
        f"/Nike/products/{product_id}/image",
        files={"file": ("notes.txt", _png((255, 0, 0)), "text/plain")},
    )

    assert response.status_code == 200
    saved = response.json()["product"]
    assert saved["has_image"] is True
    assert saved["image_version"]
    assert "image_key" not in saved
    assert len(_store(authenticated_tenant_client).objects) == 1

    image = authenticated_tenant_client.get(f"/products/{product_id}/image")
    assert image.status_code == 200
    assert image.headers["content-type"].startswith("image/png")
    assert image.headers["cache-control"] == "private, max-age=3600"
    assert image.headers["x-content-type-options"] == "nosniff"
    assert Image.open(io.BytesIO(image.content)).getpixel((0, 0)) == (255, 0, 0)

    catalogue = authenticated_tenant_client.get("/products/?search=Air%20Max")
    listed = catalogue.json()["products"][0]
    assert listed["has_image"] is True
    assert "image_key" not in listed


def test_jpeg_and_webp_uploads_are_accepted(authenticated_tenant_client):
    product_id = _create_product(authenticated_tenant_client)
    for fmt, media in (("JPEG", "image/jpeg"), ("WEBP", "image/webp")):
        buffer = io.BytesIO()
        Image.new("RGB", (8, 8), (10, 20, 30)).save(buffer, format=fmt)
        response = authenticated_tenant_client.post(
            f"/Nike/products/{product_id}/image",
            files={"file": (f"photo.{fmt.lower()}", buffer.getvalue(), media)},
        )
        assert response.status_code == 200
        image = authenticated_tenant_client.get(f"/products/{product_id}/image")
        assert image.headers["content-type"].startswith(media)
    assert len(_store(authenticated_tenant_client).objects) == 1


def test_removing_image_clears_public_get(authenticated_tenant_client):
    product_id = _create_product(authenticated_tenant_client)
    uploaded = authenticated_tenant_client.post(
        f"/Nike/products/{product_id}/image",
        files={"file": ("red.png", _png((255, 0, 0)), "image/png")},
    )
    assert uploaded.status_code == 200

    removed = authenticated_tenant_client.delete(f"/Nike/products/{product_id}/image")
    assert removed.status_code == 204
    assert _store(authenticated_tenant_client).objects == {}
    assert authenticated_tenant_client.get(f"/products/{product_id}/image").status_code == 404


def test_other_tenant_cannot_upload(authenticated_tenant_client):
    response = authenticated_tenant_client.post(
        "/Samsung/products/1/image",
        files={"file": ("photo.png", _png((0, 0, 0)), "image/png")},
    )

    assert response.status_code == 403
    assert _store(authenticated_tenant_client).objects == {}


def test_non_image_is_rejected(authenticated_tenant_client):
    product_id = _create_product(authenticated_tenant_client)
    response = authenticated_tenant_client.post(
        f"/Nike/products/{product_id}/image",
        files={"file": ("photo.png", b"not-an-image", "image/png")},
    )

    assert response.status_code == 415
    assert _store(authenticated_tenant_client).objects == {}


def test_oversized_image_is_rejected(authenticated_tenant_client):
    product_id = _create_product(authenticated_tenant_client)
    response = authenticated_tenant_client.post(
        f"/Nike/products/{product_id}/image",
        files={"file": ("photo.png", b"x" * (5 * 1024 * 1024 + 1), "image/png")},
    )

    assert response.status_code == 413
    assert _store(authenticated_tenant_client).objects == {}


def test_replace_deletes_previous_image(authenticated_tenant_client):
    product_id = _create_product(authenticated_tenant_client)
    first = authenticated_tenant_client.post(
        f"/Nike/products/{product_id}/image",
        files={"file": ("red.png", _png((255, 0, 0)), "image/png")},
    )
    assert first.status_code == 200
    first_key = next(iter(_store(authenticated_tenant_client).objects))

    second = authenticated_tenant_client.post(
        f"/Nike/products/{product_id}/image",
        files={"file": ("blue.png", _png((0, 0, 255)), "image/png")},
    )
    assert second.status_code == 200
    stored = _store(authenticated_tenant_client).objects
    assert len(stored) == 1
    assert first_key not in stored

    image = authenticated_tenant_client.get(f"/products/{product_id}/image")
    assert Image.open(io.BytesIO(image.content)).getpixel((0, 0)) == (0, 0, 255)


def test_missing_image_is_not_found(client):
    response = client.get("/products/1/image")
    assert response.status_code == 404


def test_deleting_product_removes_image(authenticated_tenant_client):
    product_id = _create_product(authenticated_tenant_client)
    uploaded = authenticated_tenant_client.post(
        f"/Nike/products/{product_id}/image",
        files={"file": ("red.png", _png((255, 0, 0)), "image/png")},
    )
    assert uploaded.status_code == 200

    deleted = authenticated_tenant_client.delete(f"/Nike/products/{product_id}")
    assert deleted.status_code == 204
    assert _store(authenticated_tenant_client).objects == {}
    assert authenticated_tenant_client.get(f"/products/{product_id}/image").status_code == 404


def test_catalogue_products_omit_image_key(client):
    response = client.get("/products/")
    assert response.status_code == 200
    product = response.json()["products"][0]
    assert product["has_image"] is False
    assert "image_key" not in product
