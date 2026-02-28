#!/usr/bin/env python
"""
Django's command-line utility for administrative tasks.
This is the entry point for commands like:
  python manage.py runserver
  python manage.py migrate
  python manage.py makemigrations
"""
import os
import sys


def main():
    # Tell Django which settings module to use before anything else runs
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
