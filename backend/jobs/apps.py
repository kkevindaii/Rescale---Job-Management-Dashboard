"""
App configuration for the 'jobs' Django application.

Django uses AppConfig subclasses to store metadata about each installed app
and to run startup logic (e.g. connecting signal handlers).
"""
from django.apps import AppConfig


class JobsConfig(AppConfig):
    # Use 64-bit integer primary keys by default for all models in this app
    default_auto_field = 'django.db.models.BigAutoField'

    # Must match the folder name and the entry in INSTALLED_APPS
    name = 'jobs'
