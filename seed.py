from ecommerce.database import SessionLocal
from ecommerce.models import Role, User

db = SessionLocal()

roles = ["ADMIN", "TENANT", "USER"]

for role_name in roles:
    existing_role = db.query(Role).filter(Role.name == role_name).first()

    if not existing_role:
        db.add(Role(name=role_name))

admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
admin_user = db.query(User).filter(User.username == "admin").first()

if admin_user and admin_role:
    admin_user.role_id = admin_role.id


db.commit()
db.close()

print("Roles created successfully")
