from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./ecommerce.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_product_image_columns(bind=engine) -> None:
    """Add image columns when create_all cannot alter an existing SQLite file."""
    if bind.dialect.name != "sqlite":
        return
    with bind.begin() as conn:
        rows = conn.exec_driver_sql("PRAGMA table_info(products)").fetchall()
        if not rows:
            return
        names = {row[1] for row in rows}
        if "image_key" not in names:
            conn.exec_driver_sql("ALTER TABLE products ADD COLUMN image_key VARCHAR")
            conn.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_products_image_key ON products (image_key)"
            )
        if "image_content_type" not in names:
            conn.exec_driver_sql(
                "ALTER TABLE products ADD COLUMN image_content_type VARCHAR"
            )
