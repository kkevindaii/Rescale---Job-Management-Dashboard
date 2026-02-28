# ---- Backend Dockerfile ----
# Builds the Django + Gunicorn API server.

# slim variant: includes only the minimal packages needed to run Python,
# keeping the image smaller and faster to pull
FROM python:3.11-slim

# Set the working directory inside the container.
# All subsequent COPY and RUN commands are relative to this path.
WORKDIR /app

# Install system-level dependencies.
# postgresql-client provides pg_isready, used in entrypoint.sh to wait
# for the database before running migrations.
# --no-install-recommends avoids pulling in unnecessary packages.
# Cleaning apt lists afterwards reduces the image layer size.
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements first — before the application code.
# Docker builds layers in order and caches each one. By copying and installing
# requirements before the source code, a code-only change reuses the cached
# pip install layer instead of re-running it from scratch.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application source code
COPY . .

# Copy the entrypoint script and make it executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Document that the container listens on port 8000.
# This is informational — the actual port binding is set in docker-compose.yml.
EXPOSE 8000

# Run the entrypoint script on container start.
# It waits for the DB, runs migrations, then starts gunicorn.
ENTRYPOINT ["/entrypoint.sh"]
