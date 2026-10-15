# Étude · Fournisseurs SMS (S10)

> **Décision : Twilio (ADR 0002, acceptée le 2026-10-15)**, remplaçable via l'interface `SmsProvider`. Le reste de
> cette étude documente la comparaison et sert de base à une bascule future (BulkGate en tête).

Étude préparatoire à l'[ADR 0002 · Fournisseur SMS](../adr/0002-fournisseur-sms.md). Tâche **API-L2.0a** du
[PLAN-API](../plans/PLAN-API.md). Sources consultées le **15 octobre 2026** ; chaque chiffre est daté de cette
consultation et à revalider par devis avant signature.

## 1. Besoin

| Élément | Valeur |
| --- | --- |
| Destinataires | **Parents** (téléphone E.164), jamais les mineurs (S4, D30) |
| Pays | Bénin d'abord (MTN, Moov, Celtiis), puis Togo, Côte d'Ivoire, Burkina Faso (D3) |
| Messages | OTP d'inscription et de mot de passe oublié (6 chiffres, 5 min, D24), lien de demande de consentement, lien de demande de paiement, relance unique de réapprovisionnement (D38) |
| Nature | Tous **transactionnels** (aucun marketing vers un mineur ou son parent, D6) |
| Volume de démarrage | Modeste : hypothèse de travail **2 000 SMS/mois** (≈ 700 inscriptions avec OTP, consentements, paiements), scénario haut **10 000 SMS/mois** |
| Émission | API Django, tâche Celery `send_sms` avec réessais exponentiels, derrière `SmsProvider.send(phone, text) → message_id` |
| Critères éliminatoires (plan) | Pas d'API serveur ; pas de couverture du Bénin |

Les messages sont en français, GSM-7 si possible (éviter les accents hors jeu GSM-7 pour tenir un segment de 160
caractères ; un segment UCS-2 tombe à 70 caractères et multiplie le coût).

## 2. Constat sur les sources

- La documentation **officielle** n'est lisible sans compte que pour une partie des fournisseurs. Les sites
  d'Infobip, d'Africa's Talking et de Vonage ont refusé la lecture automatique (HTTP 403) : leurs prix par pays
  n'ont pas pu être confirmés à la source.
- Les tarifs d'agrégateurs internationaux dépendent du compte et du volume : un **devis** est indispensable.
- Les guides de conformité de tiers (sent.dm, etc.) répètent des règles ARCEP (enregistrement de l'identifiant,
  double consentement, plage 8 h-17 h) **sans citer de texte réglementaire** : elles visent surtout le marketing et
  sont à vérifier auprès de l'ARCEP et de l'opérateur. Aucune procédure officielle propre à Celtiis n'a été trouvée.
- Conversion FCFA indicative : 1 EUR = 655,957 FCFA (parité fixe) ; 1 USD ≈ 570 FCFA (hypothèse, à réviser).

## 3. Fournisseurs examinés

### 3.1 Twilio (agrégateur international)
- **Prix** (pages officielles twilio.com/sms/pricing, par segment, hors frais opérateurs éventuels) : Bénin
  **0,2985 USD** (≈ 170 FCFA), Côte d'Ivoire **0,4925 USD** (≈ 281 FCFA), Togo **0,4946 USD** (≈ 282 FCFA),
  Burkina Faso **0,2568 USD** (≈ 146 FCFA). Pas de détail par opérateur. Facturation en USD (carte).
- **Identifiant alphanumérique** : Bénin → **préenregistrement obligatoire** via la console, ≈ **3 semaines**,
  contenu promotionnel non enregistrable, identifiants génériques déconseillés ; sur MTN l'identifiant numérique
  fait échouer la livraison. Côte d'Ivoire → préenregistrement via la console, ≈ 3 semaines ; sans enregistrement,
  envoi « au mieux ». Togo et Burkina Faso → **aucun préenregistrement**, identifiant dynamique accepté.
- **API / SDK** : API REST, SDK Python officiel (`twilio`), sous-compte, `StatusCallback` (webhook de statut),
  Verify (OTP géré) en option. La meilleure documentation du comparatif.
- **Fiabilité / support** : acteur mondial, SLA et support commercial ; pas de présence locale.
- **Données personnelles** : numéros de parents traités hors UE/UEMOA par une société américaine ; clauses
  contractuelles à examiner (voir §5).
- **Points faibles** : prix **5 à 20 fois** supérieurs aux routes locales, facturation en USD.

### 3.2 BulkGate (passerelle SMS européenne, routes directes Afrique de l'Ouest)
- **Prix** (pages officielles bulkgate.com/en/pricing/sms/…, par opérateur, hors TVA) :

  | Pays | Expéditeur textuel **enregistré** | Expéditeur non enregistré / numéro système |
  | --- | --- | --- |
  | Bénin | **0,0149 €** (≈ 9,8 FCFA) sur BBCom, Moov, MTN, Sonatel | BBCom 0,0281 €, Sonatel 0,1256 €, MTN 0,1454 €, Moov 0,1718 € |
  | Côte d'Ivoire | **0,0182 €** (≈ 11,9 FCFA) sur Orange, MTN, Moov, café, GreenN, KoZ | 0,0248 à 0,2478 € |
  | Togo | non listé ; « économique » : Moov 0,0396 €, Togo Cell 0,0595 € | Moov 0,0396 €, Togo Cell 0,261 € |
  | Burkina Faso | non listé | Telmob 0,0694 €, Telecel 0,0859 €, Orange 0,1024 € |

  Le Bénin est desservi via **BBCom** (ancien Libercom, rapproché de Celtiis : *à confirmer par écrit*, Celtiis n'est
  pas nommé sur la page). Facturation en euros.
- **Identifiant alphanumérique** : 11 caractères maximum ; enregistrement par formulaire (« Sender ID
  Registration »), activation après approbation des opérateurs, **≈ 4 semaines ouvrées** (Bénin), « environ un mois »
  (Côte d'Ivoire). **Attention** : la page mentionne « *International traffic not allowed* » pour les expéditeurs
  enregistrés / économiques et « *registrations last 30 days* » — le sens exact (route réservée au trafic local ?
  renouvellement mensuel ?) est **la principale inconnue** : à lever avant toute décision définitive.
- **API / SDK** : API REST « propre », clé d'API par portail, jetons multiples liés à des portefeuilles distincts,
  API transactionnelle 2.0 avec **priorité aux OTP**, SDK PHP officiel, exemples Python et Node.js ; appel direct
  par `requests` suffisant. Accusés de réception en temps réel (statut détaillé) ; mécanisme de **webhook de statut
  non confirmé** dans la documentation lue (webhooks cités pour les réponses 2-way). Pas de sandbox documenté.
- **Fiabilité / support** : société tchèque, support par formulaire et courriel ; aucune présence locale.
- **Données personnelles** : fournisseur européen (RGPD), meilleur point de départ que Twilio pour le contrat.

### 3.3 Africa's Talking
- Le centre d'aide (non daté) ne liste le SMS en gros/short code que pour la **Côte d'Ivoire** parmi nos quatre
  pays ; aucune confirmation pour le **Bénin**, le Togo ou le Burkina Faso. Tarifs SMS non trouvés (seuls les tarifs
  voix figurent). API REST, SDK Python officiel, rappels de livraison, sandbox : connus du fournisseur mais non
  re-vérifiés. **Écarté** sur le critère éliminatoire (couverture Bénin non démontrée) ; à relancer si leur
  équipe commerciale confirme le Bénin par écrit.

### 3.4 Infobip
- Agrégateur mondial avec bureau et clients en Afrique de l'Ouest, API REST, SDK Python, webhooks de statut,
  portail de gestion des identifiants : capacités attendues mais **non lues à la source** (HTTP 403). Un tiers cite
  0,3016 USD par SMS pour le Togo (≈ 172 FCFA, indicatif). **Devis à demander** : candidat sérieux pour le secours.

### 3.5 Vonage
- Pages de restrictions du Bénin inaccessibles (HTTP 403). Un tarif de revente (Deutsche Telekom, 10/01/2025) donne
  Bénin ≈ **0,1655 €** (≈ 109 FCFA) et Côte d'Ivoire ≈ **0,1881 €** (≈ 123 FCFA) ; Togo et Burkina Faso non trouvés.
  Règles génériques : pas d'identifiants usurpés ni génériques, identifiants numériques réécrits. Même profil
  qu'Infobip ; **devis à demander** si nécessaire.

### 3.6 Orange SMS API (developer.orange.com)
- **Côte d'Ivoire seulement** parmi nos pays : forfaits prépayés en FCFA payables par crédit de communication ou
  Orange Money — 100 SMS pour 725 FCFA, 1 000 pour 7 260 FCFA (**7,26 FCFA/SMS**), 10 000 pour 72 600 FCFA ; validité
  de 30 à 60 jours ; 5 transactions/s ; jeton OAuth d'une heure ; expéditeur de 11 caractères maximum. La page ne
  précise **pas** les destinations (réseaux autres qu'Orange, autres pays) et aucune API équivalente n'a été
  trouvée pour le Bénin. **Écarté** (pas de couverture du Bénin), mais ce serait une option de **repli local pour
  la Côte d'Ivoire** si le volume y justifie une intégration.

### 3.7 Acteurs locaux et régionaux
| Acteur | Ce que disent leurs sites | Réserves |
| --- | --- | --- |
| **FasterMessage** (Abomey-Calavi, société URBAN TECHNOLOGY) | Seul à citer **MTN, Moov et Celtiis** ; API RESTful, champ expéditeur, accusés de réception | Aucun tarif, aucun webhook documenté, structure petite : contrôle de solidité nécessaire |
| **e-MC** (Cotonou) | MTN, Moov, Libercom ; API HTTP ou SMPP ; expéditeur personnalisé | Celtiis non cité |
| **SMS-PRO.AFRICA** | MTN et Moov ; API ; **12 FCFA/SMS** affiché | Celtiis non cité ; tarif à confirmer |
| **LAfricaMobile** | « plus de 60 opérateurs » en Afrique, API XML/JSON, expéditeur de 11 caractères | Bénin non nommé ; accusés/webhooks non documentés |
| **Termii, eSMS Africa, SendSMSGate, Hubtel, Sendchamp** | Termii (Nigeria, OTP) et eSMS Africa listent le Bénin sans opérateurs ; Hubtel centré Ghana | Informations trop minces ; Hubtel et Sendchamp écartés |

Ces acteurs sont **moins chers et plus proches** (support en français, enregistrement de l'identifiant mieux
maîtrisé), mais ni leur solidité, ni leurs accusés de réception, ni leur contrat ne sont vérifiables à distance.

## 4. Tableau comparatif

| Critère | Twilio | BulkGate | Africa's Talking | Infobip | Vonage | Orange CI | Locaux (FasterMessage…) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Éliminatoire : API serveur | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Éliminatoire : Bénin | ✅ | ✅ (MTN, Moov, BBCom) | ❌ non démontré | ✅ (à confirmer) | ✅ (à confirmer) | ❌ | ✅ (Celtiis : FasterMessage seulement) |
| Prix Bénin (FCFA/SMS) | ≈ 170 | **≈ 10** (expéditeur enregistré) ; 18-113 sinon | — | devis | ≈ 109 (revente) | — | ≈ 12 (SMS-PRO) |
| Prix CI / TG / BF | 281 / 282 / 146 | 12 / 26-171 / 46-67 | — | TG ≈ 172 | CI ≈ 123 | CI 7,26 | à demander |
| Expéditeur « STEAMY » | Bénin, CI : ≈ 3 sem. ; TG, BF : aucun | ≈ 4 sem. à ≈ 1 mois ; inconnue « trafic international » | — | par la console | par le portail | 11 car. | par le fournisseur |
| SDK Python | ✅ officiel | requêtes HTTP (PHP officiel) | ✅ | ✅ | ✅ | non | non |
| Accusés (webhook) | ✅ `StatusCallback` | accusés oui ; webhook à confirmer | rappels oui | ✅ | ✅ | partiel | à confirmer |
| Sandbox | numéros de test | non documenté | ✅ | oui (essai) | oui | non | non |
| Devise | USD | EUR | USD/KES | EUR/USD | EUR | **FCFA** | **FCFA** possible |
| Données personnelles | USA | **UE (RGPD)** | Kenya | UE/mondial | UE/mondial | CI | Bénin/Afrique |
| Support | mondial | formulaire | Kenya | commercial | commercial | local CI | **local** |
| Bascule | simple (REST) | simple (REST) | — | simple | simple | — | variable |

## 5. Conformité et données personnelles

- Le SMS transporte le **numéro d'un parent** et, dans les liens, des jetons à usage unique : le fournisseur voit le
  numéro et le message. Le contenu doit rester minimal : **ni prénom de l'enfant, ni identifiant dans le texte**
  (D20 ne les expose qu'après ouverture du lien), jeton court, expiration 7 jours côté API.
- Bénin : loi n° 2017-20 (code du numérique) et APDP ; Côte d'Ivoire : loi n° 2013-450 et ARTCI ; Togo et Burkina
  Faso : lois et autorités équivalentes. Le transfert hors du pays suppose une base juridique : privilégier un
  contrat avec **clauses de traitement** (sous-traitant) et un hébergement UE ou régional ; à faire valider.
- Les guides tiers signalent plage horaire et consentement renforcé pour le **marketing** : sans objet ici
  (transactionnel uniquement), mais l'OTP ne doit jamais servir de support promotionnel.
- Journaliser côté API : identifiant de message, statut, horodatage, **numéro masqué** ; purge selon la politique
  de rétention.

## 6. Coût estimé

Hypothèse : tous les SMS au Bénin, un segment, taux de change du §2.

| Fournisseur | 2 000 SMS/mois | 10 000 SMS/mois |
| --- | --- | --- |
| BulkGate, expéditeur enregistré (9,8 FCFA) | ≈ 20 000 FCFA | ≈ 98 000 FCFA |
| BulkGate, non enregistré, MTN/Moov (≈ 95-113 FCFA) | ≈ 190 000-226 000 FCFA | ≈ 950 000-1 130 000 FCFA |
| Local affiché (SMS-PRO, 12 FCFA) | ≈ 24 000 FCFA | ≈ 120 000 FCFA |
| Vonage (revente, ≈ 109 FCFA) | ≈ 218 000 FCFA | ≈ 1 090 000 FCFA |
| Twilio (170 FCFA) | ≈ 340 000 FCFA | ≈ 1 700 000 FCFA |

L'**OTP** fait l'essentiel du volume : les renvois (toutes les 60 s) et les plafonds D24 pilotent la facture.
En cas de repli sur Twilio pour tous les envois, la facture est **≈ 17 fois** celle d'une route locale enregistrée :
le secours ne doit servir qu'en bascule.

## 7. Inconnues à lever (avant le branchement réel, API-L2.0b)

1. **BulkGate** : sens de « *International traffic not allowed* » (un expéditeur enregistré peut-il être émis depuis
   un compte hors du pays ?) et de « *registrations last 30 days* » (renouvellement ?). Confirmer par écrit que
   **Celtiis** est bien desservi (BBCom) et le tarif Togo / Burkina Faso avec expéditeur enregistré.
2. **Webhook de statut** BulkGate (format, signature), débit, comportement en cas d'échec, SLA sur les OTP,
   essai gratuit.
3. **Enregistrement de « STEAMY »** auprès des opérateurs (documents d'entreprise exigés, qui dépose la demande,
   quelle personne morale, coût éventuel, délai réel, ARCEP ou opérateur). Sans identifiant enregistré, l'OTP part
   par un numéro ou un identifiant générique, plus cher et parfois refusé sur MTN.
4. Devis et conditions d'**Infobip** et de **Vonage** (et Africa's Talking si le Bénin est confirmé).
5. Qualification de **FasterMessage**, e-MC et SMS-PRO : existence légale, contrat, accusés, taux de délivrabilité
   sur Celtiis, facturation en FCFA.
6. **Délivrabilité réelle** : tests croisés sur MTN, Moov et Celtiis avec 3 numéros réels par opérateur et mesure du
   délai (objectif OTP < 30 s) ; un test régional du Togo a montré des échecs de livraison transfrontalière
   (source tierce de 2025), donc ne pas conclure sans test.
7. **Contrat de données** : clauses de sous-traitance, lieu de traitement, durée de conservation des journaux.
8. Plafond de dépenses et alerte de solde côté fournisseur (abus : pompage d'OTP).

## 8. Sources consultées (15 octobre 2026)

- Twilio : [tarifs Bénin](https://www.twilio.com/en-us/sms/pricing/bj), [Côte d'Ivoire](https://www.twilio.com/en-us/sms/pricing/ci),
  [Togo](https://www.twilio.com/en-us/sms/pricing/tg), [Burkina Faso](https://www.twilio.com/en-us/sms/pricing/bf) ;
  directives : [Bénin](https://www.twilio.com/en-us/guidelines/bj/sms), [Côte d'Ivoire](https://www.twilio.com/en-us/guidelines/ci/sms),
  [Togo](https://www.twilio.com/en-us/guidelines/tg/sms), [Burkina Faso](https://www.twilio.com/en-us/guidelines/bf/sms)
- BulkGate : tarifs [Bénin](https://www.bulkgate.com/en/pricing/sms/bj/benin/), [Togo](https://www.bulkgate.com/en/pricing/sms/tg/togo/),
  [Côte d'Ivoire](https://www.bulkgate.com/en/pricing/sms/ci/ivory-coast/), [Burkina Faso](https://www.bulkgate.com/en/pricing/sms/bf/burkina-faso/),
  [API](https://www.bulkgate.com/en/developers/sms-api/), [centre d'aide](https://www.bulkgate.com/en/helpdesk/)
- Orange : [tarifs SMS CI](https://developer.orange.com/apis/sms-ci/pricing)
- Africa's Talking : [pays couverts](https://help.africastalking.com/en/articles/2727792-which-countries-are-africa-s-talking-products-in)
- FasterMessage : [SMS au Bénin](https://fastermessage.com/envoi-de-sms-professionnel-au-benin/) ; LAfricaMobile : [API SMS](https://developers.lafricamobile.com/docs/sms/introduction)
- Indicatifs de tiers, non officiels : [sent.dm Bénin](https://sent.dm/resources/benin-sms-pricing), [sent.dm Togo](https://sent.dm/resources/togo-sms-pricing),
  [Telekom (revente Vonage)](https://developer.telekom.com/uploads/Magenta_Business_API_C_Paa_S_Pricelist_10_01_2025_a116316b5b.pdf),
  [Celcom Africa](https://www.celcomafrica.com/pricing)
- Non lisibles (HTTP 403) : Vonage (articles de restrictions), Infobip (tarifs), Africa's Talking (tarifs)
