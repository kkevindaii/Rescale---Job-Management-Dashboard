"""
WSGI (Web Server Gateway Interface) entry point for the Django application.

WSGI is the standard Python interface between a web server (e.g. gunicorn)
and the Django application. The Docker container runs gunicorn which loads
this module to serve HTTP requests.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
