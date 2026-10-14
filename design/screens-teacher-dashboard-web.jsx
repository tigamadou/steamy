// screens-teacher-dashboard-web.jsx - Dashboard ENSEIGNANT, version web (1240×760).
// Conforme à user flows/7_dashboard_enseignant.mmd. Happy path, 8 écrans WT01–WT08.
// Définit WebTeacherShell (sidebar enseignant, mêmes classes CSS que WebAppShell).
// Réutilise StatPill, SectionHeader, QuizAttemptRow, ProgressBar, SettingsRow,
// WPDSection, WPDInfoCard (globaux) + atoms/complex du DS. Expose window.TeacherDashFlowWeb.
// Reporté : Événements enseignant, Aide/FAQ, Notifications, déconnexion modal.

const TEACHER_DASH_W = 1240,
  TEACHER_DASH_H = 760;
const teacherDashWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};
const TEACHER_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 16px var(--font-sans)",
  color: "var(--ink-900)",
};
const TEACHER_TEXTAREA = {
  width: "100%",
  border: "2px solid var(--ink-200)",
  borderRadius: 14,
  padding: "12px 16px",
  font: "600 15px var(--font-sans)",
  color: "var(--ink-900)",
  resize: "vertical",
  outline: "none",
  boxSizing: "border-box",
};

const TEACHER_NAV = [
  { id: "home", icon: "home", label: "Accueil" },
  { id: "courses", icon: "book", label: "Mes parcours" },
  { id: "classes", icon: "user", label: "Mes classes" },
  { id: "evals", icon: "star", label: "Évaluations" },
  { id: "events", icon: "trophy", label: "Événements" },
  { id: "settings", icon: "gear", label: "Paramètres" },
];

const TEACHER_CLASSES = [
  {
    name: "3ème B · Robotique",
    count: 24,
    progress: 58,
    color: "var(--cat-robotique)",
  },
  {
    name: "4ème A · Initiation code",
    count: 18,
    progress: 42,
    color: "var(--cat-code)",
  },
  {
    name: "Club STEM · Samedi",
    count: 12,
    progress: 71,
    color: "var(--cat-ia)",
  },
];
const TEACHER_LEARNERS = [
  {
    name: "Léa Adjovi",
    emoji: "🦉",
    color: "var(--primary-500)",
    progress: 62,
    last: "Quiz Loi d'Ohm · 9/10",
    status: "ok",
  },
  {
    name: "Noé Sossou",
    emoji: "🦊",
    color: "var(--cat-mecanique)",
    progress: 38,
    last: "Mission 2 · en cours",
    status: "warn",
  },
  {
    name: "Inès Kossou",
    emoji: "🐯",
    color: "var(--amber-500)",
    progress: 84,
    last: "Niveau 3 validé",
    status: "ok",
  },
  {
    name: "Yann Dossa",
    emoji: "🐲",
    color: "var(--error-500)",
    progress: 15,
    last: "Quiz échoué · 4/10",
    status: "ko",
  },
];
const TEACHER_COURSES = [
  {
    title: "Construis ton robot Bluetooth",
    emoji: "🤖",
    color: "var(--cat-robotique)",
    classes: 2,
    learners: 42,
    progress: 55,
  },
  {
    title: "Initiation à Scratch",
    emoji: "💻",
    color: "var(--cat-code)",
    classes: 1,
    learners: 18,
    progress: 42,
  },
];
const TEACHER_EVALS = [
  {
    learner: "Léa Adjovi",
    type: "Formative",
    concept: "Niveau 2 · Moteurs",
    score: 83,
    status: "ok",
  },
  {
    learner: "Noé Sossou",
    type: "Formative",
    concept: "Niveau 2 · Moteurs",
    score: 50,
    status: "ko",
  },
  {
    learner: "Inès Kossou",
    type: "Sommative",
    concept: "Projet 1 · Le châssis",
    score: 88,
    status: "ok",
  },
  {
    learner: "Yann Dossa",
    type: "Formative",
    concept: "Niveau 1 · Les bases",
    score: 40,
    status: "ko",
  },
];

// ════════════════════════════════════════════════════════
// SHELL ENSEIGNANT
// ════════════════════════════════════════════════════════
function WebTeacherShell({
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
          {TEACHER_NAV.map((it) => (
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
          <Avatar name="Koffi" size={32} ring />
          <div className="app-sidebar__user-info">
            <div className="app-sidebar__user-name">M. Koffi A.</div>
            <div className="app-sidebar__user-class">
              Formateur · Robotique
            </div>
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
            <Avatar name="Koffi" size={36} ring />
          </div>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

// ─── Helpers locaux ───────────────────────────────────────
function WTClassCard({ c }) {
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
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: c.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🎒
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{c.name}</div>
          <div
            style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}
          >
            {c.count} apprenants
          </div>
        </div>
      </div>
      <ProgressBar value={c.progress} label="Progression moyenne" />
      <Button variant="outline" size="sm" block>
        Voir la classe
      </Button>
    </div>
  );
}

function WTLearnerRow({ l }) {
  const tones = { ok: "success", warn: "amber", ko: "error" };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 16,
        background: "#fff",
        border: "1.5px solid var(--ink-100)",
        borderRadius: 16,
      }}
    >
      <Avatar emoji={l.emoji} size={48} color={l.color} ring />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{l.name}</div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ink-500)",
            marginTop: 2,
          }}
        >
          Dernière activité : {l.last}
        </div>
        <div style={{ marginTop: 8, maxWidth: 320 }}>
          <ProgressBar value={l.progress} />
        </div>
      </div>
      <Badge tone={tones[l.status]}>{l.progress}%</Badge>
      <Button variant="outline" size="sm">
        Voir le profil
      </Button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WT01 · ACCUEIL ENSEIGNANT
// ════════════════════════════════════════════════════════
function WT01_Home() {
  return (
    <WebTeacherShell active="home" headerTitle="Bonjour M. Koffi 👋" notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="dash-hero">
          <span className="dash-hero__deco-1" />
          <span className="dash-hero__deco-2" />
          <div className="dash-hero__body">
            <span className="dash-hero__kicker">Espace formateur</span>
            <h2 className="dash-hero__title">
              3 classes · 54 apprenants encadrés
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
              Suis la progression de tes classes, corrige les évaluations et
              accompagne chaque apprenant.
            </p>
            <div style={{ marginTop: 12 }}>
              <Button
                variant="amber"
                icon={
                  <Icon name="plus" size={18} color="#fff" strokeWidth={3} />
                }
              >
                Ajouter des apprenants
              </Button>
            </div>
          </div>
          <div className="dash-hero__mascot">
            <Mascot pose="focus" size={160} hue="#fff" />
          </div>
        </div>

        <div className="stat-strip">
          <StatPill icon="user" label="Apprenants" value="54" tone="violet" />
          <StatPill icon="book" label="Classes" value="3" tone="success" />
          <StatPill icon="star" label="À corriger" value="6" tone="amber" />
        </div>

        <div>
          <SectionHeader title="Mes classes" action="Voir tout" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {TEACHER_CLASSES.map((c, i) => (
              <WTClassCard key={i} c={c} />
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title="À corriger" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TEACHER_EVALS.filter((e) => e.status === "ko").map((e, i) => (
              <div key={i} className="qa-row">
                <div className="qa-row__emoji">📝</div>
                <div className="qa-row__body">
                  <div className="qa-row__title">
                    {e.learner} · {e.concept}
                  </div>
                  <div className="qa-row__course">{e.type}</div>
                </div>
                <Badge tone="error">{e.score}%</Badge>
                <Button variant="outline" size="sm">
                  Commenter
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT02 · MES PARCOURS ENCADRÉS
// ════════════════════════════════════════════════════════
function WT02_Courses() {
  return (
    <WebTeacherShell active="courses" headerTitle="Mes parcours encadrés">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TEACHER_COURSES.map((c, i) => (
          <div
            key={i}
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
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: c.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              {c.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>{c.title}</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                  marginTop: 2,
                }}
              >
                {c.classes} classes · {c.learners} apprenants
              </div>
              <div style={{ marginTop: 8, maxWidth: 360 }}>
                <ProgressBar value={c.progress} label="Progression globale" />
              </div>
            </div>
            <Button variant="outline">Voir le contenu</Button>
          </div>
        ))}
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT03 · MES CLASSES
// ════════════════════════════════════════════════════════
function WT03_Classes() {
  return (
    <WebTeacherShell
      active="classes"
      headerTitle="Mes classes"
      headerActions={
        <Button
          icon={<Icon name="plus" size={18} color="#fff" strokeWidth={3} />}
        >
          Créer une classe
        </Button>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {TEACHER_CLASSES.map((c, i) => (
          <WTClassCard key={i} c={c} />
        ))}
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT04 · APPRENANTS D'UNE CLASSE
// ════════════════════════════════════════════════════════
function WT04_ClassLearners() {
  return (
    <WebTeacherShell
      active="classes"
      headerTitle="3ème B · Robotique"
      headerActions={
        <Button
          icon={<Icon name="plus" size={18} color="#fff" strokeWidth={3} />}
        >
          Ajouter des apprenants
        </Button>
      }
    >
      <div className="crumb">
        Mes classes › <b>3ème B · Robotique</b> · 24 apprenants
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {TEACHER_LEARNERS.map((l, i) => (
          <WTLearnerRow key={i} l={l} />
        ))}
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT05 · PROFIL & PROGRESSION D'UN APPRENANT (+ commentaires)
// ════════════════════════════════════════════════════════
function WT05_LearnerDetail() {
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
  ];
  return (
    <WebTeacherShell active="classes" headerTitle="Profil de Léa">
      <div className="crumb">
        Mes classes › 3ème B › <b>Léa Adjovi</b>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
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
                emoji="⚡"
                title="Quiz · Loi d'Ohm"
                course="Capteurs élec. · Niveau 2"
                score={9}
                total={10}
                date="il y a 2 h"
                status="ok"
              />
              <QuizAttemptRow
                emoji="🤖"
                title="Quiz · Branchement moteurs"
                course="Robot Bluetooth · Niveau 2"
                score={5}
                total={10}
                date="hier"
                status="ko"
              />
              <QuizAttemptRow
                emoji="💻"
                title="Quiz · Variables Scratch"
                course="Initiation Scratch · Niveau 1"
                score={10}
                total={10}
                date="il y a 3 j"
                status="ok"
              />
            </div>
          </div>
        </div>

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
              3ème B · 13 ans
            </p>
            <div className="side-card__stats">
              <div>
                <div className="side-card__stat-label">Badges</div>
                <div className="side-card__stat-value">5</div>
              </div>
              <div>
                <div className="side-card__stat-label">Moyenne</div>
                <div className="side-card__stat-value">78%</div>
              </div>
            </div>
          </div>
          <div
            className="side-card"
            style={{ alignItems: "stretch", textAlign: "left" }}
          >
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>
              Laisser un commentaire
            </h4>
            <textarea
              rows={3}
              placeholder="Encouragements, conseils, axes de progrès…"
              style={TEACHER_TEXTAREA}
            />
            <div className="side-card__actions">
              <Button block>Envoyer à l'apprenant</Button>
              <Button block variant="outline">
                Message au parent
              </Button>
            </div>
          </div>
        </div>
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT06 · AJOUTER DES APPRENANTS (individuel / import par lot)
// ════════════════════════════════════════════════════════
function WT06_AddLearners() {
  const [mode, setMode] = React.useState("individual");
  return (
    <WebTeacherShell active="classes" headerTitle="Ajouter des apprenants">
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div className="crumb">
          3ème B · Robotique › <b>Ajouter des apprenants</b>
        </div>
        <div className="tabs-pill" style={{ marginBottom: 20 }}>
          <button
            className={["tabs-pill__btn", mode === "individual" && "is-active"]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setMode("individual")}
          >
            Individuel
          </button>
          <button
            className={["tabs-pill__btn", mode === "batch" && "is-active"]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setMode("batch")}
          >
            Import par lot
          </button>
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
          {mode === "individual" ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field label="Prénom" required>
                  <Input value="" placeholder="Léa" />
                </Field>
                <Field label="Nom" required>
                  <Input value="" placeholder="Adjovi" />
                </Field>
              </div>
              <Field label="Numéro de téléphone" required>
                <PhoneInput value="" />
              </Field>
              <Field label="Classe" required>
                <div className="input">
                  <select style={TEACHER_SELECT}>
                    <option>3ème B · Robotique</option>
                    <option>4ème A · Initiation code</option>
                    <option>Club STEM · Samedi</option>
                  </select>
                </div>
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
                <span style={{ fontSize: 20 }}>📩</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink-700)",
                    lineHeight: 1.5,
                  }}
                >
                  Une notification et un lien de création de compte seront
                  envoyés à l'apprenant (et à son parent si &lt; 16 ans).
                </span>
              </div>
              <Button block size="lg">
                Envoyer l'invitation
              </Button>
            </>
          ) : (
            <>
              <div
                style={{
                  border: "2px dashed var(--ink-300)",
                  borderRadius: 16,
                  padding: "32px 20px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 40 }}>📄</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  Glisse un fichier CSV ou Excel
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink-500)",
                  }}
                >
                  Colonnes attendues : Nom, Prénom, Numéro
                </div>
                <Button variant="outline">Choisir un fichier</Button>
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "var(--ink-400)",
                }}
              >
                - ou colle la liste -
              </div>
              <textarea
                rows={4}
                placeholder={
                  "Léa Adjovi, +229 01 90 12 34 56\nNoé Sossou, +229 01 90 77 66 55"
                }
                style={TEACHER_TEXTAREA}
              />
              <Field label="Classe de destination" required>
                <div className="input">
                  <select style={TEACHER_SELECT}>
                    <option>3ème B · Robotique</option>
                    <option>4ème A · Initiation code</option>
                  </select>
                </div>
              </Field>
              <Button block size="lg">
                Importer & inviter
              </Button>
            </>
          )}
        </div>
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT07 · SUIVI DES ÉVALUATIONS
// ════════════════════════════════════════════════════════
function WT07_Evals() {
  const [filter, setFilter] = React.useState("all");
  const visible = TEACHER_EVALS.filter(
    (e) =>
      filter === "all" ||
      (filter === "formative" && e.type === "Formative") ||
      (filter === "summative" && e.type === "Sommative") ||
      (filter === "failed" && e.status === "ko"),
  );
  return (
    <WebTeacherShell active="evals" headerTitle="Suivi des évaluations">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="filter-strip">
          <Tag active={filter === "all"} onClick={() => setFilter("all")}>
            Toutes
          </Tag>
          <Tag
            active={filter === "formative"}
            onClick={() => setFilter("formative")}
            color="var(--primary-500)"
          >
            Formatives
          </Tag>
          <Tag
            active={filter === "summative"}
            onClick={() => setFilter("summative")}
            color="var(--cat-ia)"
          >
            Sommatives
          </Tag>
          <Tag
            active={filter === "failed"}
            onClick={() => setFilter("failed")}
            color="var(--error-500)"
          >
            À revoir
          </Tag>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((e, i) => (
            <div key={i} className="qa-row">
              <div className="qa-row__emoji">
                {e.type === "Sommative" ? "🏆" : "📝"}
              </div>
              <div className="qa-row__body">
                <div className="qa-row__title">{e.learner}</div>
                <div className="qa-row__course">
                  {e.type} · {e.concept}
                </div>
              </div>
              <Badge tone={e.status === "ok" ? "success" : "error"}>
                {e.status === "ok" ? "Validé" : "Concept à revoir"}
              </Badge>
              <div className="qa-row__score">{e.score}%</div>
              <Button variant="outline" size="sm">
                Commentaire
              </Button>
            </div>
          ))}
        </div>
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT08 · PARAMÈTRES ENSEIGNANT (hub)
// ════════════════════════════════════════════════════════
function WT08_Settings() {
  const [s, setS] = React.useState({
    progress: true,
    submissions: true,
    events: false,
  });
  const set = (k) => (v) => setS((prev) => ({ ...prev, [k]: v }));
  const MenuRow = ({ label }) => (
    <button
      className="settings-row"
      style={{ cursor: "pointer", textAlign: "left" }}
    >
      <span className="settings-row__label">{label}</span>
      <Icon name="chevron-right" size={18} color="var(--ink-400)" />
    </button>
  );
  return (
    <WebTeacherShell active="settings" headerTitle="Paramètres">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <WPDSection title="Profil formateur">
          <WPDInfoCard
            title="Mes informations"
            rows={[
              ["Nom", "M. Koffi Adékambi"],
              ["Email", "k.adekambi@exemple.bj"],
              ["Spécialité / matière", "Robotique & électronique"],
              ["Téléphone", "+229 01 90 55 44 33"],
            ]}
          />
          <WPDInfoCard
            title="Bio"
            action="Modifier"
            rows={[
              [
                "Présentation",
                "Ingénieur passionné - j'enseigne la robotique depuis 6 ans.",
              ],
            ]}
          />
          <WPDInfoCard
            title="Connexion"
            action="Changer"
            rows={[
              ["Téléphone", "+229 01 90 55 44 33"],
              ["Mot de passe", "••••••••"],
            ]}
          />
        </WPDSection>
        <WPDSection title="Notifications">
          <SettingsRow
            label="Progression des apprenants"
            description="Badges, niveaux et alertes de décrochage."
            checked={s.progress}
            onChange={set("progress")}
          />
          <SettingsRow
            label="Nouvelles évaluations à corriger"
            description="Quand un apprenant soumet une évaluation."
            checked={s.submissions}
            onChange={set("submissions")}
          />
          <SettingsRow
            label="Annonces Steamy Events"
            description="Nouveaux challenges et ateliers."
            checked={s.events}
            onChange={set("events")}
          />
        </WPDSection>
        <WPDSection title="Légal">
          <MenuRow label="Conditions générales d'utilisation" />
          <MenuRow label="Mentions légales" />
          <MenuRow label="Politique de confidentialité" />
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
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT09 · STEAMY EVENTS (enseignant)
// ════════════════════════════════════════════════════════
function WT09_Events() {
  const reqs = [
    {
      learner: "Léa Adjovi",
      cls: "3ème B",
      event: "Challenge Robot Sumo",
      status: "pending",
    },
    {
      learner: "Inès Kossou",
      cls: "3ème B",
      event: "Hackathon IA Junior",
      status: "accepted",
    },
    {
      learner: "Noé Sossou",
      cls: "4ème A",
      event: "Atelier Électronique",
      status: "pending",
    },
  ];
  const st = {
    pending: ["amber", "En attente"],
    accepted: ["success", "Acceptée"],
    refused: ["error", "Refusée"],
  };
  return (
    <WebTeacherShell active="events" headerTitle="Steamy Events" notifDot>
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
            {APPR_EVENTS.map((e, i) => (
              <div
                key={i}
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
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                    }}
                  >
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
                    <Button size="sm" variant="outline">
                      Proposer à une classe
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Demandes de participation de mes apprenants" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reqs.map((r, i) => (
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
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    {r.learner} ·{" "}
                    <span style={{ color: "var(--ink-500)", fontWeight: 700 }}>
                      {r.cls}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                    }}
                  >
                    {r.event}
                  </div>
                </div>
                <Badge tone={st[r.status][0]}>{st[r.status][1]}</Badge>
                <Icon name="chevron-right" size={18} color="var(--ink-400)" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT10 · DÉTAIL D'UN PARCOURS ENCADRÉ (contenu + progression)
// ════════════════════════════════════════════════════════
function WT10_CourseDetail() {
  return (
    <WebTeacherShell
      active="courses"
      headerTitle="Construis ton robot Bluetooth"
    >
      <div className="crumb">
        Mes parcours › <b>Construis ton robot Bluetooth</b>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background:
                "linear-gradient(135deg, var(--cat-robotique), #3D27B8)",
              color: "#fff",
              borderRadius: 22,
              padding: 24,
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: "rgba(255,255,255,.2)",
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              2 classes · 42 apprenants
            </span>
            <h1
              style={{ margin: "12px 0 12px", fontSize: 26, fontWeight: 900 }}
            >
              Construis ton robot Bluetooth
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                maxWidth: 420,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: "rgba(255,255,255,.25)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: "55%",
                    background: "var(--amber-400)",
                    borderRadius: 999,
                  }}
                />
              </div>
              <span style={{ fontSize: 13, fontWeight: 900 }}>55%</span>
            </div>
          </div>

          <div>
            <SectionHeader title="Contenu du parcours" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <MissionItem
                step="Projet 1 · Niveau 1"
                title="Monter le châssis"
                duration="42/42 apprenants"
                state="done"
                icon="🔧"
              />
              <MissionItem
                step="Projet 1 · Niveau 2"
                title="Brancher les moteurs"
                duration="28/42 apprenants"
                state="current"
                icon="⚙️"
              />
              <MissionItem
                step="Projet 1 · Niveau 3"
                title="Premiers déplacements"
                duration="9/42 apprenants"
                state="current"
                icon="🤖"
              />
              <MissionItem
                step="Projet 2 · Niveau 1"
                title="Capteurs & lumière"
                duration="à venir"
                state="locked"
                icon="💡"
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="side-card"
            style={{ alignItems: "stretch", textAlign: "left" }}
          >
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>
              Progression par classe
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  3ème B · Robotique
                </div>
                <ProgressBar value={58} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Club STEM · Samedi
                </div>
                <ProgressBar value={71} tone="success" />
              </div>
            </div>
          </div>
          <div
            className="side-card"
            style={{ alignItems: "stretch", textAlign: "left" }}
          >
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>
              Évaluations
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: "100%",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink-700)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Formatives réussies</span>
                <span style={{ color: "var(--success-600)" }}>74%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Sommatives réussies</span>
                <span style={{ color: "var(--success-600)" }}>61%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Concepts à revoir</span>
                <span style={{ color: "var(--error-600)" }}>
                  Moteurs · Polarité
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT11 · AIDE & SUPPORT (enseignant)
// ════════════════════════════════════════════════════════
function WT11_Help() {
  const faqs = [
    [
      "Comment créer une classe ?",
      "Va dans « Mes classes » puis « Créer une classe ». Tu peux ensuite y ajouter des apprenants.",
    ],
    [
      "Comment importer plusieurs apprenants ?",
      "Dans « Ajouter des apprenants » → onglet « Import par lot » : dépose un fichier CSV (Nom, Prénom, Numéro) ou colle la liste.",
    ],
    [
      "Comment corriger une évaluation ?",
      "Dans « Évaluations », ouvre une soumission « à revoir » et laisse un commentaire de suivi à l'apprenant.",
    ],
    [
      "Comment contacter le parent d'un apprenant ?",
      "Depuis le profil de l'apprenant, clique « Message au parent ».",
    ],
  ];
  return (
    <WebTeacherShell active="settings" headerTitle="Aide & Support">
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
              Besoin d'un coup de main ?
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-600)" }}
            >
              Notre équipe pédagogique répond du lundi au samedi.
            </div>
          </div>
          <Button>Contacter le support</Button>
        </div>
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// WT12 · NOTIFICATIONS (enseignant)
// ════════════════════════════════════════════════════════
function WT12_Notifs() {
  const [tab, setTab] = React.useState("all");
  const notifs = [
    {
      tone: "amber",
      icon: "📝",
      title: "Évaluation à corriger",
      msg: "Yann Dossa a soumis le quiz Niveau 1 (4/10).",
      time: "il y a 1 h",
      unread: true,
    },
    {
      tone: "error",
      icon: "⚠️",
      title: "Risque de décrochage",
      msg: "Noé Sossou n'a pas progressé depuis 7 jours.",
      time: "il y a 3 h",
      unread: true,
    },
    {
      tone: "success",
      icon: "🎓",
      title: "Nouvel apprenant",
      msg: "Inès Kossou a rejoint la classe 3ème B.",
      time: "hier",
      unread: false,
    },
    {
      tone: "info",
      icon: "🏆",
      title: "Steamy Events",
      msg: "Léa Adjovi a postulé au Challenge Robot Sumo.",
      time: "hier",
      unread: false,
    },
  ];
  const list = tab === "unread" ? notifs.filter((n) => n.unread) : notifs;
  const unread = notifs.filter((n) => n.unread).length;
  return (
    <WebTeacherShell active="settings" headerTitle="Notifications" notifDot>
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
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
function TeacherDashFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="tdash-home"
        title="Accueil & parcours"
        subtitle="Dashboard formateur · parcours encadrés (progression globale)."
      >
        <DCArtboard
          id="WT01"
          label="WT01 · Accueil formateur"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT01_Home />
        </DCArtboard>
        <DCArtboard
          id="WT02"
          label="WT02 · Mes parcours"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT02_Courses />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="tdash-classes"
        title="Classes & apprenants"
        subtitle="Liste classes · apprenants d'une classe · profil apprenant (commentaires) · ajout individuel/par lot."
      >
        <DCArtboard
          id="WT03"
          label="WT03 · Mes classes"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT03_Classes />
        </DCArtboard>
        <DCArtboard
          id="WT04"
          label="WT04 · Apprenants d'une classe"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT04_ClassLearners />
        </DCArtboard>
        <DCArtboard
          id="WT05"
          label="WT05 · Profil apprenant"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT05_LearnerDetail />
        </DCArtboard>
        <DCArtboard
          id="WT06"
          label="WT06 · Ajouter des apprenants"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT06_AddLearners />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="tdash-rest"
        title="Évaluations & paramètres"
        subtitle="Suivi formatif/sommatif + concepts échoués · hub paramètres formateur."
      >
        <DCArtboard
          id="WT07"
          label="WT07 · Suivi évaluations"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT07_Evals />
        </DCArtboard>
        <DCArtboard
          id="WT08"
          label="WT08 · Paramètres"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT08_Settings />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="tdash-comm"
        title="Événements · contenu · aide · notifications"
        subtitle="Events formateur · détail parcours encadré · aide · notifications."
      >
        <DCArtboard
          id="WT09"
          label="WT09 · Steamy Events"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT09_Events />
        </DCArtboard>
        <DCArtboard
          id="WT10"
          label="WT10 · Détail parcours encadré"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT10_CourseDetail />
        </DCArtboard>
        <DCArtboard
          id="WT11"
          label="WT11 · Aide & Support"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT11_Help />
        </DCArtboard>
        <DCArtboard
          id="WT12"
          label="WT12 · Notifications"
          width={TEACHER_DASH_W}
          height={TEACHER_DASH_H}
          style={teacherDashWebStyle}
        >
          <WT12_Notifs />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.TeacherDashFlowWeb = TeacherDashFlowWeb;
window.WebTeacherShell = WebTeacherShell;
