import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ecommerce.env import load_app_env
from ecommerce.routers import auth, brands, orders, products, tenant, admin

from ecommerce import models
from ecommerce.database import engine, ensure_product_image_columns

load_app_env()

app = FastAPI()

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(products.router)
app.include_router(brands.router)
app.include_router(tenant.router)
app.include_router(admin.router)

models.Base.metadata.create_all(engine)
ensure_product_image_columns(engine)
