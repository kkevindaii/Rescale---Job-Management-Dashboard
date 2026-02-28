"""
Root URL configuration for the Rescale Job Dashboard backend.

All API routes are namespaced under /api/ and delegated to the jobs app.
This keeps the root urls.py clean and makes it easy to version the API
later (e.g. /api/v2/) without touching individual view files.
"""
from django.urls import path, include
from jobs.views import health_check

urlpatterns = [
    path('health/', health_check),
    path('api/', include('jobs.urls')),
]
