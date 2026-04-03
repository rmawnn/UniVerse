# Backend Local Setup (Docker)

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

## Quick Start

```bash
cd backend

# 1. Create your env file
cp .env.example .env
# Edit .env if you want to change DB password or SECRET_KEY

# 2. Start everything
docker compose up -d

# 3. Run database migrations
docker compose exec backend alembic upgrade head

# 4. Verify it's working
curl http://localhost:8000/api/v1/health
```

The API is now running at **http://localhost:8000**. Docs at **http://localhost:8000/docs**.

## Common Commands

### Start / Stop

```bash
docker compose up -d          # Start in background
docker compose down           # Stop containers (keeps data)
docker compose down -v        # Stop and DELETE database data
docker compose logs -f        # Tail all logs
docker compose logs -f backend  # Tail backend logs only
```

### Database Migrations

```bash
# Run pending migrations
docker compose exec backend alembic upgrade head

# Create a new migration after model changes
docker compose exec backend alembic revision --autogenerate -m "describe the change"

# Roll back one migration
docker compose exec backend alembic downgrade -1
```

### Running Tests

Tests use a separate database (`universe_test_db`). Create it first:

```bash
# Create the test database
docker compose exec postgres psql -U postgres -c "CREATE DATABASE universe_test_db;"

# Run tests
docker compose exec backend python -m pytest tests/ -v --tb=short
```

### Connect to PostgreSQL

```bash
# Via psql inside the container
docker compose exec postgres psql -U postgres -d universe_db

# From your host (if port 5432 is exposed)
psql -h localhost -U postgres -d universe_db
```

### Reset Local Database

```bash
# Option 1: Drop and recreate via psql
docker compose exec postgres psql -U postgres -c "DROP DATABASE universe_db;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE universe_db;"
docker compose exec backend alembic upgrade head

# Option 2: Destroy the volume entirely
docker compose down -v
docker compose up -d
docker compose exec backend alembic upgrade head
```

### Rebuild After Dependency Changes

```bash
docker compose build backend
docker compose up -d
```

## How It Works

- **backend** — FastAPI app with hot-reload via `--reload` and a bind mount of your source code. Any code change restarts the server automatically.
- **postgres** — PostgreSQL 16 with data persisted in a Docker named volume (`pgdata`). Data survives `docker compose down` but not `docker compose down -v`.
- `DB_HOST` is overridden to `postgres` (the Docker service name) in `docker-compose.yml`, so your `.env` can keep `DB_HOST=localhost` for non-Docker use.

## Running Without Docker

If you prefer running locally without Docker:

```bash
cd backend
python -m venv venv
source venv/bin/activate      # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Make sure PostgreSQL is running locally
# Edit .env: DB_HOST=localhost, DB_PASSWORD=<your password>

alembic upgrade head
uvicorn app.main:app --reload
```

## Windows Notes

- Docker Desktop must be running before `docker compose` commands work.
- If port 5432 conflicts with a local PostgreSQL install, either stop the local service or change `DB_PORT` in `.env` (e.g., `DB_PORT=5433`) and update the port mapping in `docker-compose.yml`.
- File watching (hot-reload) works with Docker Desktop's WSL2 backend. If reload is slow, ensure your project is on a WSL2 filesystem or use Docker Desktop's file sharing settings.
