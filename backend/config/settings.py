"""
Django settings for the Rescale Job Dashboard backend.

All environment-sensitive values are read from environment variables so the
same codebase works both locally and inside Docker without any code changes.
"""
import os
from pathlib import Path

# Root of the backend/ directory — used to build absolute paths below
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Security ---

# Secret key used for cryptographic signing (sessions, CSRF tokens, etc.)
# Must be kept secret in production — pulled from env, falls back to a
# dev-only placeholder that makes the misconfiguration obvious
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key-do-not-use-in-production')

# Debug mode: shows detailed error pages and enables extra logging
# Explicitly compare to the string 'True' because env vars are always strings
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

# Hosts/domains Django is allowed to serve — comma-separated in the env var
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,backend').split(',')


# --- Installed applications ---

INSTALLED_APPS = [
    # Django internals required by DRF and the ORM
    'django.contrib.contenttypes',
    'django.contrib.auth',

    # Django REST Framework — powers our API serializers and views
    'rest_framework',

    # Injects Access-Control-Allow-Origin headers so the browser allows
    # the frontend (different port) to call our API
    'corsheaders',

    # Our single application containing Job and JobStatus models + API
    'jobs',
]


# --- Middleware ---
# Middleware runs on every request/response in the order listed here.

MIDDLEWARE = [
    # CORS middleware must come first so it can add headers before any other
    # middleware short-circuits the response
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]


# --- URL routing ---

# Django looks here to find the top-level URL patterns
ROOT_URLCONF = 'config.urls'


# --- Templates ---

# Required by Django internals even for a pure API — omitting this can cause
# errors in Django's exception handling and error response machinery
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]


# --- Database ---

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        # All connection details come from environment variables, which are
        # set in docker-compose.yml — no credentials hardcoded in source
        'NAME': os.environ.get('POSTGRES_DB', 'rescale'),
        'USER': os.environ.get('POSTGRES_USER', 'rescale'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'rescale'),
        # 'db' is the Docker Compose service name for PostgreSQL
        'HOST': os.environ.get('POSTGRES_HOST', 'db'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}


# --- CORS ---

# In debug/development mode, allow requests from any origin so we don't have
# to hardcode the frontend's port (which can vary between dev and CI).
# In production this should be set to a specific list of allowed origins.
CORS_ALLOW_ALL_ORIGINS = DEBUG


# --- REST Framework ---

REST_FRAMEWORK = {
    # Only render JSON — no browsable HTML API in responses
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
}


# --- Miscellaneous ---

# Use BigAutoField (64-bit int) as the default primary key type for all models
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
