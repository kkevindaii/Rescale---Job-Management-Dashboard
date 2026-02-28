from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from .models import Job, JobStatus


class JobAPITests(TestCase):

    def setUp(self):
        # APIClient is DRF's test helper — behaves like a real HTTP client
        # but makes requests directly to Django without going through a network
        self.client = APIClient()

    def test_create_job_returns_201_with_pending_status(self):
        response = self.client.post('/api/jobs/', {'name': 'Test Job'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Test Job')
        self.assertEqual(response.data['current_status'], 'PENDING')
        # One JobStatus row should exist for the new job
        self.assertEqual(JobStatus.objects.count(), 1)

    def test_list_jobs_returns_current_status(self):
        job = Job.objects.create(name='List Test')
        JobStatus.objects.create(job=job, status_type='PENDING')
        JobStatus.objects.create(job=job, status_type='RUNNING')

        response = self.client.get('/api/jobs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        # current_status should be the latest entry, not the first
        self.assertEqual(response.data['results'][0]['current_status'], 'RUNNING')

    def test_patch_job_creates_new_status_row(self):
        job = Job.objects.create(name='Patch Test')
        JobStatus.objects.create(job=job, status_type='PENDING')

        response = self.client.patch(
            f'/api/jobs/{job.pk}/',
            {'status_type': 'COMPLETED'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_status'], 'COMPLETED')
        # A second JobStatus row should have been inserted, not updated in place
        self.assertEqual(JobStatus.objects.filter(job=job).count(), 2)

    def test_delete_job_removes_job_and_statuses(self):
        job = Job.objects.create(name='Delete Test')
        JobStatus.objects.create(job=job, status_type='PENDING')
        JobStatus.objects.create(job=job, status_type='RUNNING')

        response = self.client.delete(f'/api/jobs/{job.pk}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Job.objects.count(), 0)
        # CASCADE should have removed the status rows too
        self.assertEqual(JobStatus.objects.count(), 0)

    def test_history_returns_statuses_oldest_first(self):
        job = Job.objects.create(name='History Test')
        JobStatus.objects.create(job=job, status_type='PENDING')
        JobStatus.objects.create(job=job, status_type='RUNNING')
        JobStatus.objects.create(job=job, status_type='COMPLETED')

        response = self.client.get(f'/api/jobs/{job.pk}/history/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        statuses = [entry['status_type'] for entry in response.data]
        self.assertEqual(statuses, ['PENDING', 'RUNNING', 'COMPLETED'])

    def test_create_job_with_empty_name_returns_400(self):
        response = self.client.post('/api/jobs/', {'name': ''}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_job_with_missing_name_returns_400(self):
        response = self.client.post('/api/jobs/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_jobs_empty_returns_empty_list(self):
        response = self.client.get('/api/jobs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    def test_patch_invalid_status_type_returns_400(self):
        job = Job.objects.create(name='Patch Invalid')
        JobStatus.objects.create(job=job, status_type='PENDING')

        response = self.client.patch(
            f'/api/jobs/{job.pk}/',
            {'status_type': 'INVALID'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_missing_status_type_returns_400(self):
        job = Job.objects.create(name='Patch Missing')
        JobStatus.objects.create(job=job, status_type='PENDING')

        response = self.client.patch(f'/api/jobs/{job.pk}/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_nonexistent_job_returns_404(self):
        response = self.client.patch(
            '/api/jobs/99999/',
            {'status_type': 'RUNNING'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexistent_job_returns_404(self):
        response = self.client.delete('/api/jobs/99999/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_history_nonexistent_job_returns_404(self):
        response = self.client.get('/api/jobs/99999/history/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
