"""
Data models for the Job Management Dashboard.

Two models, two database tables:
  - Job          → stores the job itself (name, timestamps)
  - JobStatus    → stores the status history for a job

Status is never stored directly on the Job. Instead, every status change
inserts a new JobStatus row. The job's current status is always derived
by reading the most recent JobStatus entry for that job.
"""
from django.db import models


class Job(models.Model):
    """
    Represents a computational job submitted by a user.

    Intentionally lean — only holds identity and timestamps.
    All status information lives in the related JobStatus table.
    """

    # Job name as provided by the user (e.g. "Fluid Dynamics Simulation")
    name = models.CharField(max_length=255)

    # Set once on creation; never updated afterwards
    created_at = models.DateTimeField(auto_now_add=True)

    # Automatically updated to the current time on every save()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Default ordering for all Job queries — newest jobs appear first
        # in list responses without needing to specify order_by() each time
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class JobStatus(models.Model):
    """
    Records a single status event for a Job.

    This table acts as an append-only log — rows are inserted on every
    status change, never updated in place. The current status of a job
    is always the row with the latest timestamp for that job.

    This design naturally preserves the full status history as a
    by-product of normal operation.
    """

    class StatusType(models.TextChoices):
        """
        Enumeration of all valid job status values.

        TextChoices stores the string value (e.g. 'PENDING') directly in
        the database column, making raw SQL queries and logs readable
        without needing to join against a lookup table.
        """
        PENDING = 'PENDING'
        RUNNING = 'RUNNING'
        COMPLETED = 'COMPLETED'
        FAILED = 'FAILED'

    # Many-to-one: multiple JobStatus rows can belong to a single Job.
    # CASCADE means deleting a Job automatically deletes all its status rows,
    # satisfying the DELETE /api/jobs/<id>/ requirement without extra code.
    # related_name='statuses' lets us do job.statuses.all() on a Job instance.
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='statuses')

    # The status value for this event — must be one of the StatusType choices
    status_type = models.CharField(max_length=20, choices=StatusType.choices)

    # Automatically set to the current time when the row is inserted.
    # auto_now_add makes this field read-only — callers cannot override it.
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Default ordering: newest status first.
        # This means job.statuses.first() always returns the current status
        # without any additional .order_by() call at the query site.
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.job.name} → {self.status_type} at {self.timestamp}'
