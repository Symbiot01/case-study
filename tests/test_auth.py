def test_signup(client, monkeypatch):
    async def fake_create_keycloak_user(username, password, tenant_name=None):
        return "fake-keycloak-id"

    monkeypatch.setattr(
        "ecommerce.repositories.auth.create_keycloak_user",
        fake_create_keycloak_user,
    )

    response = client.post(
        "/auth/signup",
        json={
            "username": "testuser",
            "password": "password123",
        },
    )

    assert response.status_code == 201
    assert response.json()["username"] == "testuser"


def test_login_success(client, monkeypatch, normal_user):
    async def fake_get_user_token(username, password):
        return {
            "access_token": "token",
            "refresh_token": "refresh",
            "expires_in": 3600,
            "token_type": "bearer",
        }

    monkeypatch.setattr(
        "ecommerce.repositories.auth.get_user_token",
        fake_get_user_token,
    )

    response = client.post(
        "/auth/login",
        json={
            "username": normal_user.username,
            "password": "password123",
        },
    )

    assert response.status_code == 200
    assert response.json()["access_token"] == "token"


def test_login_missing_user_returns_404(client):
    response = client.post(
        "/auth/login",
        json={
            "username": "missing-user",
            "password": "password123",
        },
    )

    assert response.status_code == 404
