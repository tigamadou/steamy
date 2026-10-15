// screens-dashboard-web.jsx - Dashboard apprenant, version web (1240×760).
// 9 écrans : Dashboard (home/empty/loading), Notifications (list/empty/settings),
// Mes tentatives de quiz (list/detail/empty).
// Réutilise tous les composants du DS et expose window.DashboardFlowWeb.

const DASH_W = 1240,
  DASH_H = 760;

// ════════════════════════════════════════════════════════
// STYLES locaux (sidebar, header, helpers dashboard)
// ════════════════════════════════════════════════════════
const dashboardWeb_styles = `
.app-shell {
  height: 100%;
  display: flex;
  font-family: var(--font-sans);
  color: var(--ink-900);
  background: var(--bg);
}

/* ── Sidebar ─────────────────────────────────────── */
.app-sidebar {
  width: 248px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid var(--ink-100);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
}
.app-sidebar__logo {
  padding: 4px 4px 24px;
  display: flex;
  align-items: center;
}
.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.app-sidebar__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  height: 44px;
  border-radius: 12px;
  border: 0;
  background: transparent;
  color: var(--ink-700);
  font: 800 14px var(--font-sans);
  cursor: pointer;
  position: relative;
  text-align: left;
}
.app-sidebar__item:hover { background: var(--ink-100); }
.app-sidebar__item.is-active {
  background: rgba(91, 63, 224, 0.10);
  color: var(--primary-600);
}
.app-sidebar__item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px; bottom: 8px;
  width: 3px;
  background: var(--primary-500);
  border-radius: 999px;
}
.app-sidebar__user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--ink-100);
  margin-bottom: 8px;
}
.app-sidebar__user-info { min-width: 0; flex: 1; }
.app-sidebar__user-name { font-weight: 800; font-size: 13px; color: var(--ink-900); }
.app-sidebar__user-class { font-weight: 600; font-size: 11px; color: var(--ink-500); }
.app-sidebar__logout {
  background: transparent;
  border: 0;
  font: 700 12px var(--font-sans);
  color: var(--ink-500);
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.app-sidebar__logout:hover { background: var(--ink-100); color: var(--ink-700); }
.app-sidebar__logout:hover svg { color: var(--ink-700); }

/* ── Header ──────────────────────────────────────── */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.app-header {
  height: 64px;
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid var(--ink-100);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 0 28px;
}
.app-header__title {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.app-header__right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.app-header__search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--ink-50);
  border: 1.5px solid transparent;
  border-radius: 999px;
  padding: 0 16px;
  height: 40px;
  width: 320px;
  color: var(--ink-500);
  font: 700 13px var(--font-sans);
  transition: border-color .15s, background .15s;
}
.app-header__search:focus-within {
  background: #fff;
  border-color: var(--primary-300);
}
.app-header__search input {
  border: 0; outline: 0; background: transparent;
  flex: 1; font: inherit; color: var(--ink-900); min-width: 0;
}
.app-header__icon-btn {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: #fff;
  border: 1.5px solid var(--ink-100);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  cursor: pointer;
}
.app-header__icon-btn:hover { background: var(--ink-50); }
.app-header__dot {
  position: absolute;
  top: 6px; right: 6px;
  width: 9px; height: 9px;
  border-radius: 999px;
  background: var(--error-500);
  border: 2px solid #fff;
}

/* ── Main content ────────────────────────────────── */
.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
}

/* ── Hero card ───────────────────────────────────── */
.dash-hero {
  position: relative;
  padding: 24px 28px;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
  color: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 160px;
}
.dash-hero__body { flex: 1; min-width: 0; max-width: 60%; display: flex; flex-direction: column; gap: 8px; }
.dash-hero__kicker {
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
  opacity: 0.85; text-transform: uppercase;
}
.dash-hero__title { font-size: 24px; font-weight: 900; line-height: 1.2; margin: 0; letter-spacing: -0.01em; }
.dash-hero__progress { display: flex; align-items: center; gap: 12px; margin: 12px 0 4px; max-width: 380px; }
.dash-hero__progress .bar {
  flex: 1; height: 8px; background: rgba(255,255,255,.25);
  border-radius: 999px; overflow: hidden;
}
.dash-hero__progress .bar > span {
  display: block; height: 100%; background: var(--amber-400); border-radius: 999px;
}
.dash-hero__pct { font-size: 12px; font-weight: 900; }
.dash-hero__mascot {
  position: absolute; right: -8px; top: -16px;
  pointer-events: none;
}
.dash-hero__deco-1 { position: absolute; left: 36%; top: 12%; width: 8px; height: 8px; background: var(--amber-400); border-radius: 999px; box-shadow: 0 0 16px var(--amber-300); }
.dash-hero__deco-2 { position: absolute; left: 50%; bottom: 16%; width: 6px; height: 6px; background: rgba(255,255,255,.6); border-radius: 999px; }

/* ── Stat strip ──────────────────────────────────── */
.stat-strip { display: flex; gap: 16px; }
.stat-pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: #fff;
  border: 1.5px solid var(--ink-100);
  border-radius: 16px;
  min-height: 64px;
}
.stat-pill__icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-pill__icon--amber { background: var(--amber-100); color: var(--amber-700); }
.stat-pill__icon--violet { background: var(--primary-100); color: var(--primary-700); }
.stat-pill__icon--success { background: var(--success-100); color: var(--success-700); }
.stat-pill__label { font-size: 12px; font-weight: 700; color: var(--ink-500); }
.stat-pill__value { font-size: 18px; font-weight: 900; color: var(--ink-900); line-height: 1.1; margin-top: 1px; }

/* ── Quick action tile ───────────────────────────── */
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.quick-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: #fff;
  border: 1.5px solid var(--ink-100);
  cursor: pointer;
  transition: transform .12s, box-shadow .15s, border-color .15s;
  text-align: left;
  min-height: 88px;
}
.quick-tile:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-pop-sm);
  border-color: var(--primary-200);
}
.quick-tile__icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.quick-tile__icon--violet { background: var(--primary-100); color: var(--primary-600); }
.quick-tile__icon--amber { background: var(--amber-100); color: var(--amber-700); }
.quick-tile__icon--success { background: var(--success-100); color: var(--success-700); }
.quick-tile__title { font-size: 15px; font-weight: 800; color: var(--ink-900); }
.quick-tile__count { font-size: 12px; font-weight: 700; color: var(--ink-500); margin-top: 2px; }

/* ── Section header ──────────────────────────────── */
.section-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.section-head__title { font-size: 18px; font-weight: 900; margin: 0; letter-spacing: -0.01em; }
.section-head__action {
  font-size: 13px; font-weight: 800; color: var(--primary-600);
  background: transparent; border: 0; cursor: pointer;
  display: flex; align-items: center; gap: 4px;
}

/* ── Toggle (switch) ─────────────────────────────── */
.toggle {
  position: relative;
  width: 44px; height: 24px;
  border-radius: 999px;
  background: var(--ink-200);
  border: 0; padding: 0; cursor: pointer;
  transition: background .15s;
  flex-shrink: 0;
}
.toggle__knob {
  position: absolute;
  top: 2px; left: 2px;
  width: 20px; height: 20px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,.18);
  transition: transform .18s var(--ease-out);
}
.toggle.is-on { background: var(--primary-500); }
.toggle.is-on .toggle__knob { transform: translateX(20px); }
.toggle:focus-visible { outline: 0; box-shadow: 0 0 0 4px var(--primary-100); }
.toggle[disabled] { opacity: .5; cursor: not-allowed; }

/* ── Settings row ────────────────────────────────── */
.settings-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 16px 20px;
  background: #fff;
  border: 1px solid var(--ink-100);
  border-radius: 16px;
}
.settings-row__label { font-size: 14px; font-weight: 800; color: var(--ink-900); }
.settings-row__desc { font-size: 12px; font-weight: 600; color: var(--ink-500); margin-top: 3px; line-height: 1.45; }

/* ── Tabs (segmented pill) ───────────────────────── */
.tabs-pill {
  display: inline-flex;
  background: var(--ink-100);
  border-radius: 999px;
  padding: 4px;
  gap: 2px;
}
.tabs-pill__btn {
  border: 0;
  background: transparent;
  padding: 8px 18px;
  border-radius: 999px;
  font: 800 13px var(--font-sans);
  color: var(--ink-600);
  cursor: pointer;
  transition: all .12s;
}
.tabs-pill__btn.is-active {
  background: #fff;
  color: var(--primary-600);
  box-shadow: 0 2px 6px rgba(15,13,38,.08);
}

/* ── Skeleton ────────────────────────────────────── */
@keyframes dash-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.skel { background: var(--ink-100); border-radius: 12px; animation: dash-pulse 1.4s ease-in-out infinite; }

/* ── Quiz attempt row ────────────────────────────── */
.qa-row {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 18px;
  background: #fff;
  border: 1px solid var(--ink-100);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color .12s, transform .12s;
}
.qa-row:hover { border-color: var(--primary-200); transform: translateX(2px); }
.qa-row__emoji {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--primary-100);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.qa-row__body { flex: 1; min-width: 0; }
.qa-row__title { font-size: 14px; font-weight: 800; color: var(--ink-900); }
.qa-row__course { font-size: 12px; font-weight: 600; color: var(--ink-500); margin-top: 2px; }
.qa-row__score { font-size: 16px; font-weight: 900; color: var(--ink-900); min-width: 56px; text-align: right; }
.qa-row__date { font-size: 12px; font-weight: 700; color: var(--ink-400); min-width: 80px; text-align: right; }

/* ── Mini stat card (quiz list) ──────────────────── */
.mini-stat {
  flex: 1;
  background: #fff;
  border: 1px solid var(--ink-100);
  border-radius: 14px;
  padding: 14px 16px;
}
.mini-stat__label { font-size: 11px; font-weight: 800; color: var(--ink-500); text-transform: uppercase; letter-spacing: .04em; }
.mini-stat__value { font-size: 22px; font-weight: 900; color: var(--ink-900); margin-top: 4px; }
.mini-stat__value--success { color: var(--success-600); }

/* ── Empty state ─────────────────────────────────── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  gap: 16px;
  max-width: 480px;
  margin: 32px auto;
}
.empty h2 { font-size: 24px; font-weight: 900; margin: 8px 0 0; letter-spacing: -0.01em; }
.empty p { font-size: 14px; font-weight: 600; color: var(--ink-600); margin: 0; line-height: 1.5; }

/* ── Score hero (quiz detail) ────────────────────── */
.score-hero {
  position: relative;
  padding: 24px 28px;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
  color: #fff;
  overflow: hidden;
  min-height: 152px;
  display: flex;
  align-items: center;
  gap: 28px;
}
.score-hero__big { font-size: 64px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; }
.score-hero__big small { font-size: 26px; font-weight: 800; opacity: .8; }
.score-hero__meta { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.score-hero__bar { height: 10px; background: rgba(255,255,255,.25); border-radius: 999px; overflow: hidden; max-width: 320px; }
.score-hero__bar > span { display: block; height: 100%; background: var(--amber-400); border-radius: 999px; }

/* ── Question recap row (quiz detail) ────────────── */
.qrecap {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid var(--ink-100);
  border-radius: 12px;
}
.qrecap__num {
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--ink-100); color: var(--ink-700);
  font: 800 13px var(--font-sans);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.qrecap__icon {
  width: 24px; height: 24px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.qrecap__icon--ok { background: var(--success-500); color: #fff; }
.qrecap__icon--ko { background: var(--error-500); color: #fff; }
.qrecap__body { flex: 1; min-width: 0; font-size: 13px; }
.qrecap__q { font-weight: 800; color: var(--ink-900); }
.qrecap__a { color: var(--ink-500); font-weight: 600; margin-top: 2px; }

/* ── Side card (quiz detail) ─────────────────────── */
.side-card {
  background: #fff;
  border: 1.5px solid var(--ink-100);
  border-radius: 20px;
  padding: 20px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 12px;
}
.side-card__stats { display: flex; gap: 18px; padding: 10px 0; }
.side-card__stat-label { font-size: 11px; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: .04em; }
.side-card__stat-value { font-size: 16px; font-weight: 900; color: var(--ink-900); margin-top: 2px; }
.side-card__actions { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 8px; }

/* ── Welcome empty (WD02) ────────────────────────── */
.welcome-card {
  background: rgba(91, 63, 224, 0.06);
  border: 2px dashed var(--primary-300);
  border-radius: 22px;
  padding: 36px 28px;
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 24px;
}
.welcome-card__body { flex: 1; }
.welcome-card__body h1 { font-size: 28px; font-weight: 900; margin: 0 0 8px; letter-spacing: -0.01em; }
.welcome-card__body p { font-size: 15px; font-weight: 600; color: var(--ink-600); margin: 0 0 16px; line-height: 1.5; max-width: 480px; }

/* ── Breadcrumb ──────────────────────────────────── */
.crumb { font-size: 12px; font-weight: 700; color: var(--ink-500); margin-bottom: 12px; }
.crumb b { color: var(--ink-900); font-weight: 800; }

/* ── Filter strip ────────────────────────────────── */
.filter-strip {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
`;

if (!document.getElementById("dashboard-web-styles")) {
  const s = document.createElement("style");
  s.id = "dashboard-web-styles";
  s.textContent = dashboardWeb_styles;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════
// COMPOSANT : WebAppShell (sidebar + header + main)
// ════════════════════════════════════════════════════════
const NAV_ITEMS = [
  { id: "home", icon: "home", label: "Accueil" },
  { id: "catalog", icon: "compass", label: "Catalogue" },
  { id: "wishlist", icon: "heart", label: "Mes souhaits" },
  { id: "badges", icon: "trophy", label: "Badges" },
  { id: "profile", icon: "user", label: "Profil" },
];

function WebAppShell({
  active = "home",
  headerTitle,
  headerSearch = true,
  headerActions,
  notifDot,
  children,
  contentBg,
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__logo">
          <Logo height={40} />
        </div>
        <nav className="app-sidebar__nav">
          {NAV_ITEMS.map((it) => (
            <button
              key={it.id}
              className={["app-sidebar__item", active === it.id && "is-active"]
                .filter(Boolean)
                .join(" ")}
              title={it.id !== "home" ? "Bientôt" : undefined}
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
          <Avatar name="Léa" size={32} ring />
          <div className="app-sidebar__user-info">
            <div className="app-sidebar__user-name">Léa A.</div>
            <div className="app-sidebar__user-class">3ème · Cotonou</div>
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
            {headerSearch && (
              <div className="app-header__search">
                <Icon name="search" size={16} color="var(--ink-500)" />
                <input placeholder="Rechercher un parcours…" />
              </div>
            )}
            {headerActions}
            <button className="app-header__icon-btn" aria-label="Notifications">
              <Icon name="bell" size={18} color="var(--ink-700)" />
              {notifDot && <span className="app-header__dot" />}
            </button>
            <Avatar name="Léa" size={36} ring />
          </div>
        </header>
        <div
          className="app-content"
          style={contentBg ? { background: contentBg } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      className={["toggle", checked && "is-on"].filter(Boolean).join(" ")}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      aria-pressed={checked}
    >
      <span className="toggle__knob" />
    </button>
  );
}

function SettingsRow({ label, description, checked, onChange }) {
  return (
    <div className="settings-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="settings-row__label">{label}</div>
        {description && <div className="settings-row__desc">{description}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function StatPill({ icon, label, value, tone = "violet" }) {
  return (
    <div className="stat-pill">
      <div className={`stat-pill__icon stat-pill__icon--${tone}`}>
        <Icon name={icon} size={20} strokeWidth={2.5} />
      </div>
      <div>
        <div className="stat-pill__label">{label}</div>
        <div className="stat-pill__value">{value}</div>
      </div>
    </div>
  );
}

function QuickActionTile({ icon, title, count, tone = "violet" }) {
  return (
    <button className="quick-tile">
      <div className={`quick-tile__icon quick-tile__icon--${tone}`}>
        <Icon name={icon} size={22} strokeWidth={2.5} />
      </div>
      <div>
        <div className="quick-tile__title">{title}</div>
        <div className="quick-tile__count">{count}</div>
      </div>
    </button>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="section-head">
      <h2 className="section-head__title">{title}</h2>
      {action && (
        <button className="section-head__action">
          {action} <Icon name="chevron-right" size={14} />
        </button>
      )}
    </div>
  );
}

function SkeletonBlock({ w = "100%", h = 16, r = 12, style }) {
  return (
    <div
      className="skel"
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  );
}

function QuizAttemptRow({
  emoji = "🎯",
  title,
  course,
  score,
  total,
  date,
  status,
}) {
  const tones = { ok: "success", warn: "amber", ko: "error" };
  const labels = { ok: "Réussi", warn: "À refaire", ko: "Échoué" };
  return (
    <div className="qa-row">
      <div className="qa-row__emoji">{emoji}</div>
      <div className="qa-row__body">
        <div className="qa-row__title">{title}</div>
        <div className="qa-row__course">{course}</div>
      </div>
      <Badge tone={tones[status]}>{labels[status]}</Badge>
      <div className="qa-row__score">
        {score}/{total}
      </div>
      <div className="qa-row__date">{date}</div>
      <Icon name="chevron-right" size={18} color="var(--ink-400)" />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WD01 · Dashboard home (sobre)
// ════════════════════════════════════════════════════════
function WD01_Dashboard() {
  return (
    <WebAppShell active="home" headerTitle="Salut Léa 👋" notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero card */}
        <div className="dash-hero">
          <span className="dash-hero__deco-1" />
          <span className="dash-hero__deco-2" />
          <div className="dash-hero__body">
            <span className="dash-hero__kicker">En cours · Niveau 2</span>
            <h2 className="dash-hero__title">Construis ton robot Bluetooth</h2>
            <div className="dash-hero__progress">
              <div className="bar">
                <span style={{ width: "62%" }} />
              </div>
              <span className="dash-hero__pct">62%</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Button
                variant="amber"
                size="lg"
                icon={
                  <Icon name="play" size={18} color="#fff" strokeWidth={3} />
                }
              >
                Continuer la mission
              </Button>
            </div>
          </div>
          <div className="dash-hero__mascot">
            <Mascot pose="cheer" size={170} hue="#fff" />
          </div>
        </div>

        {/* Stat strip */}
        <div className="stat-strip">
          <StatPill icon="flame" label="Streak" value="5 jours" tone="amber" />
          <StatPill icon="sparkle" label="Points" value="1 240" tone="violet" />
          <StatPill icon="rocket" label="Niveau" value="2" tone="success" />
        </div>

        {/* Quick actions */}
        <div className="quick-grid">
          <QuickActionTile
            icon="compass"
            title="Catalogue"
            count="24 parcours"
            tone="violet"
          />
          <QuickActionTile
            icon="heart"
            title="Mes souhaits"
            count="3 parcours"
            tone="amber"
          />
          <QuickActionTile
            icon="book"
            title="Mes quiz"
            count="12 tentatives"
            tone="success"
          />
        </div>

        {/* Pour toi */}
        <div>
          <SectionHeader title="Pour toi" action="Voir tout" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            <CourseCard
              title="Initiation à Scratch"
              level="Débutant"
              free
              color="var(--cat-code)"
              emoji="💻"
            />
            <CourseCard
              title="Capteurs électroniques"
              level="Intermédiaire"
              price="18 000 F"
              color="var(--cat-electronique)"
              emoji="⚡"
            />
            <CourseCard
              title="L'IA pour les débutants"
              level="Débutant"
              free
              color="var(--cat-ia)"
              emoji="🤖"
            />
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD02 · Dashboard nouvel utilisateur
// ════════════════════════════════════════════════════════
function WD02_Empty() {
  return (
    <WebAppShell active="home" headerTitle="Salut Léa 👋">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="welcome-card">
          <div className="welcome-card__body">
            <h1>Bienvenue Léa !</h1>
            <p>
              Tu n'as pas encore commencé de parcours. Choisis-en un pour
              démarrer ton aventure robotique.
            </p>
            <Button
              size="lg"
              iconRight={
                <Icon
                  name="arrow-right"
                  size={18}
                  color="#fff"
                  strokeWidth={3}
                />
              }
            >
              Explorer le catalogue
            </Button>
          </div>
          <Mascot pose="wave" size={180} />
        </div>

        <div>
          <SectionHeader
            title="Suggestions pour bien démarrer"
            action="Voir tout"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            <CourseCard
              title="Découverte de la robotique"
              level="Débutant"
              free
              color="var(--cat-robotique)"
              emoji="🤖"
            />
            <CourseCard
              title="Initiation à Scratch"
              level="Débutant"
              free
              color="var(--cat-code)"
              emoji="💻"
            />
            <CourseCard
              title="Premiers circuits"
              level="Débutant"
              price="12 000 F"
              color="var(--cat-electronique)"
              emoji="⚡"
            />
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD03 · Dashboard chargement (skeleton)
// ════════════════════════════════════════════════════════
function WD03_Loading() {
  return (
    <WebAppShell active="home" headerTitle="Salut Léa 👋">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SkeletonBlock h={160} r={22} />
        <div className="stat-strip">
          <SkeletonBlock h={64} r={16} />
          <SkeletonBlock h={64} r={16} />
          <SkeletonBlock h={64} r={16} />
        </div>
        <div className="quick-grid">
          <SkeletonBlock h={88} r={18} />
          <SkeletonBlock h={88} r={18} />
          <SkeletonBlock h={88} r={18} />
        </div>
        <div>
          <SkeletonBlock w={120} h={20} r={6} style={{ marginBottom: 12 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            <SkeletonBlock h={260} r={22} />
            <SkeletonBlock h={260} r={22} />
            <SkeletonBlock h={260} r={22} />
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD04 · Notifications · liste
// ════════════════════════════════════════════════════════
const NOTIFS = [
  {
    tone: "success",
    icon: "🏆",
    title: "Nouveau badge débloqué",
    msg: "Premier robot construit - bravo !",
    time: "il y a 1 h",
    unread: true,
  },
  {
    tone: "info",
    icon: "📦",
    title: "Ton kit est en route",
    msg: "Suivi de livraison disponible dans tes commandes.",
    time: "il y a 3 h",
    unread: true,
  },
  {
    tone: "amber",
    icon: "🎯",
    title: "Mission terminée",
    msg: "Bravo pour le quiz Scratch - 9/10 !",
    time: "hier",
    unread: true,
  },
  {
    tone: "info",
    icon: "🎁",
    title: "Recommandation pour toi",
    msg: "L'IA pour les débutants - basé sur ton profil.",
    time: "hier",
    unread: false,
  },
  {
    tone: "primary",
    icon: "💬",
    title: "Message du coach Yann",
    msg: "On reprend ton projet robot demain à 18h ?",
    time: "il y a 2 j",
    unread: false,
  },
];

function WD04_NotifsList() {
  const [tab, setTab] = React.useState("all");
  const list = tab === "unread" ? NOTIFS.filter((n) => n.unread) : NOTIFS;
  const unreadCount = NOTIFS.filter((n) => n.unread).length;

  return (
    <WebAppShell
      active="home"
      headerTitle="Notifications"
      headerSearch={false}
      notifDot
    >
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
              Non lues ({unreadCount})
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="section-head__action">
              Tout marquer comme lu
            </button>
            <button
              className="app-header__icon-btn"
              title="Paramètres des notifications"
            >
              <Icon name="gear" size={18} color="var(--ink-700)" />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((n, i) => (
            <NotifItem key={i} {...n} />
          ))}
          {list.length === 0 && (
            <div className="empty">
              <Mascot pose="idle" size={120} hue="var(--primary-500)" />
              <p>Tu as tout lu - rien de neuf.</p>
            </div>
          )}
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD05 · Notifications · état vide
// ════════════════════════════════════════════════════════
function WD05_NotifsEmpty() {
  return (
    <WebAppShell active="home" headerTitle="Notifications" headerSearch={false}>
      <div className="empty">
        <Mascot pose="sleep" size={180} hue="var(--primary-500)" />
        <h2>Tout est calme par ici</h2>
        <p>
          Tu n'as aucune notification. On te prévient dès qu'il se passe quelque
          chose d'important.
        </p>
        <div style={{ marginTop: 8 }}>
          <Button variant="outline" icon={<Icon name="gear" size={18} />}>
            Régler les notifications
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD06 · Notifications · paramètres
// ════════════════════════════════════════════════════════
function WD06_NotifsSettings() {
  const [s, setS] = React.useState({
    rappels: true,
    recos: true,
    quizRetry: false,
    badges: true,
    levelUp: true,
    coach: true,
    contests: false,
    email: true,
    push: true,
    sms: false,
  });
  const set = (k) => (v) => setS((prev) => ({ ...prev, [k]: v }));

  const Section = ({ title, children }) => (
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

  return (
    <WebAppShell active="home" headerTitle="Notifications" headerSearch={false}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="tabs-pill" style={{ marginBottom: 24 }}>
          <button className="tabs-pill__btn">Notifications</button>
          <button className="tabs-pill__btn is-active">Paramètres</button>
        </div>

        <Section title="Apprentissage">
          <SettingsRow
            label="Rappels de missions"
            description="On te rappelle de continuer ton parcours quotidien."
            checked={s.rappels}
            onChange={set("rappels")}
          />
          <SettingsRow
            label="Nouveaux parcours recommandés"
            description="Reçois nos suggestions basées sur ton profil."
            checked={s.recos}
            onChange={set("recos")}
          />
          <SettingsRow
            label="Quiz à refaire"
            description="Rappel quand un quiz peut être amélioré."
            checked={s.quizRetry}
            onChange={set("quizRetry")}
          />
        </Section>

        <Section title="Récompenses">
          <SettingsRow
            label="Badges débloqués"
            description="Notification dès qu'un badge est gagné."
            checked={s.badges}
            onChange={set("badges")}
          />
          <SettingsRow
            label="Niveau atteint"
            description="Notification de passage de niveau."
            checked={s.levelUp}
            onChange={set("levelUp")}
          />
        </Section>

        <Section title="Communauté">
          <SettingsRow
            label="Messages du coach"
            description="Notification pour les messages directs."
            checked={s.coach}
            onChange={set("coach")}
          />
          <SettingsRow
            label="Annonces de concours"
            description="Steamy Events et challenges."
            checked={s.contests}
            onChange={set("contests")}
          />
        </Section>

        <Section title="Canaux">
          <SettingsRow
            label="Email"
            description="seth.gnavo@example.com"
            checked={s.email}
            onChange={set("email")}
          />
          <SettingsRow
            label="Push mobile"
            description="Notifications sur l'app mobile."
            checked={s.push}
            onChange={set("push")}
          />
          <SettingsRow
            label="SMS"
            description="+229 01 90 12 34 56"
            checked={s.sms}
            onChange={set("sms")}
          />
        </Section>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD07 · Mes tentatives · liste
// ════════════════════════════════════════════════════════
const ATTEMPTS = [
  {
    emoji: "💻",
    title: "Quiz · Variables Scratch",
    course: "Initiation à Scratch · Niveau 1",
    score: 9,
    total: 10,
    date: "il y a 2 h",
    status: "ok",
  },
  {
    emoji: "⚡",
    title: "Quiz · Loi d'Ohm",
    course: "Capteurs élec. · Niveau 2",
    score: 6,
    total: 10,
    date: "hier",
    status: "warn",
  },
  {
    emoji: "🤖",
    title: "Quiz · Premiers capteurs",
    course: "Découverte robot · Niveau 1",
    score: 10,
    total: 10,
    date: "il y a 2 j",
    status: "ok",
  },
  {
    emoji: "💡",
    title: "Quiz · Algorithmes simples",
    course: "Initiation à Scratch · Niveau 2",
    score: 4,
    total: 10,
    date: "il y a 4 j",
    status: "ko",
  },
  {
    emoji: "🔧",
    title: "Quiz · Mécanique de base",
    course: "Construis ton robot · Niveau 1",
    score: 8,
    total: 10,
    date: "la semaine dernière",
    status: "ok",
  },
  {
    emoji: "🤖",
    title: "Quiz · Bluetooth & contrôle",
    course: "Construis ton robot · Niveau 2",
    score: 7,
    total: 10,
    date: "il y a 8 j",
    status: "warn",
  },
  {
    emoji: "🧠",
    title: "Quiz · Vocabulaire IA",
    course: "IA pour débutants · Niveau 1",
    score: 9,
    total: 10,
    date: "il y a 12 j",
    status: "ok",
  },
  {
    emoji: "⚙️",
    title: "Quiz · Boucles & conditions",
    course: "Initiation à Scratch · Niveau 3",
    score: 5,
    total: 10,
    date: "il y a 14 j",
    status: "ko",
  },
];

function WD07_QuizList() {
  const [filter, setFilter] = React.useState("all");
  const visible = ATTEMPTS.filter(
    (a) => filter === "all" || filter === a.status,
  );

  return (
    <WebAppShell active="home" headerTitle="Mes tentatives de quiz" notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Stat row */}
        <div style={{ display: "flex", gap: 12 }}>
          <div className="mini-stat">
            <div className="mini-stat__label">Taux de réussite</div>
            <div className="mini-stat__value mini-stat__value--success">
              78%
            </div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat__label">Tentatives</div>
            <div className="mini-stat__value">{ATTEMPTS.length}</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat__label">Quiz parfaits</div>
            <div className="mini-stat__value">4</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat__label">Streak</div>
            <div className="mini-stat__value">3</div>
          </div>
        </div>

        {/* Filter strip */}
        <div className="filter-strip">
          <Tag active={filter === "all"} onClick={() => setFilter("all")}>
            Tous
          </Tag>
          <Tag
            active={filter === "ok"}
            onClick={() => setFilter("ok")}
            color="var(--success-500)"
          >
            Réussis
          </Tag>
          <Tag
            active={filter === "warn"}
            onClick={() => setFilter("warn")}
            color="var(--amber-500)"
          >
            À refaire
          </Tag>
          <Tag
            active={filter === "ko"}
            onClick={() => setFilter("ko")}
            color="var(--error-500)"
          >
            Échoués
          </Tag>
          <div style={{ flex: 1 }} />
          <button className="section-head__action">
            Trier · Plus récent <Icon name="chevron-down" size={14} />
          </button>
        </div>

        {/* Liste */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((a, i) => (
            <QuizAttemptRow key={i} {...a} />
          ))}
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD08 · Détail d'une tentative
// ════════════════════════════════════════════════════════
function WD08_QuizDetail() {
  return (
    <WebAppShell active="home" headerTitle="Détail de la tentative">
      <div className="crumb">
        Mes tentatives › <b>Quiz · Variables Scratch · Niveau 1</b>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Colonne gauche */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Score hero */}
          <div className="score-hero">
            <div>
              <div className="dash-hero__kicker">Score final</div>
              <div className="score-hero__big">
                9<small>/10</small>
              </div>
            </div>
            <div className="score-hero__meta">
              <Badge tone="success" solid>
                ✓ Réussi
              </Badge>
              <div className="score-hero__bar">
                <span style={{ width: "90%" }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>
                Ton meilleur score sur ce quiz · +120 Points
              </div>
            </div>
          </div>

          {/* Question expanded */}
          <div>
            <SectionHeader title="Question marquante" />
            <Quiz
              index={3}
              total={10}
              question="Quelle valeur prend la variable score après l'exécution de ce bloc Scratch ?"
              choices={["0", "5", "10", "15"]}
              selected={2}
              correct={2}
              showFeedback
            />
          </div>

          {/* Récapitulatif */}
          <div>
            <SectionHeader title="Récapitulatif des questions" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                {
                  ok: true,
                  q: "Que fait le bloc « quand drapeau cliqué » ?",
                  a: "Tu as répondu : « Démarrer le programme » ✓",
                },
                {
                  ok: true,
                  q: "Comment crée-t-on une variable ?",
                  a: "Tu as répondu : « Onglet Variables → Créer » ✓",
                },
                {
                  ok: true,
                  q: "Quelle valeur prend score ?",
                  a: "Tu as répondu : « 10 » ✓",
                },
                {
                  ok: false,
                  q: "À quoi sert le bloc « répéter 10 fois » ?",
                  a: "Ta réponse : « Tester la condition » · Bonne réponse : « Boucler 10 fois »",
                },
                {
                  ok: true,
                  q: "Que signifie « événement » ?",
                  a: "Tu as répondu : « Action déclenchée » ✓",
                },
              ].map((row, i) => (
                <div key={i} className="qrecap">
                  <div className="qrecap__num">{i + 1}</div>
                  <div
                    className={[
                      "qrecap__icon",
                      row.ok ? "qrecap__icon--ok" : "qrecap__icon--ko",
                    ].join(" ")}
                  >
                    <Icon
                      name={row.ok ? "check" : "x"}
                      size={14}
                      color="#fff"
                      strokeWidth={3}
                    />
                  </div>
                  <div className="qrecap__body">
                    <div className="qrecap__q">{row.q}</div>
                    <div className="qrecap__a">{row.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="side-card">
            <Mascot pose="cheer" size={120} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              Bravo Léa !
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-600)",
                lineHeight: 1.45,
              }}
            >
              Tu peux retenter pour viser le 10/10 et débloquer un nouveau
              badge.
            </p>
            <div className="side-card__stats">
              <div>
                <div className="side-card__stat-label">Temps</div>
                <div className="side-card__stat-value">4 min 12 s</div>
              </div>
              <div>
                <div className="side-card__stat-label">Points gagnés</div>
                <div
                  className="side-card__stat-value"
                  style={{ color: "var(--amber-600)" }}
                >
                  +120
                </div>
              </div>
            </div>
            <div className="side-card__actions">
              <Button variant="primary" block>
                Réessayer le quiz
              </Button>
              <Button variant="outline" block>
                Voir le parcours
              </Button>
            </div>
          </div>

          <div
            className="side-card"
            style={{ alignItems: "flex-start", textAlign: "left" }}
          >
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>
              Concepts à revoir
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink-700)",
                }}
              >
                <Icon name="book" size={14} color="var(--primary-500)" />{" "}
                Boucles « répéter »
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink-700)",
                }}
              >
                <Icon name="book" size={14} color="var(--primary-500)" />{" "}
                Conditions « si … alors »
              </div>
            </div>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD09 · Tentatives · état vide
// ════════════════════════════════════════════════════════
function WD09_QuizEmpty() {
  return (
    <WebAppShell active="home" headerTitle="Mes tentatives de quiz">
      <div className="empty">
        <Mascot pose="focus" size={180} />
        <h2>Pas encore de quiz</h2>
        <p>
          Termine une mission pour débloquer ton premier quiz et grimper au
          classement.
        </p>
        <div style={{ marginTop: 8 }}>
          <Button
            iconRight={
              <Icon name="arrow-right" size={18} color="#fff" strokeWidth={3} />
            }
          >
            Voir mes parcours en cours
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD10 · STEAMY EVENTS (apprenant) - liste + mes demandes
// ════════════════════════════════════════════════════════
const APPR_EVENTS = [
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
const APPR_EVENT_REQS = [
  { event: "Challenge Robot Sumo", status: "pending" },
  { event: "Expo STEM Cotonou", status: "accepted" },
];

function WD10_Events() {
  const st = {
    pending: ["amber", "En attente"],
    accepted: ["success", "Acceptée"],
    refused: ["error", "Refusée"],
  };
  return (
    <WebAppShell active="home" headerTitle="Steamy Events" notifDot>
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
                    <Button size="sm">Participer</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Mes demandes de participation" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {APPR_EVENT_REQS.map((r, i) => (
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
                <div style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>
                  {r.event}
                </div>
                <Badge tone={st[r.status][0]}>{st[r.status][1]}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD11 · DEMANDE DE PARTICIPATION (formulaire)
// ════════════════════════════════════════════════════════
function WD11_EventApply() {
  const sel = {
    border: 0,
    outline: 0,
    background: "transparent",
    flex: 1,
    font: "700 16px var(--font-sans)",
    color: "var(--ink-900)",
  };
  return (
    <WebAppShell
      active="home"
      headerTitle="Demande de participation"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Steamy Events › <b>Challenge Robot Sumo</b>
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
          <Field label="Pourquoi veux-tu participer ?" required>
            <textarea
              rows={3}
              placeholder="Dis-nous ce qui te motive…"
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
          <Field label="Ton niveau en robotique">
            <div className="input">
              <select style={sel}>
                <option>Débutant</option>
                <option>Intermédiaire</option>
                <option>Avancé</option>
              </select>
            </div>
          </Field>
          <div
            style={{
              background: "var(--amber-100)",
              border: "2px solid var(--amber-300)",
              borderRadius: 14,
              padding: 14,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 20 }}>👨‍👩‍👧</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--amber-700)",
                lineHeight: 1.5,
              }}
            >
              Ta demande sera transmise à ton parent pour accord avant la
              validation finale.
            </span>
          </div>
          <Button block size="lg">
            Envoyer ma demande
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD12 · AIDE & SUPPORT (FAQ + contact)
// ════════════════════════════════════════════════════════
function WD12_Help() {
  const faqs = [
    [
      "Comment débloquer un parcours payant ?",
      "Ouvre le parcours, clique « Acheter », saisis ton Kit Code si besoin : la demande de paiement part à ton parent, qui règle en Mobile Money.",
    ],
    [
      "J'ai oublié mon mot de passe",
      "Pas de panique : demande à ton parent de le réinitialiser depuis ton profil, dans son espace.",
    ],
    [
      "Comment fonctionne le consentement parent ?",
      "Ton compte est rattaché à celui d'un parent : il reçoit un message pour valider ton inscription et tes achats.",
    ],
    [
      "Où trouver le Kit Code ?",
      "Il est imprimé sur la notice livrée avec ton kit physique.",
    ],
  ];
  return (
    <WebAppShell active="profile" headerTitle="Aide & Support">
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
              Tu ne trouves pas ta réponse ?
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-600)" }}
            >
              Notre équipe te répond en français, du lundi au samedi.
            </div>
          </div>
          <Button>Contacter le support</Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD13 · PARAMÈTRES (hub apprenant)
// ════════════════════════════════════════════════════════
function WD13_Settings() {
  const [s, setS] = React.useState({ push: true, email: true, sms: false });
  const set = (k) => (v) => setS((prev) => ({ ...prev, [k]: v }));
  const MenuRow = ({ label, badge }) => (
    <button
      className="settings-row"
      style={{ cursor: "pointer", textAlign: "left" }}
    >
      <span className="settings-row__label">
        {label} {badge && <Badge tone="amber">{badge}</Badge>}
      </span>
      <Icon name="chevron-right" size={18} color="var(--ink-400)" />
    </button>
  );
  return (
    <WebAppShell active="profile" headerTitle="Paramètres">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <WPDSection title="Profil apprenant">
          <WPDInfoCard
            title="Mes informations"
            rows={[
              ["Nom", "Léa Adjovi"],
              ["Date de naissance", "14/03/2012"],
              ["Classe", "4ème"],
              ["Localité", "Cotonou · Cocotomey"],
            ]}
          />
          <WPDInfoCard
            title="Connexion"
            action="Changer"
            rows={[
              ["Téléphone", "+229 01 90 12 34 56"],
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
              ["Réseau", "MTN"],
              ["Numéro", "+229 01 90 12 34 56"],
            ]}
          />
        </WPDSection>
        <WPDSection title="Notifications">
          <SettingsRow
            label="Push mobile"
            description="Rappels de missions et célébrations."
            checked={s.push}
            onChange={set("push")}
          />
          <SettingsRow
            label="Email"
            description="Factures et nouveautés."
            checked={s.email}
            onChange={set("email")}
          />
          <SettingsRow
            label="SMS"
            description="Sécurité et consentement."
            checked={s.sms}
            onChange={set("sms")}
          />
        </WPDSection>
        <WPDSection title="Mon compte">
          <MenuRow label="Historique de commande" />
          <MenuRow label="Progression & recommandations" />
          <MenuRow label="Infos de mon parent" />
          <MenuRow label="CGU / Mentions / Politiques" />
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
                Action irréversible. L'accord de ton parent sera demandé.
              </div>
            </div>
            <Button variant="danger" size="sm">
              Supprimer
            </Button>
          </div>
        </WPDSection>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD14 · HISTORIQUE DE COMMANDE (apprenant)
// ════════════════════════════════════════════════════════
function WD14_Orders() {
  const [filter, setFilter] = React.useState("all");
  const orders = [
    {
      ref: "#CM-1042",
      label: "Parcours · Robot Bluetooth",
      date: "12 mai 2026",
      amount: "25 000 F",
      status: "ok",
    },
    {
      ref: "#CM-1039",
      label: "Parcours · Initiation IA",
      date: "2 mai 2026",
      amount: "18 000 F",
      status: "pending",
    },
    {
      ref: "#CM-1031",
      label: "Parcours · Capteurs élec.",
      date: "20 avr. 2026",
      amount: "15 000 F",
      status: "ko",
    },
  ];
  const tones = { ok: "success", pending: "amber", ko: "error" };
  const labels = { ok: "Réussi", pending: "En attente", ko: "Échoué" };
  const visible = orders.filter((o) => filter === "all" || filter === o.status);
  return (
    <WebAppShell active="profile" headerTitle="Historique de commande">
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
            <div key={i} className="qa-row">
              <div className="qa-row__emoji">🚀</div>
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
          ))}
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD15 · SUPPRIMER LE COMPTE (branche âge)
// ════════════════════════════════════════════════════════
function WD15_DeleteAccount() {
  return (
    <WebAppShell
      active="profile"
      headerTitle="Supprimer mon compte"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Paramètres › <b>Supprimer mon compte</b>
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
                Supprimer ton compte ?
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
                Cette action efface ta progression, tes badges et tes commandes.
                Elle est irréversible.
              </p>
            </div>
          </div>
          <div
            style={{
              background: "var(--amber-100)",
              border: "2px solid var(--amber-300)",
              borderRadius: 14,
              padding: 16,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 22 }}>👨‍👩‍👧</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--amber-700)",
                lineHeight: 1.5,
              }}
            >
              Ta demande sera{" "}
              <strong>envoyée à ton parent</strong> pour validation avant
              l'inscription définitive.
            </span>
          </div>
          <Field label="Pourquoi pars-tu ? (optionnel)">
            <textarea
              rows={2}
              placeholder="Ton retour nous aide à améliorer Steamy."
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
              Envoyer la demande
            </Button>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD17 · ÉDITER LE PROFIL
// ════════════════════════════════════════════════════════
function WD17_EditProfile() {
  const sel = {
    border: 0,
    outline: 0,
    background: "transparent",
    flex: 1,
    font: "700 16px var(--font-sans)",
    color: "var(--ink-900)",
  };
  return (
    <WebAppShell
      active="profile"
      headerTitle="Modifier mon profil"
      headerSearch={false}
    >
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
          Paramètres › <b>Profil</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 18,
            padding: 18,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Avatar emoji="🦉" size={64} color="var(--primary-500)" ring />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Ton avatar</div>
            <div style={{ fontSize: 18, marginTop: 4 }}>
              🦊 🐼 🐸 🐯 🐙 🦉 🐲 🐝
            </div>
          </div>
          <Button variant="outline" size="sm">
            Changer
          </Button>
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
            <Field label="Date de naissance">
              <Input value="14 / 03 / 2012" />
            </Field>
            <Field label="Pays">
              <div className="input">
                <span style={{ fontSize: 18 }}>🇧🇯</span>
                <select style={sel}>
                  <option>Bénin</option>
                  <option>Togo</option>
                  <option>Côte d'Ivoire</option>
                </select>
              </div>
            </Field>
          </div>
          <Field label="Localité (ville / quartier)">
            <Input value="Cotonou · Cocotomey" />
          </Field>
          <Field label="Email">
            <Input
              value="lea.adjovi@exemple.bj"
              icon={<Icon name="mail" size={18} color="var(--ink-500)" />}
            />
          </Field>
          <Field label="Niveau / classe">
            <div className="input">
              <select style={sel}>
                <option>4ème</option>
                <option>3ème</option>
                <option>5ème</option>
              </select>
            </div>
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
          <Field label="Objectifs">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <GoalChip selected>🤖 Robots</GoalChip>
              <GoalChip selected>💻 Code</GoalChip>
              <GoalChip>🧠 IA</GoalChip>
              <GoalChip>⚡ Électronique</GoalChip>
            </div>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button variant="outline">Annuler</Button>
          <Button>Enregistrer</Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD18 · MODIFIER LA CONNEXION (numéro + OTP · mot de passe)
// ════════════════════════════════════════════════════════
function WD18_EditLogin() {
  const card = {
    background: "#fff",
    border: "2px solid var(--ink-100)",
    borderRadius: 18,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };
  return (
    <WebAppShell
      active="profile"
      headerTitle="Modifier la connexion"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="crumb">
          Paramètres › <b>Connexion</b>
        </div>
        <div style={card}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            Changer de numéro
          </h3>
          <Field
            label="Nouveau numéro"
            hint="Un code de vérification te sera envoyé par SMS."
          >
            <PhoneInput value="" />
          </Field>
          <Button variant="outline">Envoyer le code</Button>
          <div
            style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}
          >
            <OTPInput value="042" activeIndex={3} />
          </div>
        </div>
        <div style={card}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            Changer le mot de passe
          </h3>
          <Field label="Mot de passe actuel">
            <PasswordInput value="" />
          </Field>
          <Field label="Nouveau mot de passe">
            <PasswordInput value="" />
          </Field>
          <div
            style={{
              background: "var(--bg)",
              padding: 16,
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              border: "2px solid var(--ink-100)",
            }}
          >
            <PwReq label="Au moins 8 caractères" />
            <PwReq label="Une lettre et un chiffre" />
          </div>
          <Button>Mettre à jour le mot de passe</Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD19 · INFO DE LIVRAISON (édition)
// ════════════════════════════════════════════════════════
function WD19_Delivery() {
  const sel = {
    border: 0,
    outline: 0,
    background: "transparent",
    flex: 1,
    font: "700 16px var(--font-sans)",
    color: "var(--ink-900)",
  };
  return (
    <WebAppShell
      active="profile"
      headerTitle="Info de livraison"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="crumb">
          Paramètres › <b>Livraison</b>
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
          <Field label="Pays" required>
            <div className="input">
              <span style={{ fontSize: 18 }}>🇧🇯</span>
              <select style={sel}>
                <option>Bénin</option>
                <option>Togo</option>
              </select>
            </div>
          </Field>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Ville" required>
              <Input value="Cotonou" />
            </Field>
            <Field label="Quartier" required>
              <Input value="Cocotomey" />
            </Field>
          </div>
          <Field label="Rue / repère" required>
            <Input value="Rue 12.45, près de la pharmacie" />
          </Field>
          <Button block>Enregistrer l'adresse</Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD20 · INFO DE PAIEMENT (Mobile Money - édition)
// ════════════════════════════════════════════════════════
function WD20_Payment() {
  const sel = {
    border: 0,
    outline: 0,
    background: "transparent",
    flex: 1,
    font: "700 16px var(--font-sans)",
    color: "var(--ink-900)",
  };
  return (
    <WebAppShell
      active="profile"
      headerTitle="Info de paiement"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="crumb">
          Paramètres › <b>Paiement</b>
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
          <Field label="Pays" required>
            <div className="input">
              <span style={{ fontSize: 18 }}>🇧🇯</span>
              <select style={sel}>
                <option>Bénin</option>
                <option>Togo</option>
              </select>
            </div>
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
              Réseau Mobile Money
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <WANetworkCard name="MTN" dot="#F5A623" selected />
              <WANetworkCard name="Moov" dot="#0066B3" />
              <WANetworkCard name="Celtiis" dot="#E2001A" />
            </div>
          </div>
          <Field label="Numéro Mobile Money" required>
            <PhoneInput value="01 90 12 34 56" />
          </Field>
          <Button block>Enregistrer</Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD21 · PROGRESSION + RECOMMANDATIONS
// ════════════════════════════════════════════════════════
function WD21_Progress() {
  const week = [
    ["L", 30],
    ["M", 55],
    ["M", 20],
    ["J", 70],
    ["V", 45],
    ["S", 90],
    ["D", 35],
  ];
  return (
    <WebAppShell active="profile" headerTitle="Ma progression">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="stat-strip">
          <StatPill
            icon="flame"
            label="Temps cette semaine"
            value="3 h 20"
            tone="amber"
          />
          <StatPill icon="sparkle" label="Points" value="1 240" tone="violet" />
          <StatPill icon="trophy" label="Badges" value="5" tone="success" />
        </div>
        <div
          style={{
            background: "#fff",
            border: "1.5px solid var(--ink-100)",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <SectionHeader title="Activité de la semaine" />
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
                        "linear-gradient(180deg, var(--primary-400), var(--primary-600))",
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
          <SectionHeader title="Maîtrise par domaine" />
          <ProgressBar value={72} label="Robotique" />
          <ProgressBar value={48} label="Programmation" tone="amber" />
          <ProgressBar value={90} label="Électronique" tone="success" />
        </div>
        <div>
          <SectionHeader title="Recommandé pour toi" action="Voir tout" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            <CourseCard
              title="L'IA pour les débutants"
              level="Débutant"
              free
              color="var(--cat-ia)"
              emoji="🧠"
            />
            <CourseCard
              title="Crée ton premier jeu"
              level="Débutant"
              price="15 000 F"
              color="var(--cat-code)"
              emoji="🎮"
            />
            <CourseCard
              title="Domotique maison"
              level="Intermédiaire"
              price="20 000 F"
              color="var(--cat-energie)"
              emoji="🏠"
            />
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD22 · INFOS DE MON PARENT (si âge < 16)
// ════════════════════════════════════════════════════════
function WD22_ParentInfo() {
  return (
    <WebAppShell
      active="profile"
      headerTitle="Infos de mon parent"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="crumb">
          Paramètres › <b>Mon parent</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 18,
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Avatar name="Marie" size={56} ring />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Marie Adjovi</div>
            <div
              style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}
            >
              Ta mère · +229 01 90 88 77 66
            </div>
          </div>
          <Badge tone="success">✓ Validé</Badge>
        </div>
        <div
          style={{
            background: "var(--primary-50)",
            border: "2px solid var(--primary-100)",
            borderRadius: 14,
            padding: 16,
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
            Ton parent valide tes achats et reçoit un résumé de ta progression.
            Tu peux demander à changer de parent référent.
          </span>
        </div>
        <Button variant="outline" block>
          Demander un changement de parent
        </Button>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WD16 · DÉCONNEXION (modal de confirmation - pattern partagé)
// ════════════════════════════════════════════════════════
function WD16_Logout() {
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <WebAppShell active="profile" headerTitle="Profil" headerSearch={false}>
        <div
          style={{ filter: "blur(1px)", opacity: 0.55, pointerEvents: "none" }}
        >
          <SectionHeader title="Mon profil" />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div
              style={{
                height: 120,
                background: "#fff",
                border: "1.5px solid var(--ink-100)",
                borderRadius: 18,
              }}
            />
            <div
              style={{
                height: 120,
                background: "#fff",
                border: "1.5px solid var(--ink-100)",
                borderRadius: 18,
              }}
            />
          </div>
        </div>
      </WebAppShell>
      <Modal
        icon="👋"
        title="Déjà l'heure de partir ?"
        body="Tu seras déconnecté·e de Steamy sur cet appareil. À très vite pour de nouvelles missions !"
        secondaryLabel="Annuler"
        primaryLabel="Se déconnecter"
        danger
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
const dashWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};

function DashboardFlowWeb() {
  return (
    <DesignCanvas>
      {/* Écrans à concevoir (C18) : screens-*-a-concevoir-web.jsx */}
      {window.LearnerACSections && window.LearnerACSections()}
      <DCSection
        id="dash"
        title="Dashboard apprenant"
        subtitle="Accueil sobre · état nouvel utilisateur · état chargement."
      >
        <DCArtboard
          id="WD01"
          label="WD01 · Accueil"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD01_Dashboard />
        </DCArtboard>
        <DCArtboard
          id="WD02"
          label="WD02 · Nouvel utilisateur"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD02_Empty />
        </DCArtboard>
        <DCArtboard
          id="WD03"
          label="WD03 · Chargement"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD03_Loading />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="notif"
        title="Notifications"
        subtitle="Liste avec onglets, état vide, paramètres avec toggles live."
      >
        <DCArtboard
          id="WD04"
          label="WD04 · Liste"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD04_NotifsList />
        </DCArtboard>
        <DCArtboard
          id="WD05"
          label="WD05 · Vide"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD05_NotifsEmpty />
        </DCArtboard>
        <DCArtboard
          id="WD06"
          label="WD06 · Paramètres"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD06_NotifsSettings />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="quiz"
        title="Mes tentatives de quiz"
        subtitle="Liste filtrable, détail enrichi, état vide."
      >
        <DCArtboard
          id="WD07"
          label="WD07 · Liste"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD07_QuizList />
        </DCArtboard>
        <DCArtboard
          id="WD08"
          label="WD08 · Détail"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD08_QuizDetail />
        </DCArtboard>
        <DCArtboard
          id="WD09"
          label="WD09 · Vide"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD09_QuizEmpty />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="events"
        title="Steamy Events · apprenant"
        subtitle="Liste des événements + mes demandes · formulaire de participation."
      >
        <DCArtboard
          id="WD10"
          label="WD10 · Événements"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD10_Events />
        </DCArtboard>
        <DCArtboard
          id="WD11"
          label="WD11 · Demande de participation"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD11_EventApply />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="help-settings"
        title="Aide & Paramètres"
        subtitle="FAQ + contact support · hub paramètres (profil, livraison, paiement, notifs)."
      >
        <DCArtboard
          id="WD12"
          label="WD12 · Aide & Support"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD12_Help />
        </DCArtboard>
        <DCArtboard
          id="WD13"
          label="WD13 · Paramètres (hub)"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD13_Settings />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="account"
        title="Mon compte"
        subtitle="Historique de commande (facture) · suppression de compte (branche âge)."
      >
        <DCArtboard
          id="WD14"
          label="WD14 · Historique commande"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD14_Orders />
        </DCArtboard>
        <DCArtboard
          id="WD15"
          label="WD15 · Supprimer le compte"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD15_DeleteAccount />
        </DCArtboard>
        <DCArtboard
          id="WD16"
          label="WD16 · Déconnexion (modal partagé)"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD16_Logout />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="settings-edit"
        title="Paramètres · sous-pages d'édition"
        subtitle="Profil · connexion (n°+OTP, mot de passe) · livraison · paiement Mobile Money."
      >
        <DCArtboard
          id="WD17"
          label="WD17 · Éditer le profil"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD17_EditProfile />
        </DCArtboard>
        <DCArtboard
          id="WD18"
          label="WD18 · Modifier la connexion"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD18_EditLogin />
        </DCArtboard>
        <DCArtboard
          id="WD19"
          label="WD19 · Info de livraison"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD19_Delivery />
        </DCArtboard>
        <DCArtboard
          id="WD20"
          label="WD20 · Info de paiement"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD20_Payment />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="account-extra"
        title="Compte · progression & parent"
        subtitle="Progression analytique + recommandations · infos du parent référent."
      >
        <DCArtboard
          id="WD21"
          label="WD21 · Progression & recommandations"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD21_Progress />
        </DCArtboard>
        <DCArtboard
          id="WD22"
          label="WD22 · Infos de mon parent"
          width={DASH_W}
          height={DASH_H}
          style={dashWebStyle}
        >
          <WD22_ParentInfo />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.DashboardFlowWeb = DashboardFlowWeb;
window.WebAppShell = WebAppShell;
