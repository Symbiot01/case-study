from sqlalchemy import Column, Integer, String, Float, ForeignKey, Table
from sqlalchemy.orm import relationship

from .database import Base

favourite_products = Table(
    "favourite_products",
    Base.metadata,
    Column(
        "user_id",
        ForeignKey("users.id"),
        primary_key=True,
    ),
    Column(
        "product_id",
        ForeignKey("products.id"),
        primary_key=True,
    ),
)


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    # One tenant can have many users
    users = relationship(
        "User",
        back_populates="tenant",
    )

    # One tenant can have many products
    products = relationship(
        "Product",
        back_populates="tenant",
    )


class Role(Base):
    __tablename__ = "roles"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String,
        unique=True,
        nullable=False,
    )

    # One role can belong to many users
    users = relationship(
        "User",
        back_populates="role",
    )


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # Username must be globally unique
    username = Column(
        String,
        unique=True,
        nullable=False,
    )

    # ID of the corresponding user in Keycloak
    keycloak_id = Column(
        String,
        unique=True,
        nullable=True,
    )

    # A normal user can have no tenant.
    # A tenant user belongs to a specific tenant.
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id"),
        nullable=True,
    )

    # Every user has a role
    role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=False,
    )

    tenant = relationship(
        "Tenant",
        back_populates="users",
    )

    role = relationship(
        "Role",
        back_populates="users",
    )

    # User can favourite many products
    favourite_products = relationship(
        "Product",
        secondary=favourite_products,
        back_populates="favourited_by",
    )

    # User can have many orders
    orders = relationship(
        "Order",
        back_populates="user",
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String,
        nullable=False,
        index=True,
    )

    price = Column(
        Float,
        nullable=False,
    )

    # Available quantity
    quantity = Column(
        Integer,
        nullable=False,
        default=0,
    )

    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=False,
    )

    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id"),
        nullable=False,
    )

    category = relationship(
        "Category",
        back_populates="products",
    )

    tenant = relationship(
        "Tenant",
        back_populates="products",
    )

    # Product can appear in many order items
    order_items = relationship(
        "OrderItem",
        back_populates="product",
    )

    # Product can be favourited by many users
    favourited_by = relationship(
        "User",
        secondary=favourite_products,
        back_populates="favourite_products",
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    total_quantity = Column(
        Integer,
        nullable=False,
        default=0,
    )

    total_amount = Column(
        Float,
        nullable=False,
        default=0,
    )

    # One user can have many orders
    user = relationship(
        "User",
        back_populates="orders",
    )

    # One order can contain many order items
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    order_id = Column(
        Integer,
        ForeignKey("orders.id"),
        nullable=False,
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
    )

    # Number of this product being purchased
    quantity = Column(
        Integer,
        nullable=False,
    )

    # Store the price at the time of purchase
    # This is important because Product.price could change
    # later, while an old order should retain its original price.
    price = Column(
        Float,
        nullable=False,
    )

    order = relationship(
        "Order",
        back_populates="items",
    )

    product = relationship(
        "Product",
        back_populates="order_items",
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    # One category can contain many products
    products = relationship(
        "Product",
        back_populates="category",
    )
