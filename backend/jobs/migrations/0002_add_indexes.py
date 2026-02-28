from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0001_initial'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='job',
            index=models.Index(fields=['created_at'], name='job_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='job',
            index=models.Index(fields=['name'], name='job_name_idx'),
        ),
        migrations.AddIndex(
            model_name='jobstatus',
            index=models.Index(fields=['job', '-timestamp'], name='jobstatus_job_timestamp_idx'),
        ),
    ]
