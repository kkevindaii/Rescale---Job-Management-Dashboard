"""
Root URL configuration for the Rescale Job Dashboard backend.

All API routes are namespaced under /api/ and delegated to the jobs app.
This keeps the root urls.py clean and makes it easy to version the API
later (e.g. /api/v2/) without touching individual view files.
"""
from django.urls import path, include

urlpatterns = [
    # Delegate everything under /api/ to the jobs app's own urls.py
    path('api/', include('jobs.urls')),
]
