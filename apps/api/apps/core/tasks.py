# core/tasks.py

from celery import shared_task
from django.core.management import call_command


@shared_task
def run_db_backup(dump_path="/tmp/db-backup.sql"):
    # simple pg_dump using env vars (must be available in container)
    # Alternative: use Django db backup libs
    try:
        call_command("dbbackup")  # if you use django-dbbackup or custom command
    except Exception as e:
        # fallback: log
        print("db backup failed:", e)
    return True

@shared_task
def clear_expired_sessions():
    from django.contrib.sessions.models import Session
    Session.objects.filter(expire_date__lt=timezone.now()).delete()
    return True
