# Spécification écrans — Partie 3 : Parent, Enseignant, Boutique, Admin

Complément de [SPEC-TECHNIQUE.md](SPEC-TECHNIQUE.md) §5. Couvre 55 écrans : `WPD` (14), `WT` (12), `WK` (11), `WAD` (15), `WX` (3).

**Légende** : **[I]** implémenté (état React) · **[D]** déclaré (cliquable, sans handler) · **[S]** statique.

---

## 5.11 Dashboard parent — `WPD01`-`WPD14` · `screens-parent-dashboard-web.jsx`

> **En-tête de fichier périmé** : annonce « 8 écrans WPD01–WPD08 », en définit 14.

### Shell `WebParentShell`

Mêmes classes CSS que `WebAppShell` (`app-shell`, `app-sidebar`, `app-header`) mais **navigation différente**, **pas de recherche** dans le header, et utilisateur « Marie A. · Parent · Cotonou ».

| Nav | Icône | Écrans rattachés |
| --- | --- | --- |
| Accueil | `home` | `WPD01`, `WPD05` |
| Mes enfants | `user` | `WPD02`, `WPD03`, `WPD04`, `WPD09`, `WPD10`, `WPD11` |
| Événements | `trophy` | `WPD06`, `WPD12` |
| Commandes | `cart` | `WPD07` |
| Aide | `book` | *(aucun — `WPD13` utilise `active="settings"`)* ⚠️ |
| Paramètres | `gear` | `WPD08`, `WPD13`, `WPD14` |

> ⚠️ **`WPD13` (Aide & support) et `WPD14` (Notifications) sont rattachés à `settings`** alors qu'une entrée « Aide » existe et qu'aucune entrée « Notifications » n'existe. À corriger : `WPD13` → `help`, et les notifications doivent passer par la cloche du header (comme côté apprenant).

**Registre : vouvoiement** systématique (« Suivez leur progression », « Vous gardez le contrôle »).

### Écrans

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WPD01` | Accueil parent | **Hero** dégradé primaire : « Espace parent », « 2 enfants accompagnés sur Steamy », argumentaire, bouton **« Ajouter un enfant »** (amber, icône +) **[D]** → `WPD04`, `Mascot wave 160`. **« À valider »** : encart ambre bordure `--amber-300` — 🔔 « Demande de consentement - Léa (13 ans) », « Léa souhaite s'inscrire et a besoin de votre accord. », bouton **« Examiner »** (secondary) **[D]** → `WPD05`. **Stats** : 👤 Enfants 2 · 🚀 Parcours en cours 3 · 🔔 À valider 1. **« Mes enfants »** + « Voir tout » **[D]** : 2 `WPDKidCard` (avatar, nom, « 13 ans · 4ème · Cotonou », bouton « Voir » **[D]**, « En cours · <parcours> » + `ProgressBar`) |
| `WPD02` | Mes enfants | `headerActions` = bouton « Ajouter un enfant » **[D]**. Liste de 3 `WPDKidRow` : ① Léa (active, `ring`, 5 badges, `ProgressBar` étiquetée, bouton « Voir le profil » **[D]** → `WPD03`) · ② Noé (active, 2 badges) · ③ **Inès (`pending`)** : avatar sans anneau, `Badge` ambre « En attente », meta « Inscription en attente », **pas de barre de progression**, bouton **« Relancer l'invitation »** (ghost) **[D]** |
| `WPD03` | Détail enfant | Fil « Mes enfants › **Léa Adjovi** ». Grille 2fr/1fr. **Gauche** : « Progression des parcours » (3 lignes : pastille couleur, titre, `ProgressBar` — `tone="success"` si 100 %, pourcentage coloré) ; « Dernières tentatives de quiz » (3 `QuizAttemptRow`). **Droite** : `side-card` profil (`Avatar` 88, nom, « 13 ans · 4ème · Cotonou », 3 stats Badges 5 / Points 1 240 / Streak 5 j, boutons « Modifier le profil » (outline) **[D]** → `WPD10` et « Rapport hebdomadaire » (ghost) **[D]** → `WPD11`) ; `side-card` « Informations » (Identifiant `lea.adjovi` · Lien « Votre fille » · Inscrite le 14 mars 2026 · Handicap Aucun) |
| `WPD04` | Ajouter un enfant | **Voie parent-initiée.** Conteneur 560px. En-tête ➕ « Créer le compte de votre enfant » + « Vous définissez son accès. Communiquez-lui ensuite son identifiant et son mot de passe. ». Champs : Prénom* + Nom* (2 col), **Identifiant*** (hint « Servira à sa connexion (ex. prénom.nom) »), **Mot de passe initial*** (`PasswordInput`, hint « Vous pourrez le réinitialiser depuis son profil »). **Encart 🔑** : « Notez bien ces identifiants : votre enfant en aura besoin pour se connecter. Vous gardez le contrôle de son compte et de ses achats. » Bouton « Créer le compte » (block lg) **[D]**. **Aucun consentement requis** — le parent est déjà le responsable |
| `WPD05` | Demande de consentement | Miroir in-app de `WP05`. Conteneur 640px. Carte enfant (`Avatar 🦉`, nom, « lea.adjovi · 13 ans », `Badge` ambre « En attente »). **« Informations renseignées »** : 4 lignes (Lien de parenté · Niveau/classe · Localité · Centres d'intérêt). **Encart 🔒** : « En acceptant, vous confirmez être le **responsable légal** de Léa. Les données ne servent qu'au suivi pédagogique. » Boutons « **Accepter la demande** » (secondary, block) **[D]** · « Refuser » (outline, block) **[D]** → `WP11` |
| `WPD06` | Steamy Events | **« Événements à venir »** + « Tout voir » **[D]** : 3 `WPDEventCard`, bouton **« Inscrire un enfant »** (sm) **[D]** → `WPD12`. **« Demandes de participation de mes enfants »** : 3 lignes 🎟️ (événement, « Pour <prénom> », `WPDReqStatus` : En attente ambre / Acceptée vert / **Refusée rouge**, chevron **[D]**) |
| `WPD07` | Historique de commande | **[I]** `useState(filter)` → 4 `Tag` (Toutes / Réussies / En attente / Échouées). 4 `WPDOrderRow` : **emoji conditionnel** 📦 si le libellé commence par « Kit », sinon 🚀 ; référence `#CM-xxxx` + date ; `Badge` statut ; montant ; bouton « Facture » **uniquement si `ok`** **[D]** |
| `WPD08` | Paramètres parent | Conteneur 760px, sections `WPDSection`. **Profil parent** : `WPDInfoCard` « Mes informations » (Nom, Téléphone, Email, Profession) et « Connexion » (action « Changer » **[D]** : Numéro de téléphone, Mot de passe). **Livraison & paiement** : Adresse (Pays/Ville/Quartier/Rue) · Mobile Money (Pays/Réseau/Numéro). **Notifications** : **[I]** 4 toggles — Demandes de consentement ✓ · Paiements à valider ✓ · Progression des enfants ✓ · Annonces Steamy Events ✗. **Légal** : 3 `MenuRow` **[D]** (CGU, Mentions légales, Politique de confidentialité). **Zone sensible** : « Supprimer mon compte » — « **Une demande sera envoyée à l'administrateur.** Action irréversible. », bouton danger **[D]** |
| `WPD09` | Supprimer un enfant | Conteneur 560px, carte bordure `--error-300`. En-tête ⚠️ « Supprimer le compte de Léa ? » + « Sa progression, ses badges et ses commandes seront définitivement supprimés. Action irréversible. ». **Rappel de l'enfant ciblé** (avatar + nom + âge/classe). **Motif de la suppression*** (`<select>` : L'enfant n'utilise plus la plateforme / Compte créé par erreur / Compte en doublon / Autre raison) + `textarea` Précisions. Boutons « Annuler » (outline block) **[D]** · « **Supprimer définitivement** » (danger block) **[D]** |
| `WPD10` | Modifier le profil enfant | Conteneur 640px. Prénom* + Nom*, Date de naissance + Niveau/classe (`<select>`), Localité, **Genre** (3 `ChoiceCard`), Situation de handicap (`<select>`). Pied « Annuler » (outline) / « Enregistrer » **[D]**. ⚠️ **Ne permet pas de réinitialiser le mot de passe de l'enfant**, alors que `WD12` et `WPD04` l'annoncent (§8.9) |
| `WPD11` | Rapport hebdomadaire | Fil « Mes enfants › Léa Adjovi › **Rapport hebdo** ». 3 `StatPill` : 🔥 Temps cette semaine 3 h 20 · 🚀 Missions terminées 7 · ⭐ Quiz réussis 5 / 6. **Histogramme 7 jours** (dégradé `--cat-ia`, fait main). **« Progression des parcours »** : 2 `ProgressBar` étiquetées (Robot Bluetooth 62 %, Initiation Scratch 100 % vert). Boutons « **Recevoir par email** » (outline) **[D]** · « Voir le profil complet » **[D]** → `WPD03` |
| `WPD12` | Faire participer un enfant | Conteneur 560px. En-tête événement (pastille 🤖 + titre + « 📅 14 juin 2026 · 📍 Cotonou · Gratuit »). **« Quel enfant inscrire ? »*** (`<select>` Léa 13 ans / Noé 10 ans), « Motivation (optionnel) » (`textarea`). **Encart ✅** : « En tant que parent, **votre consentement est automatiquement validé** pour cette participation. » Bouton « Envoyer la demande » (block lg) **[D]** |
| `WPD13` | Aide & support | Recherche **[D]**. **4 FAQ** en accordéon (1ʳᵉ dépliée, **[S]**) : valider une demande de consentement · ajouter un autre enfant · payer un parcours ou un kit (« Mobile Money (MTN, Moov, Celtiis). **Aucune carte bancaire n'est demandée.** ») · suivre la progression. Bandeau contact `Mascot idle 80` + « Contacter le support » **[D]**. ⚠️ La FAQ « ajouter un enfant » décrit « saisissez son numéro, il recevra un lien d'inscription » — **contredit `WPD04`** qui demande identifiant + mot de passe (§8.9) |
| `WPD14` | Notifications | **[I]** `useState(tab)` → « Toutes » / « Non lues (2) », filtrage réel. « Tout marquer comme lu » **[D]**. 4 `NotifItem` typés parent : 🔔 **Demande de consentement** (primary, non lue) · 💳 **Paiement à valider** « Léa veut acheter "Robot Bluetooth" (25 000 F) » (ambre, non lue) · 🏆 Nouveau badge (Noé) · 🔒 **Alerte sécurité** « Nouvelle connexion au compte de Léa depuis Cotonou » |

---

## 5.12 Dashboard enseignant — `WT01`-`WT12` · `screens-teacher-dashboard-web.jsx`

> **En-tête de fichier périmé** : annonce « 8 écrans WT01–WT08 », en définit 12.

### Shell `WebTeacherShell`

Utilisateur « M. Koffi A. · Formateur · Robotique ». **Registre : tutoiement** (contrairement au parent).

| Nav | Icône | Écrans |
| --- | --- | --- |
| Accueil | `home` | `WT01` |
| Mes parcours | `book` | `WT02`, `WT10` |
| Mes classes | `user` | `WT03`, `WT04`, `WT05`, `WT06` |
| Évaluations | `star` | `WT07` |
| Événements | `trophy` | `WT09` |
| Paramètres | `gear` | `WT08`, `WT11`, `WT12` |

> ⚠️ Même défaut que côté parent : `WT11` (Aide) et `WT12` (Notifications) sont rattachés à `settings`.

### Écrans

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WT01` | Accueil formateur | **Hero** : « Espace formateur », « 3 classes · 54 apprenants encadrés », bouton **« Ajouter des apprenants »** (amber, icône +) **[D]** → `WT06`, `Mascot focus 160`. **Stats** : 👤 Apprenants 54 · 📖 Classes 3 · ⭐ **À corriger 6**. **« Mes classes »** + « Voir tout » **[D]** : 3 `WTClassCard` (pastille 🎒 colorée, nom, « n apprenants », `ProgressBar` « Progression moyenne », bouton « Voir la classe » (outline sm block) **[D]** → `WT04`). **« À corriger »** : lignes filtrées sur `status === 'ko'` — apprenant · concept, type d'évaluation, `Badge` rouge score, bouton **« Commenter »** (outline sm) **[D]** → `WT05` |
| `WT02` | Mes parcours encadrés | 2 lignes de parcours : pastille 56px colorée + emoji, titre, « n classes · n apprenants », `ProgressBar` « Progression globale », bouton « Voir le contenu » (outline) **[D]** → `WT10` |
| `WT03` | Mes classes | `headerActions` = bouton **« Créer une classe »** (icône +) **[D]** → écran non conçu. Grille 3 col de 3 `WTClassCard` |
| `WT04` | Apprenants d'une classe | `headerActions` = « Ajouter des apprenants » **[D]** → `WT06`. Fil « Mes classes › **3ème B · Robotique** · 24 apprenants ». 4 `WTLearnerRow` : `Avatar` 48 `ring`, nom, « Dernière activité : … », `ProgressBar` (max 320px), `Badge` de progression **teinté par `status`** (ok vert / warn ambre / ko rouge), bouton « Voir le profil » (outline sm) **[D]** → `WT05` |
| `WT05` | Profil apprenant | Fil « Mes classes › 3ème B › **Léa Adjovi** ». Grille 2fr/1fr. **Gauche** : « Progression des parcours » (2 lignes) ; « Dernières tentatives de quiz » (3 `QuizAttemptRow`). **Droite** : `side-card` profil (`Avatar` 88, « 3ème B · 13 ans », stats Badges 5 / **Moyenne 78 %**) ; **`side-card` « Laisser un commentaire »** : `textarea` (placeholder « Encouragements, conseils, axes de progrès… »), boutons **« Envoyer à l'apprenant »** (block) **[D]** et **« Message au parent »** (outline block) **[D]** |
| `WT06` | Ajouter des apprenants | Conteneur 620px. **[I]** `useState(mode)` → `tabs-pill` « **Individuel** » / « **Import par lot** », bascule réelle du formulaire. **Mode individuel** : Prénom* + Nom*, `PhoneInput`*, Classe* (`<select>` 3 classes), **encart 📩** « Une notification et un lien de création de compte seront envoyés à l'apprenant (et à son parent si < 16 ans). », bouton « Envoyer l'invitation » **[D]**. **Mode lot** : zone de dépôt en pointillés (📄 « Glisse un fichier CSV ou Excel », « Colonnes attendues : **Nom, Prénom, Numéro** », bouton « Choisir un fichier » **[D]**), séparateur « - ou colle la liste - », `textarea` avec exemple sur 2 lignes, Classe de destination*, bouton « Importer & inviter » **[D]**. ⚠️ **Aucun état d'erreur d'import conçu** (doublons, numéro invalide, ligne malformée) — trou documenté |
| `WT07` | Suivi des évaluations | **[I]** `useState(filter)` → 4 `Tag` (Toutes / Formatives / Sommatives / **À revoir**), filtrage réel sur `type` et `status`. Lignes : emoji **conditionnel** (🏆 sommative, 📝 formative), apprenant, « <type> · <concept> », `Badge` « Validé » vert ou « **Concept à revoir** » rouge, score %, bouton « Commentaire » (outline sm) **[D]** |
| `WT08` | Paramètres | Conteneur 760px. **Profil formateur** : `WPDInfoCard` « Mes informations » (Nom, Email, **Spécialité / matière**, Téléphone), « **Bio** » (Présentation, action « Modifier » **[D]**), « Connexion » (Téléphone, Mot de passe, action « Changer » **[D]**). **Notifications** : **[I]** 3 toggles — Progression des apprenants (« Badges, niveaux et **alertes de décrochage** ») ✓ · Nouvelles évaluations à corriger ✓ · Annonces Steamy Events ✗. **Légal** : 3 `MenuRow` **[D]**. **Zone sensible** : « Supprimer mon compte » — « Une demande sera envoyée à l'administrateur. » |
| `WT09` | Steamy Events | **« Événements à venir »** : 3 cartes issues de `APPR_EVENTS` (**dépendance de données vers `screens-dashboard-web.jsx`**), bouton **« Proposer à une classe »** (outline sm) **[D]**. **« Demandes de participation de mes apprenants »** : 3 lignes 🎟️ (apprenant · **classe**, événement, `Badge` statut, chevron **[D]**) |
| `WT10` | Détail parcours encadré | Fil « Mes parcours › **Construis ton robot Bluetooth** ». Grille 1.6fr/1fr. **Gauche** : bandeau dégradé (pastille « 2 classes · 42 apprenants », H1, barre de progression 55 %) ; **« Contenu du parcours »** : 4 `MissionItem` où **`duration` est détourné en compteur de complétion** — « 42/42 apprenants » `done` · « 28/42 apprenants » `current` · « 9/42 apprenants » `current` · « à venir » `locked`. **Droite** : `side-card` « Progression par classe » (2 `ProgressBar` : 3ème B 58 %, Club STEM 71 % vert) ; `side-card` « Évaluations » (Formatives réussies **74 %** · Sommatives réussies **61 %** · **Concepts à revoir : Moteurs · Polarité**) |
| `WT11` | Aide & support | Recherche **[D]** + 4 FAQ (créer une classe · importer plusieurs apprenants · corriger une évaluation · contacter le parent d'un apprenant) + bandeau contact « Notre équipe **pédagogique** répond du lundi au samedi. » **[D]** |
| `WT12` | Notifications | **[I]** onglets Toutes / Non lues (2). 4 `NotifItem` typés formateur : 📝 **Évaluation à corriger** (ambre) · ⚠️ **Risque de décrochage** « Noé Sossou n'a pas progressé depuis 7 jours » (error) · 🎓 Nouvel apprenant (success) · 🏆 Steamy Events (info) |

---

## 5.13 Boutique de kits — `WK01`-`WK11` · `screens-kit-shop-web.jsx`

Shell `WebAppShell` `active="catalog"`. Réutilise `WANetworkCard` (défini dans purchase).

### Chemin nominal

```
WK01 → WK02 → [panier] → WK03 → WK04 (invité) → WK05 → WK06 ─┬→ WK07
                            │                                 └→ WK09 ─(retry)→ WK06
                            └─(< 16 ans)→ WK08 ──(parent paie)──→ WK07
WK10 = panier vide · WK11 = stock épuisé
```

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WK01` | Catalogue kits | `filter-strip` : 5 `Tag` (Tous actif, Robotique, Électronique, Capteurs/IA, Énergie) **[D]** + « Trier · Populaires ▾ » **[D]**. Grille 3 col de 6 `WKKitCard` (`KIT_CATALOG`) : bandeau couleur `16/10` + emoji 64px, `Badge` niveau, nom, description, prix en `--primary-700`, bouton **« Ajouter »** (sm, icône panier) **[D]** |
| `WK02` | Détail kit | Fil « Boutique › **Steamy Bot v1** ». Grille 1.6fr/1fr. **Gauche** : visuel principal `16/9`, **galerie de 4 vignettes** 72×72 (la 1ʳᵉ bordée primaire = sélectionnée) **[D]**, H1 + description, **« Ce que contient le kit »** (6 items ✓ en 2 col : châssis 2 roues, 2 moteurs DC + roues, carte de contrôle, module Bluetooth, câbles + visserie, notice illustrée), **« Parcours compatibles »** (2 cartes **[D]** → `WC05`). **Droite (sticky)** : prix 35 000 F 32px, `Badge` vert « ● En stock », **« Ajouter au panier »** (block lg, icône panier) **[D]** → `WK03`, « Acheter maintenant » (outline block) **[D]** → `WK04`/`WK05`, mention « 🚚 Livraison à Cotonou sous 3–5 jours » |
| `WK03` | Panier | Grille 1.6fr/1fr. **Gauche** : 2 `WKCartRow` (pastille 56px colorée, nom, prix unitaire, **`WKQtyStepper`** − / n / + **[D]**, bouton ✕ « Retirer » **[D]**) + lien « ← Continuer mes achats » **[D]**. **Droite (sticky)** : « Récapitulatif » — Sous-total (3 articles) 79 000 F · Livraison 2 000 F · séparateur · **Total 81 000 F** (fort, primaire) · bouton « **Passer au paiement** » (block lg) **[D]** |
| `WK04` | Informations invité | **Checkout sans compte.** Conteneur 560px. En-tête 🛍️ « Commande en tant qu'invité » + « Pas besoin de compte pour commander. Tu pourras en créer un plus tard pour suivre tes livraisons. ». Prénom* + Nom*, `PhoneInput`* (hint « **Pour le suivi de livraison par SMS** »), `Checkbox` politique. Bouton « Continuer vers la livraison » (block lg) **[D]** → `WK05`. Pied « Tu as déjà un compte ? **Se connecter** » **[D]** |
| `WK05` | Livraison | Conteneur 560px. « Où livrer ton kit ? ». Pays* (`<select>` + 🇧🇯), Ville* + Quartier* (2 col), **Rue / repère*** (hint « **Un point de repère aide le livreur.** »). Bouton « Continuer vers le paiement » (block lg) **[D]** → `WK06` |
| `WK06` | Paiement | **Bandeau total** (fond `--primary-50`) : « Total à payer · 3 articles + livraison » / **81 000 F**. Formulaire identique à `WA03` : Pays*, **Réseau Mobile Money*** (3 `WANetworkCard`), Numéro*. CTA « **Payer 81 000 F** » (secondary block lg) **[D]**. Mention 🔒 « Paiement sécurisé · aucune carte bancaire » |
| `WK07` | Confirmation & suivi | Conteneur 720px. **Bandeau succès** vert : `Mascot cheer 110`, « Merci, c'est commandé ! », « Commande **#KT-7042** · un reçu t'a été envoyé par SMS. On te prévient à chaque étape. ». **`WKTimeline`** 4 étapes verticales : ① Commande confirmée `done` (Aujourd'hui · 14:32) · ② **En préparation** `current` (Atelier Steamy · Cotonou) · ③ Expédiée `todo` (À venir) · ④ Livrée `todo` (Estimée sous 3–5 jours). Boutons « Télécharger le reçu » (outline lg) **[D]** · « Retour à la boutique » (lg) **[D]** |
| `WK08` | Paiement par le parent | Miroir de `WA02` pour le kit. `Mascot idle 140`, « Un parent doit valider l'achat », « On lui envoie un lien de paiement sécurisé pour ta commande de kit (**81 000 F**). », pastille `Loader` + « Lien envoyé à Marie · en attente du paiement… ». Boutons « Changer de parent » (outline) **[D]** · « Renvoyer le lien » **[D]** |
| `WK09` | Paiement échoué | **Hors shell**, dégradé rouge. `Mascot sad 130`, « Paiement échoué », « La commande de ton kit n'a pas pu être réglée. **Aucun montant n'a été débité, ton panier est conservé.** », encart « Raison : solde Mobile Money insuffisant. ». Boutons « Changer de numéro » (outline) **[D]** · « Réessayer le paiement » **[D]** |
| `WK10` | Panier vide | État vide actionnable : `Mascot idle 170`, « Ton panier est vide », « Ajoute un kit robotique pour construire pour de vrai. **La livraison se fait partout en Afrique de l'Ouest.** », bouton « Voir les kits » (lg) **[D]** → `WK01` |
| `WK11` | Stock épuisé | Fil « Boutique › **Bras Robotisé** ». Visuel en `grayscale(.3)` + **étiquette noire « Rupture de stock »** en haut à gauche. Carte : prix 48 000 F **en `--ink-400`**, `Badge` rouge « ● Indisponible », « Ce kit est momentanément en rupture. Laisse ton numéro : on te prévient dès qu'il revient. », `Field` « **Être prévenu·e du retour** » (`PhoneInput`), boutons « Me prévenir » (block lg) **[D]** · « Voir des kits similaires » (outline block) **[D]** |

**Règles de commerce à implémenter** :
- Frais de livraison fixes (2 000 F dans le mock) — barème réel à définir par zone.
- Le panier survit à un échec de paiement (`WK09`).
- Checkout invité autorisé, mais **le détour parent reste obligatoire si le compte est celui d'un apprenant** (`WK08`).
- Notification de réapprovisionnement par SMS (`WK11`).

---

## 5.14 Back-office admin — `WAD01`-`WAD15` · `screens-admin-web.jsx`

**Direction visuelle : monochrome.** Tokens `--ink-*` uniquement ; la famille `--primary-*` est **bannie**. La couleur ne sert qu'aux `Badge` de statut, aux deltas de tendance et aux accents de graphes. Les boutons principaux surchargent les variables CSS du DS (`ADM_DARK_BTN` : `--btn-bg: var(--ink-900)`).

### Shell `WebAdminShell`

Sidebar **sombre** 240px (`--ink-900`), `Logo white 24` + pastille « ADMIN », nav **groupée** :

| Groupe | Entrées |
| --- | --- |
| **Pilotage** | Vue d'ensemble (`home`) · Impact Tracker (`impact`) |
| **Plateforme** | Utilisateurs (`users`) · Modération (`moderation`) · Contenu (`content`) · Boutique (`shop`) · Paiements (`payments`) · Steamy Events (`events`) |
| **Système** | Équipe & rôles (`team`) · Paramètres (`settings`) |

Header 62px : titre, recherche optionnelle (`headerSearch`, **défaut `false`** — inverse de `WebAppShell`), `headerActions`, cloche + pastille, avatar. Pied de sidebar : « Seth G. · Super-admin » + icône `logout`.

### Pilotage

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WAD01` | Vue d'ensemble | **Hero sombre** (`--ink-900`) : « Administration · Janvier 2026 », « **220 nouveaux apprenants ce mois** », « La plateforme tient sa cible d'acquisition. Prochaine échéance : soumission du rapport d'impact trimestriel le 4 février. », bouton « Voir l'Impact Tracker » (outline) **[D]** → `WAD02`. **4 `StatCard`** : Utilisateurs 332 (+220 ce mois, sparkline) · Apprenants actifs 460 (+9 %) · Ventes du mois 44 000 FCFA · **Taux de complétion « — » « mesure à activer »** (delta neutre « non suivi »). **Carte échéance** : `DeadlineTracker` 3 étapes (Soumission 4 févr. `current` · Relance 6 févr. · Correction 9 févr.) + `ProgressBar` « Complétude du rapport » 77 % + bouton « Ouvrir le rapport » **[D]** → `WAD04`. **Carte « À traiter »** : 3 `adm-alert` avec bordure gauche colorée — ⚠️ Consentements parentaux **3** (warn) · ❗ Paiements échoués **2** (err) · 👁 Candidatures Events **5** (neutre) |
| `WAD02` | Impact Tracker · dashboard KPI | `headerActions` : « Saisie manuelle » (outline sm) **[D]** → `WAD05` · « Rapport trimestriel » (sombre sm) **[D]** → `WAD04`. **Légende `SourceTag`** : Auto (calculé) / Manuel (à saisir) / Indisponible (non collecté). **[I]** `SegmentedControl` Mois / Trimestre / Année (⚠️ change l'état, **pas les données**). **4 `StatCard`** : Ventes 44 000 (cible 50 000) · Nouveaux utilisateurs 220 (cible 200 ✓) · Nouveaux apprenants 220 (cible 200 ✓) · **Recommandation (NPS) 10/10**. **2 `DemographicsCard`** (NU et NA) : 2 `DonutChart` (femmes 65/220, ≤ 35 ans 220/220) + **2 tuiles « Indisponible »** hachurées (Zone rurale « Localité non captée au signup », Handicap « Champ inclusion non demandé ») avec lien **« Activer la collecte »** **[D]**. **6 cartes de groupe** (`KpiLine`) : Ventes & financement · Impact pédagogique · Écosystème · Produit & innovation · Emploi · Engagement |
| `WAD03` | Détail indicateur | Fil « Impact Tracker › **Nouveaux utilisateurs** ». **Carte principale** : `Badge` de statut calculé par `kpiStatus()`, **valeur 220 en 56px**, « cible 200 · atteinte à 110 % », **`BarChart`** 5 périodes (Sep→Jan) 360×130, légende « Auto · recalculé chaque nuit » + « Plage : 01/01/2026 → 31/01/2026 ». **« Historique par période »** : `DataTable` dense 5 lignes (Période / Réponse / Statut). **Droite** : « Composition (Janvier) » (2 `DonutChart`) ; **« Définition »** (« Comptes utilisateurs créés entre le 1er et le 31 janvier 2026, tous rôles confondus. Source : table `users`, champ `created_at`. Recalculé automatiquement. ») |
| `WAD04` | Rapport trimestriel | Reproduit le format du PDF bailleur. **Carte d'en-tête** : trimestre, `ProgressBar` « 23 / 30 indicateurs renseignés » (77 %), `DeadlineTracker`. Barre d'actions : « 30 indicateurs · format Impact Tracker (Du · Au · Réponse · Statut) » + boutons « **Exporter CSV** » **[D]** · « **Exporter PDF** » **[D]** · « **Soumettre** » (sombre) **[D]**. **`DataTable` dense de 30 lignes** : Indicateur / Du / Au / Réponse / Statut / Source. Les plages de dates sont calculées par `kpiRange()` : **mois courant** pour NU, NA, Ventes & finance, Écosystème en source `auto` ; **trimestre** (01/11/2025→31/01/2026) sinon. Les valeurs nulles s'affichent en italique gris (« Indisponible » ou la `note`). ⚠️ **Export et soumission non branchés** |
| `WAD05` | Saisie manuelle | Conteneur 880px. Fil « Impact Tracker › Rapport Janvier 2026 › **Saisie manuelle** ». **4 cartes** en grille 2×2 : **Financement** (Financement hors programme ? Oui/Non · Montant total reçu 1 951 472 · Première fois pour ces financeurs ? · Qui sont ces nouveaux financeurs ? « OIF ») · **Produit & innovation** (4 champs Oui/Non + « lesquels ? ») · **Satisfaction & emploi** (Recommandation 1-10 = 10 · Employés temps plein 5 · Employées femmes temps plein 2) · **« Indicateurs indisponibles »** (fond `--ink-50`) : 3 tuiles hachurées avec action **« Configurer la collecte »** **[D]** — Zone rurale (« Ajouter "localité urbaine/rurale" au formulaire d'inscription »), Situation de handicap (« Ajouter un champ inclusion (optionnel, opt-in) au profil »), Institutions (« Modéliser l'entité "institution" et son rattachement »). Pied : « Enregistrer le brouillon » (outline) **[D]** · « Valider la saisie » (sombre) **[D]** |

**Logique `kpiStatus(kpi)`** — règle centrale, appliquée dans `WAD02`, `WAD03` et `WAD04` :

```js
source === 'indispo'                          → { indispo,   neutral, "Indisponible" }
value == null || value === ''                 → { attente,   amber,   "En attente"   }
target != null && value < target * 0.7        → { hors-cible, error,  "Hors-cible"   }
sinon                                          → { validee,   success, "Validée"      }
```

⚠️ Le code porte un commentaire de travail explicite (« ⭐ TA CONTRIBUTION (mode learning) », « La baseline marche déjà ; affine-la selon ta règle métier ») avec 3 questions ouvertes : traitement d'un KPI manuel non saisi, définition de « hors-cible » (seuil 70 % arbitraire), abstention si `target == null`. **À trancher et à nettoyer avant livraison.**

### Plateforme

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WAD06` | Utilisateurs | `headerSearch` actif + `headerActions` « Inviter » (sombre sm, icône +) **[D]**. **4 `StatCard`** de répartition : Apprenants 220 · Parents 96 · Enseignants 12 · Admins 4. **[I]** `SegmentedControl` (Tous / Apprenants / Parents / Enseignants) → **filtrage réel** de la table. Recherche secondaire « Nom, ville… » **[D]**. **`DataTable`** cliquable (`onRowClick`) : Utilisateur (`Avatar` + nom) / Rôle / Ville / Inscrit le / Statut (`StatusBadge`) / chevron → `WAD07` |
| `WAD07` | Détail utilisateur | Fil « Utilisateurs › **Léa Adjovi** ». Grille 1fr/1.6fr. **Gauche** : carte identité (`Avatar` 72, nom, email, `Badge` vert « Compte actif ») ; carte **« Informations »** — Rôle, Âge, Genre, Ville, **« Localité (urbain/rural) : Non renseigné »** (affiché en italique gris — matérialise le trou de collecte du §8.3), **« Consentement parent : Validé · Mme Sossou »**, Inscrit le. **Droite** : « Parcours suivis » (2 `ProgressBar`) ; 3 `StatCard` (Quiz réussis 9/12 · Badges 5 · Dépensé 18 000 FCFA) ; **« Actions »** : « Réinitialiser le mot de passe » · « Changer de rôle » · « Voir le parent » · « **Suspendre le compte** » (danger) — toutes **[D]** |
| `WAD08` | Modération & consentements | **[I]** `SegmentedControl` : « Consentements (3) » / « Signalements (0) » / « Comptes à vérifier (1) », **bascule réelle du contenu**. **Onglet consentements** : note « Demandes de consentement parental pour les moins de 16 ans. **Le refus est terminal.** » + 3 `adm-alert` warn (enfant · âge — action demandée, « Parent : X · <date> ») avec boutons « Refuser » (outline sm) **[D]** / « **Valider** » (sombre sm) **[D]**. **Onglet signalements** : état vide « Aucun signalement en attente. ». **Onglet comptes à vérifier** : 1 alerte « Inès Kossou · Enseignant déclaré — Justificatif d'établissement à vérifier » + « Rejeter » / « **Approuver** » **[D]** |
| `WAD09` | Contenu / Parcours | `headerSearch` + « **Nouveau parcours** » (sombre sm) **[D]**. **4 `StatCard`** : Parcours publiés 18 · Brouillons 4 · Gratuits 11 · **Avec kit requis 7**. **`DataTable`** cliquable : Parcours / Catégorie / **Accès** (`Badge` vert « Gratuit » ou neutre « Payant ») / **Kit** (Oui / —) / Inscrits / Statut (`publié` vert, `brouillon` neutre) |
| `WAD10` | Boutique & commandes | « **Ajouter un kit** » (sombre sm) **[D]**. Grille 1fr/1.4fr. **Gauche** : « Stock des kits » — 3 lignes `adm-kpi` avec **badge de stock à 3 seuils** : `stock === 0` → rouge « Rupture » · `stock < 10` → ambre « n en stock » · sinon vert. **Droite** : 3 `StatCard` (Commandes du mois 31 · **À expédier 6** · CA kits 312k FCFA) ; « Commandes récentes » = `DataTable` dense (Réf. / Article / Acheteur / **Paiement** / **Livraison**, chacun en `StatusBadge`) |
| `WAD11` | Paiements Mobile Money | Bandeau « Réseaux : **MTN · Moov · Celtiis (pas de carte bancaire)** » + **[I]** `SegmentedControl` Mois/Trimestre (⚠️ sans effet sur les données). **4 `StatCard`** : Volume encaissé 356k FCFA (+12 %, sparkline) · Transactions 48 (+6) · **Taux d'échec 9 %** (−2 pts, `deltaTone="success"`) · Remboursements 1. **`DataTable`** : Référence `MM-xxxxx` / Utilisateur / Réseau / Montant / Date / Statut (`payé` vert, `échoué` rouge, `remboursé` neutre) |
| `WAD12` | Steamy Events (modération) | « **Créer un événement** » (sombre sm) **[D]**. 3 `StatCard` (Événements à venir 3 · Candidatures 18 « 5 à modérer » · Participants confirmés 42). **« Candidatures à modérer »** — sous-titre : « **Pour les < 16 ans, l'accord parental est requis avant validation.** » `DataTable` : Apprenant (nom + âge) / Événement / **Consentement** (`Badge` ambre « Parent requis » · vert « Validé » · neutre « N/A ») / actions « Refuser » (outline sm) **[D]** et « Accepter » (sombre sm) — **`disabled` tant que `consent === 'requis'`**. C'est le seul endroit du dépôt où l'invariant de consentement est **matérialisé par un `disabled`** |
| `WAD13` | Équipe & rôles (RBAC) | « **Inviter un admin** » (sombre sm) **[D]**. Grille 1.5fr/1fr. **Gauche** : « Membres » — `DataTable` (Membre = `Avatar` + nom + email / Rôle en `Badge` neutre / Dernière activité). **Droite** : « Rôles & permissions » — 4 définitions : **Super-admin** (accès total, gestion de l'équipe et des rôles) · **Contenu** (parcours, catalogue, boutique) · **Support** (utilisateurs, modération, consentements) · **Finance** (paiements, rapport d'impact). ⚠️ **Purement descriptif — aucune logique RBAC n'existe** |
| `WAD14` | Paramètres généraux | Conteneur 820px, 3 sections. **Plateforme** : **[I]** « Mode maintenance » (« Coupe l'accès apprenant pendant les opérations. ») ✗ · « Inscriptions ouvertes » ✓. **Intégrations Mobile Money** : **[I]** MTN MoMo ✓ · Moov Money ✓ · **Notifications SMS** (« Codes OTP et consentements parentaux. ») ✓ — ⚠️ **Celtiis est absent** alors qu'il est proposé dans `WA03`/`WK06`/`WD20`. **Annonce plateforme** : `textarea` « Message diffusé à tous les utilisateurs » + bouton « Diffuser l'annonce » (sombre sm) **[D]** |
| `WAD15` | Connexion admin (2FA) | **Hors shell.** Carte 380px centrée sur `--ink-50`. `Logo 34` + « ESPACE ADMINISTRATION ». Champs : **Email professionnel** (icône mail), Mot de passe (`PasswordInput`), **Code de vérification (2FA)** — `OTPInput length=6` avec hint « **Envoyé sur ton application d'authentification.** » (TOTP, pas SMS). Bouton « **Connexion sécurisée** » (block sombre) **[D]**. Mention 🔒 « Connexion chiffrée · journalisée » |

---

## 6. États transversaux — `WX01`-`WX03` · `screens-states-web.jsx`

**Ne pas traiter comme une zone.** Ce sont des **états d'enveloppe** applicables à n'importe quelle vue, dessinés comme des écrans faute d'autre moyen sur le canvas.

Composant générique `WXState({ pose, emoji, title, body, primaryLabel, secondaryLabel, bg, circle, border, shadow })` : carte 540px centrée, mascotte 160 dans un cercle, emoji en incrustation, H1 30px, corps, 1 ou 2 boutons.

| ID | État | Contenu | Actions |
| --- | --- | --- | --- |
| `WX01` | Hors ligne | `Mascot sleep` + 📡, « Tu es hors ligne », « Vérifie ta connexion internet. **Steamy reprend tout seul dès que le réseau revient - rien n'est perdu.** » | « Mode hors ligne » (outline) **[D]** · « Réessayer » **[D]** |
| `WX02` | Erreur réseau | `Mascot sad` + ⚠️, « Oups, ça a coupé », « On n'a pas pu charger cette page. **Le réseau est parfois capricieux** - réessaie dans un instant. » | « Retour » (outline) **[D]** · « Réessayer » **[D]** |
| `WX03` | Chargement | `Mascot focus 150` + `Loader`, « On prépare ton contenu… », « **Le réseau est parfois un peu lent par ici** - merci de patienter quelques secondes. » | Aucune |

### Règles d'implémentation

1. **Un composant d'enveloppe unique**, pas trois pages. Idéalement un `<AppStateBoundary>` qui intercepte `offline` / `error` / `pending`.
2. **`WX01` mentionne un « Mode hors ligne »** — fonctionnalité annoncée par l'interface mais **jamais spécifiée ailleurs**. À arbitrer : cache de lecture ? téléchargement de missions ? Voir §8.11.
3. **Trois niveaux de chargement coexistent** et doivent être distingués :
   - **Skeleton** structurel quand la mise en page est connue (`WD03`).
   - **Loader + message rassurant** pour les attentes longues attendues (`WA04`, `WJ04`, `WX03`).
   - **Pastille `Loader` inline** pour les attentes asynchrones tierces (`W07`, `WA02`, `WK08`).
4. Ne jamais afficher un spinner nu : la connectivité ouest-africaine est une contrainte produit explicite, tout délai doit être verbalisé.
