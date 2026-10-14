// screens-admin-web.jsx - Espace ADMIN (back-office), version web (1240×760).
// IDs écrans : WAD01..WAD15. Shell dédié WebAdminShell. Expose window.AdminFlowWeb.
//
// Direction visuelle : SOBRE / MONOCHROME (tokens --ink-* uniquement).
// La couleur n'est autorisée que pour : badges de statut (success/amber/error/info),
// deltas de tendance, accents de graphes. La famille --primary-* (violet candy) est
// volontairement bannie ici pour distinguer le back-office de l'app enfant.
//
// Réutilise : Icon, Logo, Button, Badge, Tag, Avatar, Field, Input, ProgressBar,
// Toggle, SettingsRow (globaux) + Sparkline, BarChart, DonutChart, StatCard,
// DataTable, SegmentedControl (ds-charts.jsx, chargé avant ce fichier).

const ADMIN_W = 1240,
  ADMIN_H = 760;
const adminWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};
// Override des CSS vars du .btn pour obtenir un bouton candy NOIR (monochrome).
const ADM_DARK_BTN = {
  "--btn-bg": "var(--ink-900)",
  "--btn-shadow": "var(--ink-700)",
  "--btn-hover-bg": "var(--ink-800)",
};
const ADM_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 15px var(--font-sans)",
  color: "var(--ink-900)",
};

const fmtNum = (n) =>
  n == null || n === "" ? "—" : Number(n).toLocaleString("fr-FR");

// ════════════════════════════════════════════════════════
// STYLES (monochrome) - injectés une fois
// ════════════════════════════════════════════════════════
const adminWeb_styles = `
.adm-shell { height:100%; display:flex; font-family:var(--font-sans); color:var(--ink-900); background:var(--ink-50); }

/* ── Sidebar sombre ─────────────────────────────── */
.adm-sidebar { width:240px; flex-shrink:0; background:var(--ink-900); color:#fff; display:flex; flex-direction:column; padding:20px 14px; }
.adm-brand { display:flex; align-items:center; justify-content:space-between; padding:4px 6px 18px; }
.adm-brand__pill { font:800 9px var(--font-sans); letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.22); border-radius:999px; padding:3px 8px; }
.adm-nav { display:flex; flex-direction:column; gap:2px; flex:1; overflow-y:auto; }
.adm-nav__group { font:800 10px var(--font-sans); letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,.38); padding:14px 10px 6px; }
.adm-nav__item { display:flex; align-items:center; gap:11px; width:100%; height:40px; padding:0 11px; border-radius:10px; border:0; background:transparent; color:rgba(255,255,255,.62); font:800 13px var(--font-sans); text-align:left; cursor:pointer; transition:background .12s,color .12s; }
.adm-nav__item:hover { background:rgba(255,255,255,.08); color:#fff; }
.adm-nav__item.is-active { background:#fff; color:var(--ink-900); }
.adm-sidebar__user { display:flex; align-items:center; gap:10px; padding:10px 8px; margin-top:8px; border-top:1px solid rgba(255,255,255,.1); }
.adm-sidebar__uinfo { min-width:0; flex:1; }
.adm-sidebar__uname { font:800 13px var(--font-sans); color:#fff; }
.adm-sidebar__urole { font:600 11px var(--font-sans); color:rgba(255,255,255,.5); }

/* ── Main / header ──────────────────────────────── */
.adm-main { flex:1; display:flex; flex-direction:column; min-width:0; }
.adm-header { height:62px; flex-shrink:0; background:#fff; border-bottom:1px solid var(--ink-100); display:flex; align-items:center; justify-content:space-between; gap:20px; padding:0 26px; }
.adm-header__title { font:800 20px var(--font-sans); margin:0; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.adm-header__right { display:flex; align-items:center; gap:12px; flex-shrink:0; }
.adm-search { display:flex; align-items:center; gap:8px; background:var(--ink-50); border:1.5px solid transparent; border-radius:10px; padding:0 14px; height:38px; width:280px; color:var(--ink-500); font:700 13px var(--font-sans); }
.adm-search:focus-within { background:#fff; border-color:var(--ink-300); }
.adm-search input { border:0; outline:0; background:transparent; flex:1; font:inherit; color:var(--ink-900); min-width:0; }
.adm-iconbtn { width:38px; height:38px; border-radius:10px; background:#fff; border:1.5px solid var(--ink-100); display:flex; align-items:center; justify-content:center; position:relative; cursor:pointer; }
.adm-iconbtn:hover { background:var(--ink-50); }
.adm-dot { position:absolute; top:7px; right:7px; width:8px; height:8px; border-radius:999px; background:var(--error-500); border:2px solid #fff; }
.adm-content { flex:1; overflow-y:auto; padding:24px 28px; }

/* ── Hero band (sombre) ─────────────────────────── */
.adm-hero { background:var(--ink-900); color:#fff; border-radius:18px; padding:22px 26px; display:flex; align-items:center; justify-content:space-between; gap:24px; }
.adm-hero__kick { font:800 11px var(--font-sans); letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,.55); }
.adm-hero__title { font:900 24px var(--font-sans); margin:6px 0 0; letter-spacing:-.01em; }
.adm-hero__sub { font:600 13px var(--font-sans); color:rgba(255,255,255,.7); margin-top:6px; max-width:520px; line-height:1.5; }

/* ── Generic card / heads ───────────────────────── */
.adm-card { background:#fff; border:1px solid var(--ink-100); border-radius:16px; padding:18px; }
.adm-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
.adm-head__title { font:900 16px var(--font-sans); margin:0; letter-spacing:-.01em; }
.adm-head__sub { font:600 12px var(--font-sans); color:var(--ink-500); margin-top:2px; }

/* ── SourceTag (auto/manuel/indispo) ────────────── */
.adm-src { display:inline-flex; align-items:center; font:800 10px var(--font-sans); letter-spacing:.03em; text-transform:uppercase; padding:3px 7px; border-radius:6px; white-space:nowrap; }
.adm-src--auto { border:1px solid var(--ink-900); color:var(--ink-900); }
.adm-src--manuel { border:1px solid var(--ink-300); color:var(--ink-500); }
.adm-src--indispo { border:1px dashed var(--ink-300); color:var(--ink-400); font-style:italic; }

/* ── KPI line ───────────────────────────────────── */
.adm-kpi { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--ink-100); }
.adm-kpi:last-child { border-bottom:0; }
.adm-kpi__main { flex:1; min-width:0; }
.adm-kpi__label { font:700 13px var(--font-sans); color:var(--ink-800); }
.adm-kpi__val { font:900 16px var(--font-sans); color:var(--ink-900); white-space:nowrap; }
.adm-kpi__val--muted { color:var(--ink-400); font-style:italic; font-weight:700; font-size:13px; }

/* ── Indispo tile ───────────────────────────────── */
.adm-indispo { border:1.5px dashed var(--ink-300); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:6px; background:repeating-linear-gradient(45deg,transparent,transparent 9px,var(--ink-50) 9px,var(--ink-50) 18px); }
.adm-indispo__t { font:800 13px var(--font-sans); color:var(--ink-600); }
.adm-indispo__d { font:600 12px var(--font-sans); color:var(--ink-500); line-height:1.45; }
.adm-link { background:none; border:0; padding:0; font:800 12px var(--font-sans); color:var(--ink-900); text-decoration:underline; cursor:pointer; }

/* ── Deadline tracker ───────────────────────────── */
.adm-dl { display:flex; align-items:flex-start; }
.adm-dl__step { flex:1; display:flex; flex-direction:column; align-items:center; text-align:center; position:relative; }
.adm-dl__step:not(:last-child)::after { content:''; position:absolute; top:11px; left:50%; width:100%; height:2px; background:var(--ink-200); z-index:0; }
.adm-dl__step.is-done:not(:last-child)::after { background:var(--ink-900); }
.adm-dl__dot { width:24px; height:24px; border-radius:999px; background:#fff; border:2px solid var(--ink-300); display:flex; align-items:center; justify-content:center; position:relative; z-index:1; color:var(--ink-400); }
.adm-dl__step.is-done .adm-dl__dot { background:var(--ink-900); border-color:var(--ink-900); color:#fff; }
.adm-dl__step.is-current .adm-dl__dot { border-color:var(--ink-900); color:var(--ink-900); box-shadow:0 0 0 4px var(--ink-100); }
.adm-dl__lbl { font:800 12px var(--font-sans); color:var(--ink-800); margin-top:8px; }
.adm-dl__date { font:700 11px var(--font-sans); color:var(--ink-500); margin-top:2px; }

/* ── Alert row ──────────────────────────────────── */
.adm-alert { display:flex; align-items:center; gap:13px; padding:13px 15px; background:#fff; border:1px solid var(--ink-100); border-left:3px solid var(--ink-300); border-radius:12px; }
.adm-alert--warn { border-left-color:var(--amber-500); }
.adm-alert--err { border-left-color:var(--error-500); }
.adm-alert--ok { border-left-color:var(--success-500); }
.adm-alert__ico { width:34px; height:34px; border-radius:9px; background:var(--ink-100); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.adm-alert__body { flex:1; min-width:0; }
.adm-alert__t { font:800 13px var(--font-sans); color:var(--ink-900); }
.adm-alert__d { font:600 12px var(--font-sans); color:var(--ink-500); margin-top:1px; }
.adm-alert__n { font:900 18px var(--font-sans); color:var(--ink-900); min-width:30px; text-align:center; }

/* ── Legend ─────────────────────────────────────── */
.adm-legend { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.adm-legend span { display:inline-flex; align-items:center; gap:6px; font:700 11px var(--font-sans); color:var(--ink-500); }

/* ── Login ──────────────────────────────────────── */
.adm-login { height:100%; display:flex; align-items:center; justify-content:center; background:var(--ink-50); }
.adm-login__card { width:380px; background:#fff; border:1px solid var(--ink-200); border-radius:20px; padding:32px; box-shadow:var(--shadow-modal); }
`;

if (!document.getElementById("admin-web-styles")) {
  const s = document.createElement("style");
  s.id = "admin-web-styles";
  s.textContent = adminWeb_styles;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════
// NAV admin (groupée)
// ════════════════════════════════════════════════════════
const ADMIN_NAV = [
  {
    group: "Pilotage",
    items: [
      { id: "home", icon: "home", label: "Vue d'ensemble" },
      { id: "impact", icon: "sparkle", label: "Impact Tracker" },
    ],
  },
  {
    group: "Plateforme",
    items: [
      { id: "users", icon: "user", label: "Utilisateurs" },
      { id: "moderation", icon: "eye", label: "Modération" },
      { id: "content", icon: "book", label: "Contenu" },
      { id: "shop", icon: "cart", label: "Boutique" },
      { id: "payments", icon: "phone", label: "Paiements" },
      { id: "events", icon: "trophy", label: "Steamy Events" },
    ],
  },
  {
    group: "Système",
    items: [
      { id: "team", icon: "lock", label: "Équipe & rôles" },
      { id: "settings", icon: "gear", label: "Paramètres" },
    ],
  },
];

// ════════════════════════════════════════════════════════
// SHELL ADMIN (monochrome)
// ════════════════════════════════════════════════════════
function WebAdminShell({
  active = "home",
  headerTitle,
  headerSearch = false,
  headerActions,
  notifDot,
  children,
}) {
  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <Logo height={24} white />
          <span className="adm-brand__pill">Admin</span>
        </div>
        <nav className="adm-nav">
          {ADMIN_NAV.map((g) => (
            <div key={g.group}>
              <div className="adm-nav__group">{g.group}</div>
              {g.items.map((it) => {
                const on = active === it.id;
                return (
                  <button
                    key={it.id}
                    className={["adm-nav__item", on && "is-active"]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Icon
                      name={it.icon}
                      size={18}
                      strokeWidth={on ? 2.5 : 2}
                      color={on ? "var(--ink-900)" : "rgba(255,255,255,.7)"}
                    />
                    {it.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-sidebar__user">
          <Avatar name="Admin" size={34} color="var(--ink-700)" />
          <div className="adm-sidebar__uinfo">
            <div className="adm-sidebar__uname">Seth G.</div>
            <div className="adm-sidebar__urole">Super-admin</div>
          </div>
          <Icon name="logout" size={16} color="rgba(255,255,255,.5)" />
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-header">
          <h1 className="adm-header__title">{headerTitle}</h1>
          <div className="adm-header__right">
            {headerSearch && (
              <div className="adm-search">
                <Icon name="search" size={16} color="var(--ink-500)" />
                <input placeholder="Rechercher…" />
              </div>
            )}
            {headerActions}
            <button className="adm-iconbtn" aria-label="Notifications">
              <Icon name="bell" size={18} color="var(--ink-700)" />
              {notifDot && <span className="adm-dot" />}
            </button>
            <Avatar name="Admin" size={34} color="var(--ink-700)" />
          </div>
        </header>
        <div className="adm-content">{children}</div>
      </div>
    </div>
  );
}

// ─── Helpers locaux ───────────────────────────────────────
function AdmHead({ title, sub, right }) {
  return (
    <div className="adm-head">
      <div style={{ minWidth: 0 }}>
        <h2 className="adm-head__title">{title}</h2>
        {sub && <div className="adm-head__sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function SourceTag({ source }) {
  const map = {
    auto: { label: "Auto", title: "Calculé automatiquement depuis la plateforme" },
    manuel: { label: "Manuel", title: "Saisi par l'admin avant soumission" },
    indispo: {
      label: "Indisponible",
      title: "Donnée non collectée aujourd'hui (à activer au signup)",
    },
  };
  const m = map[source] || map.auto;
  return (
    <span className={`adm-src adm-src--${source}`} title={m.title}>
      {m.label}
    </span>
  );
}

// ════════════════════════════════════════════════════════
// ⭐ TA CONTRIBUTION (mode learning) - logique métier centrale
// ────────────────────────────────────────────────────────
// kpiStatus(kpi) décide, pour CHAQUE indicateur, du statut affiché partout
// (dashboard, détail, rapport trimestriel). C'est le cœur du jugement.
//
// Entrée  : kpi = { value, target?, source } (source: 'auto'|'manuel'|'indispo')
// Sortie  : { status, tone, label }
//   - tone doit être une tone de <Badge> : 'neutral' | 'success' | 'amber' | 'error' | 'info'
//
// Décisions qui t'appartiennent (remplace la baseline ci-dessous) :
//   1. Un KPI 'manuel' non encore saisi (value == null) => 'En attente' ou autre ?
//   2. Qu'est-ce qui est 'Hors-cible' ? (ex: value < target * 0.7) Quelle tone ?
//   3. Cible absente (target == null) => on s'abstient de juger (neutre) ?
// La baseline marche déjà ; affine-la selon ta règle métier.
function kpiStatus(kpi) {
  if (kpi.source === "indispo")
    return { status: "indispo", tone: "neutral", label: "Indisponible" };
  if (kpi.value == null || kpi.value === "")
    return { status: "attente", tone: "amber", label: "En attente" };
  if (
    kpi.target != null &&
    typeof kpi.value === "number" &&
    kpi.value < kpi.target * 0.7
  )
    return { status: "hors-cible", tone: "error", label: "Hors-cible" };
  return { status: "validee", tone: "success", label: "Validée" };
}
// ────────────────────────────────────────────────────────

function DeadlineTracker({ steps }) {
  return (
    <div className="adm-dl">
      {steps.map((s, i) => (
        <div
          key={i}
          className={["adm-dl__step", s.state === "done" && "is-done", s.state === "current" && "is-current"]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="adm-dl__dot">
            {s.state === "done" ? (
              <Icon name="check" size={13} color="#fff" strokeWidth={3} />
            ) : (
              <span style={{ fontSize: 10, fontWeight: 900 }}>{i + 1}</span>
            )}
          </div>
          <div className="adm-dl__lbl">{s.label}</div>
          <div className="adm-dl__date">{s.date}</div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// DONNÉES (démo) - Impact Tracker (PDF Q3, période Janvier 2026)
// ════════════════════════════════════════════════════════
const ADMIN_PERIOD = "Janvier 2026";

const KPIS = [
  // Ventes & finance
  { id: "ventes", group: "Ventes & finance", label: "Ventes réalisées", value: 44000, unit: "FCFA", target: 50000, source: "auto", series: [12000, 18000, 26000, 31000, 44000] },
  { id: "fin_montant", group: "Ventes & finance", label: "Financements reçus", value: 1951472, unit: "FCFA", source: "manuel", series: [0, 0, 0, 250000, 1951472] },
  { id: "fin_hors", group: "Ventes & finance", label: "Financement hors programme ?", value: "Oui", source: "manuel" },
  { id: "fin_first", group: "Ventes & finance", label: "Financeurs inédits (1ère fois) ?", value: "Oui", source: "manuel" },
  { id: "fin_who", group: "Ventes & finance", label: "Nouveaux financeurs", value: "OIF", source: "manuel" },
  // Utilisateurs (NU)
  { id: "nu", group: "Utilisateurs (NU)", label: "Nouveaux utilisateurs", value: 220, target: 200, source: "auto", series: [120, 150, 175, 195, 220] },
  { id: "nu_35", group: "Utilisateurs (NU)", label: "≤ 35 ans", value: 220, base: 220, source: "auto" },
  { id: "nu_f", group: "Utilisateurs (NU)", label: "Femmes", value: 65, base: 220, source: "auto" },
  { id: "nu_f35", group: "Utilisateurs (NU)", label: "Femmes ≤ 35 ans", value: 65, base: 220, source: "auto" },
  { id: "nu_rural", group: "Utilisateurs (NU)", label: "Zone rurale", value: null, base: 220, source: "indispo" },
  { id: "nu_hand", group: "Utilisateurs (NU)", label: "Situation de handicap", value: null, base: 220, source: "indispo" },
  { id: "nu_active", group: "Utilisateurs (NU)", label: "Connectés ≥ 1 fois", value: 460, source: "auto", series: [300, 340, 390, 420, 460] },
  // Apprenants (NA)
  { id: "na", group: "Apprenants (NA)", label: "Nouveaux apprenants", value: 220, target: 200, source: "auto", series: [120, 150, 175, 195, 220] },
  { id: "na_35", group: "Apprenants (NA)", label: "≤ 35 ans", value: 220, base: 220, source: "auto" },
  { id: "na_f", group: "Apprenants (NA)", label: "Femmes", value: 65, base: 220, source: "auto" },
  { id: "na_f35", group: "Apprenants (NA)", label: "Femmes ≤ 35 ans", value: 65, base: 220, source: "auto" },
  { id: "na_rural", group: "Apprenants (NA)", label: "Zone rurale", value: null, base: 220, source: "indispo" },
  { id: "na_hand", group: "Apprenants (NA)", label: "Situation de handicap", value: null, base: 220, source: "indispo" },
  { id: "na_active", group: "Apprenants (NA)", label: "Connectés ≥ 1 fois", value: 460, source: "auto", series: [300, 340, 390, 420, 460] },
  // Écosystème
  { id: "educ", group: "Écosystème", label: "Nouveaux éducateurs", value: 0, source: "auto", series: [0, 0, 0, 0, 0] },
  { id: "inst", group: "Écosystème", label: "Nouvelles institutions", value: null, source: "indispo" },
  // Impact pédagogique
  { id: "complete", group: "Impact pédagogique", label: "Parcours complétés", value: null, source: "auto", note: "Mesure à activer" },
  { id: "complete_conf", group: "Impact pédagogique", label: "Complétés + compétences confirmées", value: null, source: "auto", note: "Mesure à activer" },
  // Produit & innovation
  { id: "prod", group: "Produit & innovation", label: "Nouveaux produits / fonctionnalités ?", value: "Non", source: "manuel" },
  { id: "prod_which", group: "Produit & innovation", label: "Lesquels ?", value: "N/A", source: "manuel" },
  { id: "prod_vuln", group: "Produit & innovation", label: "… destinés aux publics vulnérables ?", value: "Non", source: "manuel" },
  { id: "prod_vuln_which", group: "Produit & innovation", label: "Lesquels ?", value: "N/A", source: "manuel" },
  // Satisfaction
  { id: "nps", group: "Satisfaction", label: "Recommandation programme (1-10)", value: 10, target: 8, source: "manuel" },
  // Emploi
  { id: "emp", group: "Emploi", label: "Employés temps plein", value: 5, source: "manuel", series: [2, 3, 3, 4, 5] },
  { id: "emp_f", group: "Emploi", label: "Employées femmes temps plein", value: 2, base: 5, source: "manuel" },
];
const kpiById = (id) => KPIS.find((k) => k.id === id);
const SERIES_LABELS = ["Sep", "Oct", "Nov", "Déc", "Jan"];

// Plages de dates du rapport (cf. PDF) : acquisition = mois courant ; reste = trimestre.
const MONTH_RANGE = ["01/01/2026", "31/01/2026"];
const QUARTER_RANGE = ["01/11/2025", "31/01/2026"];
const kpiRange = (k) =>
  ["Utilisateurs (NU)", "Apprenants (NA)", "Ventes & finance", "Écosystème"].includes(
    k.group,
  ) && k.source === "auto"
    ? MONTH_RANGE
    : QUARTER_RANGE;

// ── Plateforme (démo) ──
const ADMIN_USERS = [
  { name: "Léa Adjovi", role: "Apprenant", age: 13, city: "Cotonou", status: "actif", joined: "12/01/2026" },
  { name: "Koffi Adékambi", role: "Enseignant", age: 38, city: "Porto-Novo", status: "actif", joined: "08/01/2026" },
  { name: "Mme Sossou", role: "Parent", age: 41, city: "Cotonou", status: "actif", joined: "08/01/2026" },
  { name: "Noé Sossou", role: "Apprenant", age: 12, city: "Abomey", status: "actif", joined: "14/01/2026" },
  { name: "Inès Kossou", role: "Apprenant", age: 15, city: "Parakou", status: "suspendu", joined: "03/01/2026" },
  { name: "Yann Dossa", role: "Apprenant", age: 14, city: "Cotonou", status: "actif", joined: "19/01/2026" },
  { name: "Aline Houngbo", role: "Parent", age: 39, city: "Bohicon", status: "actif", joined: "21/01/2026" },
];
const ROLE_COUNTS = [
  { role: "Apprenants", n: 220 },
  { role: "Parents", n: 96 },
  { role: "Enseignants", n: 12 },
  { role: "Admins", n: 4 },
];
const TRANSACTIONS = [
  { ref: "MM-10428", user: "Mme Sossou", net: "MTN", amount: 18000, status: "payé", date: "19/01" },
  { ref: "MM-10427", user: "A. Houngbo", net: "Moov", amount: 12000, status: "payé", date: "18/01" },
  { ref: "MM-10426", user: "K. Adékambi", net: "MTN", amount: 25000, status: "échoué", date: "17/01" },
  { ref: "MM-10425", user: "Mme Sossou", net: "Celtiis", amount: 5000, status: "payé", date: "16/01" },
  { ref: "MM-10424", user: "A. Houngbo", net: "MTN", amount: 18000, status: "remboursé", date: "14/01" },
];
const ADMIN_COURSES = [
  { title: "Construis ton robot Bluetooth", cat: "Robotique", price: "Payant", kit: true, status: "publié", enrolled: 42 },
  { title: "Initiation à Scratch", cat: "Code", price: "Gratuit", kit: false, status: "publié", enrolled: 88 },
  { title: "Capteurs électroniques", cat: "Électronique", price: "Payant", kit: true, status: "publié", enrolled: 31 },
  { title: "L'IA pour les débutants", cat: "IA", price: "Gratuit", kit: false, status: "brouillon", enrolled: 0 },
];
const ADMIN_ORDERS = [
  { ref: "CMD-3391", item: "Kit Robot Starter", buyer: "Mme Sossou", pay: "payé", ship: "expédié", date: "18/01" },
  { ref: "CMD-3390", item: "Kit Électronique", buyer: "A. Houngbo", pay: "payé", ship: "préparation", date: "17/01" },
  { ref: "CMD-3389", item: "Kit Robot Starter", buyer: "K. Adékambi", pay: "échoué", ship: "—", date: "16/01" },
];
const CONSENTS = [
  { child: "Léa Adjovi", age: 13, parent: "Mme Sossou", action: "Achat parcours", date: "il y a 2 h" },
  { child: "Noé Sossou", age: 12, parent: "M. Sossou", action: "Création de compte", date: "il y a 5 h" },
  { child: "Yann Dossa", age: 14, parent: "—", action: "Steamy Event", date: "hier" },
];
const ADMIN_TEAM = [
  { name: "Seth G.", email: "seth@steamy.bj", role: "Super-admin", last: "à l'instant" },
  { name: "Rachid A.", email: "ophelie@steamy.bj", role: "Contenu", last: "il y a 1 h" },
  { name: "Marc T.", email: "marc@steamy.bj", role: "Support", last: "hier" },
  { name: "Rita B.", email: "rita@steamy.bj", role: "Finance", last: "il y a 3 j" },
];

// petit badge de statut générique
function StatusBadge({ value }) {
  const map = {
    actif: "success", payé: "success", expédié: "success", publié: "success",
    suspendu: "error", échoué: "error",
    "remboursé": "neutral", brouillon: "neutral", "—": "neutral",
    "préparation": "amber", "en attente": "amber",
  };
  return <Badge tone={map[value] || "neutral"}>{value}</Badge>;
}

// ════════════════════════════════════════════════════════
// WAD01 · VUE D'ENSEMBLE
// ════════════════════════════════════════════════════════
function WAD01_Home() {
  return (
    <WebAdminShell active="home" headerTitle="Vue d'ensemble" headerSearch notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="adm-hero">
          <div>
            <div className="adm-hero__kick">Administration · {ADMIN_PERIOD}</div>
            <h2 className="adm-hero__title">220 nouveaux apprenants ce mois</h2>
            <p className="adm-hero__sub">
              La plateforme tient sa cible d'acquisition. Prochaine échéance :
              soumission du rapport d'impact trimestriel le 4 février.
            </p>
          </div>
          <Button variant="outline">Voir l'Impact Tracker</Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <StatCard label="Utilisateurs" value="332" sub="total plateforme" delta="+220 ce mois" deltaTone="success" spark={[180, 210, 250, 290, 332]} />
          <StatCard label="Apprenants actifs" value="460" sub="connectés ≥ 1 fois" delta="+9%" deltaTone="success" spark={[300, 340, 390, 420, 460]} />
          <StatCard label="Ventes du mois" value="44 000" sub="FCFA" delta="vs 31 000" deltaTone="success" spark={[12, 18, 26, 31, 44]} />
          <StatCard label="Taux de complétion" value="—" sub="mesure à activer" delta="non suivi" deltaTone="neutral" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "flex-start" }}>
          <div className="adm-card">
            <AdmHead
              title="Rapport d'impact · prochaine échéance"
              sub={`Trimestre « ${ADMIN_PERIOD} » · 23/30 indicateurs renseignés`}
              right={<Button size="sm" style={ADM_DARK_BTN}>Ouvrir le rapport</Button>}
            />
            <div style={{ padding: "10px 6px 16px" }}>
              <DeadlineTracker
                steps={[
                  { label: "Soumission", date: "4 févr. 2026", state: "current" },
                  { label: "Relance", date: "6 févr. 2026", state: "todo" },
                  { label: "Correction", date: "9 févr. 2026", state: "todo" },
                ]}
              />
            </div>
            <ProgressBar value={77} label="Complétude du rapport" />
          </div>

          <div className="adm-card">
            <AdmHead title="À traiter" sub="Files d'attente du back-office" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="adm-alert adm-alert--warn">
                <div className="adm-alert__ico"><Icon name="lock" size={16} color="var(--ink-700)" /></div>
                <div className="adm-alert__body">
                  <div className="adm-alert__t">Consentements parentaux</div>
                  <div className="adm-alert__d">En attente de validation (&lt; 16 ans)</div>
                </div>
                <div className="adm-alert__n">3</div>
              </div>
              <div className="adm-alert adm-alert--err">
                <div className="adm-alert__ico"><Icon name="phone" size={16} color="var(--ink-700)" /></div>
                <div className="adm-alert__body">
                  <div className="adm-alert__t">Paiements échoués</div>
                  <div className="adm-alert__d">Mobile Money à relancer</div>
                </div>
                <div className="adm-alert__n">2</div>
              </div>
              <div className="adm-alert">
                <div className="adm-alert__ico"><Icon name="eye" size={16} color="var(--ink-700)" /></div>
                <div className="adm-alert__body">
                  <div className="adm-alert__t">Candidatures Events</div>
                  <div className="adm-alert__d">À modérer</div>
                </div>
                <div className="adm-alert__n">5</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD02 · IMPACT · DASHBOARD KPI
// ════════════════════════════════════════════════════════
function KpiLine({ k }) {
  const st = kpiStatus(k);
  const isNum = typeof k.value === "number";
  return (
    <div className="adm-kpi">
      <div className="adm-kpi__main">
        <div className="adm-kpi__label">{k.label}</div>
        <div style={{ marginTop: 4 }}><SourceTag source={k.source} /></div>
      </div>
      {k.series && <Sparkline data={k.series} width={70} height={24} />}
      {k.source === "indispo" || k.value == null ? (
        <span className="adm-kpi__val adm-kpi__val--muted">
          {k.note || "Indisponible"}
        </span>
      ) : (
        <span className="adm-kpi__val">
          {isNum ? fmtNum(k.value) : k.value}
          {k.unit ? ` ${k.unit}` : ""}
        </span>
      )}
    </div>
  );
}

function DemographicsCard({ prefix, title }) {
  const total = kpiById(prefix).value;
  const f = kpiById(prefix + "_f").value;
  const y = kpiById(prefix + "_35").value;
  return (
    <div className="adm-card">
      <AdmHead title={title} sub={`Base : ${fmtNum(total)} inscrits · ${ADMIN_PERIOD}`} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 8 }}>
          <DonutChart value={f} total={total} size={92} caption="femmes" />
          <SourceTag source="auto" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 8 }}>
          <DonutChart value={y} total={total} size={92} caption="≤ 35 ans" />
          <SourceTag source="auto" />
        </div>
        <div className="adm-indispo">
          <div className="adm-indispo__t">Zone rurale · Indisponible</div>
          <div className="adm-indispo__d">Localité non captée au signup.</div>
          <button className="adm-link">Activer la collecte</button>
        </div>
        <div className="adm-indispo">
          <div className="adm-indispo__t">Handicap · Indisponible</div>
          <div className="adm-indispo__d">Champ inclusion non demandé.</div>
          <button className="adm-link">Activer la collecte</button>
        </div>
      </div>
    </div>
  );
}

function WAD02_Impact() {
  const [period, setPeriod] = React.useState("month");
  const groupCard = (title, ids) => (
    <div className="adm-card">
      <AdmHead title={title} />
      <div>
        {ids.map((id) => (
          <KpiLine key={id} k={kpiById(id)} />
        ))}
      </div>
    </div>
  );
  return (
    <WebAdminShell
      active="impact"
      headerTitle="Impact Tracker"
      headerActions={
        <>
          <Button size="sm" variant="outline">Saisie manuelle</Button>
          <Button size="sm" style={ADM_DARK_BTN}>Rapport trimestriel</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div className="adm-legend">
            <span><SourceTag source="auto" /> calculé</span>
            <span><SourceTag source="manuel" /> à saisir</span>
            <span><SourceTag source="indispo" /> non collecté</span>
          </div>
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            options={[
              { id: "month", label: "Mois" },
              { id: "quarter", label: "Trimestre" },
              { id: "year", label: "Année" },
            ]}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <StatCard label="Ventes (FCFA)" value="44 000" delta="cible 50 000" deltaTone="neutral" spark={[12, 18, 26, 31, 44]} />
          <StatCard label="Nouveaux utilisateurs" value="220" delta="cible 200 ✓" deltaTone="success" spark={[120, 150, 175, 195, 220]} />
          <StatCard label="Nouveaux apprenants" value="220" delta="cible 200 ✓" deltaTone="success" spark={[120, 150, 175, 195, 220]} />
          <StatCard label="Recommandation (NPS)" value="10/10" delta="excellent" deltaTone="success" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "flex-start" }}>
          <DemographicsCard prefix="nu" title="Inclusion · Utilisateurs (NU)" />
          <DemographicsCard prefix="na" title="Inclusion · Apprenants (NA)" />
          {groupCard("Ventes & financement", ["ventes", "fin_montant", "fin_hors", "fin_first", "fin_who"])}
          {groupCard("Impact pédagogique", ["complete", "complete_conf"])}
          {groupCard("Écosystème", ["educ", "inst"])}
          {groupCard("Produit & innovation", ["prod", "prod_which", "prod_vuln", "prod_vuln_which"])}
          {groupCard("Emploi", ["emp", "emp_f"])}
          {groupCard("Engagement", ["nu_active", "na_active"])}
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD03 · IMPACT · DÉTAIL D'UN INDICATEUR
// ════════════════════════════════════════════════════════
function WAD03_KpiDetail() {
  const k = kpiById("nu");
  const st = kpiStatus(k);
  const hist = [
    ["Janvier 2026", "220", "Validée", "success"],
    ["Décembre 2025", "195", "Validée", "success"],
    ["Novembre 2025", "175", "Validée", "success"],
    ["Octobre 2025", "150", "Validée", "success"],
    ["Septembre 2025", "120", "Validée", "success"],
  ];
  return (
    <WebAdminShell active="impact" headerTitle="Détail de l'indicateur">
      <div className="crumb">
        Impact Tracker › <b>{k.label}</b>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-card">
            <AdmHead
              title={k.label}
              sub="Nombre de nouveaux comptes créés sur la période"
              right={<Badge tone={st.tone}>{st.label}</Badge>}
            />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 8 }}>
              <div>
                <div style={{ font: "900 56px var(--font-sans)", lineHeight: 1, letterSpacing: "-.02em" }}>
                  {fmtNum(k.value)}
                </div>
                <div style={{ font: "700 13px var(--font-sans)", color: "var(--ink-500)", marginTop: 6 }}>
                  cible {fmtNum(k.target)} · atteinte à 110%
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <BarChart data={k.series} labels={SERIES_LABELS} width={360} height={130} />
              </div>
            </div>
            <div className="adm-legend">
              <span><SourceTag source="auto" /> recalculé chaque nuit</span>
              <span>Plage : 01/01/2026 → 31/01/2026</span>
            </div>
          </div>

          <div className="adm-card">
            <AdmHead title="Historique par période" />
            <DataTable
              dense
              columns={[
                { key: "p", label: "Période" },
                { key: "v", label: "Réponse", align: "right", width: "120px" },
                { key: "s", label: "Statut", align: "right", width: "120px" },
              ]}
              rows={hist.map(([p, v, , tone]) => ({
                p,
                v: <b>{v}</b>,
                s: <Badge tone="success">Validée</Badge>,
              }))}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-card">
            <AdmHead title="Composition (Janvier)" />
            <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 6 }}>
              <DonutChart value={65} total={220} size={104} caption="femmes" />
              <DonutChart value={220} total={220} size={104} caption="≤ 35 ans" />
            </div>
          </div>
          <div className="adm-card">
            <AdmHead title="Définition" />
            <p style={{ font: "600 13px var(--font-sans)", color: "var(--ink-600)", lineHeight: 1.55, margin: 0 }}>
              Comptes utilisateurs créés entre le 1er et le 31 janvier 2026, tous
              rôles confondus. Source : table <code>users</code>, champ
              <code> created_at</code>. Recalculé automatiquement.
            </p>
          </div>
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD04 · IMPACT · RAPPORT TRIMESTRIEL (reproduit le PDF)
// ════════════════════════════════════════════════════════
function WAD04_Report() {
  const rows = KPIS.map((k) => {
    const st = kpiStatus(k);
    const [from, to] = kpiRange(k);
    const isNum = typeof k.value === "number";
    return {
      ind: <span style={{ fontWeight: 700 }}>{k.label}</span>,
      from,
      to,
      rep:
        k.value == null ? (
          <span style={{ color: "var(--ink-400)", fontStyle: "italic" }}>
            {k.note || "Indisponible"}
          </span>
        ) : (
          <b>{isNum ? fmtNum(k.value) : k.value}{k.unit ? ` ${k.unit}` : ""}</b>
        ),
      st: <Badge tone={st.tone}>{st.label}</Badge>,
      src: <SourceTag source={k.source} />,
    };
  });
  return (
    <WebAdminShell active="impact" headerTitle="Rapport d'impact trimestriel">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="adm-card">
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "center" }}>
            <div>
              <div className="adm-head__sub">Trimestre</div>
              <h2 style={{ font: "900 22px var(--font-sans)", margin: "2px 0 10px" }}>
                {ADMIN_PERIOD}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, maxWidth: 300 }}>
                  <ProgressBar value={77} label="23 / 30 indicateurs renseignés" />
                </div>
              </div>
            </div>
            <DeadlineTracker
              steps={[
                { label: "Soumission", date: "4 févr.", state: "current" },
                { label: "Relance", date: "6 févr.", state: "todo" },
                { label: "Correction", date: "9 févr.", state: "todo" },
              ]}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ font: "700 13px var(--font-sans)", color: "var(--ink-500)" }}>
            {KPIS.length} indicateurs · format Impact Tracker (Du · Au · Réponse · Statut)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="outline" icon={<Icon name="arrow-right" size={16} />}>Exporter CSV</Button>
            <Button size="sm" variant="outline">Exporter PDF</Button>
            <Button size="sm" style={ADM_DARK_BTN}>Soumettre</Button>
          </div>
        </div>

        <DataTable
          dense
          columns={[
            { key: "ind", label: "Indicateur clé de performance", width: "2.4fr" },
            { key: "from", label: "Du", width: "100px" },
            { key: "to", label: "Au", width: "100px" },
            { key: "rep", label: "Réponse", align: "right", width: "1fr" },
            { key: "st", label: "Statut", align: "right", width: "120px" },
            { key: "src", label: "Source", align: "right", width: "120px" },
          ]}
          rows={rows}
        />
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD05 · IMPACT · SAISIE DES INDICATEURS MANUELS
// ════════════════════════════════════════════════════════
function WAD05_ManualEntry() {
  const card = (title, children) => (
    <div className="adm-card">
      <AdmHead title={title} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
  const YesNo = () => (
    <div className="input" style={{ height: 48 }}>
      <select style={ADM_SELECT}>
        <option>Oui</option>
        <option>Non</option>
      </select>
    </div>
  );
  return (
    <WebAdminShell active="impact" headerTitle="Saisie des indicateurs manuels">
      <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="crumb">Impact Tracker › Rapport {ADMIN_PERIOD} › <b>Saisie manuelle</b></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "flex-start" }}>
          {card("Financement", (
            <>
              <Field label="Financement hors programme reçu ?"><YesNo /></Field>
              <Field label="Montant total reçu (FCFA)"><Input value="1 951 472" /></Field>
              <Field label="Première fois pour ces financeurs ?"><YesNo /></Field>
              <Field label="Qui sont ces nouveaux financeurs ?"><Input value="Organisation internationale de la Francophonie (OIF)" /></Field>
            </>
          ))}
          {card("Produit & innovation", (
            <>
              <Field label="Nouveaux produits / fonctionnalités ?"><YesNo /></Field>
              <Field label="Si oui, lesquels ?"><Input placeholder="N/A" /></Field>
              <Field label="… destinés aux publics vulnérables ?"><YesNo /></Field>
              <Field label="Si oui, lesquels ?"><Input placeholder="N/A" /></Field>
            </>
          ))}
          {card("Satisfaction & emploi", (
            <>
              <Field label="Recommandation du programme (1 à 10)"><Input value="10" /></Field>
              <Field label="Employés à temps plein"><Input value="5" /></Field>
              <Field label="Employées femmes à temps plein"><Input value="2" /></Field>
            </>
          ))}
          <div className="adm-card" style={{ background: "var(--ink-50)" }}>
            <AdmHead title="Indicateurs indisponibles" sub="Données non collectées aujourd'hui" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="adm-indispo">
                <div className="adm-indispo__t">Zone rurale (NU / NA)</div>
                <div className="adm-indispo__d">Ajouter « localité urbaine/rurale » au formulaire d'inscription.</div>
                <button className="adm-link">Configurer la collecte</button>
              </div>
              <div className="adm-indispo">
                <div className="adm-indispo__t">Situation de handicap (NU / NA)</div>
                <div className="adm-indispo__d">Ajouter un champ inclusion (optionnel, opt-in) au profil.</div>
                <button className="adm-link">Configurer la collecte</button>
              </div>
              <div className="adm-indispo">
                <div className="adm-indispo__t">Institutions d'apprentissage</div>
                <div className="adm-indispo__d">Modéliser l'entité « institution » et son rattachement.</div>
                <button className="adm-link">Configurer la collecte</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="outline">Enregistrer le brouillon</Button>
          <Button style={ADM_DARK_BTN}>Valider la saisie</Button>
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD06 · UTILISATEURS
// ════════════════════════════════════════════════════════
function WAD06_Users() {
  const [role, setRole] = React.useState("all");
  const visible = ADMIN_USERS.filter(
    (u) => role === "all" || u.role.toLowerCase().startsWith(role),
  );
  return (
    <WebAdminShell
      active="users"
      headerTitle="Utilisateurs"
      headerSearch
      headerActions={<Button size="sm" style={ADM_DARK_BTN} icon={<Icon name="plus" size={16} color="#fff" strokeWidth={3} />}>Inviter</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {ROLE_COUNTS.map((r) => (
            <StatCard key={r.role} label={r.role} value={fmtNum(r.n)} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SegmentedControl
            value={role}
            onChange={setRole}
            options={[
              { id: "all", label: "Tous" },
              { id: "apprenant", label: "Apprenants" },
              { id: "parent", label: "Parents" },
              { id: "enseignant", label: "Enseignants" },
            ]}
          />
          <div style={{ flex: 1 }} />
          <div className="adm-search" style={{ width: 240 }}>
            <Icon name="search" size={16} color="var(--ink-500)" />
            <input placeholder="Nom, ville…" />
          </div>
        </div>

        <DataTable
          onRowClick={() => {}}
          columns={[
            { key: "u", label: "Utilisateur", width: "1.6fr" },
            { key: "role", label: "Rôle", width: "1fr" },
            { key: "city", label: "Ville", width: "1fr" },
            { key: "joined", label: "Inscrit le", width: "1fr" },
            { key: "status", label: "Statut", align: "right", width: "120px" },
            { key: "go", label: "", align: "right", width: "40px" },
          ]}
          rows={visible.map((u) => ({
            u: (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={u.name} size={30} color="var(--ink-300)" />
                <b>{u.name}</b>
              </div>
            ),
            role: u.role,
            city: u.city,
            joined: u.joined,
            status: <StatusBadge value={u.status} />,
            go: <Icon name="chevron-right" size={16} color="var(--ink-400)" />,
          }))}
        />
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD07 · DÉTAIL UTILISATEUR
// ════════════════════════════════════════════════════════
function WAD07_UserDetail() {
  const meta = [
    ["Rôle", "Apprenant"],
    ["Âge", "13 ans"],
    ["Genre", "Féminin"],
    ["Ville", "Cotonou"],
    ["Localité (urbain/rural)", "Non renseigné"],
    ["Consentement parent", "Validé · Mme Sossou"],
    ["Inscrit le", "12/01/2026"],
  ];
  return (
    <WebAdminShell active="users" headerTitle="Profil utilisateur">
      <div className="crumb">Utilisateurs › <b>Léa Adjovi</b></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
            <Avatar name="Léa Adjovi" size={72} color="var(--ink-700)" />
            <div>
              <h3 style={{ margin: 0, font: "900 18px var(--font-sans)" }}>Léa Adjovi</h3>
              <div style={{ font: "600 13px var(--font-sans)", color: "var(--ink-500)" }}>léa.adjovi@exemple.bj</div>
            </div>
            <Badge tone="success">Compte actif</Badge>
          </div>
          <div className="adm-card">
            <AdmHead title="Informations" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {meta.map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: i < meta.length - 1 ? "1px solid var(--ink-100)" : 0 }}>
                  <span style={{ font: "600 13px var(--font-sans)", color: "var(--ink-500)" }}>{k}</span>
                  <span style={{ font: "800 13px var(--font-sans)", color: v === "Non renseigné" ? "var(--ink-400)" : "var(--ink-900)", fontStyle: v === "Non renseigné" ? "italic" : "normal" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-card">
            <AdmHead title="Parcours suivis" />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ font: "700 13px var(--font-sans)", marginBottom: 5 }}>Construis ton robot Bluetooth</div>
                <ProgressBar value={62} />
              </div>
              <div>
                <div style={{ font: "700 13px var(--font-sans)", marginBottom: 5 }}>Initiation à Scratch</div>
                <ProgressBar value={100} tone="success" />
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <StatCard label="Quiz réussis" value="9/12" />
            <StatCard label="Badges" value="5" />
            <StatCard label="Dépensé" value="18 000" sub="FCFA" />
          </div>
          <div className="adm-card">
            <AdmHead title="Actions" />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button size="sm" variant="outline">Réinitialiser le mot de passe</Button>
              <Button size="sm" variant="outline">Changer de rôle</Button>
              <Button size="sm" variant="outline">Voir le parent</Button>
              <Button size="sm" variant="danger">Suspendre le compte</Button>
            </div>
          </div>
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD08 · MODÉRATION & CONSENTEMENTS
// ════════════════════════════════════════════════════════
function WAD08_Moderation() {
  const [tab, setTab] = React.useState("consent");
  return (
    <WebAdminShell active="moderation" headerTitle="Modération" notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { id: "consent", label: "Consentements (3)" },
            { id: "reports", label: "Signalements (0)" },
            { id: "verify", label: "Comptes à vérifier (1)" },
          ]}
        />

        {tab === "consent" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ font: "600 13px var(--font-sans)", color: "var(--ink-500)" }}>
              Demandes de consentement parental pour les moins de 16 ans. Le refus est terminal.
            </div>
            {CONSENTS.map((c, i) => (
              <div key={i} className="adm-alert adm-alert--warn">
                <div className="adm-alert__ico"><Icon name="lock" size={16} color="var(--ink-700)" /></div>
                <div className="adm-alert__body">
                  <div className="adm-alert__t">{c.child} · {c.age} ans <span style={{ color: "var(--ink-400)", fontWeight: 700 }}>— {c.action}</span></div>
                  <div className="adm-alert__d">Parent : {c.parent} · {c.date}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size="sm" variant="outline">Refuser</Button>
                  <Button size="sm" style={ADM_DARK_BTN}>Valider</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "reports" && (
          <div className="adm-card" style={{ textAlign: "center", padding: 48, color: "var(--ink-400)", font: "600 14px var(--font-sans)" }}>
            Aucun signalement en attente.
          </div>
        )}
        {tab === "verify" && (
          <div className="adm-alert">
            <div className="adm-alert__ico"><Icon name="user" size={16} color="var(--ink-700)" /></div>
            <div className="adm-alert__body">
              <div className="adm-alert__t">Inès Kossou · Enseignant déclaré</div>
              <div className="adm-alert__d">Justificatif d'établissement à vérifier</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="outline">Rejeter</Button>
              <Button size="sm" style={ADM_DARK_BTN}>Approuver</Button>
            </div>
          </div>
        )}
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD09 · CONTENU / PARCOURS
// ════════════════════════════════════════════════════════
function WAD09_Content() {
  return (
    <WebAdminShell
      active="content"
      headerTitle="Contenu · Parcours"
      headerSearch
      headerActions={<Button size="sm" style={ADM_DARK_BTN} icon={<Icon name="plus" size={16} color="#fff" strokeWidth={3} />}>Nouveau parcours</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <StatCard label="Parcours publiés" value="18" />
          <StatCard label="Brouillons" value="4" />
          <StatCard label="Gratuits" value="11" />
          <StatCard label="Avec kit requis" value="7" />
        </div>
        <DataTable
          onRowClick={() => {}}
          columns={[
            { key: "t", label: "Parcours", width: "2fr" },
            { key: "cat", label: "Catégorie", width: "1fr" },
            { key: "price", label: "Accès", width: "100px" },
            { key: "kit", label: "Kit", width: "90px" },
            { key: "enr", label: "Inscrits", align: "right", width: "90px" },
            { key: "status", label: "Statut", align: "right", width: "120px" },
          ]}
          rows={ADMIN_COURSES.map((c) => ({
            t: <b>{c.title}</b>,
            cat: c.cat,
            price: c.price === "Gratuit" ? <Badge tone="success">Gratuit</Badge> : <Badge tone="neutral">Payant</Badge>,
            kit: c.kit ? "Oui" : "—",
            enr: fmtNum(c.enrolled),
            status: <StatusBadge value={c.status} />,
          }))}
        />
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD10 · BOUTIQUE · KITS & COMMANDES
// ════════════════════════════════════════════════════════
function WAD10_Shop() {
  const kits = [
    { name: "Kit Robot Starter", stock: 24, price: "25 000" },
    { name: "Kit Électronique", stock: 8, price: "18 000" },
    { name: "Kit IA & Capteurs", stock: 0, price: "32 000" },
  ];
  return (
    <WebAdminShell
      active="shop"
      headerTitle="Boutique · Kits & commandes"
      headerActions={<Button size="sm" style={ADM_DARK_BTN} icon={<Icon name="plus" size={16} color="#fff" strokeWidth={3} />}>Ajouter un kit</Button>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, alignItems: "flex-start" }}>
        <div className="adm-card">
          <AdmHead title="Stock des kits" />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {kits.map((k, i) => (
              <div key={i} className="adm-kpi">
                <div className="adm-kpi__main">
                  <div className="adm-kpi__label">{k.name}</div>
                  <div style={{ font: "600 12px var(--font-sans)", color: "var(--ink-500)", marginTop: 3 }}>{k.price} FCFA</div>
                </div>
                {k.stock === 0 ? <Badge tone="error">Rupture</Badge> : k.stock < 10 ? <Badge tone="amber">{k.stock} en stock</Badge> : <Badge tone="success">{k.stock} en stock</Badge>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <StatCard label="Commandes (mois)" value="31" />
            <StatCard label="À expédier" value="6" />
            <StatCard label="CA kits" value="312k" sub="FCFA" />
          </div>
          <div className="adm-card">
            <AdmHead title="Commandes récentes" />
            <DataTable
              dense
              columns={[
                { key: "ref", label: "Réf.", width: "1fr" },
                { key: "item", label: "Article", width: "1.6fr" },
                { key: "buyer", label: "Acheteur", width: "1.2fr" },
                { key: "pay", label: "Paiement", align: "right", width: "110px" },
                { key: "ship", label: "Livraison", align: "right", width: "120px" },
              ]}
              rows={ADMIN_ORDERS.map((o) => ({
                ref: <b>{o.ref}</b>,
                item: o.item,
                buyer: o.buyer,
                pay: <StatusBadge value={o.pay} />,
                ship: <StatusBadge value={o.ship} />,
              }))}
            />
          </div>
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD11 · PAIEMENTS / TRANSACTIONS (Mobile Money)
// ════════════════════════════════════════════════════════
function WAD11_Payments() {
  const [period, setPeriod] = React.useState("month");
  return (
    <WebAdminShell active="payments" headerTitle="Paiements · Mobile Money">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ font: "700 13px var(--font-sans)", color: "var(--ink-500)" }}>
            Réseaux : MTN · Moov · Celtiis (pas de carte bancaire)
          </div>
          <SegmentedControl value={period} onChange={setPeriod} options={[{ id: "month", label: "Mois" }, { id: "quarter", label: "Trimestre" }]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <StatCard label="Volume encaissé" value="356k" sub="FCFA" delta="+12%" deltaTone="success" spark={[210, 250, 280, 320, 356]} />
          <StatCard label="Transactions" value="48" delta="+6" deltaTone="success" />
          <StatCard label="Taux d'échec" value="9%" delta="-2 pts" deltaTone="success" />
          <StatCard label="Remboursements" value="1" deltaTone="neutral" />
        </div>
        <DataTable
          columns={[
            { key: "ref", label: "Référence", width: "1fr" },
            { key: "user", label: "Utilisateur", width: "1.4fr" },
            { key: "net", label: "Réseau", width: "1fr" },
            { key: "amount", label: "Montant", align: "right", width: "1fr" },
            { key: "date", label: "Date", align: "right", width: "90px" },
            { key: "status", label: "Statut", align: "right", width: "130px" },
          ]}
          rows={TRANSACTIONS.map((t) => ({
            ref: <b>{t.ref}</b>,
            user: t.user,
            net: t.net,
            amount: <b>{fmtNum(t.amount)} F</b>,
            date: t.date,
            status: <StatusBadge value={t.status} />,
          }))}
        />
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD12 · STEAMY EVENTS
// ════════════════════════════════════════════════════════
function WAD12_Events() {
  const apps = [
    { learner: "Léa Adjovi", age: 13, event: "Challenge Robot Sumo", consent: "requis", status: "en attente" },
    { learner: "Inès Kossou", age: 15, event: "Hackathon IA Junior", consent: "validé", status: "en attente" },
    { learner: "Marc T. (adulte)", age: 22, event: "Atelier Électronique", consent: "n/a", status: "en attente" },
  ];
  return (
    <WebAdminShell
      active="events"
      headerTitle="Steamy Events"
      headerActions={<Button size="sm" style={ADM_DARK_BTN} icon={<Icon name="plus" size={16} color="#fff" strokeWidth={3} />}>Créer un événement</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <StatCard label="Événements à venir" value="3" />
          <StatCard label="Candidatures" value="18" delta="5 à modérer" deltaTone="neutral" />
          <StatCard label="Participants confirmés" value="42" />
        </div>
        <div className="adm-card">
          <AdmHead title="Candidatures à modérer" sub="Pour les < 16 ans, l'accord parental est requis avant validation." />
          <DataTable
            columns={[
              { key: "l", label: "Apprenant", width: "1.6fr" },
              { key: "e", label: "Événement", width: "1.6fr" },
              { key: "c", label: "Consentement", align: "center", width: "140px" },
              { key: "a", label: "", align: "right", width: "180px" },
            ]}
            rows={apps.map((a) => ({
              l: <span><b>{a.learner}</b> <span style={{ color: "var(--ink-400)", fontWeight: 700 }}>· {a.age} ans</span></span>,
              e: a.event,
              c: a.consent === "requis" ? <Badge tone="amber">Parent requis</Badge> : a.consent === "validé" ? <Badge tone="success">Validé</Badge> : <Badge tone="neutral">N/A</Badge>,
              a: (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button size="sm" variant="outline">Refuser</Button>
                  <Button size="sm" style={ADM_DARK_BTN} disabled={a.consent === "requis"}>Accepter</Button>
                </div>
              ),
            }))}
          />
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD13 · ÉQUIPE & RÔLES
// ════════════════════════════════════════════════════════
function WAD13_Team() {
  const perms = [
    ["Super-admin", "Accès total, gestion de l'équipe et des rôles"],
    ["Contenu", "Parcours, catalogue, boutique"],
    ["Support", "Utilisateurs, modération, consentements"],
    ["Finance", "Paiements, rapport d'impact"],
  ];
  return (
    <WebAdminShell
      active="team"
      headerTitle="Équipe & rôles"
      headerActions={<Button size="sm" style={ADM_DARK_BTN} icon={<Icon name="plus" size={16} color="#fff" strokeWidth={3} />}>Inviter un admin</Button>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "flex-start" }}>
        <div className="adm-card">
          <AdmHead title="Membres" />
          <DataTable
            columns={[
              { key: "m", label: "Membre", width: "1.6fr" },
              { key: "role", label: "Rôle", width: "1fr" },
              { key: "last", label: "Dernière activité", align: "right", width: "1fr" },
            ]}
            rows={ADMIN_TEAM.map((m) => ({
              m: (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={m.name} size={30} color="var(--ink-300)" />
                  <div>
                    <div style={{ fontWeight: 800 }}>{m.name}</div>
                    <div style={{ font: "600 11px var(--font-sans)", color: "var(--ink-500)" }}>{m.email}</div>
                  </div>
                </div>
              ),
              role: <Badge tone="neutral">{m.role}</Badge>,
              last: m.last,
            }))}
          />
        </div>
        <div className="adm-card">
          <AdmHead title="Rôles & permissions" />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {perms.map(([r, d], i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: i < perms.length - 1 ? "1px solid var(--ink-100)" : 0 }}>
                <div style={{ font: "800 13px var(--font-sans)" }}>{r}</div>
                <div style={{ font: "600 12px var(--font-sans)", color: "var(--ink-500)", marginTop: 2, lineHeight: 1.45 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD14 · PARAMÈTRES GÉNÉRAUX
// ════════════════════════════════════════════════════════
function WAD14_Settings() {
  const [s, setS] = React.useState({ maintenance: false, signups: true, mtn: true, moov: true, sms: true });
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  return (
    <WebAdminShell active="settings" headerTitle="Paramètres généraux">
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h3 style={{ font: "900 12px var(--font-sans)", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-600)", margin: "0 0 10px" }}>Plateforme</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SettingsRow label="Mode maintenance" description="Coupe l'accès apprenant pendant les opérations." checked={s.maintenance} onChange={set("maintenance")} />
            <SettingsRow label="Inscriptions ouvertes" description="Autoriser la création de nouveaux comptes." checked={s.signups} onChange={set("signups")} />
          </div>
        </div>
        <div>
          <h3 style={{ font: "900 12px var(--font-sans)", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-600)", margin: "0 0 10px" }}>Intégrations Mobile Money</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SettingsRow label="MTN MoMo" description="Encaissement actif." checked={s.mtn} onChange={set("mtn")} />
            <SettingsRow label="Moov Money" description="Encaissement actif." checked={s.moov} onChange={set("moov")} />
            <SettingsRow label="Notifications SMS" description="Codes OTP et consentements parentaux." checked={s.sms} onChange={set("sms")} />
          </div>
        </div>
        <div>
          <h3 style={{ font: "900 12px var(--font-sans)", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-600)", margin: "0 0 10px" }}>Annonce plateforme</h3>
          <div className="adm-card">
            <Field label="Message diffusé à tous les utilisateurs">
              <textarea rows={3} placeholder="Ex : maintenance prévue dimanche de 2h à 4h…" style={{ width: "100%", border: "2px solid var(--ink-200)", borderRadius: 14, padding: "12px 16px", font: "600 14px var(--font-sans)", color: "var(--ink-900)", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <Button size="sm" style={ADM_DARK_BTN}>Diffuser l'annonce</Button>
            </div>
          </div>
        </div>
      </div>
    </WebAdminShell>
  );
}

// ════════════════════════════════════════════════════════
// WAD15 · CONNEXION ADMIN (login + 2FA)
// ════════════════════════════════════════════════════════
function WAD15_Login() {
  return (
    <div className="adm-login">
      <div className="adm-login__card">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 22 }}>
          <Logo height={34} />
          <div style={{ font: "800 11px var(--font-sans)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-400)" }}>
            Espace administration
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Email professionnel">
            <Input value="seth@steamy.bj" icon={<Icon name="mail" size={18} color="var(--ink-500)" />} />
          </Field>
          <Field label="Mot de passe">
            <PasswordInput value="superadmin" />
          </Field>
          <Field label="Code de vérification (2FA)" hint="Envoyé sur ton application d'authentification.">
            <OTPInput length={6} value="42" activeIndex={2} />
          </Field>
          <Button block style={ADM_DARK_BTN}>Connexion sécurisée</Button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, font: "700 12px var(--font-sans)", color: "var(--ink-500)" }}>
            <Icon name="lock" size={14} color="var(--ink-500)" /> Connexion chiffrée · journalisée
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
function AdminFlowWeb() {
  // NB: DCSection ne reconnaît QUE des <DCArtboard> directs (filtre c.type === DCArtboard).
  // Pas de composant wrapper ici, sinon les artboards seraient ignorés.
  return (
    <DesignCanvas>
      <DCSection id="adm-overview" title="Pilotage" subtitle="Vue d'ensemble du back-office (monochrome).">
        <DCArtboard id="WAD01" label="WAD01 · Vue d'ensemble" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD01_Home /></DCArtboard>
      </DCSection>

      <DCSection id="adm-impact" title="Impact Tracker" subtitle="Suivi des KPI d'impact (PDF Q3) · dashboard, détail, rapport trimestriel, saisie manuelle.">
        <DCArtboard id="WAD02" label="WAD02 · Dashboard KPI" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD02_Impact /></DCArtboard>
        <DCArtboard id="WAD03" label="WAD03 · Détail indicateur" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD03_KpiDetail /></DCArtboard>
        <DCArtboard id="WAD04" label="WAD04 · Rapport trimestriel" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD04_Report /></DCArtboard>
        <DCArtboard id="WAD05" label="WAD05 · Saisie manuelle" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD05_ManualEntry /></DCArtboard>
      </DCSection>

      <DCSection id="adm-users" title="Utilisateurs & accès" subtitle="Liste, détail, modération & consentements parentaux.">
        <DCArtboard id="WAD06" label="WAD06 · Utilisateurs" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD06_Users /></DCArtboard>
        <DCArtboard id="WAD07" label="WAD07 · Détail utilisateur" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD07_UserDetail /></DCArtboard>
        <DCArtboard id="WAD08" label="WAD08 · Modération" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD08_Moderation /></DCArtboard>
      </DCSection>

      <DCSection id="adm-commerce" title="Contenu & commerce" subtitle="Parcours, boutique de kits & commandes, paiements Mobile Money, events.">
        <DCArtboard id="WAD09" label="WAD09 · Contenu / Parcours" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD09_Content /></DCArtboard>
        <DCArtboard id="WAD10" label="WAD10 · Boutique & commandes" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD10_Shop /></DCArtboard>
        <DCArtboard id="WAD11" label="WAD11 · Paiements" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD11_Payments /></DCArtboard>
        <DCArtboard id="WAD12" label="WAD12 · Steamy Events" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD12_Events /></DCArtboard>
      </DCSection>

      <DCSection id="adm-system" title="Système & accès" subtitle="Équipe & rôles, paramètres, connexion sécurisée.">
        <DCArtboard id="WAD13" label="WAD13 · Équipe & rôles" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD13_Team /></DCArtboard>
        <DCArtboard id="WAD14" label="WAD14 · Paramètres" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD14_Settings /></DCArtboard>
        <DCArtboard id="WAD15" label="WAD15 · Connexion admin" width={ADMIN_W} height={ADMIN_H} style={adminWebStyle}><WAD15_Login /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.AdminFlowWeb = AdminFlowWeb;
window.WebAdminShell = WebAdminShell;
