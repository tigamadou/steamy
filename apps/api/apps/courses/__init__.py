"""
Ancienne app `courses` (`Path`, `Course`, `Module`, `Lesson`, `Resource`), remplacée par `catalog` en API-L1.1 (S2).

Il n'en reste que les migrations : `0002` supprime ses tables après que `learning` a été rattaché au catalogue. Les
supprimer réécrirait des migrations déjà fusionnées (`learning.0001` en dépend) ; l'app disparaîtra avec la refonte
des migrations de `learning` (API-L3a).
"""
