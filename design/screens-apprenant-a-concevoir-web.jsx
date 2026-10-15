// screens-apprenant-a-concevoir-web.jsx - Écran apprenant absent de la maquette (C18), version web (1240×760).
// WD23 · Mes parcours (D39) : onglets En cours / Terminés, bandeau des demandes en attente,
// états vide et chargement. Spec : docs/SPEC-ECRANS-2-apprenant.md §5.6 « Mes parcours ».
// Définit WDACShell : AppShell apprenant avec la navigation cible de D39 (6 entrées, « Badges » masquée),
// mêmes classes CSS que WebAppShell. Réutilise SectionHeader, SkeletonBlock (dashboard-web) et le DS.
// Tokens uniquement. Ne s'auto-monte pas : expose window.LearnerACSections, appelée par DashboardFlowWeb.

const WDAC_W = 1240,
  WDAC_H = 760;
const wdacStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-pop-md)",
  overflow: "hidden",
};

// Barre de progression : classes .progress du DS, sans le flex: 1 qui l'écrase dans une colonne flex.
function WDACBar({ value = 0, tone }) {
  return (
    <div className={["progress", tone && `progress--${tone}`].filter(Boolean).join(" ")} style={{ flex: "none", width: "100%" }}>
      <div className="progress__bar" style={{ width: `${value}%` }} />
    </div>
  );
}

// Navigation apprenant cible (D39) : « Badges » reste masquée tant que l'écran n'est pas conçu.
const WDAC_NAV = [
  { id: "home", icon: "home", label: "Accueil" },
  { id: "courses", icon: "book", label: "Mes parcours" },
  { id: "catalog", icon: "compass", label: "Catalogue" },
  { id: "wishlist", icon: "heart", label: "Mes souhaits" },
  { id: "profile", icon: "user", label: "Profil" },
];

function WDACShell({ active = "courses", headerTitle, headerActions, notifDot, children }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__logo">
          <Logo height={40} />
        </div>
        <nav className="app-sidebar__nav">
          {WDAC_NAV.map((it) => (
            <button
              key={it.id}
              className={["app-sidebar__item", active === it.id && "is-active"]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon name={it.icon} size={20} strokeWidth={active === it.id ? 2.5 : 2} />
              {it.label}
            </button>
          ))}
        </nav>
        <div className="app-sidebar__user">
          <Avatar name="Léa" size={32} ring color="var(--primary-500)" />
          <div className="app-sidebar__user-info">
            <div className="app-sidebar__user-name">Léa A.</div>
            <div className="app-sidebar__user-class">4ᵉ · Cotonou</div>
          </div>
        </div>
        <button className="app-sidebar__logout">
          <span>Déconnexion</span>
          <Icon name="logout" size={16} color="var(--ink-500)" />
        </button>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <h1 className="app-header__title">{headerTitle}</h1>
          <div className="app-header__right">
            <div className="app-header__search">
              <Icon name="search" size={16} color="var(--ink-500)" />
              <input placeholder="Rechercher un parcours…" />
            </div>
            {headerActions}
            <button className="app-header__icon-btn" aria-label="Notifications">
              <Icon name="bell" size={18} color="var(--ink-700)" />
              {notifDot && <span className="app-header__dot" />}
            </button>
            <Avatar name="Léa" size={36} ring color="var(--primary-500)" />
          </div>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

// ─── Données de démonstration (jeu D2 : Léa Adjovi, 4ᵉ, Cotonou) ───
const WDAC_ONGOING = [
  {
    title: "Construis ton robot Bluetooth",
    emoji: "📡",
    color: "var(--cat-robotique)",
    level: "Intermédiaire",
    progress: 62,
    position: "Projet 2 · Niveau 1",
    next: "Servo-moteur",
    last: "Hier",
    origin: "Classe de M. Koffi",
  },
  {
    title: "L'IA pour les débutants",
    emoji: "🤖",
    color: "var(--cat-ia)",
    level: "Débutant",
    progress: 15,
    position: "Projet 1 · Niveau 2",
    next: "Apprendre à une machine à trier",
    last: "Il y a 4 jours",
  },
];

const WDAC_DONE = [
  {
    title: "Découverte de la robotique",
    emoji: "🦾",
    color: "var(--cat-robotique)",
    level: "Débutant",
    certified: "Certifiée le 3 sept. 2026",
  },
];

// ─── Composants locaux ───────────────────────────────
function WDACTabs({ value, ongoing = 2, done = 1 }) {
  return (
    <div className="tabs-pill" style={{ alignSelf: "flex-start" }}>
      <button className={["tabs-pill__btn", value === "ongoing" && "is-active"].filter(Boolean).join(" ")}>
        En cours ({ongoing})
      </button>
      <button className={["tabs-pill__btn", value === "done" && "is-active"].filter(Boolean).join(" ")}>
        Terminés ({done})
      </button>
    </div>
  );
}

function WDACVisual({ c, size = 112 }) {
  return (
    <div
      style={{
        width: size,
        alignSelf: "stretch",
        minHeight: size,
        borderRadius: 16,
        background: c.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        flexShrink: 0,
      }}
    >
      {c.emoji}
    </div>
  );
}

// Carte d'inscription en cours : clic sur la carte → WC06a, « Continuer » → WJ03 de la prochaine mission.
function WDACEnrolledCard({ c }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        padding: 16,
        background: "var(--surface)",
        border: "1.5px solid var(--ink-100)",
        borderRadius: 20,
        boxShadow: "var(--shadow-pop-sm)",
        cursor: "pointer",
      }}
    >
      <WDACVisual c={c} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge tone="primary">{c.level}</Badge>
          {c.origin && (
            <Badge tone="amber" icon={<Icon name="user" size={12} color="var(--amber-700)" strokeWidth={2.5} />}>
              {c.origin}
            </Badge>
          )}
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink-900)" }}>{c.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, maxWidth: 360 }}>
            <WDACBar value={c.progress} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, color: "var(--primary-700)" }}>{c.progress} %</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-500)" }}>· {c.position}</span>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 13, fontWeight: 700, color: "var(--ink-600)" }}>
          <span>
            🎯 Prochaine mission : <b style={{ color: "var(--ink-900)" }}>{c.next}</b>
          </span>
          <span>🕒 Dernière activité : {c.last}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button variant="secondary" icon={<Icon name="play" size={16} color="var(--surface)" strokeWidth={3} />}>
          Continuer
        </Button>
      </div>
    </div>
  );
}

// Carte de parcours terminé (certifié, D33) : certification PDF + lien vers WJ07.
function WDACDoneCard({ c }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        padding: 16,
        background: "var(--surface)",
        border: "1.5px solid var(--success-200)",
        borderRadius: 20,
        boxShadow: "var(--shadow-pop-sm)",
      }}
    >
      <WDACVisual c={c} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge tone="primary">{c.level}</Badge>
          <Badge tone="success" icon={<Icon name="check" size={12} color="var(--success-700)" strokeWidth={3} />}>
            Terminé · 100 %
          </Badge>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{c.title}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-600)" }}>
          🏅 {c.certified} · toutes les missions et évaluations sommatives réussies
        </div>
        <a href="#" style={{ fontSize: 13, fontWeight: 900, color: "var(--primary-600)" }}>
          Voir mon certificat et mon ticket Steamy Events ›
        </a>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button variant="outline" icon={<Icon name="arrow-right" size={16} color="var(--primary-600)" strokeWidth={2.5} />}>
          Télécharger la certification
        </Button>
      </div>
    </div>
  );
}

// Bandeau « En attente de ton parent » : demandes de paiement non réglées → WA02.
function WDACPendingBanner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        borderRadius: 18,
        background: "var(--amber-50)",
        border: "2px solid var(--amber-300)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--amber-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        ⏳
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 900 }}>En attente de ton parent · 1 demande</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-600)" }}>
          <b style={{ color: "var(--ink-900)" }}>Capteurs électroniques</b> · 18 000 FCFA · demandé le 13 oct. ·
          ton parent a jusqu'au 20 oct. pour la régler
        </div>
      </div>
      <Button variant="outline" size="sm">
        Voir la demande
      </Button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WD23 · MES PARCOURS
// ════════════════════════════════════════════════════════
function WD23_MyCourses() {
  return (
    <WDACShell active="courses" headerTitle="Mes parcours" notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <WDACPendingBanner />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <WDACTabs value="ongoing" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
            Triés par dernière activité
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {WDAC_ONGOING.map((c, i) => (
            <WDACEnrolledCard key={i} c={c} />
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
          Envie d'un nouveau défi ?{" "}
          <a href="#" style={{ color: "var(--primary-600)", fontWeight: 900 }}>
            Explorer le catalogue
          </a>
        </div>
      </div>
    </WDACShell>
  );
}

function WD23_Done() {
  return (
    <WDACShell active="courses" headerTitle="Mes parcours">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <WDACTabs value="done" />
        {WDAC_DONE.map((c, i) => (
          <WDACDoneCard key={i} c={c} />
        ))}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 16,
            background: "var(--ink-50)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ink-600)",
          }}
        >
          <span style={{ fontSize: 20 }}>💡</span>
          Un parcours passe dans « Terminés » quand toutes ses missions et ses évaluations sommatives sont
          réussies : ta certification est alors générée (cela peut prendre quelques minutes).
        </div>
      </div>
    </WDACShell>
  );
}

function WD23_Empty() {
  return (
    <WDACShell active="courses" headerTitle="Mes parcours">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <WDACTabs value="ongoing" ongoing={0} done={0} />
        <div className="welcome-card">
          <div className="welcome-card__body">
            <h1>Tu n'as pas encore de parcours</h1>
            <p>
              Commence par un parcours gratuit : tu pourras le suivre tout de suite, sans attendre ton parent.
            </p>
            <Button
              size="lg"
              variant="secondary"
              iconRight={<Icon name="arrow-right" size={18} color="var(--surface)" strokeWidth={3} />}
            >
              Commence par un parcours gratuit
            </Button>
          </div>
          <Mascot pose="wave" size={180} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)", textAlign: "center" }}>
          Tu as reçu un kit Steamy ? Saisis ton Kit Code depuis la fiche du parcours pour le débloquer.
        </div>
      </div>
    </WDACShell>
  );
}

function WD23_Loading() {
  return (
    <WDACShell active="courses" headerTitle="Mes parcours">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <SkeletonBlock w={240} h={40} r={999} />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 18,
              padding: 16,
              border: "1.5px solid var(--ink-100)",
              borderRadius: 20,
            }}
          >
            <SkeletonBlock w={112} h={112} r={16} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
              <SkeletonBlock w={90} h={20} r={999} />
              <SkeletonBlock w="55%" h={20} r={8} />
              <SkeletonBlock w="40%" h={10} r={999} />
              <SkeletonBlock w="65%" h={14} r={8} />
            </div>
            <SkeletonBlock w={130} h={44} r={14} style={{ alignSelf: "center" }} />
          </div>
        ))}
      </div>
    </WDACShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS : sections ajoutées à la vue « Dashboard » (DashboardFlowWeb)
// ════════════════════════════════════════════════════════
function LearnerACSections() {
  const ab = (id, label, El) => (
    <DCArtboard key={id} id={id} label={label} width={WDAC_W} height={WDAC_H} style={wdacStyle}>
      <El />
    </DCArtboard>
  );
  return [
    <DCSection
      key="ac-wd23"
      id="ac-wd23"
      title="À valider (C18) · WD23 Mes parcours"
      subtitle="Nouvelle entrée de nav « Mes parcours » (D39, « Badges » masquée). Carte → WC06a · « Continuer » → WJ03 de la prochaine mission · bandeau → WA02 · vide → WC01 filtré gratuit (D27) · terminé → PDF + WJ07."
    >
      {ab("WD23", "WD23 · Mes parcours · en cours", WD23_MyCourses)}
      {ab("WD23-termines", "WD23 · Terminés", WD23_Done)}
      {ab("WD23-vide", "WD23 · Vide", WD23_Empty)}
      {ab("WD23-chargement", "WD23 · Chargement", WD23_Loading)}
    </DCSection>,
  ];
}

window.LearnerACSections = LearnerACSections;
window.WDACShell = WDACShell;
