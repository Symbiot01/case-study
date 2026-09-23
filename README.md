## Requirements

- Python 3.11 or 3.12
- Node.js 20 or newer
- Docker with Compose
- Git

## 1. Clone and install

```bash
git clone https://git.beehyv.com/saroja.bamra/fastapi-assignment
cd fastapi-assignment
python -m venv ecommerce-venv
source ecommerce-venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
npm install --prefix web
```

## 2. Copy the local env

`.env.example` is the shared localhost config. Docker Compose reads `.env`. The API reads `.env.dev` first, then fills anything still missing from `.env`. Copy the example to both before the first start so Keycloak, MinIO, and the seed use the same values.

```bash
cp .env.example .env
cp .env.example .env.dev
```

Those passwords are for a machine on localhost. Do not use them on a public host, and do not publish MinIO port 9000.

## 3. Start Keycloak and MinIO

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:

- Keycloak at `http://localhost:8080`
- MinIO at `http://127.0.0.1:9000`, console at `http://127.0.0.1:9001`
- a one-shot init that creates the private `product-images` bucket and the `ecommerce-api` user

The MinIO image is `quay.io/minio/minio` because Docker Hub no longer serves that repository. The API user can only get, put, and delete objects in `product-images`. The storefront never talks to MinIO. The API stores the file and serves it.

Wait until Keycloak answers and the init container has exited:

```bash
docker compose -f docker-compose.dev.yml ps
```

`minio-init` should be `exited` with code 0. Keycloak can take a minute on the first start.

## 4. Seed Keycloak and the shop

```bash
python scripts/seed_dev.py
python seed.py
```

`scripts/seed_dev.py` creates the `ecommerce` realm, the `ecommerce-api` client, and three accounts. It keeps the passwords already in `.env.dev` and writes a client secret. `seed.py` adds the catalogue: brands, categories, and products. Both are safe to run again.

Sign in with the accounts from `.env.example`:

| Account | Username | Password | Where to sign in |
| --- | --- | --- | --- |
| Shopper | `shopper` | `shopper-local-1` | `/login` |
| Admin | `admin` | `admin-local-1` | `/login` |
| Brand staff | `ilse` | `ilse-local-1` | `/Studio%20Ilse/login` |

## 5. Run the API and the storefront

In one terminal, from the project root with the virtual environment active:

```bash
uvicorn ecommerce.main:app --host 127.0.0.1 --port 8000 --reload
```

In another:

```bash
npm run dev --prefix web
```

Open the shop at `http://localhost:5173`. The storefront calls `/api`, and Vite forwards that to the API. API docs are at `http://127.0.0.1:8000/docs`.

SQLite is created at `./ecommerce.db` on startup, including the product image columns.

## 6. Run the tests

```bash
pytest -q
```

Tests use an in-memory stand-in for MinIO, so they do not need the bucket to be running.

## Notes

- `.env.example` is committed. `.env`, `.env.dev`, the virtual environment, `web/node_modules`, and `ecommerce.db` stay out of git.
- Changing `MINIO_ROOT_PASSWORD` or `S3_SECRET_KEY` after the first start does not update the existing MinIO volume. Reset it with `docker compose -f docker-compose.dev.yml down -v` and start again. That deletes stored images.
- Keycloak's admin password is fixed on the first start. It must stay the same in `.env` and `.env.dev`.

## Common issues

### Keycloak is up, but seed cannot sign in

`KEYCLOAK_ADMIN_PASSWORD` in `.env.dev` does not match the password Keycloak was first started with. Put the same value in both files. If the container was created with a blank password, remove the Keycloak volume and start Compose again.

### Product images fail to upload

Check that `minio-init` exited 0, and that `S3_SECRET_KEY` in `.env` is the secret the init container used. The API reads that value from `.env`.

### The shop cannot reach the API

The storefront expects the API on `127.0.0.1:8000`. Leave `VITE_API_URL` unset for local development.
