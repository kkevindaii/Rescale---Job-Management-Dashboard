"""
URL routing for the jobs app.

DRF's DefaultRouter inspects the registered ViewSet and automatically
generates URL patterns for each action method. This keeps URL definitions
DRY — adding a new action to the ViewSet doesn't require a manual URL entry.

The router's URLs are included under /api/ in config/urls.py, so the
final resolved paths are:

  GET    /api/jobs/       →  JobViewSet.list()
  POST   /api/jobs/       →  JobViewSet.create()
  PATCH  /api/jobs/<pk>/  →  JobViewSet.partial_update()
  DELETE /api/jobs/<pk>/  →  JobViewSet.destroy()
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import JobViewSet

# DefaultRouter also provides a browsable API root at /api/ in debug mode,
# which is handy for manually testing endpoints during development
router = DefaultRouter()

# 'jobs' becomes the URL prefix — e.g. /api/jobs/ and /api/jobs/<pk>/
# basename is used to generate named URL patterns (e.g. 'job-list', 'job-detail')
router.register('jobs', JobViewSet, basename='job')

urlpatterns = [
    path('', include(router.urls)),
]
