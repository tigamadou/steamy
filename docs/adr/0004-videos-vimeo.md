# ADR 0004 · Vidéos des missions et bandes-annonces (Vimeo)

- **Statut** : **acceptée** pour les principes (vidéos non listées, hachage, restriction d'intégration, exposition
  conditionnelle, pas de hors ligne) ; **proposée** pour les points V1 à V4 de la section « Points à trancher »
- **Date** : 15 octobre 2026 (documentation Vimeo consultée le même jour, sources en fin de document)
- **Étape** : avant `API-L3a.1` ([PLAN-API](../plans/PLAN-API.md#api-l3a--pédagogie))
- **Décisions appliquées** : D16 (pas de mode hors ligne), D34 et D55 (temps d'apprentissage), D71 (groupe Contenu)
  ([ARBITRAGES](../alignement/ARBITRAGES.md)) ; champs `vimeoId` / `vimeoHash` de
  [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §3.2 ; intégration front déjà décrite dans
  [LOT-3-APPRENANT](../plans/LOT-3-APPRENANT.md) §6

## Contexte

Les vidéos des missions, les introductions de niveau et les bandes-annonces des parcours sont hébergées sur **Vimeo**
(choix de l'utilisateur) ; aucune vidéo n'est stockée chez Steamy. Le contenu d'un parcours est réservé aux inscrits :
une mission verrouillée ou un non-inscrit reçoit `CONTENT_LOCKED` / `NOT_ENROLLED` et ne voit jamais l'identifiant
de la vidéo. Le public a 10 à 17 ans, en Afrique francophone, souvent sur des connexions mobiles limitées.

Cette ADR fixe : le mode de confidentialité Vimeo, ce que l'API expose et à qui, le lecteur côté Next.js et sa
politique de sécurité, le suivi du visionnage, ce que Vimeo garantit (et ne garantit pas), les quotas, l'accessibilité
et la chaîne de saisie des identifiants. Elle ne fait **aucun appel à l'API Vimeo** en v1 (durées saisies à la main).

## Ce que dit la documentation Vimeo

| Sujet | Constat (aide Vimeo, 15 octobre 2026) |
| --- | --- |
| Non listé | Réglage de **visibilité** réservé aux offres payantes. La vidéo n'apparaît pas dans la recherche, mais toute personne ayant l'URL peut la voir et la partager ; l'URL contient un **hachage de confidentialité** obligatoire pour l'intégration et le partage |
| Hachage et lecteur | Sans le paramètre `h`, un lecteur intégré affiche « la vidéo n'existe pas ». `h` doit suivre immédiatement l'identifiant, les autres paramètres s'ajoutent avec `&` : `https://player.vimeo.com/video/{id}?h={hash}&dnt=1` |
| Intégration limitée aux domaines (« Specific domains ») | Réglage **par vidéo** (Partager → Intégrer → « Où peut-elle être intégrée ? »), **50 domaines** au plus ; hors liste, le lecteur affiche une erreur. L'article d'aide actuel dit « incluse dans toutes les offres » ; un résumé de recherche plus ancien l'exclut pour Free et Basic. **À vérifier sur l'offre réelle** (inconnue 2) |
| « Embed only » | Réglage de visibilité payant : la vidéo est intégrable mais invisible sur vimeo.com. Utile pour ne pas exposer le catalogue sur le site de Vimeo |
| Privé | Toutes offres, mais **non intégrable** : inutilisable ici |
| Mot de passe | Offres payantes ; non retenu (le mot de passe serait partagé, et saisi dans le lecteur) |
| oEmbed | Avec la restriction de domaine, une requête oEmbed sans le domaine autorisé renvoie une réponse tronquée ; un non listé exige l'URL complète avec hachage. Non utilisé en v1 |
| Bande passante | Seuil de **2 To par mois** sur les offres standard, **non bloquant** à la volée (Vimeo contacte les comptes au-delà de 2 To deux mois sur douze, ou de 10 To une fois ; délai de 7 jours puis suspension possible, les vidéos cessant alors de lire partout) ; Free : 1 To et seulement 3 Go de stockage pour les vidéos intégrables ou non publiques ; Studio : 36 To par an. Dernière mise à jour de la page : 13 octobre 2026 |
| Sous-titres | Fichiers WebVTT (recommandé) ou SRT en UTF-8, chargés par vidéo ; sous-titres automatiques sur les offres payantes (la page Free de 2026 les cite aussi) |
| Offres | La gamme change : l'aide documente Starter, Standard, Advanced, Enterprise, mais aussi **Core** (déploiement progressif : 7 To de stockage dont 300 Go gérés pour les vidéos intégrables et non publiques, 2 To/mois, liens non listés, restriction de domaine, « embed only », 1 siège + 3 membres) et **Studio** (400 $/mois). Les prix et noms ne sont pas stables d'une source à l'autre |

## Décision

1. **Toutes les vidéos de contenu sont non listées, en « embed only », et limitées à nos domaines.** Réglage
   Vimeo par vidéo : visibilité *Unlisted* (ou *Embed only* si l'offre l'autorise), intégration *Specific domains*
   (production, préproduction, domaine de l'admin Django pour l'aperçu, voir 6), téléchargement désactivé. Le hachage
   n'est pas un secret fort : il évite seulement qu'un identifiant numérique, énumérable, suffise.
2. **Deux champs, jamais un seul.** `vimeoId` (numérique) et `vimeoHash` sont stockés séparément (champs déjà prévus
   dans la spec), de même `introVimeoId` / `introVimeoHash`. La bande-annonce suit la même règle : la spec ne prévoit
   que `trailerVimeoId` ; **ajouter `trailerVimeoHash`** (point V2).
3. **Exposition conditionnelle, côté serveur.** `vimeoId` + `vimeoHash` d'une mission ne sont renvoyés que si
   l'utilisateur a une **inscription active** au parcours **et** que la mission est **déverrouillée** (séquence
   respectée) ; `introVimeoId/Hash` d'un niveau, si l'inscription est active et le niveau atteint. Sinon :
   `NOT_ENROLLED` ou `CONTENT_LOCKED`, et ni identifiant, ni hachage, ni corps de mission. Le catalogue public (WC04)
   ne renvoie que la bande-annonce et les titres et durées du programme. Ces réponses portent
   `Cache-Control: private, no-store`. Le hachage n'est jamais journalisé, ni mis dans une URL de notre site, ni
   rendu dans le HTML des pages publiques (test API et test Playwright d'absence, déjà prévu au lot 1).
4. **Lecteur** : composant client `VimeoPlayer` (lot 3), un `iframe` `https://player.vimeo.com/video/{id}?h={hash}&dnt=1`
   sur lequel `@vimeo/player` (version épinglée, empaqueté, aucun script tiers) se branche pour les événements. Chargé
   **après un clic** sur une vignette (image de couverture hébergée chez nous) : aucun contact avec Vimeo avant
   l'intention de lecture, ce qui limite les traces laissées par un mineur. `title` accessible, ratio 16:9,
   `allow="fullscreen; picture-in-picture"`, pas de lecture automatique.
5. **Content Security Policy** : `frame-src https://player.vimeo.com`, rien d'autre. Pas de `script-src` Vimeo (le SDK
   est dans notre bundle), pas de `connect-src` ni de `img-src` Vimeo (les ressources du lecteur sont dans l'iframe,
   qui applique sa propre politique ; la vignette est la nôtre). La restriction de domaine de Vimeo repose sur
   l'origine de la page qui intègre : **ne pas** poser `Referrer-Policy: no-referrer` sur ces pages ni sur
   l'iframe ; garder `strict-origin-when-cross-origin`. À vérifier en recette sur un domaine réel (inconnue 5).
6. **Saisie par le groupe Contenu, dans l'admin Django** (WAD09, D71). Champs `vimeoId` et `vimeoHash` sur
   `Mission`, `introVimeoId/Hash` sur `Level`, `trailerVimeoId/Hash` sur `Course`. Pour éviter les erreurs de copie,
   le formulaire accepte aussi l'**URL complète** de partage et en extrait l'identifiant et le hachage (validation
   `^\d+$` pour l'identifiant ; hachage alphanumérique, sans fixer de longueur). Aperçu en lecture seule dans
   l'admin : le **domaine de l'admin doit donc figurer dans la liste des domaines autorisés** de chaque vidéo. La
   durée est saisie à la main. Procédure de publication (liste de contrôle donnée au groupe Contenu) : téléverser →
   visibilité non listée → intégration limitée aux domaines → téléchargement désactivé → sous-titres français
   ajoutés → copier l'URL de partage → la coller dans l'admin → vérifier l'aperçu → publier le parcours.
7. **Suivi minimal du visionnage.** Le composant cumule les secondes **réellement lues** (événement `timeupdate`,
   sauts exclus) et envoie `POST learning/activity/ { missionId, seconds }` toutes les 30 s de lecture, à la pause,
   à la fin et au passage en arrière-plan (`fetch` avec `keepalive`). Rien d'autre : ni position de lecture, ni
   liste d'événements, ni identifiant d'appareil. Le serveur plafonne les secondes par appel et par jour. Le
   visionnage **ne conditionne pas** « Marquer comme terminée » : l'API reste juge. Il alimente le streak et le temps
   d'apprentissage (D34, D55) et rien d'autre.
8. **Pas de mode hors ligne** (D16) : téléchargement désactivé côté Vimeo. Hors connexion ou vidéo refusée : encart
   « La vidéo ne peut pas être lue » et contenu texte de la mission.
9. **Pas d'appel à l'API Vimeo en v1** : pas de jeton Vimeo dans l'environnement, pas de synchronisation de durées
   ou de vignettes. Si cela change, une nouvelle ADR.

## Ce que Vimeo garantit, et ce qu'il ne garantit pas

| Garanti (si les réglages ci-dessus sont appliqués) | Non garanti |
| --- | --- |
| La vidéo n'est ni listée, ni trouvable par recherche sur Vimeo | Une personne **inscrite** peut copier `id` + `hash` (outils du navigateur) et les donner à d'autres |
| Le lecteur intégré refuse de s'afficher sur un site hors liste | La vérification de domaine ne protège que le navigateur ; un client non navigateur peut fabriquer l'en-tête d'origine. L'ouverture directe de l'URL du lecteur est à tester (inconnue 3) |
| Pas de bouton de téléchargement | Pas de DRM : une capture d'écran ou d'écran reste possible |
| | **Révocation** : retirer un inscrit ne rend pas l'URL déjà copiée inutilisable ; la régénération du hachage est à vérifier (inconnue 4) |
| | **Disponibilité** : rétrograder l'offre peut verrouiller des vidéos « y compris par les liens et intégrations existants » ; suspension possible au-delà du seuil de bande passante, ou compte inactif |

Conséquences retenues : la fuite d'un lien est un **risque accepté en v1** (déjà au registre des risques du plan) ;
limitée par la réservation côté serveur, l'absence de cache, la limitation de débit des routes de contenu et la
restriction de domaine. Un parcours payant dont la fuite deviendrait un manque à gagner réel déclencherait une
nouvelle ADR (lecture signée par jeton ou hébergeur à DRM) : ce n'est pas le cas en v1. Les **originaux** (fichiers
sources) restent conservés par Contenu hors de Vimeo, pour pouvoir changer d'hébergeur si l'offre ou le compte pose
problème.

## Quotas et dimensionnement

Ordre de grandeur, **hypothèses à confirmer** : une vidéo en 720p consomme environ 1,3 Go par heure de lecture
(≈ 3 Mb/s). Le seuil de 2 To par mois correspond alors à ≈ 1 500 heures de lecture mensuelles, soit par exemple
500 apprenants actifs à 3 h par mois, ou ≈ 4 500 lectures complètes de missions de 20 minutes. Le seuil n'est pas
bloquant mais son dépassement répété expose à une relance puis à une suspension sous 7 jours : surveiller le rapport de
bande passante du compte (propriétaire d'une offre payante), et prévoir l'offre « Custom/Enterprise » si la
fréquentation le justifie. Leviers produit : missions courtes (≈ 5 à 10 min), qualité maximale 720p à l'export,
vignette cliquable (pas de lecture à vide), pas de lecture automatique. L'offre gratuite ne convient pas : les
options non listé et restriction de domaine y sont payantes (ou, selon la source, non offertes) et les vidéos
intégrables y sont limitées à 3 Go.

## Sous-titres et accessibilité

- Chaque vidéo publiée a des **sous-titres français** au format WebVTT (relus par Contenu si générés
  automatiquement : la qualité du français automatique est à vérifier, inconnue 7). L'option `texttrack=fr`
  (affichage par défaut, source secondaire) est à confirmer dans la documentation du lecteur.
- Le contenu textuel de la mission (blocs texte, astuces) est la **version de repli** : il doit résumer la vidéo
  (transcription ou équivalent), ce qui sert aussi sans connexion suffisante.
- `iframe` avec `title` explicite ; vignette atteignable et activable au clavier ; le lecteur Vimeo gère ses
  commandes clavier à l'intérieur de l'iframe.

## Conséquences

- (+) Aucun stockage ni transcodage vidéo, aucune infrastructure de streaming à exploiter.
- (+) L'API garde la décision d'accès : le contrôle d'inscription et de séquence est testable sans Vimeo
  (Playwright intercepte `player.vimeo.com`).
- (−) Dépendance forte à un compte et à une offre : prix, noms d'offres et quotas évoluent, une rétrogradation
  rend les vidéos illisibles.
- (−) Protection d'accès « raisonnable » mais pas forte (lien copiable, pas de DRM).
- (−) Réglages par vidéo : erreurs de configuration possibles, d'où la liste de contrôle et l'aperçu dans l'admin.
- (−) Les adresses IP des enfants parviennent à Vimeo à la lecture ; `dnt=1` réduit les traces mais ne les supprime pas
  (cookies essentiels possibles). La mention figure dans la politique de confidentialité (texte à valider
  juridiquement, D6).

## Points à trancher (statut : proposée)

| # | Point | Proposition |
| --- | --- | --- |
| V1 | Offre Vimeo minimale | Une offre **payante** offrant au moins : non listé, restriction de domaine, téléchargement désactivé, ≥ 2 To/mois, propriétaire organisation (pas un compte personnel) et 2 sièges (propriétaire + Contenu). Core, Starter ou équivalent selon ce que l'utilisateur possède |
| V2 | Bande-annonce | Aussi non listée, limitée aux domaines, avec `trailerVimeoHash` ajouté à `Course` (modification de la spec, au premier PR d'`API-L3a.1`). Variante : bande-annonce **publique** sur Vimeo (marketing, visible sur vimeo.com), sans hachage |
| V3 | Risque de fuite d'une vidéo payante | Accepté en v1 sans DRM, comme au registre du plan ; à confirmer par l'utilisateur sachant que des parcours payants existent |
| V4 | Préproduction et développement | Vidéos de démonstration **distinctes** de celles de production, autorisant `localhost` et la préproduction ; la production n'autorise que le domaine de production et celui de l'admin |

## Inconnues à vérifier sur l'offre Vimeo de l'utilisateur

1. Nom exact de l'offre, prix, sièges, date de renouvellement ; la gamme Core / Studio est-elle activée sur le compte ?
2. « Specific domains » et « Unlisted » / « Embed only » sont-ils disponibles sur **cette** offre (l'aide actuelle dit
   « toutes les offres » pour le premier, « offres payantes » pour les autres) ?
3. Ouvrir directement `https://player.vimeo.com/video/{id}?h={hash}` dans un onglet, hors de nos domaines : la lecture
   est-elle refusée ? Un `curl` avec un en-tête d'origine falsifié passe-t-il ?
4. Peut-on **régénérer** le hachage d'une vidéo sans la téléverser de nouveau (ou changer son identifiant) ?
5. Comportement de la restriction avec nos en-têtes réels (`Referrer-Policy`), avec un sous-domaine, et avec l'aperçu
   de l'admin Django ; une même liste de domaines peut-elle être appliquée par défaut à tout le compte ou à un dossier ?
6. Paramètre `dnt=1` : quels cookies et appels subsistent ? (page `developer.vimeo.com/player/sdk/embed`, non
   récupérée à la rédaction) ; quel contrat de traitement des données (DPA) propose Vimeo, et où sont-elles traitées ?
7. Sous-titres automatiques en **français** : disponibles sur l'offre, qualité, coût éventuel ; paramètre `texttrack`.
8. Bande passante : valeur contractuelle sur l'offre, rapport d'utilisation accessible, conséquence exacte d'un
   dépassement (relance, suspension) et plafond de stockage pour les vidéos non publiques.
9. Les vidéos déjà téléversées : réglages actuels (public ? téléchargement ?) à auditer avant `API-L3a.1`.
10. Conditions d'utilisation de Vimeo pour un contenu destiné aux mineurs et pour un usage payant (cours vendus).

## Suites

- `API-L3a.1` : champs `vimeoHash` / `introVimeoHash` / `trailerVimeoHash`, validation, exposition conditionnelle,
  tests d'absence dans le HTML public et dans toute réponse `NOT_ENROLLED` / `CONTENT_LOCKED`.
- Lot 3 (3.3a) : `VimeoPlayer`, CSP `frame-src`, suivi par `learning/activity/`, test Playwright avec une page factice.
- Lot 6 (WAD09) : formulaire d'URL, validation, aperçu dans l'admin, liste de contrôle du groupe Contenu.
- Une ADR acceptée n'est pas réécrite : un changement d'hébergeur ou de mode de protection en crée une nouvelle.

## Sources (consultées le 15 octobre 2026)

- Aide Vimeo, [À propos des réglages de confidentialité](https://help.vimeo.com/hc/en-us/articles/12426199699985-About-video-privacy-settings)
- Aide Vimeo, [Confidentialité au niveau du domaine](https://help.vimeo.com/hc/en-us/articles/30030693052305-How-do-I-set-up-domain-level-privacy)
- Aide Vimeo, [oEmbed et vidéos privées](https://help.vimeo.com/hc/articles/12427906892689)
- Aide Vimeo, [Bande passante](https://help.vimeo.com/hc/en-us/articles/12426275404305-Bandwidth-on-Vimeo)
- Aide Vimeo, [Offre Free](https://help.vimeo.com/hc/en-us/articles/12425432518801-About-the-Vimeo-Free-plan), [Core](https://help.vimeo.com/hc/en-us/articles/49786876885137-About-the-Vimeo-Core-plan), [Studio](https://help.vimeo.com/hc/en-us/articles/47197205924241-About-the-Vimeo-Studio-plan), [Offres](https://help.vimeo.com/hc/en-us/articles/12425432033937-About-Vimeo-plans)
- Aide Vimeo, [Sous-titres](https://help.vimeo.com/hc/en-us/articles/21956884955537-How-to-add-captions-or-subtitles-to-your-video)
- [`vimeo/player.js`](https://github.com/vimeo/player.js) (lecteur, événements, vidéos non listées avec `h`)
- Non récupérées (à lire avant `3.3a`) : `developer.vimeo.com/player/sdk/embed` (paramètres `dnt`, `texttrack`) et la
  référence des événements. Les données de `dnt` et `texttrack` ci-dessus viennent de sources secondaires.
