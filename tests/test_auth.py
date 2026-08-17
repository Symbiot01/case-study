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
