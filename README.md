## Requirements

You will need:

- Python 3.11 or 3.12
- pip
- a local Keycloak instance
- Git

## 1. Clone the project

```bash
git clone https://git.beehyv.com/saroja.bamra/fastapi-assignment
cd fastapi-assignment
```

## 2. Create a virtual environment

```bash
python -m venv ecommerce-venv
source ecommerce-venv/bin/activate
```

## 3. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## 4. Set up the environment variables

Create a `.env` file in the project root:

```bash
cat > .env <<'EOF'
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ecommerce
KEYCLOAK_CLIENT_ID=ecommerce-api
KEYCLOAK_CLIENT_SECRET=your_client_secret_here
EOF
```

The app expects these values to match your Keycloak setup:

- `KEYCLOAK_URL` = your Keycloak base URL
- `KEYCLOAK_REALM` = `ecommerce`
- `KEYCLOAK_CLIENT_ID` = `ecommerce-api`
- `KEYCLOAK_CLIENT_SECRET` = the client secret from Keycloak

## 5. Start Keycloak

This app depends on Keycloak being running for login and token validation.

Before testing authenticated routes, make sure the Keycloak realm and client are set up correctly.

## 6. Create the local database

The app uses SQLite and creates the tables automatically when it starts.

You can just run the app and let FastAPI build the database schema.

## 7. Seed the roles

This project includes a small seed script for the default roles:

```bash
python seed.py
```

It creates the roles used in the app:

- `ADMIN`
- `TENANT`
- `USER`

Additionally, the seed.py file updates the role of any user created with the username `admin` to `ADMIN` (to avoid updating the admin role manually). After creating a user named `admin` run this script again:

```bash
python seed.py
```

## 8. Run the app

```bash
uvicorn ecommerce.main:app --reload
```

Then open:

```text
http://localhost:8000/docs
```

The Swagger docs are available there.

## 9. Run the tests

```bash
pytest -q
```

Or just one file:

```bash
pytest -q tests/test_auth.py
```

## Notes

- The local database is stored at `./ecommerce.db`
- The app creates tables automatically on startup
- `.env`, virtual environments, sqlite files, and Python cache files are ignored in `.gitignore`

## Common issues

### Missing packages

```bash
pip install -r requirements.txt
```

### Keycloak errors

Check that:

- Keycloak is running
- the realm is named `ecommerce`
- the client ID is `ecommerce-api`
- the secret in `.env` matches Keycloak

### Database not created

Restart the app or run:

```bash
python -c "from ecommerce.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

## Quick setup summary

```bash
git clone <repo>
cd ecommerce-app
python -m venv ecommerce-venv
source ecommerce-venv/bin/activate
pip install -r requirements.txt
cat > .env <<'EOF'
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ecommerce
KEYCLOAK_CLIENT_ID=ecommerce-api
KEYCLOAK_CLIENT_SECRET=your_client_secret_here
EOF
python seed.py
uvicorn ecommerce.main:app --reload
```
