# ADR 0002 · Fournisseur SMS

- **Statut** : acceptée (arbitrage S10 tranché par le porteur du projet)
- **Date** : 2026-10-15
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
| **A. Twilio seul (retenu)** | Meilleure API, SDK Python, `StatusCallback`, sous-comptes | 146 à 282 FCFA/SMS (≈ 17 fois une route locale), USD, enregistrement d'identifiant ≈ 3 semaines (Bénin, Côte d'Ivoire), données aux États-Unis |
| **B. BulkGate** (candidat à la bascule) | ≈ 10 FCFA/SMS au Bénin et 12 en Côte d'Ivoire avec expéditeur enregistré, 4 pays couverts, RGPD, OTP prioritaires, API REST simple | Webhook de statut et sens de « trafic international non autorisé » à confirmer, enregistrement ≈ 4 semaines, pas de SDK Python officiel, pas de sandbox, support par formulaire |
| **C. Prestataire local** (FasterMessage, e-MC, SMS-PRO) | Seul FasterMessage cite Celtiis ; support local, FCFA, tarifs bas | Solidité, contrat, webhooks et délivrabilité invérifiables à distance |
| **D. Infobip ou Vonage** | API et SDK complets, webhooks, support commercial | Prix non confirmés (≈ 109 à 172 FCFA/SMS d'après des sources tierces), sites illisibles lors de l'étude |
| **E. Africa's Talking, Orange SMS API** | Orange CI à 7,26 FCFA/SMS | **Éliminés** : couverture du Bénin non démontrée |

## Décision

1. **Twilio est le seul fournisseur SMS en production pour l'instant**, pour tous les usages : OTP, liens de
   consentement, liens de demande de paiement. Choisi pour la fiabilité de son API, de ses webhooks
   (`StatusCallback`) et de son SDK Python, et pour la couverture publiée des quatre pays.
2. **La remplaçabilité est garantie par l'interface**, pas par le contrat : `SmsProvider.send(phone, text) →
   message_id`, sélection par `SMS_PROVIDER`, `FakeSmsProvider` seul autorisé hors staging et production.
   Changer de fournisseur ne touche pas le code métier. L'interface expose aussi la lecture des **accusés**
   (`parse_status`) pour brancher les webhooks sans coupler l'API à un fournisseur.
3. **Une seule implémentation réelle dans le périmètre d'API-L2 : `TwilioProvider`.** `BulkGateProvider` n'est pas
   développé. Un secours (`SMS_FALLBACK_PROVIDER`) reste optionnel et hors périmètre tant qu'aucun second
   fournisseur n'est contracté.
4. **BulkGate (candidat n° 1), Infobip, Vonage et les prestataires locaux** (FasterMessage, e-MC, SMS-PRO) sont les
   candidats d'une bascule future.
5. **Réévaluation** : dès que la facture SMS mensuelle dépasse **≈ 150 000 FCFA** (soit ≈ 900 SMS/mois au Bénin
   chez Twilio) ou **un an après la mise en production**, selon ce qui arrive en premier ; ou plus tôt si la
   délivrabilité sur MTN, Moov ou Celtiis est insuffisante.
6. **Texte des SMS** : pas de nom d'enfant, GSM-7 (un segment), lien court à jeton, expéditeur « STEAMY ».

## Conséquences

- **Coût** : avec Twilio seul, ≈ 340 000 FCFA/mois pour 2 000 SMS au Bénin et ≈ 1 700 000 FCFA pour 10 000
  (≈ 170 FCFA/SMS ; Côte d'Ivoire ≈ 281, Togo ≈ 282, Burkina Faso ≈ 146). C'est **≈ 17 fois** une route locale
  enregistrée (BulkGate ≈ 10 FCFA au Bénin) : le coût est le prix de la simplicité, d'où la réévaluation planifiée
  et des plafonds OTP stricts (D24) ; plafond de dépense et alerte de solde à configurer chez Twilio.
- **Calendrier** : enregistrer « STEAMY » dans la console Twilio dès l'acceptation (≈ 3 semaines au Bénin et en
  Côte d'Ivoire ; aucun préenregistrement au Togo et au Burkina Faso), en parallèle d'API-L2.0b ; développement et
  CI avec le faux fournisseur d'ici là.
- **Périmètre API-L2.0b** : une implémentation réelle (`TwilioProvider`), webhook de statut Twilio, tests avec les
  numéros de test Twilio.
- **Données** : numéros de parents traités par une société américaine ; clauses contractuelles et journaux sans
  numéro en clair, contenu des SMS minimal.
- **Réversibilité** : facile grâce à l'interface ; le coût de sortie est l'enregistrement d'un identifiant chez le
  nouveau fournisseur.

## Inconnues restant à lever

Avec Twilio :

1. Enregistrement de « STEAMY » au Bénin et en Côte d'Ivoire : pièces exigées, personne morale, délai réel, refus
   éventuel (contenu promotionnel non enregistrable, identifiants génériques déconseillés).
2. Couverture et délivrabilité réelles sur MTN, Moov et **Celtiis** (Twilio ne détaille pas par opérateur) : tests
   avec 3 numéros par opérateur, délai de l'OTP < 30 s.
3. Frais opérateurs éventuels en plus du tarif publié ; facturation en USD par carte.
4. Contrat de traitement des données.

Pour la bascule future ([étude §7](../etudes/sms.md#7-inconnues-à-lever-avant-le-branchement-réel-api-l20b)) : sens
de « *International traffic not allowed* » chez BulkGate, Celtiis chez BulkGate, devis Infobip et Vonage,
qualification des prestataires locaux.
