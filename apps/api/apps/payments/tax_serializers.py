"""Lignes de taxes exposées par l'API (C25) : le front les affiche telles quelles, sans rien recalculer."""

from rest_framework import serializers


class TaxLineSerializer(serializers.Serializer):
    code = serializers.ChoiceField(choices=["vat", "aib"], help_text="`vat` : TVA ; `aib` : AIB")
    rate = serializers.CharField(help_text="Taux en %, ex. `18` ou `1.5`")
    base = serializers.IntegerField(help_text="Montant HT sur lequel la taxe est calculée (FCFA)")
    amount = serializers.IntegerField(
        help_text="Montant de la taxe, ajouté au total à payer (FCFA)"
    )
