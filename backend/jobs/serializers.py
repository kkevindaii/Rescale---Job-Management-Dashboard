"""
Serializers for the Job Management Dashboard API.

Serializers act as a two-way translator between Django model instances
and JSON. They handle:
  - Outbound: converting Python objects → JSON for API responses
  - Inbound:  validating and parsing JSON → Python types before saving to DB
"""
from rest_framework import serializers
from .models import Job, JobStatus


class JobStatusSerializer(serializers.ModelSerializer):
    """
    Serializes a single JobStatus row.

    Used when returning status history for a job (stretch goal) and
    internally when creating new status entries.
    """

    class Meta:
        model = JobStatus
        fields = ['id', 'job', 'status_type', 'timestamp']

        # These fields are set automatically by the model/database and
        # should never be writable via the API
        read_only_fields = ['id', 'timestamp']


class JobSerializer(serializers.ModelSerializer):
    """
    Serializes a Job along with its current status.

    'current_status' is not a column on the Job table — it is derived
    by reading the most recent JobStatus entry for the job. We use a
    SerializerMethodField to compute it at serialization time.
    """

    # SerializerMethodField marks this as a computed/read-only field.
    # DRF will call get_current_status(self, obj) to produce its value.
    current_status = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = ['id', 'name', 'created_at', 'updated_at', 'current_status']
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_status']

    def get_current_status(self, obj):
        """
        Returns the status_type string from the most recent JobStatus row.

        obj.statuses is a queryset already ordered by -timestamp (defined in
        JobStatus.Meta), so .first() gives us the latest status with no
        extra ordering needed here.

        Returns None if the job somehow has no status entries, which
        shouldn't happen in practice since we always create an initial
        PENDING status on job creation.
        """
        latest = obj.statuses.first()
        return latest.status_type if latest else None
