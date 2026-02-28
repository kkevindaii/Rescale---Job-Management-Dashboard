.PHONY: build up test test-backend test-frontend stop clean

# Build all Docker images (backend, frontend, tests)
build:
	docker compose build

# Start the application stack in the background (excludes the test runner)
up:
	docker compose up -d db backend frontend

# Run the full E2E test suite.
# `docker compose run tests` starts the dependency chain (db → backend → frontend)
# and waits for each service's healthcheck to pass before proceeding.
# The Playwright process exit code propagates — non-zero means tests failed.
test:
	docker compose build
	docker compose run --rm tests
	docker compose down

# Run React unit tests inside an isolated Node container.
# Builds only the test stage of the frontend Dockerfile (no nginx, no build output)
# then runs vitest once and exits.
test-frontend:
	docker build --target test -t rescale-frontend-test ./frontend
	docker run --rm rescale-frontend-test

# Run Django unit tests inside the backend container.
# Starts the db service (required by Django's test runner to create the test DB),
# runs the tests, then tears down.
test-backend:
	docker compose build backend
	docker compose run --rm backend python manage.py test --verbosity 2
	docker compose down

# Stop and remove all running containers
stop:
	docker compose down

# Remove containers, volumes, and networks for a completely clean slate.
# Use this between test runs if you want a fresh database.
clean:
	docker compose down -v --remove-orphans
