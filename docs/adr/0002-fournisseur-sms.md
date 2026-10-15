# ADR 0002 · Fournisseur SMS

- **Statut** : proposé (à trancher par le porteur du projet, arbitrage S10)
- **Date** : 15 octobre 2026
- **Étape du plan** : API-L2.0a, avant API-L2.0b ([PLAN-API](../plans/PLAN-API.md))
- **Étude détaillée** : [docs/etudes/sms.md](../etudes/sms.md)

## Contexte

Les mineurs n'ont ni téléphone ni courriel : le parent s'inscrit et valide par **OTP SMS** (6 chiffres, 5 min,
D24), reçoit les **liens de consentement** et de **demande de paiement**, et un SMS unique de réapprovisionnement.
Les envois partent d'une API Django par une tâche Celery. S10 impose une interface abstraite et un faux fournisseur
en local et en CI ; le choix du vrai fournisseur attend cette comparaison.

Marché : Bénin d'abord (MTN, Moov, Celtiis), puis Togo, Côte d'Ivoire, Burkina Faso. Volume de démarrage modeste
(≈ 2 000 SMS/mois, jusqu'à 10 000). Critères éliminatoires : pas d'API serveur, pas de couverture du Bénin.
Autres critères : prix par pays en FCFA, délivrabilité, identifiant « STEAMY », webhooks, données personnelles,
facilité de bascule.

## Options

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **A. Twilio seul** | Meilleure API, SDK Python, `StatusCallback`, sous-comptes | 146 à 282 FCFA/SMS (≈ 17 fois une route locale), USD, enregistrement d'identifiant ≈ 3 semaines (Bénin, Côte d'Ivoire), données aux États-Unis |
| **B. BulkGate** (passerelle européenne, routes directes) | ≈ 10 FCFA/SMS au Bénin et 12 en Côte d'Ivoire avec expéditeur enregistré, 4 pays couverts, RGPD, OTP prioritaires, API REST simple | Webhook de statut et sens de « trafic international non autorisé » à confirmer, enregistrement ≈ 4 semaines, pas de SDK Python officiel, pas de sandbox, support par formulaire |
| **C. Prestataire local** (FasterMessage, e-MC, SMS-PRO) | Seul FasterMessage cite Celtiis ; support local, FCFA, tarifs bas | Solidité, contrat, webhooks et délivrabilité invérifiables à distance |
| **D. Infobip ou Vonage** | API et SDK complets, webhooks, support commercial | Prix non confirmés (≈ 109 à 172 FCFA/SMS d'après des sources tierces), sites illisibles lors de l'étude |
| **E. Africa's Talking, Orange SMS API** | Orange CI à 7,26 FCFA/SMS | **Éliminés** : couverture du Bénin non démontrée |

## Décision proposée

1. **Fournisseur principal : BulkGate**, sous réserve de lever les inconnues bloquantes ci-dessous (en particulier
   l'enregistrement de « STEAMY » et la couverture de Celtiis). C'est la seule option dont le prix par opérateur,
   les quatre pays et les règles d'identifiant sont publiés à la source, au coût le plus bas.
2. **Secours : Twilio**, activé automatiquement ou à la main si le principal échoue, **limité aux OTP** pour
   contenir le coût. Choisi pour la fiabilité de son API, de ses webhooks et de son SDK, et pour ses règles
   publiées (Togo et Burkina Faso sans enregistrement préalable).
3. Si BulkGate ne lève pas ses inconnues, **bascule du principal** vers le meilleur devis parmi Infobip, Vonage et
   FasterMessage (si Celtiis y est confirmé) ; Twilio reste secours.
4. **Contrat d'interface** (inchangé, API-L2.0b) : `SmsProvider.send(phone, text) → message_id` avec deux
   implémentations réelles (`BulkGateProvider`, `TwilioProvider`) et `FakeSmsProvider` ; sélection par
   `SMS_PROVIDER` et `SMS_FALLBACK_PROVIDER` ; ajouter à l'interface la lecture des **accusés** (`parse_status`) pour
   brancher les webhooks sans coupler l'API à un fournisseur. Le faux fournisseur reste le seul autorisé hors
   staging et production.
5. **Texte des SMS** : pas de nom d'enfant, GSM-7 (un segment), lien court à jeton, expéditeur « STEAMY ».

## Conséquences

- **Coût** : ≈ 20 000 FCFA/mois pour 2 000 SMS et ≈ 98 000 FCFA pour 10 000 au Bénin avec expéditeur enregistré,
  contre ≈ 340 000 et ≈ 1 700 000 FCFA avec Twilio seul. Sans identifiant enregistré, le coût monte de 10 à 20 fois
  (MTN, Moov) : l'enregistrement est donc sur le chemin critique.
- **Calendrier** : enregistrer « STEAMY » dès la validation de l'ADR (≈ 3 à 4 semaines), en parallèle d'API-L2.0b ;
  d'ici là, développement et CI avec le faux fournisseur, tests réels via les numéros de test.
- **Risque** : un fournisseur à support par formulaire sans présence locale : le secours Twilio et les tests de
  délivrabilité réduisent ce risque ; un plafond de dépense et une alerte de solde sont à configurer.
- **Données** : numéros de parents confiés à un sous-traitant européen (principal) et américain (secours) ; contrat
  de traitement à signer, journaux sans numéro en clair, contenu des SMS minimal.
- **Réversibilité** : facile grâce à l'interface ; le coût de sortie est l'enregistrement d'un identifiant chez le
  nouveau fournisseur.
- **Plan** : API-L2.0b branche le fournisseur réel seulement après la validation de cet ADR.

## Inconnues à lever avant branchement (détail : [étude §7](../etudes/sms.md#7-inconnues-à-lever-avant-le-branchement-réel-api-l20b))

1. Sens de « *International traffic not allowed* » et « *registrations last 30 days* » chez BulkGate.
2. Celtiis réellement desservi (BBCom ?), tarifs Togo et Burkina Faso avec expéditeur enregistré.
3. Procédure, pièces et délai d'enregistrement de « STEAMY » (personne morale requise ?).
4. Webhook de statut, débit, SLA OTP, essai gratuit.
5. Devis Infobip et Vonage ; qualification de FasterMessage.
6. Tests de délivrabilité sur MTN, Moov et Celtiis (délai OTP < 30 s).
7. Contrat de traitement des données.
