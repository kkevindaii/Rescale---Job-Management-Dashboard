# ---- Frontend Dockerfile (multi-stage build) ----
#
# Stage 1 (build): Node installs dependencies and compiles the React app
# Stage 2 (serve): nginx serves the compiled static files
#
# Multi-stage builds keep the final image small — the Node runtime and
# node_modules are discarded after the build, only the dist/ output is kept.


# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json first to leverage Docker layer caching.
# The install step only re-runs if package.json changes — code changes
# alone won't invalidate this layer.
COPY package.json ./
RUN npm install

# Copy the rest of the source and build the production bundle
COPY . .
RUN npm run build


# --- Stage 2: Test ---
# Separate stage so unit tests can run in Docker without needing a server.
# Used exclusively by `make test-frontend` — not part of the production build.
FROM node:20-alpine AS test
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "test"]


# --- Stage 3: Serve ---
FROM nginx:alpine

# wget is needed for the docker-compose health check
RUN apk add --no-cache wget

# Copy the compiled output from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Replace nginx's default config with ours, which:
#   - serves index.html for all routes (SPA fallback)
#   - proxies /api/ requests to the backend container
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
