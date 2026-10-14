# Alignement des specs : arbitrages

Ces décisions ont été prises le 14 octobre 2026, **avant** l'alignement de la documentation et l'écriture des plans d'implémentation. Elles font foi en cas de contradiction avec les autres documents.
Chacune comporte une recommandation. Les constats qui les motivent sont dans [CONSTATS.md](CONSTATS.md).

Il y a deux niveaux :
- **Structurants (S)** : ils changent le modèle de données ou le périmètre. Ils demandent une réponse explicite.
- **Détail (D)** : ils peuvent être validés en bloc, en signalant seulement ceux à modifier.

Légende du statut : ⏳ à décider · ✅ décidé.

---

## Structurants

| # | Question | Recommandation | Statut |
| --- | --- | --- | --- |
| S1 | L'API contient-elle des **données réelles** (ancien déploiement steamy-api) ? | Si non, on **réinitialise les migrations** : refondre le modèle utilisateur coûte bien moins cher que migrer | ✅ |
| S2 | **Correspondance pédagogique** | `Course` = Parcours (unité vendue) ; `Module` → Projet ; nouveau `Level` = Niveau ; `Lesson` → Mission. `Path` est supprimé (ou devient une « filière » optionnelle). Le quiz est rattaché au niveau (formatif) ou au projet (sommatif). Dans l'interface, « Niveau » est réservé à la pédagogie, « Difficulté » désigne le niveau de difficulté, et la gamification utilise « Rang » | ✅ |
| S3 | Le **parent est-il obligatoire à tout âge** (consentement, paiement, événements, suppression) ? | Oui, à tout âge. Supprimer toutes les mentions « < 16 ans » (WA02, WK08, WD11, WAD08, WAD12, WT06, CGU) | ✅ |
| S4 | **Identifiants de connexion** par persona | Apprenant : identifiant + mot de passe (ni téléphone ni OTP). Parent : téléphone + OTP SMS à l'inscription, puis téléphone + mot de passe. Enseignant : email + mot de passe. Admin : email + mot de passe + TOTP. **Un seul écran de connexion** (W16) avec un champ « Identifiant ou numéro » résolu côté serveur ; l'admin se connecte à part (WAD15) | ✅ |
| S5 | **Rôle de l'enseignant** | C'est un encadrant, pas un auteur. Il suit des parcours existants ; la création de contenu relève du back-office (groupe « Contenu »). Son compte est créé **sur invitation** (admin ou école), jamais par inscription libre | ✅ |
| S6 | **Back-office** : admin Django ou écrans Next.js ? | Hybride. **Next.js** pour WAD01 (vue d'ensemble) et WAD02-WAD05 (Impact Tracker). **Admin Django** (thème monochrome) pour utilisateurs, modération, contenu, boutique, paiements, événements, RBAC (groupes Django) et réglages. Environ 5 écrans sur mesure au lieu de 15 | ✅ |
| S7 | **Fonctions communautaires** (défis WL13, classements WL14, tutos WL15, forum WL19, « Suivre » WL12) | Reportées après la v1, ou publiées en vitrine statique sans action. Aucune n'a de modèle, d'API ni d'écran de création | ✅ |
| S8 | **Steamy Events** (WL08/WL21, WD10/WD11, WPD06/WPD12, WT09, WAD12) | Dans la v1, avec un modèle `SteamyEvent` + `EventApplication` (accord parental systématique). Fusionner WL08 dans WL21. **Décision : événements payants inclus en v1**, payés par le parent selon le même flux que les parcours (commande de type « événement ») | ✅ |
| S9 | **Prestataire de paiement** | Un prestataire principal intégré côté serveur (initiation + webhook source de vérité), le second en secours. **Décision : comparaison KKiaPay / FedaPay à faire avant le lot 3** (réseaux dont Celtiis, pays, frais, API serveur, liens de paiement), derrière une interface commune | ✅ |
| S10 | **Fournisseur SMS** (OTP parent, liens de consentement et de paiement) | Interface abstraite côté API + tâche Celery. **Décision : comparaison à faire avant le lot 2**, selon le coût par pays. Faux fournisseur en local et en CI | ✅ |
| S11 | **Messagerie** (`apps/messaging`, websocket) | Gelée : aucun écran ne l'utilise. On extrait `Notification` dans une app dédiée. Pas de messagerie libre enseignant ↔ enfant | ✅ |
| S12 | **Connexion par token DRF** (`/api/public/user/login`) | Désactivée : le web utilise la session, et le mobile est hors périmètre | ✅ |

---

## Détail par lot

### Transverse
| # | Question | Recommandation | Statut |
| --- | --- | --- | --- |
| D1 | Correctifs de sécurité S1-S9 de l'API | Les traiter **en premier**, dans un lot « API 0 », avant tout écran | ✅ |
| D2 | Données de démonstration (§8.8) | Un jeu unique (Léa Adjovi, 4ᵉ, Cotonou…) avec des compteurs cohérents, utilisé aussi pour les fixtures | ✅ |
| D3 | Référentiels (pays, réseaux par pays, classes, objectifs, handicap, catégories, zones de livraison) | Servis par l'API, jamais codés en dur. `PhoneInput` avec choix du pays et stockage E.164 (§8.6) | ✅ |
| D4 | Langue des messages de l'API | Locale `fr`, et un catalogue de codes d'erreur métier (`USERNAME_TAKEN`, `OTP_INVALID`…) | ✅ |
| D5 | Conventions d'URL | `/api/<domaine>/…/` avec slash final, kebab-case, et `/api/backoffice/…` pour l'admin (pas `/admin/`) | ✅ |
| D6 | Données sensibles des mineurs (genre, handicap) | Facultatives, avec mention de leur finalité. Pas de marketing vers les mineurs. Texte à valider juridiquement | ✅ |
| D7 | Notifications | Champs `type`, `tone` et `url` ; action « tout marquer comme lu » ; compteur ; préférences | ✅ |

### Lot 1 · Public
| # | Question | Recommandation | Statut |
| --- | --- | --- | --- |
| D10 | Contenu éditorial (légal, à propos, offres B2B, blog, guides, chiffres vitrine) | Fichiers versionnés dans `apps/web` (MDX/TS), rendus statiquement. Le blog pourra passer dans l'admin Django plus tard | ✅ |
| D11 | Fiche parcours publique (SEO) | Oui : une variante de WC04 dans le shell public, **sans le contenu des leçons**. Écran à concevoir | ✅ |
| D12 | Achat de kit par un visiteur (WL07) | Checkout invité ouvert depuis WL07 (WK02-WK07 accessibles hors connexion) | ✅ |
| D13 | WL11 B2B | Tous les CTA mènent au formulaire de devis. `QuoteRequest` côté API + notification email | ✅ |
| D14 | WL20 guides | Téléchargement libre. Newsletter optionnelle, avec consentement explicite | ✅ |
| D15 | Mineurs sur les pages publiques | Pseudonyme et avatar seulement, opt-in parental, modération a priori (nouvel invariant §4.6) | ✅ |
| D16 | « Comment ça marche » (WL01) et « Mode hors ligne » (WX01) | Ancre vers la section ; « Mode hors ligne » retiré en v1 (les vidéos sont sur Vimeo) | ✅ |
| D17 | Pages cibles du footer | Tarifs → WL11 ; Events → WL21 ; Centre d'aide → FAQ statique ; Contact → formulaire ; Consentement parent → section de WL09 | ✅ |

### Lot 2 · Authentification
| # | Question | Recommandation | Statut |
| --- | --- | --- | --- |
| D20 | Ce que le parent voit dans la demande (WP05/WPD05) | Seulement ce qui existe à ce stade : prénom, nom, identifiant, âge, lien de parenté. Le profil (W11-W14) se fait après l'accord | ✅ |
| D21 | Reprise d'une inscription en attente (W07) | Compte inactif et session « inscription en cours », plus un **code de reprise** affiché. La demande expire au bout de 7 jours | ✅ |
| D22 | Refus de consentement (§8.4) | Le refus clôt la demande. Une nouvelle demande au même parent est possible après 30 jours. Le changement de parent passe par la modération admin. Le compte en attente est purgé et l'identifiant libéré | ✅ |
| D23 | Âge | Entre 10 et 17 ans, contrôlé par le serveur. Cohérence vérifiée entre l'âge (W05) et la date de naissance (W11) | ✅ |
| D24 | OTP | 6 chiffres, valable 5 min, 3 essais, renvoi après 60 s, plafond quotidien par numéro et par IP | ✅ |
| D25 | Politique de mot de passe | 8 caractères minimum, au moins une lettre et un chiffre, validée côté serveur. Les libellés de `PwReq` sont identiques partout | ✅ |
| D26 | Mot de passe oublié | WL02-WL05 sont réservés au parent (et à l'enseignant), au vouvoiement. Sur W16, l'apprenant voit « demande à ton parent ». Le parent réinitialise depuis WPD03 (§8.9) | ✅ |
| D27 | « 1 parcours gratuit débloqué » (W15) | Pas de déblocage spécial : les parcours gratuits sont ouverts à tous. W15 affiche « Commence par un parcours gratuit » et renvoie vers le catalogue filtré | ✅ |

### Lot 3 · Apprenant
| # | Question | Recommandation | Statut |
| --- | --- | --- | --- |
| D30 | Moyens de paiement de l'apprenant (WD20) et téléphone (WD06, WD13, WD18) | Supprimés. L'apprenant affiche son identifiant et passe toujours par son parent pour payer | ✅ |
| D31 | Statut `warn` des tentatives (§8.7) | `ok` si le score atteint le seuil ; `warn` entre 50 % et le seuil ; `ko` sous 50 %. Calculé par le serveur | ✅ |
| D32 | Sommative ratée | Tentatives illimitées, 10 min entre deux essais. Écran d'échec paramétré par le seuil, avec renvoi vers les missions à revoir | ✅ |
| D33 | Certification | 100 % des missions + toutes les sommatives réussies. PDF généré en asynchrone. Ticket Events attribué une seule fois | ✅ |
| D34 | Points, streak | Points : barème simple par mission ou quiz, à définir (sinon retirer « +200 points »). Streak : jours d'activité consécutifs | ✅ |
| D35 | Format du Kit Code (§8.5) | `STEAMY-XXXX-XXXX`, Crockford base32, insensible à la casse, tentatives limitées, consommation atomique | ✅ |
| D36 | Effet d'un Kit Code | Débloque le parcours gratuitement. Un parcours qui exige un kit ne s'obtient **qu'avec un code**. Les codes sont générés à la commande de kit et imprimés sur la notice | ✅ |
| D37 | Commandes | Un seul `Order` typé (parcours ou kit) avec payeur ≠ bénéficiaire, statut à 4 états et statut de livraison. Le prix est toujours calculé par le serveur | ✅ |
| D38 | Boutique | Frais de port par zone. Stock réservé à la commande (libéré après 30 min si non payé). Panier côté serveur une fois connecté. Alerte de réassort par SMS unique | ✅ |
| D39 | Navigation (§8.10) | 6 entrées. « Mes parcours » livré en v1 ; « Badges » masqué tant que l'écran n'est pas conçu | ✅ |
| D40 | Suppression de compte (WD15) | Demande validée par le parent, puis désactivation et anonymisation à J+30 ; factures conservées | ✅ |
| D41 | Steamy Events, aide, changement de parent (WD10-WD12, WD22) | Events selon S8 : candidature de l'enfant, accord du parent et, si l'événement est payant, paiement par le parent. FAQ statique ; pas de bouton de changement de parent en v1 | ✅ |

### Lot 4 · Parent
| # | Question | Recommandation | Statut |
| --- | --- | --- | --- |
| D50 | Enfant « en attente » (WPD02) | Ce statut signifie qu'une demande de consentement a été reçue (CTA « Examiner » → WPD05). « Relancer l'invitation » et `resend-invite` sont supprimés | ✅ |
| D51 | Création d'un enfant par le parent (WPD04) | Ajouter la date de naissance et le lien de parenté. L'enfant fait W11-W14 à sa première connexion | ✅ |
| D52 | Payer une demande de l'enfant | Lien SMS vers une page authentifiée « Demande de paiement » dans l'espace parent (écran à concevoir, reprend WA03). WPD01 liste consentements, paiements et événements à valider | ✅ |
| D53 | Valider une candidature à un événement | Boutons Accepter / Refuser sur WPD06 ; pour un événement payant, « Accepter » mène à la page « Demande de paiement » (D52). WPD12 (inscription par le parent) inclut le paiement | ✅ |
| D54 | Suppression (enfant, compte parent) | Désactivation puis anonymisation à J+30, annulable. Un compte parent ne se supprime qu'après suppression ou transfert de ses enfants | ✅ |
| D55 | Rapport hebdomadaire | Visible dans l'app ; envoyé par email si une adresse est renseignée. Nécessite un journal de temps d'apprentissage | ✅ |
| D56 | Alerte de connexion (WPD14) | Reportée après la v1 | ✅ |

### Lot 5 · Enseignant
| # | Question | Recommandation | Statut |
| --- | --- | --- | --- |
| D60 | Ajout d'élèves (WT06) | L'enseignant saisit le prénom, le nom, le téléphone du parent et le lien de parenté. Une demande de consentement « origine enseignant » est envoyée. Le parent accepte et crée l'identifiant. L'élève rejoint ensuite la classe | ✅ |
| D61 | École et offres B2B | Entité `School` minimale (offre, quotas contrôlés par le serveur). Pas de tableau de bord établissement en v1 | ✅ |
| D62 | Classe et parcours | Une classe = un parcours. Accès au parcours couvert par l'offre B2B (pas de paiement par l'élève) | ✅ |
| D63 | Commentaires de l'enseignant | À sens unique, notifiés, affichés côté apprenant et parent. Pas de messagerie | ✅ |
| D64 | Ce que voit l'enseignant | Uniquement les parcours qu'il encadre. Pas de données sensibles (handicap, localité) | ✅ |
| D65 | « À corriger » (WT01/WT07) | Devient « À revoir » : tentatives échouées à commenter. Pas de correction manuelle en v1 | ✅ |
| D66 | Alerte de décrochage | Tâche quotidienne ; seuil réglable dans WAD14 (par défaut 7 jours) | ✅ |

### Lot 6 · Admin
| # | Question | Recommandation | Statut |
| --- | --- | --- | --- |
| D70 | Rôle de l'admin dans les consentements (WAD08) | **Suivi** uniquement : demandes en attente, relances, litiges, changement de parent. Pas de validation à la place du parent | ✅ |
| D71 | RBAC | `is_staff` ouvre l'accès au back-office ; 4 groupes Django (Super-admin, Contenu, Support, Finance) ; le rôle `admin` disparaît de `User.role` | ✅ |
| D72 | 2FA | django-otp (TOTP), exigé à la fois sur l'admin Django et sur les endpoints back-office de l'API | ✅ |
| D73 | Statuts des KPI (`kpiStatus`) | Manuel non saisi → « En attente » ; sans cible ou valeur texte → « Renseignée » ; en dessous de la cible → « Hors-cible » sous 70 %, « En dessous » de 70 à 100 % | ✅ |
| D74 | Rapport trimestriel | « Soumettre » verrouille le rapport ; export CSV/PDF généré en asynchrone | ✅ |
| D75 | KPI d'inclusion (§8.3) | Alimentés par le profil (genre, date de naissance, handicap, localité qualifiée). Les « institutions » sont à modéliser ou abandonner | ✅ |
| D76 | Réseaux Mobile Money (§8.12) | Réglage par réseau (Celtiis inclus) et par pays, lu publiquement par le formulaire de paiement | ✅ |
