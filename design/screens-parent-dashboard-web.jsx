// screens-parent-dashboard-web.jsx - Dashboard PARENT (P3), version web (1240×760).
// Conforme à user flows/3_dashboard_parent.mmd. Happy path, 8 écrans WPD01–WPD08.
// Définit WebParentShell (sidebar parent, mêmes classes CSS que WebAppShell).
// Réutilise les globaux de dashboard-web : StatPill, SectionHeader, QuizAttemptRow,
// SettingsRow, Toggle, + atoms/complex du DS. Expose window.ParentDashFlowWeb.
// Reporté : Aide/FAQ & Notifications parent (miroir apprenant, passe transverse),
// suppression enfant (motifs), modif profil enfant détaillée, rapport hebdo graphique.

const PARENT_DASH_W = 1240,
  PARENT_DASH_H = 760;
const parentDashWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};

// ════════════════════════════════════════════════════════
// SHELL PARENT (sidebar dédiée parent + header)
// ════════════════════════════════════════════════════════
const PARENT_NAV = [
  { id: "home", icon: "home", label: "Accueil" },
  { id: "kids", icon: "user", label: "Mes enfants" },
  { id: "events", icon: "trophy", label: "Événements" },
  { id: "orders", icon: "cart", label: "Commandes" },
  { id: "help", icon: "book", label: "Aide" },
  { id: "settings", icon: "gear", label: "Paramètres" },
];

function WebParentShell({
  active = "home",
  headerTitle,
  headerActions,
  notifDot,
  children,
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__logo">
          <Logo height={40} />
        </div>
        <nav className="app-sidebar__nav">
          {PARENT_NAV.map((it) => (
            <button
              key={it.id}
              className={["app-sidebar__item", active === it.id && "is-active"]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon
                name={it.icon}
                size={20}
                strokeWidth={active === it.id ? 2.5 : 2}
              />
              {it.label}
            </button>
          ))}
        </nav>
        <div className="app-sidebar__user">
          <Avatar name="Marie" size={32} ring />
          <div className="app-sidebar__user-info">
            <div className="app-sidebar__user-name">Marie A.</div>
            <div className="app-sidebar__user-class">Parent · Cotonou</div>
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
            {headerActions}
            <button className="app-header__icon-btn" aria-label="Notifications">
              <Icon name="bell" size={18} color="var(--ink-700)" />
              {notifDot && <span className="app-header__dot" />}
            </button>
            <Avatar name="Marie" size={36} ring />
          </div>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// DONNÉES MOCK
// ════════════════════════════════════════════════════════
const PARENT_KIDS = [
  {
    name: "Léa Adjovi",
    meta: "13 ans · 4ème · Cotonou",
    emoji: "🦉",
    color: "var(--primary-500)",
    progress: 62,
    course: "Robot Bluetooth",
    badges: 5,
    status: "active",
  },
  {
    name: "Noé Adjovi",
    meta: "10 ans · CM2 · Cotonou",
    emoji: "🦊",
    color: "var(--cat-mecanique)",
    progress: 28,
    course: "Initiation Scratch",
    badges: 2,
    status: "active",
  },
  {
    name: "Inès Adjovi",
    meta: "Inscription en attente",
    emoji: "🐣",
    color: "var(--ink-300)",
    progress: 0,
    course: null,
    badges: 0,
    status: "pending",
  },
];

const PARENT_EVENTS = [
  {
    emoji: "🤖",
    title: "Challenge Robot Sumo",
    date: "14 juin 2026",
    place: "Cotonou",
    price: "Gratuit",
    color: "var(--cat-robotique)",
  },
  {
    emoji: "💡",
    title: "Atelier Électronique",
    date: "28 juin 2026",
    place: "Porto-Novo",
    price: "5 000 F",
    color: "var(--cat-electronique)",
  },
  {
    emoji: "🧠",
    title: "Hackathon IA Junior",
    date: "12 juil. 2026",
    place: "En ligne",
    price: "Gratuit",
    color: "var(--cat-ia)",
  },
];

const PARENT_EVENT_REQUESTS = [
  { kid: "Léa", event: "Challenge Robot Sumo", status: "pending" },
  { kid: "Noé", event: "Atelier Électronique", status: "accepted" },
  { kid: "Léa", event: "Expo STEM Cotonou", status: "refused" },
];

const PARENT_ORDERS = [
  {
    ref: "#CM-2041",
    label: "Parcours · Robot Bluetooth",
    date: "12 mai 2026",
    amount: "25 000 F",
    status: "ok",
  },
  {
    ref: "#CM-2038",
    label: "Kit · Steamy Bot v1",
    date: "2 mai 2026",
    amount: "35 000 F",
    status: "ok",
  },
  {
    ref: "#CM-2035",
    label: "Parcours · Initiation IA",
    date: "28 avr. 2026",
    amount: "18 000 F",
    status: "pending",
  },
  {
    ref: "#CM-2030",
    label: "Kit · Pack capteurs",
    date: "20 avr. 2026",
    amount: "22 000 F",
    status: "ko",
  },
];

// ════════════════════════════════════════════════════════
// HELPERS LOCAUX
// ════════════════════════════════════════════════════════
function WPDKidCard({ k }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid var(--ink-100)",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar emoji={k.emoji} size={48} color={k.color} ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{k.name}</div>
          <div
            style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}
          >
            {k.meta}
          </div>
        </div>
        <Button variant="outline" size="sm">
          Voir
        </Button>
      </div>
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ink-500)",
            marginBottom: 6,
          }}
        >
          En cours · {k.course}
        </div>
        <ProgressBar value={k.progress} />
      </div>
    </div>
  );
}

function WPDKidRow({ k }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 18,
        background: "#fff",
        border: "1.5px solid var(--ink-100)",
        borderRadius: 18,
      }}
    >
      <Avatar
        emoji={k.emoji}
        size={56}
        color={k.color}
        ring={k.status === "active"}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 900 }}>{k.name}</span>
          {k.status === "pending" && <Badge tone="amber">En attente</Badge>}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ink-500)",
            marginTop: 2,
          }}
        >
          {k.meta}
        </div>
        {k.course && (
          <div style={{ marginTop: 8, maxWidth: 360 }}>
            <ProgressBar value={k.progress} label={`En cours · ${k.course}`} />
          </div>
        )}
      </div>
      {k.status === "active" ? (
        <>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{k.badges}</div>
            <div
              style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-500)" }}
            >
              badges
            </div>
          </div>
          <Button variant="outline">Voir le profil</Button>
        </>
      ) : (
        <Button variant="ghost">Relancer l'invitation</Button>
      )}
    </div>
  );
}

function WPDEventCard({ e }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid var(--ink-100)",
        borderRadius: 18,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 96,
          background: e.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
        }}
      >
        {e.emoji}
      </div>
      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 900 }}>{e.title}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
          📅 {e.date} · 📍 {e.place}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 6,
          }}
        >
          <Badge tone={e.price === "Gratuit" ? "success" : "primary"}>
            {e.price}
          </Badge>
          <Button size="sm">Inscrire un enfant</Button>
        </div>
      </div>
    </div>
  );
}

function WPDReqStatus({ status }) {
  const map = {
    pending: { tone: "amber", label: "En attente" },
    accepted: { tone: "success", label: "Acceptée" },
    refused: { tone: "error", label: "Refusée" },
  };
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function WPDOrderRow({ o }) {
  const tones = { ok: "success", pending: "amber", ko: "error" };
  const labels = { ok: "Réussi", pending: "En attente", ko: "Échoué" };
  return (
    <div className="qa-row">
      <div className="qa-row__emoji">
        {o.label.startsWith("Kit") ? "📦" : "🚀"}
      </div>
      <div className="qa-row__body">
        <div className="qa-row__title">{o.label}</div>
        <div className="qa-row__course">
          {o.ref} · {o.date}
        </div>
      </div>
      <Badge tone={tones[o.status]}>{labels[o.status]}</Badge>
      <div className="qa-row__score">{o.amount}</div>
      {o.status === "ok" ? (
        <Button variant="outline" size="sm">
          Facture
        </Button>
      ) : (
        <div style={{ width: 92 }} />
      )}
    </div>
  );
}

function WPDSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 900,
          color: "var(--ink-700)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function WPDInfoCard({ title, rows, action }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--ink-100)",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>
        <button className="section-head__action">{action || "Modifier"}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(([k, v], i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              fontSize: 14,
            }}
          >
            <span style={{ fontWeight: 700, color: "var(--ink-500)" }}>
              {k}
            </span>
            <span
              style={{
                fontWeight: 800,
                color: "var(--ink-900)",
                textAlign: "right",
              }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WPD01 · ACCUEIL PARENT
// ════════════════════════════════════════════════════════
function WPD01_Home() {
  return (
    <WebParentShell active="home" headerTitle="Bonjour Marie 👋" notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero */}
        <div className="dash-hero">
          <span className="dash-hero__deco-1" />
          <span className="dash-hero__deco-2" />
          <div className="dash-hero__body">
            <span className="dash-hero__kicker">Espace parent</span>
            <h2 className="dash-hero__title">
              2 enfants accompagnés sur Steamy
            </h2>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                opacity: 0.9,
                margin: "6px 0 0",
                maxWidth: 420,
                lineHeight: 1.5,
              }}
            >
              Suivez leur progression, validez les demandes et gérez les
              paiements en toute sécurité.
            </p>
            <div style={{ marginTop: 12 }}>
              <Button
                variant="amber"
                icon={
                  <Icon name="plus" size={18} color="#fff" strokeWidth={3} />
                }
              >
                Ajouter un enfant
              </Button>
            </div>
          </div>
          <div className="dash-hero__mascot">
            <Mascot pose="wave" size={160} hue="#fff" />
          </div>
        </div>

        {/* Demande à valider */}
        <div>
          <SectionHeader title="À valider" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 18,
              borderRadius: 18,
              background: "var(--amber-50)",
              border: "2px solid var(--amber-300)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--amber-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              🔔
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>
                Demande de consentement - Léa (13 ans)
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                }}
              >
                Léa souhaite s'inscrire et a besoin de votre accord.
              </div>
            </div>
            <Button variant="secondary">Examiner</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-strip">
          <StatPill icon="user" label="Enfants" value="2" tone="violet" />
          <StatPill
            icon="rocket"
            label="Parcours en cours"
            value="3"
            tone="success"
          />
          <StatPill icon="bell" label="À valider" value="1" tone="amber" />
        </div>

        {/* Enfants */}
        <div>
          <SectionHeader title="Mes enfants" action="Voir tout" />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <WPDKidCard k={PARENT_KIDS[0]} />
            <WPDKidCard k={PARENT_KIDS[1]} />
          </div>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD02 · MES ENFANTS (liste)
// ════════════════════════════════════════════════════════
function WPD02_Kids() {
  return (
    <WebParentShell
      active="kids"
      headerTitle="Mes enfants"
      notifDot
      headerActions={
        <Button
          icon={<Icon name="plus" size={18} color="#fff" strokeWidth={3} />}
        >
          Ajouter un enfant
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PARENT_KIDS.map((k, i) => (
          <WPDKidRow key={i} k={k} />
        ))}
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD03 · DÉTAIL ENFANT (profil + progression)
// ════════════════════════════════════════════════════════
function WPD03_KidDetail() {
  const parcours = [
    {
      emoji: "🤖",
      title: "Construis ton robot Bluetooth",
      progress: 62,
      color: "var(--cat-robotique)",
    },
    {
      emoji: "💻",
      title: "Initiation à Scratch",
      progress: 100,
      color: "var(--cat-code)",
    },
    {
      emoji: "⚡",
      title: "Capteurs électroniques",
      progress: 18,
      color: "var(--cat-electronique)",
    },
  ];
  return (
    <WebParentShell active="kids" headerTitle="Profil de Léa">
      <div className="crumb">
        Mes enfants › <b>Léa Adjovi</b>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* Gauche */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <SectionHeader title="Progression des parcours" />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {parcours.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 14,
                    background: "#fff",
                    border: "1.5px solid var(--ink-100)",
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: p.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    {p.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}
                    >
                      {p.title}
                    </div>
                    <ProgressBar
                      value={p.progress}
                      tone={p.progress === 100 ? "success" : undefined}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color:
                        p.progress === 100
                          ? "var(--success-600)"
                          : "var(--primary-600)",
                      minWidth: 44,
                      textAlign: "right",
                    }}
                  >
                    {p.progress}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="Dernières tentatives de quiz" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <QuizAttemptRow
                emoji="💻"
                title="Quiz · Variables Scratch"
                course="Initiation à Scratch · Niveau 1"
                score={9}
                total={10}
                date="il y a 2 h"
                status="ok"
              />
              <QuizAttemptRow
                emoji="⚡"
                title="Quiz · Loi d'Ohm"
                course="Capteurs élec. · Niveau 2"
                score={6}
                total={10}
                date="hier"
                status="warn"
              />
              <QuizAttemptRow
                emoji="🤖"
                title="Quiz · Premiers capteurs"
                course="Robot Bluetooth · Niveau 1"
                score={10}
                total={10}
                date="il y a 3 j"
                status="ok"
              />
            </div>
          </div>
        </div>

        {/* Droite */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="side-card">
            <Avatar emoji="🦉" size={88} color="var(--primary-500)" ring />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              Léa Adjovi
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-600)",
              }}
            >
              13 ans · 4ème · Cotonou
            </p>
            <div className="side-card__stats">
              <div>
                <div className="side-card__stat-label">Badges</div>
                <div className="side-card__stat-value">5</div>
              </div>
              <div>
                <div className="side-card__stat-label">Points</div>
                <div className="side-card__stat-value">1 240</div>
              </div>
              <div>
                <div className="side-card__stat-label">Streak</div>
                <div className="side-card__stat-value">5 j</div>
              </div>
            </div>
            <div className="side-card__actions">
              <Button block variant="outline">
                Modifier le profil
              </Button>
              <Button block variant="ghost">
                Rapport hebdomadaire
              </Button>
            </div>
          </div>
          <div
            className="side-card"
            style={{ alignItems: "flex-start", textAlign: "left" }}
          >
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>
              Informations
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: "100%",
                fontSize: 13,
              }}
            >
              {[
                ["Identifiant", "lea.adjovi"],
                ["Lien", "Votre fille"],
                ["Inscrite le", "14 mars 2026"],
                ["Handicap", "Aucun"],
              ].map(([k, v], i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--ink-500)" }}>
                    {k}
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: "var(--ink-900)",
                      textAlign: "right",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD04 · AJOUTER UN ENFANT
// ════════════════════════════════════════════════════════
function WPD04_AddKid() {
  return (
    <WebParentShell active="kids" headerTitle="Ajouter un enfant">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Mes enfants › <b>Ajouter un enfant</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--primary-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ➕
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                Créer le compte de votre enfant
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                  lineHeight: 1.45,
                }}
              >
                Vous définissez son accès. Communiquez-lui ensuite son
                identifiant et son mot de passe.
              </p>
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Prénom" required>
              <Input value="" placeholder="Inès" />
            </Field>
            <Field label="Nom" required>
              <Input value="" placeholder="Adjovi" />
            </Field>
          </div>
          <Field
            label="Identifiant"
            required
            hint="Servira à sa connexion (ex. prénom.nom)."
          >
            <Input value="" placeholder="ines.adjovi" />
          </Field>
          <Field
            label="Mot de passe initial"
            required
            hint="Vous pourrez le réinitialiser depuis son profil."
          >
            <PasswordInput value="" />
          </Field>
          <div
            style={{
              background: "var(--primary-50)",
              border: "2px solid var(--primary-100)",
              borderRadius: 14,
              padding: 14,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 20 }}>🔑</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink-700)",
                lineHeight: 1.5,
              }}
            >
              Notez bien ces identifiants : votre enfant en aura besoin pour se
              connecter. Vous gardez le contrôle de son compte et de ses achats.
            </span>
          </div>
          <Button block size="lg">
            Créer le compte
          </Button>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD05 · DEMANDE DE CONSENTEMENT (voir infos + confirmer/refuser)
// ════════════════════════════════════════════════════════
function WPD05_Consent() {
  return (
    <WebParentShell active="home" headerTitle="Demande de consentement">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="crumb">
          Accueil › <b>Demande de consentement</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 18,
              borderRadius: 18,
              background: "var(--bg)",
              border: "2px solid var(--ink-100)",
            }}
          >
            <Avatar emoji="🦉" size={56} color="var(--primary-500)" ring />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Léa Adjovi</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                }}
              >
                lea.adjovi · 13 ans
              </div>
            </div>
            <Badge tone="amber">En attente</Badge>
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "var(--ink-700)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 10,
              }}
            >
              Informations renseignées
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Lien de parenté", "Vous êtes sa mère"],
                ["Niveau / classe", "4ème"],
                ["Localité", "Cotonou · Cocotomey"],
                ["Centres d'intérêt", "Robots, code, électronique"],
              ].map(([k, v], i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "10px 14px",
                    background: "#fff",
                    border: "1px solid var(--ink-100)",
                    borderRadius: 12,
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--ink-500)" }}>
                    {k}
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: "var(--ink-900)",
                      textAlign: "right",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              background: "var(--primary-50)",
              border: "2px solid var(--primary-100)",
              borderRadius: 14,
              padding: 14,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 20 }}>🔒</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink-700)",
                lineHeight: 1.5,
              }}
            >
              En acceptant, vous confirmez être le responsable légal de Léa. Les
              données ne servent qu'au suivi pédagogique.
            </span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="secondary" block>
              Accepter la demande
            </Button>
            <Button variant="outline" block>
              Refuser
            </Button>
          </div>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD09 · SUPPRIMER UN ENFANT (motifs + confirmation)
// ════════════════════════════════════════════════════════
const WPD_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 16px var(--font-sans)",
  color: "var(--ink-900)",
};
function WPD09_DeleteKid() {
  return (
    <WebParentShell active="kids" headerTitle="Supprimer un enfant">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Mes enfants › Léa Adjovi › <b>Supprimer</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--error-300)",
            borderRadius: 22,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--error-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ⚠️
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                Supprimer le compte de Léa ?
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                  lineHeight: 1.45,
                }}
              >
                Sa progression, ses badges et ses commandes seront
                définitivement supprimés. Action irréversible.
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 14,
              background: "var(--bg)",
              border: "1px solid var(--ink-100)",
              borderRadius: 14,
            }}
          >
            <Avatar emoji="🦉" size={44} color="var(--primary-500)" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>Léa Adjovi</div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                }}
              >
                13 ans · 4ème
              </div>
            </div>
          </div>
          <Field label="Motif de la suppression" required>
            <div className="input">
              <select style={WPD_SELECT}>
                <option>L'enfant n'utilise plus la plateforme</option>
                <option>Compte créé par erreur</option>
                <option>Compte en doublon</option>
                <option>Autre raison</option>
              </select>
            </div>
          </Field>
          <Field label="Précisions (optionnel)">
            <textarea
              rows={2}
              placeholder="Ajoute un mot si besoin…"
              style={{
                width: "100%",
                border: "2px solid var(--ink-200)",
                borderRadius: 14,
                padding: "12px 16px",
                font: "600 15px var(--font-sans)",
                color: "var(--ink-900)",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="outline" block>
              Annuler
            </Button>
            <Button variant="danger" block>
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD06 · STEAMY EVENTS (parent)
// ════════════════════════════════════════════════════════
function WPD06_Events() {
  return (
    <WebParentShell active="events" headerTitle="Steamy Events" notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <SectionHeader title="Événements à venir" action="Tout voir" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {PARENT_EVENTS.map((e, i) => (
              <WPDEventCard key={i} e={e} />
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title="Demandes de participation de mes enfants" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PARENT_EVENT_REQUESTS.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 18px",
                  background: "#fff",
                  border: "1px solid var(--ink-100)",
                  borderRadius: 14,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "var(--primary-100)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  🎟️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{r.event}</div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                    }}
                  >
                    Pour {r.kid}
                  </div>
                </div>
                <WPDReqStatus status={r.status} />
                <Icon name="chevron-right" size={18} color="var(--ink-400)" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD07 · HISTORIQUE DE COMMANDE
// ════════════════════════════════════════════════════════
function WPD07_Orders() {
  const [filter, setFilter] = React.useState("all");
  const visible = PARENT_ORDERS.filter(
    (o) => filter === "all" || filter === o.status,
  );
  return (
    <WebParentShell active="orders" headerTitle="Historique de commande">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="filter-strip">
          <Tag active={filter === "all"} onClick={() => setFilter("all")}>
            Toutes
          </Tag>
          <Tag
            active={filter === "ok"}
            onClick={() => setFilter("ok")}
            color="var(--success-500)"
          >
            Réussies
          </Tag>
          <Tag
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
            color="var(--amber-500)"
          >
            En attente
          </Tag>
          <Tag
            active={filter === "ko"}
            onClick={() => setFilter("ko")}
            color="var(--error-500)"
          >
            Échouées
          </Tag>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((o, i) => (
            <WPDOrderRow key={i} o={o} />
          ))}
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD08 · PARAMÈTRES PARENT (hub)
// ════════════════════════════════════════════════════════
function WPD08_Settings() {
  const [s, setS] = React.useState({
    consent: true,
    payment: true,
    progress: true,
    events: false,
  });
  const set = (k) => (v) => setS((prev) => ({ ...prev, [k]: v }));
  return (
    <WebParentShell active="settings" headerTitle="Paramètres">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <WPDSection title="Profil parent">
          <WPDInfoCard
            title="Mes informations"
            rows={[
              ["Nom", "Marie Adjovi"],
              ["Téléphone", "+229 01 90 88 77 66"],
              ["Email", "marie.adjovi@exemple.bj"],
              ["Profession", "Infirmière"],
            ]}
          />
          <WPDInfoCard
            title="Connexion"
            action="Changer"
            rows={[
              ["Numéro de téléphone", "+229 01 90 88 77 66"],
              ["Mot de passe", "••••••••"],
            ]}
          />
        </WPDSection>

        <WPDSection title="Livraison & paiement">
          <WPDInfoCard
            title="Adresse de livraison"
            rows={[
              ["Pays", "Bénin"],
              ["Ville", "Cotonou"],
              ["Quartier", "Cocotomey"],
              ["Rue", "Rue 12.45"],
            ]}
          />
          <WPDInfoCard
            title="Mobile Money"
            rows={[
              ["Pays", "Bénin"],
              ["Réseau", "MTN"],
              ["Numéro", "+229 01 90 88 77 66"],
            ]}
          />
        </WPDSection>

        <WPDSection title="Notifications">
          <SettingsRow
            label="Demandes de consentement"
            description="Quand un enfant a besoin de votre accord."
            checked={s.consent}
            onChange={set("consent")}
          />
          <SettingsRow
            label="Paiements à valider"
            description="Liens de paiement et confirmations."
            checked={s.payment}
            onChange={set("payment")}
          />
          <SettingsRow
            label="Progression des enfants"
            description="Badges, niveaux et certifications."
            checked={s.progress}
            onChange={set("progress")}
          />
          <SettingsRow
            label="Annonces Steamy Events"
            description="Nouveaux challenges et ateliers."
            checked={s.events}
            onChange={set("events")}
          />
        </WPDSection>

        <WPDSection title="Légal">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Conditions générales d'utilisation",
              "Mentions légales",
              "Politique de confidentialité",
            ].map((t, i) => (
              <button
                key={i}
                className="settings-row"
                style={{ cursor: "pointer", textAlign: "left" }}
              >
                <span className="settings-row__label">{t}</span>
                <Icon name="chevron-right" size={18} color="var(--ink-400)" />
              </button>
            ))}
          </div>
        </WPDSection>

        <WPDSection title="Zone sensible">
          <div
            className="settings-row"
            style={{ borderColor: "var(--error-300)" }}
          >
            <div style={{ flex: 1 }}>
              <div
                className="settings-row__label"
                style={{ color: "var(--error-600)" }}
              >
                Supprimer mon compte
              </div>
              <div className="settings-row__desc">
                Une demande sera envoyée à l'administrateur. Action
                irréversible.
              </div>
            </div>
            <Button variant="danger" size="sm">
              Supprimer
            </Button>
          </div>
        </WPDSection>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD10 · MODIFIER LE PROFIL D'UN ENFANT
// ════════════════════════════════════════════════════════
function WPD10_EditKid() {
  return (
    <WebParentShell active="kids" headerTitle="Modifier le profil de Léa">
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="crumb">
          Mes enfants › Léa Adjovi › <b>Modifier</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 18,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Prénom" required>
              <Input value="Léa" />
            </Field>
            <Field label="Nom" required>
              <Input value="Adjovi" />
            </Field>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Date de naissance">
              <Input value="14 / 03 / 2012" />
            </Field>
            <Field label="Niveau / classe">
              <div className="input">
                <select style={WPD_SELECT}>
                  <option>4ème</option>
                  <option>3ème</option>
                  <option>5ème</option>
                </select>
              </div>
            </Field>
          </div>
          <Field label="Localité">
            <Input value="Cotonou · Cocotomey" />
          </Field>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink-700)",
                marginBottom: 8,
              }}
            >
              Genre
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <ChoiceCard emoji="👧" label="Fille" selected />
              <ChoiceCard emoji="👦" label="Garçon" />
              <ChoiceCard emoji="🌟" label="Autre" />
            </div>
          </div>
          <Field
            label="Situation de handicap"
            hint="On adapte les parcours si besoin."
          >
            <div className="input">
              <select style={WPD_SELECT}>
                <option>Aucune</option>
                <option>Visuel</option>
                <option>Auditif</option>
                <option>Moteur</option>
              </select>
            </div>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button variant="outline">Annuler</Button>
          <Button>Enregistrer</Button>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD11 · RAPPORT HEBDOMADAIRE
// ════════════════════════════════════════════════════════
function WPD11_WeeklyReport() {
  const week = [
    ["L", 40],
    ["M", 65],
    ["M", 25],
    ["J", 80],
    ["V", 50],
    ["S", 95],
    ["D", 30],
  ];
  return (
    <WebParentShell active="kids" headerTitle="Rapport hebdomadaire">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="crumb">
          Mes enfants › Léa Adjovi › <b>Rapport hebdo</b>
        </div>
        <div className="stat-strip">
          <StatPill
            icon="flame"
            label="Temps cette semaine"
            value="3 h 20"
            tone="amber"
          />
          <StatPill
            icon="rocket"
            label="Missions terminées"
            value="7"
            tone="success"
          />
          <StatPill
            icon="star"
            label="Quiz réussis"
            value="5 / 6"
            tone="violet"
          />
        </div>
        <div
          style={{
            background: "#fff",
            border: "1.5px solid var(--ink-100)",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <SectionHeader title="Temps d'apprentissage par jour" />
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 14,
              height: 160,
              marginTop: 12,
            }}
          >
            {week.map(([d, h], i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 130,
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${h}%`,
                      background:
                        "linear-gradient(180deg, var(--cat-ia), #0E7C8B)",
                      borderRadius: 8,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "var(--ink-500)",
                  }}
                >
                  {d}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: "#fff",
            border: "1.5px solid var(--ink-100)",
            borderRadius: 18,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <SectionHeader title="Progression des parcours" />
          <ProgressBar value={62} label="Robot Bluetooth" />
          <ProgressBar value={100} label="Initiation Scratch" tone="success" />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button variant="outline">Recevoir par email</Button>
          <Button>Voir le profil complet</Button>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD12 · FAIRE PARTICIPER UN ENFANT (remplir la demande)
// ════════════════════════════════════════════════════════
function WPD12_EventApply() {
  return (
    <WebParentShell active="events" headerTitle="Faire participer un enfant">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Steamy Events › Challenge Robot Sumo › <b>Inscrire un enfant</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--cat-robotique)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              🤖
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                Challenge Robot Sumo
              </h2>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                }}
              >
                📅 14 juin 2026 · 📍 Cotonou ·{" "}
                <span style={{ color: "var(--success-600)" }}>Gratuit</span>
              </div>
            </div>
          </div>
          <Field label="Quel enfant inscrire ?" required>
            <div className="input">
              <select style={WPD_SELECT}>
                <option>Léa Adjovi · 13 ans</option>
                <option>Noé Adjovi · 10 ans</option>
              </select>
            </div>
          </Field>
          <Field label="Motivation (optionnel)">
            <textarea
              rows={3}
              placeholder="Pourquoi cet événement convient à votre enfant…"
              style={{
                width: "100%",
                border: "2px solid var(--ink-200)",
                borderRadius: 14,
                padding: "12px 16px",
                font: "600 15px var(--font-sans)",
                color: "var(--ink-900)",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </Field>
          <div
            style={{
              background: "var(--primary-50)",
              border: "2px solid var(--primary-100)",
              borderRadius: 14,
              padding: 14,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 20 }}>✅</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink-700)",
                lineHeight: 1.5,
              }}
            >
              En tant que parent, votre consentement est automatiquement validé
              pour cette participation.
            </span>
          </div>
          <Button block size="lg">
            Envoyer la demande
          </Button>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD13 · AIDE & SUPPORT (parent)
// ════════════════════════════════════════════════════════
function WPD13_Help() {
  const faqs = [
    [
      "Comment valider une demande de consentement ?",
      "Depuis l'accueil ou « Mes enfants » → la demande en attente → « Examiner » → Accepter ou Refuser.",
    ],
    [
      "Comment ajouter un autre enfant ?",
      "Dans « Mes enfants » → « Ajouter un enfant » : saisissez son numéro, il recevra un lien d'inscription.",
    ],
    [
      "Comment payer un parcours ou un kit ?",
      "Le paiement se fait en Mobile Money (MTN, Moov, Celtiis). Aucune carte bancaire n'est demandée.",
    ],
    [
      "Comment suivre la progression de mon enfant ?",
      "Ouvrez son profil depuis « Mes enfants » : progression, quiz et rapport hebdomadaire y sont affichés.",
    ],
  ];
  return (
    <WebParentShell active="settings" headerTitle="Aide & Support">
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div className="app-header__search" style={{ width: "100%" }}>
          <Icon name="search" size={16} color="var(--ink-500)" />
          <input placeholder="Rechercher une question…" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faqs.map(([q, a], i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: "1.5px solid var(--ink-100)",
                borderRadius: 16,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 800 }}>{q}</span>
                <Icon
                  name={i === 0 ? "chevron-down" : "chevron-right"}
                  size={18}
                  color="var(--ink-400)"
                />
              </div>
              {i === 0 && (
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink-600)",
                    lineHeight: 1.5,
                  }}
                >
                  {a}
                </p>
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "var(--primary-50)",
            border: "2px solid var(--primary-100)",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <Mascot pose="idle" size={80} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>
              Une question sur le compte de votre enfant ?
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-600)" }}
            >
              Notre équipe répond en français, du lundi au samedi.
            </div>
          </div>
          <Button>Contacter le support</Button>
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// WPD14 · NOTIFICATIONS (parent)
// ════════════════════════════════════════════════════════
function WPD14_Notifs() {
  const [tab, setTab] = React.useState("all");
  const notifs = [
    {
      tone: "primary",
      icon: "🔔",
      title: "Demande de consentement",
      msg: "Léa souhaite s'inscrire et a besoin de votre accord.",
      time: "il y a 1 h",
      unread: true,
    },
    {
      tone: "amber",
      icon: "💳",
      title: "Paiement à valider",
      msg: "Léa veut acheter « Robot Bluetooth » (25 000 F).",
      time: "il y a 2 h",
      unread: true,
    },
    {
      tone: "success",
      icon: "🏆",
      title: "Nouveau badge",
      msg: "Noé a débloqué le badge « Premiers circuits ».",
      time: "hier",
      unread: false,
    },
    {
      tone: "info",
      icon: "🔒",
      title: "Alerte sécurité",
      msg: "Nouvelle connexion au compte de Léa depuis Cotonou.",
      time: "il y a 2 j",
      unread: false,
    },
  ];
  const list = tab === "unread" ? notifs.filter((n) => n.unread) : notifs;
  const unread = notifs.filter((n) => n.unread).length;
  return (
    <WebParentShell active="settings" headerTitle="Notifications" notifDot>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div className="tabs-pill">
            <button
              className={["tabs-pill__btn", tab === "all" && "is-active"]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTab("all")}
            >
              Toutes
            </button>
            <button
              className={["tabs-pill__btn", tab === "unread" && "is-active"]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTab("unread")}
            >
              Non lues ({unread})
            </button>
          </div>
          <button className="section-head__action">
            Tout marquer comme lu
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((n, i) => (
            <NotifItem key={i} {...n} />
          ))}
        </div>
      </div>
    </WebParentShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
function ParentDashFlowWeb() {
  return (
    <DesignCanvas>
      {/* Écrans à concevoir (C18) : screens-*-a-concevoir-web.jsx */}
      {window.ParentACSections && window.ParentACSections()}
      <DCSection
        id="pdash-home"
        title="Accueil & enfants"
        subtitle="Dashboard parent · liste enfants · détail/progression d'un enfant."
      >
        <DCArtboard
          id="WPD01"
          label="WPD01 · Accueil parent"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD01_Home />
        </DCArtboard>
        <DCArtboard
          id="WPD02"
          label="WPD02 · Mes enfants"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD02_Kids />
        </DCArtboard>
        <DCArtboard
          id="WPD03"
          label="WPD03 · Détail enfant"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD03_KidDetail />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="pdash-manage"
        title="Gestion & consentement"
        subtitle="Ajouter un enfant · valider une demande de consentement."
      >
        <DCArtboard
          id="WPD04"
          label="WPD04 · Ajouter un enfant"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD04_AddKid />
        </DCArtboard>
        <DCArtboard
          id="WPD05"
          label="WPD05 · Demande consentement"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD05_Consent />
        </DCArtboard>
        <DCArtboard
          id="WPD09"
          label="WPD09 · Supprimer un enfant"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD09_DeleteKid />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="pdash-rest"
        title="Événements · commandes · paramètres"
        subtitle="Steamy Events parent · historique de commande · hub paramètres."
      >
        <DCArtboard
          id="WPD06"
          label="WPD06 · Steamy Events"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD06_Events />
        </DCArtboard>
        <DCArtboard
          id="WPD12"
          label="WPD12 · Faire participer un enfant"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD12_EventApply />
        </DCArtboard>
        <DCArtboard
          id="WPD07"
          label="WPD07 · Historique commande"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD07_Orders />
        </DCArtboard>
        <DCArtboard
          id="WPD08"
          label="WPD08 · Paramètres parent"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD08_Settings />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="pdash-kid-more"
        title="Enfant · édition & rapport"
        subtitle="Modifier le profil d'un enfant · rapport d'activité hebdomadaire."
      >
        <DCArtboard
          id="WPD10"
          label="WPD10 · Modifier profil enfant"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD10_EditKid />
        </DCArtboard>
        <DCArtboard
          id="WPD11"
          label="WPD11 · Rapport hebdomadaire"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD11_WeeklyReport />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="pdash-support"
        title="Aide & notifications parent"
        subtitle="FAQ + contact · notifications (consentement, paiement, progression, sécurité)."
      >
        <DCArtboard
          id="WPD13"
          label="WPD13 · Aide & Support"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD13_Help />
        </DCArtboard>
        <DCArtboard
          id="WPD14"
          label="WPD14 · Notifications"
          width={PARENT_DASH_W}
          height={PARENT_DASH_H}
          style={parentDashWebStyle}
        >
          <WPD14_Notifs />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.ParentDashFlowWeb = ParentDashFlowWeb;
window.WebParentShell = WebParentShell;
