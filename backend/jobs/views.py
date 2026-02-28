"""
API views for the Job Management Dashboard.

All four endpoints are grouped into a single JobViewSet. DRF's router
(defined in urls.py) maps HTTP methods to the correct action methods here.

  GET    /api/jobs/       →  list()
  POST   /api/jobs/       →  create()
  PATCH  /api/jobs/<pk>/  →  partial_update()
  DELETE /api/jobs/<pk>/  →  destroy()
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.db.models import OuterRef, Subquery

from .models import Job, JobStatus
from .serializers import JobSerializer, JobStatusSerializer


def health_check(request):
    return JsonResponse({"status": "ok"})


class JobPagination(PageNumberPagination):
    """
    Returns 20 jobs per page.
    Clients request subsequent pages with ?page=2, ?page=3, etc.
    The response includes 'count' (total jobs in DB), 'next', and 'previous'
    so the frontend knows whether more pages exist without a separate query.
    """
    page_size = 20


class JobViewSet(viewsets.ViewSet):
    """
    Handles all CRUD operations for the Job resource.

    Uses ViewSet (not ModelViewSet) because our create and partial_update
    actions have non-standard behavior — they also write to the JobStatus
    table — so explicit method bodies are clearer than overriding defaults.
    """

    def list(self, request):
        """
        GET /api/jobs/?status=RUNNING&sort=name_asc&page=1

        Optional query params:
          status — filter by current status (PENDING, RUNNING, COMPLETED, FAILED)
          sort   — ordering (newest, oldest, name_asc, name_desc); defaults to newest

        Filtering uses a correlated subquery to find each job's current status
        (the latest JobStatus row by timestamp) without denormalizing status onto
        the Job table. The composite index on (job_id, -timestamp) keeps this fast.

        prefetch_related('statuses') is still used so the serializer's
        get_current_status() can resolve current_status without extra queries.
        """
        # Validate status filter
        status_filter = request.query_params.get('status')
        if status_filter and status_filter not in JobStatus.StatusType.values:
            return Response(
                {'error': f'Invalid status. Must be one of: {JobStatus.StatusType.values}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate sort
        valid_sorts = ['newest', 'oldest', 'name_asc', 'name_desc']
        sort = request.query_params.get('sort', 'newest')
        if sort not in valid_sorts:
            return Response(
                {'error': f'Invalid sort. Must be one of: {valid_sorts}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Subquery: latest status_type for each job — used for filtering
        latest_status = JobStatus.objects.filter(
            job=OuterRef('pk')
        ).order_by('-timestamp').values('status_type')[:1]

        queryset = Job.objects.annotate(
            current_status_type=Subquery(latest_status)
        ).prefetch_related('statuses')

        if status_filter:
            queryset = queryset.filter(current_status_type=status_filter)

        order_map = {
            'newest':    '-created_at',
            'oldest':    'created_at',
            'name_asc':  'name',
            'name_desc': '-name',
        }
        queryset = queryset.order_by(order_map[sort])

        paginator = JobPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = JobSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def create(self, request):
        """
        POST /api/jobs/
        Creates a new Job and automatically inserts an initial PENDING JobStatus.

        Request body:  { "name": "Fluid Dynamics Simulation" }
        Response body: the created job including current_status: "PENDING"

        is_valid(raise_exception=True) automatically returns a 400 response
        with validation error details if the request body is invalid,
        so we don't need to handle that case manually.
        """
        serializer = JobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()

        # Spec requirement: new jobs must start with PENDING status
        JobStatus.objects.create(job=job, status_type=JobStatus.StatusType.PENDING)

        # Re-fetch with prefetch_related so the serializer can resolve
        # current_status from the newly created JobStatus row
        job = Job.objects.prefetch_related('statuses').get(pk=job.pk)
        return Response(JobSerializer(job).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        """
        PATCH /api/jobs/<pk>/
        Updates a job's status by inserting a new JobStatus row.

        Does NOT modify any field on the Job row itself — the job's current
        status is always the most recent JobStatus entry, so inserting a new
        one is sufficient to 'update' the status.

        Request body:  { "status_type": "RUNNING" }
        Response body: the job with its updated current_status
        """
        job = get_object_or_404(Job, pk=pk)

        status_type = request.data.get('status_type')

        # Ensure status_type was included in the request body
        if not status_type:
            return Response(
                {'error': 'status_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure the value is one of the four defined choices
        if status_type not in JobStatus.StatusType.values:
            return Response(
                {'error': f'Invalid status_type. Must be one of: {JobStatus.StatusType.values}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Insert a new status row — this becomes the new current status
        JobStatus.objects.create(job=job, status_type=status_type)

        # Re-fetch with prefetch_related so current_status reflects the new row
        job = Job.objects.prefetch_related('statuses').get(pk=job.pk)
        return Response(JobSerializer(job).data)

    def destroy(self, request, pk=None):
        """
        DELETE /api/jobs/<pk>/
        Deletes the job and all its associated JobStatus entries.

        The CASCADE constraint on JobStatus.job (defined in models.py)
        handles the status deletions automatically at the database level —
        no manual cleanup needed here.
        """
        job = get_object_or_404(Job, pk=pk)
        job.delete()

        # 204 No Content is the conventional response for a successful DELETE —
        # the resource is gone, so there's nothing meaningful to return
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        GET /api/jobs/<pk>/history/
        Returns the full status history for a job, oldest entry first.

        The @action decorator tells DRF's router to register this method
        as an extra endpoint on the existing /api/jobs/<pk>/ resource.
        detail=True means it operates on a single job (requires a pk).

        Ordered ascending so the UI can render the timeline top-to-bottom
        in chronological order (first event at the top, latest at the bottom).
        """
        job = get_object_or_404(Job, pk=pk)
        statuses = job.statuses.order_by('timestamp')
        serializer = JobStatusSerializer(statuses, many=True)
        return Response(serializer.data)
