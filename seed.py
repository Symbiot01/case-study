from ecommerce.database import SessionLocal
from ecommerce.models import Role

db = SessionLocal()

roles = ["ADMIN", "TENANT", "USER"]

for role_name in roles:
    existing_role = db.query(Role).filter(Role.name == role_name).first()

    if not existing_role:
        db.add(Role(name=role_name))

db.commit()
db.close()

print("Roles created successfully")
