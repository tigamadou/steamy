# Spécifications publiques de l'API e-MECeF (DGI du Bénin)

Spécifications OpenAPI téléchargées le 2026-10-23 depuis la documentation publique de la DGI
(<https://developper.impots.bj/sygmef-emcf/swagger/index.html>), sans modification :

| Fichier | API | Usage dans Steamy |
| --- | --- | --- |
| [`e-mecef_api_v1.0.pdf`](e-mecef_api_v1.0.pdf) | « Spécification de l'API pour l'e-MCF » v1.0 (DGI, 15/01/2021) : **document de référence** (URLs, flux, exemples, annexe des erreurs) | Tout le code e-MECeF ; les exemples JSON servent de jeux de test |
| [`emcf-v1.openapi.json`](emcf-v1.openapi.json) | e-MCF 1.0 : facturation (`/api/invoice`, `/api/info/*`) | Émission, confirmation et annulation des factures normalisées ([ADR 0006](../../adr/0006-facture-normalisee-emecef.md)) |
| [`emcf-integrator-v1.openapi.json`](emcf-integrator-v1.openapi.json) | e-MCF Integrator 1.0 : demandes d'agrément et jetons des contribuables | Démarches **manuelles** auprès de la DGI (obtenir le jeton) : aucun appel depuis le code |

Aucun identifiant ni jeton dans ce dossier : l'IFU de Steamy et le jeton e-MECeF sont des variables d'environnement.
Ces documents ne décrivent pas le sens métier des groupes de taxe A à F ni si `total` inclut l'AIB : voir les points
ouverts de l'ADR 0006. Le texte du PDF dit POST pour la finalisation ; son exemple et l'OpenAPI disent PUT (retenu).
