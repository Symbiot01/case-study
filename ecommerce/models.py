from sqlalchemy import Column, Float, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from .database import Base

favourite_products = Table(
    "favourite_products",
    Base.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("product_id", ForeignKey("products.id"), primary_key=True),
)


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)

    users = relationship("User", back_populates="tenant")
    products = relationship("Product", back_populates="tenant")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    keycloak_id = Column(String, unique=True, nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    tenant = relationship("Tenant", back_populates="users")
    role = relationship("Role", back_populates="users")
    favourite_products = relationship(
        "Product",
        secondary=favourite_products,
        back_populates="favourited_by",
    )
    orders = relationship("Order", back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    image_key = Column(String, unique=True, nullable=True)
    image_content_type = Column(String, nullable=True)

    category = relationship("Category", back_populates="products")
    tenant = relationship("Tenant", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    favourited_by = relationship(
        "User",
        secondary=favourite_products,
        back_populates="favourite_products",
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_quantity = Column(Integer, nullable=False, default=0)
    total_amount = Column(Float, nullable=False, default=0)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    # Price at purchase, so a later catalogue change does not rewrite the order.
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)

    products = relationship("Product", back_populates="category")
