"""
Actions d'admin en deux temps (API-L6.2) : un formulaire (motif, note, numéro…) puis l'exécution. Le motif saisi est
transmis au service métier, qui le journalise dans `AuditLog`.
"""

from django.contrib.admin import helpers
from django.template.response import TemplateResponse


def form_action(modeladmin, request, queryset, form_class, *, title, intro, submit_label, apply):
    """
    Affiche `form_class` pour les objets sélectionnés ; une fois le formulaire valide, appelle
    `apply(cleaned_data)` et revient à la liste.
    """
    if "apply" in request.POST:
        form = form_class(request.POST)
        if form.is_valid():
            apply(form.cleaned_data)
            return None
    else:
        form = form_class()
    context = {
        **modeladmin.admin_site.each_context(request),
        "title": title,
        "intro": intro,
        "submit_label": submit_label,
        "form": form,
        "queryset": queryset,
        "opts": modeladmin.model._meta,
        "action": request.POST["action"],
        "selected": request.POST.getlist(helpers.ACTION_CHECKBOX_NAME),
    }
    return TemplateResponse(request, "admin/action_form.html", context)
