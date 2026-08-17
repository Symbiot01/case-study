import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ecommerce.database import Base, get_db
from ecommerce.main import app

SQLALCHEMY_TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    from ecommerce.models import Role

    for role_name in ["USER", "ADMIN", "TENANT"]:
        role = session.query(Role).filter(Role.name == role_name).first()
        if role is None:
            session.add(Role(name=role_name))
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def seed_catalog(db):
    from ecommerce.models import Category, Product, Role, Tenant

    tenant = db.query(Tenant).filter(Tenant.name == "Nike").first()
    if tenant is None:
        tenant = Tenant(name="Nike")
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    other_tenant = db.query(Tenant).filter(Tenant.name == "Samsung").first()
    if other_tenant is None:
        other_tenant = Tenant(name="Samsung")
        db.add(other_tenant)
        db.commit()
        db.refresh(other_tenant)

    category = db.query(Category).filter(Category.name == "Electronics").first()
    if category is None:
        category = Category(name="Electronics")
        db.add(category)
        db.commit()
        db.refresh(category)

    product_names = ["iPhone 14", "iPhone 15"]
    for name in product_names:
        existing = db.query(Product).filter(Product.name == name).first()
        if not existing:
            db.add(
                Product(
                    name=name,
                    price=999.0,
                    quantity=10,
                    category_id=category.id,
                    tenant_id=tenant.id,
                )
            )

    db.commit()
    return {
        "tenant": tenant,
        "other_tenant": other_tenant,
        "category": category,
    }


@pytest.fixture
def client(db, seed_catalog):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def role_factory(db):
    from ecommerce.models import Role

    def _make(name: str):
        role = db.query(Role).filter(Role.name == name).first()
        if role is None:
            role = Role(name=name)
            db.add(role)
            db.commit()
            db.refresh(role)
        return role

    return _make


@pytest.fixture
def normal_user(db, role_factory):
    from ecommerce.models import User

    role = role_factory("USER")
    user = User(
        username="testuser",
        keycloak_id="test-keycloak-id",
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db, role_factory):
    from ecommerce.models import User

    role = role_factory("ADMIN")
    user = User(
        username="admin",
        keycloak_id="admin-keycloak-id",
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def tenant_user(db, role_factory, seed_catalog):
    from ecommerce.models import User

    role = role_factory("TENANT")
    user = User(
        username="nike_user",
        keycloak_id="tenant-keycloak-id",
        role_id=role.id,
        tenant_id=seed_catalog["tenant"].id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def authenticated_client(client, normal_user):
    from ecommerce.security import get_current_user

    def override_get_current_user():
        return normal_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    return client


@pytest.fixture
def authenticated_admin_client(client, admin_user):
    from ecommerce.security import get_current_user

    def override_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    return client


@pytest.fixture
def authenticated_tenant_client(client, tenant_user):
    from ecommerce.security import get_current_user

    def override_get_current_user():
        return tenant_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    return client
