from sqlalchemy import func

from ecommerce.database import SessionLocal
from ecommerce.models import (
    Category,
    Order,
    OrderItem,
    Product,
    Role,
    Tenant,
    User,
)

db = SessionLocal()

roles = ["ADMIN", "TENANT", "USER"]

for role_name in roles:
    existing_role = db.query(Role).filter(Role.name == role_name).first()

    if not existing_role:
        db.add(Role(name=role_name))

db.flush()

admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
admin_user = db.query(User).filter(User.username == "admin").first()

if admin_user and admin_role:
    admin_user.role_id = admin_role.id


def get_or_create_category(name: str) -> Category:
    category = (
        db.query(Category)
        .filter(func.lower(Category.name) == name.lower())
        .one_or_none()
    )
    if category is None:
        category = Category(name=name)
        db.add(category)
        db.flush()
    return category


def get_or_create_tenant(name: str) -> Tenant:
    tenant = (
        db.query(Tenant).filter(func.lower(Tenant.name) == name.lower()).one_or_none()
    )
    if tenant is None:
        tenant = Tenant(name=name)
        db.add(tenant)
        db.flush()
    return tenant


def get_or_create_product(
    name: str,
    price: float,
    quantity: int,
    category: Category,
    tenant: Tenant,
) -> Product:
    product = (
        db.query(Product)
        .filter(
            Product.tenant_id == tenant.id,
            func.lower(Product.name) == name.lower(),
        )
        .one_or_none()
    )
    if product is None:
        product = Product(
            name=name,
            price=price,
            quantity=quantity,
            category_id=category.id,
            tenant_id=tenant.id,
        )
        db.add(product)
        db.flush()
    return product


categories = {
    name: get_or_create_category(name)
    for name in ("Ceramics", "Furniture", "Lighting", "Textiles", "Objects")
}

brands = {
    name: get_or_create_tenant(name)
    for name in (
        "Studio Ilse",
        "Kanso Works",
        "Atelier North",
        "Field & Kiln",
        "Maison Sable",
        "Hollow Form",
    )
}

# quantity 0 is out of stock, 1 is the low-stock state the storefront shows.
catalogue = [
    ("Studio Ilse", "Ceramics", "Smoke Glass Carafe", 76, 8),
    ("Studio Ilse", "Furniture", "Plaster Side Table", 510, 3),
    ("Studio Ilse", "Lighting", "Linen Shade Floor Lamp", 420, 6),
    ("Studio Ilse", "Textiles", "Undyed Wool Throw", 180, 9),
    ("Kanso Works", "Furniture", "Paper Cord Chair", 890, 2),
    ("Kanso Works", "Ceramics", "Blackened Steel Bowl", 64, 12),
    ("Kanso Works", "Furniture", "Cedar Bench", 1200, 0),
    ("Kanso Works", "Objects", "Stone Incense Dish", 38, 15),
    ("Atelier North", "Lighting", "Birch Pendant", 260, 5),
    ("Atelier North", "Objects", "Slate Tray", 48, 14),
    ("Atelier North", "Furniture", "Oak Daybed", 2400, 1),
    ("Atelier North", "Ceramics", "Clay Cup, Set of Two", 42, 20),
    ("Atelier North", "Objects", "Limestone Bookend", 95, 7),
    ("Field & Kiln", "Ceramics", "Ash Glaze Vase", 210, 6),
    ("Field & Kiln", "Ceramics", "Speckled Pourer", 88, 0),
    ("Field & Kiln", "Objects", "Tile Trivet", 36, 16),
    ("Field & Kiln", "Ceramics", "Wide Serving Bowl", 140, 4),
    ("Maison Sable", "Textiles", "Sand Linen Curtain", 320, 3),
    ("Maison Sable", "Textiles", "Boucle Cushion", 78, 11),
    ("Maison Sable", "Furniture", "Oak Frame Mirror", 460, 2),
    ("Maison Sable", "Lighting", "Brass Picture Light", 190, 5),
    ("Maison Sable", "Textiles", "Raw Silk Runner", 150, 8),
    ("Hollow Form", "Lighting", "Marble Lamp Base", 680, 2),
    ("Hollow Form", "Objects", "Cast Iron Pan", 120, 9),
    ("Hollow Form", "Objects", "Walnut Cutting Board", 85, 1),
    ("Hollow Form", "Ceramics", "Terracotta Planter", 54, 10),
    ("Hollow Form", "Furniture", "Leather Strap Shelf", 240, 0),
]

products = {
    name: get_or_create_product(name, price, quantity, categories[category], brands[brand])
    for brand, category, name, price, quantity in catalogue
}

shopper = db.query(User).filter(func.lower(User.username) == "shopper").one_or_none()

if shopper is not None and not shopper.orders:
    history = [
        [("Form No. 04 Vessel", 1), ("Slate Tray", 2)],
        [("Linen Shade Floor Lamp", 1), ("Undyed Wool Throw", 1)],
        [("Clay Cup, Set of Two", 1), ("Tile Trivet", 1)],
    ]
    for lines in history:
        order = Order(user_id=shopper.id, total_quantity=0, total_amount=0)
        db.add(order)
        db.flush()
        total_quantity = 0
        total_amount = 0
        for product_name, quantity in lines:
            product = (
                db.query(Product)
                .filter(func.lower(Product.name) == product_name.lower())
                .one()
            )
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=quantity,
                    price=product.price,
                )
            )
            total_quantity += quantity
            total_amount += product.price * quantity
        order.total_quantity = total_quantity
        order.total_amount = total_amount

if shopper is not None:
    saved_names = (
        "Form No. 04 Vessel",
        "Oak Slat Low Stool",
        "Birch Pendant",
        "Sand Linen Curtain",
    )
    already = {product.id for product in shopper.favourite_products}
    for product_name in saved_names:
        product = (
            db.query(Product)
            .filter(func.lower(Product.name) == product_name.lower())
            .one_or_none()
        )
        if product is not None and product.id not in already:
            shopper.favourite_products.append(product)

db.commit()

print(
    "Seed complete:",
    f"{db.query(Tenant).count()} brands,",
    f"{db.query(Category).count()} categories,",
    f"{db.query(Product).count()} products,",
    f"{db.query(Order).count()} orders",
)

db.close()
