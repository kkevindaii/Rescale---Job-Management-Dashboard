"""
Initial database migration — creates the jobs_job and jobs_jobstatus tables.

This file is generated from the model definitions in jobs/models.py.
Running `python manage.py migrate` applies it to the database.

Django tracks which migrations have been applied in the django_migrations table,
so this runs exactly once per database — it's safe to re-run migrate anytime.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    # No dependencies — this is the first migration for this app
    dependencies = []

    operations = [
        # Create the Job table first since JobStatus has a FK pointing to it
        migrations.CreateModel(
            name='Job',
            fields=[
                # BigAutoField = 64-bit auto-incrementing integer primary key
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                # auto_now_add: set once on INSERT, never updated
                ('created_at', models.DateTimeField(auto_now_add=True)),
                # auto_now: updated to current time on every UPDATE
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                # Default query ordering: newest jobs first
                'ordering': ['-created_at'],
            },
        ),

        # Create the JobStatus table with a FK back to Job
        migrations.CreateModel(
            name='JobStatus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                # CASCADE: deleting a Job row automatically deletes its JobStatus rows
                ('job', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='statuses',
                    to='jobs.job',
                )),
                # Choice field — database only stores the value (e.g. 'PENDING'),
                # the label (e.g. 'Pending') exists only at the Python level
                ('status_type', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('RUNNING', 'Running'),
                        ('COMPLETED', 'Completed'),
                        ('FAILED', 'Failed'),
                    ],
                    max_length=20,
                )),
                # auto_now_add: set once on INSERT — when the status event occurred
                ('timestamp', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                # Default ordering: most recent status first, so
                # job.statuses.first() always returns the current status
                'ordering': ['-timestamp'],
            },
        ),
    ]
