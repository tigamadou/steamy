"""
Rendu PDF (ADR 0005) : `render_pdf(template, context) → bytes`, derrière lequel les tâches ignorent WeasyPrint.

Le HTML est construit par nous (gabarit Django de `templates/pdf/`, données échappées) et ne charge **aucune
ressource** : le récupérateur d'URL refuse tout, ce qui ferme les failles de récupération (CVE-2025-68616). Le CSS est
dans le gabarit ; les polices sont celles du système (Nunito à embarquer, ADR 0005 « Suites »).
"""

from django.template.loader import render_to_string


class RemoteResourceRefused(ValueError):
    pass


def refuse_url(url, *args, **kwargs):
    """Récupérateur d'URL de WeasyPrint : aucune ressource externe ni locale n'est chargée."""
    raise RemoteResourceRefused(f"Ressource refusée dans un PDF : {url}")


def render_pdf(template: str, context: dict) -> bytes:
    from weasyprint import HTML
    from weasyprint.text.fonts import FontConfiguration

    html = render_to_string(template, context)
    fonts = FontConfiguration()
    return HTML(string=html, url_fetcher=refuse_url).write_pdf(font_config=fonts)
