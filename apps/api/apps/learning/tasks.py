import weasyprint  # example if you install weasyprint
from celery import shared_task
from django.core.files.base import ContentFile

from .models import Certificate


@shared_task
def generate_certificate_pdf(certificate_id):
    cert = Certificate.objects.get(pk=certificate_id)
    # render template to html (django render_to_string)
    from django.template.loader import render_to_string
    html = render_to_string("certificates/template.html", {"certificate": cert})
    pdf = weasyprint.HTML(string=html).write_pdf()
    # save to filefield
    filename = f"certificate_{cert.pk}.pdf"
    cert.file.save(filename, ContentFile(pdf))
    cert.save()
    return True
