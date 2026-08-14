from fastapi import FastAPI, Depends

from ecommerce.routers import auth, orders, products, tenant, admin

from ecommerce import models
from ecommerce.database import engine, get_db

app = FastAPI()

app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(products.router)
app.include_router(tenant.router)
app.include_router(admin.router)

models.Base.metadata.create_all(engine)
