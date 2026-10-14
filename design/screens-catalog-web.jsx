// screens-catalog-web.jsx - Catalogue Parcours, version web (1240×760).
// 8 écrans : Liste (par défaut · filtré · dropdown ouvert · vide),
// Détail (gratuit · payant), Mon parcours (collapsed · expanded).
// Réutilise WebAppShell + DS, expose window.CatalogFlowWeb.

const CAT_W = 1240,
  CAT_H = 760;

// ════════════════════════════════════════════════════════
// STYLES locaux
// ════════════════════════════════════════════════════════
const catalogWeb_styles = `
/* ── Hero band (compteur + tri) ──────────────────── */
.cat-hero-band {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px;
  background: var(--ink-50);
  border-radius: 14px;
  margin-bottom: 16px;
}
.cat-hero-band__count { font-size: 14px; font-weight: 800; color: var(--ink-700); }
.cat-hero-band__count b { color: var(--primary-600); }

/* ── Filter bar ──────────────────────────────────── */
.cat-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.cat-filter-bar__chips { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
.cat-filter-bar__dropdowns { display: flex; gap: 8px; }

/* ── Dropdown button ─────────────────────────────── */
.cat-dropdown-btn {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 14px;
  background: #fff;
  border: 2px solid var(--ink-200);
  border-radius: 12px;
  font: 800 13px var(--font-sans);
  color: var(--ink-900);
  cursor: pointer;
  transition: border-color .12s;
  position: relative;
}
.cat-dropdown-btn:hover { border-color: var(--primary-300); }
.cat-dropdown-btn.is-open { border-color: var(--primary-500); box-shadow: 0 0 0 4px var(--primary-100); }
.cat-dropdown-btn__label { color: var(--ink-500); font-weight: 700; }
.cat-dropdown-btn__chev { display: inline-flex; transition: transform .15s; }
.cat-dropdown-btn.is-open .cat-dropdown-btn__chev { transform: rotate(180deg); }

/* ── Dropdown menu (popover) ─────────────────────── */
.cat-dropdown-menu {
  position: absolute;
  background: #fff;
  border: 1px solid var(--ink-100);
  border-radius: 14px;
  box-shadow: var(--shadow-modal);
  padding: 6px;
  min-width: 220px;
  z-index: 10;
}
.cat-dropdown-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font: 700 14px var(--font-sans);
  color: var(--ink-900);
}
.cat-dropdown-item:hover { background: var(--ink-100); }
.cat-dropdown-item.is-selected { background: var(--primary-50); color: var(--primary-700); }
.cat-dropdown-radio {
  width: 18px; height: 18px;
  border: 2px solid var(--ink-300);
  border-radius: 999px;
  flex-shrink: 0;
  position: relative;
}
.cat-dropdown-item.is-selected .cat-dropdown-radio {
  border-color: var(--primary-500);
}
.cat-dropdown-item.is-selected .cat-dropdown-radio::after {
  content: '';
  position: absolute;
  inset: 3px;
  background: var(--primary-500);
  border-radius: 999px;
}

/* ── Active filter bar ───────────────────────────── */
.cat-active-filter {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  background: var(--primary-50);
  border: 1px solid var(--primary-200);
  border-radius: 12px;
  margin-bottom: 16px;
  font: 700 13px var(--font-sans);
  color: var(--primary-700);
}
.cat-active-filter__count { font-weight: 900; }
.cat-active-filter__sep { color: var(--primary-300); }
.cat-active-filter__chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: #fff;
  border: 1px solid var(--primary-200);
  border-radius: 999px;
  font-weight: 800;
  cursor: pointer;
}
.cat-active-filter__chip:hover { background: var(--ink-50); }
.cat-active-filter__clear {
  margin-left: auto;
  background: transparent; border: 0;
  color: var(--primary-700);
  font: 800 13px var(--font-sans);
  cursor: pointer;
  text-decoration: underline;
}

/* ── Course hero (detail page) ───────────────────── */
.cat-hero {
  position: relative;
  padding: 20px 24px;
  border-radius: 22px;
  color: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 200px;
}
.cat-hero::after {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(255,255,255,.18), transparent 60%);
  pointer-events: none;
}
.cat-hero__body { flex: 1; min-width: 0; z-index: 1; display: flex; flex-direction: column; gap: 6px; }

/* ── Vignette vidéo aperçu (banner droit) ───────── */
.cat-hero__video {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
.cat-hero__video-thumb {
  position: relative;
  width: 280px;
  height: 160px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 32px rgba(0,0,0,.18);
  cursor: pointer;
  transition: transform .15s var(--ease-out);
}
.cat-hero__video-thumb::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(255,255,255,.22), transparent 50%),
    radial-gradient(circle at 80% 90%, rgba(0,0,0,.32), transparent 50%);
  pointer-events: none;
}
.cat-hero__video-thumb:hover { transform: translateY(-2px); }
.cat-hero__video-thumb:hover .cat-hero__video-play { transform: translate(-50%, -50%) scale(1.08); }
.cat-hero__video-emoji {
  font-size: 72px;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,.28));
  z-index: 1;
  opacity: .9;
}
.cat-hero__video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: rgba(255,255,255,.95);
  border: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 4px;
  box-shadow: 0 6px 18px rgba(0,0,0,.32);
  transition: transform .15s var(--ease-out);
  z-index: 2;
}
.cat-hero__video-duration {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(15,13,38,.78);
  color: #fff;
  font: 800 11px var(--font-sans);
  padding: 4px 8px;
  border-radius: 6px;
  z-index: 2;
  backdrop-filter: blur(4px);
}
.cat-hero__video-label {
  font-size: 11px;
  font-weight: 800;
  color: rgba(255,255,255,.85);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cat-hero__video-label::before {
  content: '';
  width: 6px; height: 6px;
  background: var(--error-500);
  border-radius: 999px;
  animation: dash-pulse 1.6s ease-in-out infinite;
}
.cat-hero__category { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .85; }
.cat-hero__title { font-size: 26px; font-weight: 900; line-height: 1.15; margin: 0; letter-spacing: -0.01em; }
.cat-hero__meta {
  display: flex; flex-wrap: wrap; gap: 14px;
  font-size: 13px; font-weight: 700; opacity: .9;
  margin-top: 4px;
}
.cat-hero__meta span { display: inline-flex; align-items: center; gap: 4px; }

/* ── Detail content sections ─────────────────────── */
.cat-detail-section { margin-top: 24px; }
.cat-detail-section h3 { font-size: 18px; font-weight: 900; margin: 0 0 12px; letter-spacing: -0.01em; }
.cat-detail-section p { font-size: 14px; line-height: 1.6; color: var(--ink-700); margin: 0 0 8px; font-weight: 500; }

/* ── Learn list ──────────────────────────────────── */
.cat-learn-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
}
.cat-learn-item {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 13px; font-weight: 700;
  color: var(--ink-800);
  line-height: 1.45;
}
.cat-learn-item__check {
  width: 22px; height: 22px;
  border-radius: 999px;
  background: var(--success-100);
  color: var(--success-600);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Curriculum project ──────────────────────────── */
.cat-curriculum {
  background: #fff;
  border: 1px solid var(--ink-100);
  border-radius: 14px;
  overflow: hidden;
}
.cat-curriculum + .cat-curriculum { margin-top: 8px; }
.cat-curriculum__head {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
}
.cat-curriculum__head:hover { background: var(--ink-50); }
.cat-curriculum__index {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: var(--primary-100);
  color: var(--primary-700);
  display: flex; align-items: center; justify-content: center;
  font: 800 12px var(--font-sans);
  flex-shrink: 0;
}
.cat-curriculum__title { flex: 1; font-size: 14px; font-weight: 800; color: var(--ink-900); }
.cat-curriculum__meta { font-size: 12px; font-weight: 700; color: var(--ink-500); }
.cat-curriculum__chev { display: inline-flex; transition: transform .15s; color: var(--ink-400); }
.cat-curriculum.is-expanded .cat-curriculum__chev { transform: rotate(180deg); }
.cat-curriculum__body {
  padding: 6px 14px 12px 50px;
  display: flex; flex-direction: column; gap: 2px;
  border-top: 1px solid var(--ink-100);
}
.cat-curriculum__mission {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  transition: background .12s;
  cursor: pointer;
}
.cat-curriculum__mission:hover { background: var(--primary-50); }
.cat-curriculum__mission-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: var(--primary-100);
  color: var(--primary-600);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cat-curriculum__mission-title {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-800);
}
.cat-curriculum__mission-duration {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-500);
  font-family: var(--font-mono);
}

/* ── Enroll card (sticky) ────────────────────────── */
.cat-enroll {
  position: sticky;
  top: 24px;
  background: #fff;
  border: 1.5px solid var(--ink-100);
  border-radius: 22px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}
.cat-enroll__price-row {
  display: flex; align-items: baseline; gap: 8px;
  margin-bottom: 4px;
}
.cat-enroll__price {
  font-size: 32px; font-weight: 900;
  color: var(--ink-900);
  letter-spacing: -0.02em;
  line-height: 1;
}
.cat-enroll__price-currency { font-size: 16px; font-weight: 800; color: var(--ink-500); }
.cat-enroll__price-sub {
  font-size: 12px; font-weight: 700; color: var(--ink-500);
  margin-bottom: 14px;
}
.cat-enroll__divider {
  height: 1px; background: var(--ink-100);
  margin: 16px -20px;
}
.cat-enroll__section-title {
  font-size: 11px; font-weight: 900;
  color: var(--ink-500); text-transform: uppercase; letter-spacing: .06em;
  margin-bottom: 10px;
}
.cat-enroll__facts { display: flex; flex-direction: column; gap: 8px; }
.cat-enroll__fact {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; color: var(--ink-700);
}
.cat-enroll__prereqs { display: flex; flex-direction: column; gap: 6px; }
.cat-enroll__prereq {
  font-size: 13px; font-weight: 600; color: var(--ink-600);
  display: flex; align-items: flex-start; gap: 8px;
  line-height: 1.4;
}
.cat-enroll__prereq::before {
  content: '•'; color: var(--primary-500); font-weight: 900; flex-shrink: 0;
}

/* ── Kit mini-card ───────────────────────────────── */
.cat-kit-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px;
  background: var(--amber-50, #FFF7ED);
  border: 1px solid var(--amber-200, #FED7AA);
  border-radius: 14px;
}
.cat-kit-card__emoji {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.cat-kit-card__body { flex: 1; min-width: 0; }
.cat-kit-card__name { font-size: 13px; font-weight: 800; color: var(--ink-900); }
.cat-kit-card__price { font-size: 12px; font-weight: 700; color: var(--amber-700); margin-top: 2px; }
.cat-kit-card__btn {
  background: #fff;
  border: 1.5px solid var(--amber-300, #FDBA74);
  border-radius: 10px;
  padding: 6px 10px;
  font: 800 12px var(--font-sans);
  color: var(--amber-700);
  cursor: pointer;
  flex-shrink: 0;
}
.cat-kit-card__btn:hover { background: var(--amber-50, #FFF7ED); }

/* ── Project card (WC06) ─────────────────────────── */
.cat-project {
  background: #fff;
  border: 1.5px solid var(--ink-100);
  border-radius: 18px;
  overflow: hidden;
  transition: border-color .12s;
}
.cat-project + .cat-project { margin-top: 12px; }
.cat-project.is-current { border-color: var(--primary-300); box-shadow: 0 4px 12px rgba(91,63,224,.08); }
.cat-project.is-locked { opacity: .7; }
.cat-project__head {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px;
  cursor: pointer;
}
.cat-project.is-locked .cat-project__head { cursor: not-allowed; }
.cat-project__icon {
  width: 44px; height: 44px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: var(--primary-100);
  color: var(--primary-700);
}
.cat-project.is-done .cat-project__icon { background: var(--success-500); color: #fff; }
.cat-project.is-current .cat-project__icon { background: var(--primary-500); color: #fff; }
.cat-project.is-locked .cat-project__icon { background: var(--ink-100); color: var(--ink-400); }
.cat-project__body { flex: 1; min-width: 0; }
.cat-project__index { font-size: 11px; font-weight: 800; color: var(--ink-500); letter-spacing: .04em; text-transform: uppercase; }
.cat-project__title { font-size: 16px; font-weight: 800; color: var(--ink-900); margin-top: 2px; }
.cat-project__meta { font-size: 12px; font-weight: 700; color: var(--ink-500); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
.cat-project__chev { display: inline-flex; transition: transform .18s; color: var(--ink-400); }
.cat-project.is-expanded .cat-project__chev { transform: rotate(180deg); }
.cat-project__missions {
  padding: 4px 16px 16px;
  display: flex; flex-direction: column; gap: 8px;
  border-top: 1px solid var(--ink-100);
}

/* ── Catalog grid ────────────────────────────────── */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* ── Empty state ─────────────────────────────────── */
.cat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 24px;
  gap: 12px;
  max-width: 480px;
  margin: 24px auto;
}
.cat-empty h2 { font-size: 22px; font-weight: 900; margin: 8px 0 0; letter-spacing: -0.01em; }
.cat-empty p { font-size: 14px; font-weight: 600; color: var(--ink-600); margin: 0; line-height: 1.5; }

/* ── Crumb (réutilise dashboard) ─────────────────── */
.cat-crumb { font-size: 12px; font-weight: 700; color: var(--ink-500); margin-bottom: 12px; }
.cat-crumb b { color: var(--ink-900); font-weight: 800; }

/* ── Compressed hero (WC06) ──────────────────────── */
.cat-hero-compact {
  position: relative;
  padding: 18px 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
  color: #fff;
  overflow: hidden;
  display: flex; align-items: center; gap: 20px;
  min-height: 110px;
  margin-bottom: 20px;
}
.cat-hero-compact__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.cat-hero-compact__kicker { font-size: 11px; font-weight: 800; letter-spacing: .08em; opacity: .85; text-transform: uppercase; }
.cat-hero-compact__title { font-size: 20px; font-weight: 900; line-height: 1.15; margin: 0; }
.cat-hero-compact__progress { display: flex; align-items: center; gap: 12px; max-width: 380px; margin-top: 6px; }
.cat-hero-compact__progress .bar { flex: 1; height: 8px; background: rgba(255,255,255,.25); border-radius: 999px; overflow: hidden; }
.cat-hero-compact__progress .bar > span { display: block; height: 100%; background: var(--amber-400); border-radius: 999px; }
.cat-hero-compact__pct { font-size: 12px; font-weight: 900; }
.cat-hero-compact__remain { font-size: 12px; font-weight: 700; opacity: .85; }

/* tiny badge × close */
.cat-chip-x {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px;
  background: #fff;
  border: 1.5px solid var(--primary-300);
  color: var(--primary-700);
  border-radius: 999px;
  font: 800 12px var(--font-sans);
  cursor: pointer;
}
.cat-chip-x:hover { background: var(--primary-50); }
`;

if (!document.getElementById("catalog-web-styles")) {
  const s = document.createElement("style");
  s.id = "catalog-web-styles";
  s.textContent = catalogWeb_styles;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════
const CATEGORIES = [
  { id: "all", label: "Toutes" },
  { id: "robotique", label: "Robotique", color: "var(--cat-robotique)" },
  {
    id: "electronique",
    label: "Électronique",
    color: "var(--cat-electronique)",
  },
  { id: "code", label: "Code", color: "var(--cat-code)" },
  { id: "ia", label: "IA", color: "var(--cat-ia)" },
  { id: "mecanique", label: "Mécanique", color: "var(--cat-mecanique)" },
  { id: "energie", label: "Énergie", color: "var(--cat-energie)" },
];

const COURSES_DEFAULT = [
  {
    title: "Initiation à Scratch",
    cat: "code",
    emoji: "💻",
    level: "Débutant",
    free: true,
    color: "var(--cat-code)",
  },
  {
    title: "Découverte de la robotique",
    cat: "robotique",
    emoji: "🤖",
    level: "Débutant",
    free: true,
    color: "var(--cat-robotique)",
    progress: 35,
  },
  {
    title: "Capteurs électroniques",
    cat: "electronique",
    emoji: "⚡",
    level: "Intermédiaire",
    price: "18 000 F",
    color: "var(--cat-electronique)",
  },
  {
    title: "L'IA pour les débutants",
    cat: "ia",
    emoji: "🧠",
    level: "Débutant",
    free: true,
    color: "var(--cat-ia)",
  },
  {
    title: "Construis ton robot Bluetooth",
    cat: "robotique",
    emoji: "📡",
    level: "Intermédiaire",
    price: "25 000 F",
    color: "var(--cat-robotique)",
    progress: 32,
  },
  {
    title: "Énergie solaire DIY",
    cat: "energie",
    emoji: "☀️",
    level: "Débutant",
    price: "15 000 F",
    color: "var(--cat-energie)",
  },
  {
    title: "Engrenages & mécanismes",
    cat: "mecanique",
    emoji: "⚙️",
    level: "Débutant",
    free: true,
    color: "var(--cat-mecanique)",
  },
  {
    title: "Algorithmique avancée",
    cat: "code",
    emoji: "🧮",
    level: "Avancé",
    price: "20 000 F",
    color: "var(--cat-code)",
  },
  {
    title: "Premiers circuits",
    cat: "electronique",
    emoji: "🔌",
    level: "Débutant",
    free: true,
    color: "var(--cat-electronique)",
  },
];

const COURSES_ROBOTIQUE_DEBUTANT = [
  {
    title: "Découverte de la robotique",
    cat: "robotique",
    emoji: "🤖",
    level: "Débutant",
    free: true,
    color: "var(--cat-robotique)",
    progress: 35,
  },
  {
    title: "Premiers pas avec moteurs",
    cat: "robotique",
    emoji: "🦾",
    level: "Débutant",
    free: true,
    color: "var(--cat-robotique)",
  },
  {
    title: "Robot suiveur de ligne",
    cat: "robotique",
    emoji: "🛤️",
    level: "Débutant",
    price: "12 000 F",
    color: "var(--cat-robotique)",
  },
];

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

function DropdownButton({ label, value, open, onClick }) {
  return (
    <button
      className={["cat-dropdown-btn", open && "is-open"]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      <span className="cat-dropdown-btn__label">{label} ·</span>
      <span>{value}</span>
      <span className="cat-dropdown-btn__chev">
        <Icon name="chevron-down" size={14} color="var(--ink-500)" />
      </span>
    </button>
  );
}

function DropdownMenu({ items, value, style }) {
  return (
    <div className="cat-dropdown-menu" style={style}>
      {items.map((it) => (
        <div
          key={it.id}
          className={["cat-dropdown-item", value === it.id && "is-selected"]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="cat-dropdown-radio" />
          <span style={{ flex: 1 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function CatalogHeroBand({ count, sortBy = "Plus populaires" }) {
  return (
    <div className="cat-hero-band">
      <div className="cat-hero-band__count">
        <b>{count} parcours</b> · 6 catégories · adaptés aux 10–17 ans
      </div>
      <button
        className="cat-dropdown-btn"
        style={{ background: "transparent", border: 0, padding: "0 6px" }}
      >
        <span className="cat-dropdown-btn__label">Trier par</span>
        <span style={{ fontWeight: 800, color: "var(--ink-900)" }}>
          {sortBy}
        </span>
        <span className="cat-dropdown-btn__chev">
          <Icon name="chevron-down" size={14} color="var(--ink-500)" />
        </span>
      </button>
    </div>
  );
}

function ActiveFilterBar({ count, filters, onClear }) {
  return (
    <div className="cat-active-filter">
      <span className="cat-active-filter__count">{count} parcours</span>
      <span className="cat-active-filter__sep">·</span>
      {filters.map((f, i) => (
        <React.Fragment key={i}>
          <button className="cat-chip-x">
            <span>{f}</span>
            <Icon
              name="x"
              size={12}
              color="var(--primary-700)"
              strokeWidth={3}
            />
          </button>
        </React.Fragment>
      ))}
      <button className="cat-active-filter__clear" onClick={onClear}>
        Effacer les filtres
      </button>
    </div>
  );
}

function CourseHero({
  category,
  color,
  emoji,
  title,
  level,
  duration,
  rating,
  students,
  premium,
  free,
  videoDuration = "2 min 14",
}) {
  return (
    <div className="cat-hero" style={{ background: color }}>
      <div className="cat-hero__body">
        <span className="cat-hero__category">{category}</span>
        <h1 className="cat-hero__title">{title}</h1>
        <div className="cat-hero__meta">
          <span>
            <Icon name="trophy" size={14} color="#fff" /> {level}
          </span>
          <span>⏱ {duration}</span>
          <span>
            <Icon name="star" size={14} color="var(--amber-400)" /> {rating}
          </span>
          <span>
            <Icon name="user" size={14} color="#fff" /> {students} inscrits
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          {free && (
            <Badge tone="success" solid>
              Gratuit
            </Badge>
          )}
          {premium && (
            <Badge tone="amber" solid>
              Premium
            </Badge>
          )}
        </div>
      </div>
      <div className="cat-hero__video">
        <div className="cat-hero__video-thumb" style={{ background: color }}>
          <span className="cat-hero__video-emoji">{emoji}</span>
          <button
            className="cat-hero__video-play"
            aria-label="Lire la bande-annonce"
          >
            <Icon
              name="play"
              size={26}
              color="var(--ink-900)"
              strokeWidth={2.5}
            />
          </button>
          <span className="cat-hero__video-duration">{videoDuration}</span>
        </div>
        <div className="cat-hero__video-label">Bande-annonce</div>
      </div>
    </div>
  );
}

function LearnList({ items }) {
  return (
    <div className="cat-learn-list">
      {items.map((it, i) => (
        <div key={i} className="cat-learn-item">
          <div className="cat-learn-item__check">
            <Icon
              name="check"
              size={12}
              color="var(--success-600)"
              strokeWidth={3}
            />
          </div>
          <span>{it}</span>
        </div>
      ))}
    </div>
  );
}

function CurriculumProject({
  index,
  title,
  duration,
  missions = [],
  expanded,
}) {
  return (
    <div
      className={["cat-curriculum", expanded && "is-expanded"]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="cat-curriculum__head">
        <div className="cat-curriculum__index">{index}</div>
        <span className="cat-curriculum__title">{title}</span>
        <span className="cat-curriculum__meta">
          {duration} · {missions.length} missions
        </span>
        <span className="cat-curriculum__chev">
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
      {expanded && missions.length > 0 && (
        <div className="cat-curriculum__body">
          {missions.map((m, i) => (
            <div key={i} className="cat-curriculum__mission">
              <span className="cat-curriculum__mission-icon">
                <Icon name="video" size={14} color="var(--primary-600)" />
              </span>
              <span className="cat-curriculum__mission-title">{m.title}</span>
              <span className="cat-curriculum__mission-duration">
                {m.duration}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EnrollCard({
  free,
  price,
  currency = "F CFA",
  priceSub,
  ctaLabel,
  ctaVariant = "primary",
  facts = [],
  prereqs = [],
  kit,
}) {
  return (
    <div className="cat-enroll">
      {free ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <Badge tone="success" solid>
              Gratuit · accès complet
            </Badge>
          </div>
        </>
      ) : (
        <>
          <div className="cat-enroll__price-row">
            <span className="cat-enroll__price">{price}</span>
            <span className="cat-enroll__price-currency">{currency}</span>
          </div>
          <div className="cat-enroll__price-sub">
            📱 Paiement Mobile Money - accès à vie
          </div>
        </>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Button
          block
          size="lg"
          variant={ctaVariant}
          icon={
            <Icon
              name={free ? "play" : "cart"}
              size={18}
              color="#fff"
              strokeWidth={3}
            />
          }
        >
          {ctaLabel}
        </Button>
        <Button
          block
          variant="ghost"
          icon={
            <Icon
              name="heart"
              size={18}
              color="var(--primary-600)"
              strokeWidth={2.5}
            />
          }
        >
          Ajouter aux souhaits
        </Button>
      </div>

      <div className="cat-enroll__divider" />

      <div className="cat-enroll__section-title">Inclus dans le parcours</div>
      <div className="cat-enroll__facts">
        {facts.map((f, i) => (
          <div key={i} className="cat-enroll__fact">
            <span style={{ fontSize: 16 }}>{f.icon}</span>
            <span>{f.text}</span>
          </div>
        ))}
      </div>

      {prereqs.length > 0 && (
        <>
          <div className="cat-enroll__divider" />
          <div className="cat-enroll__section-title">Prérequis</div>
          <div className="cat-enroll__prereqs">
            {prereqs.map((p, i) => (
              <div key={i} className="cat-enroll__prereq">
                {p}
              </div>
            ))}
          </div>
        </>
      )}

      {kit && (
        <>
          <div className="cat-enroll__divider" />
          <div className="cat-enroll__section-title">Kit requis</div>
          {kit}
        </>
      )}
    </div>
  );
}

function KitMiniCard({ name, price, emoji = "📦" }) {
  return (
    <div className="cat-kit-card">
      <div className="cat-kit-card__emoji">{emoji}</div>
      <div className="cat-kit-card__body">
        <div className="cat-kit-card__name">{name}</div>
        <div className="cat-kit-card__price">{price}</div>
      </div>
      <button className="cat-kit-card__btn">Voir</button>
    </div>
  );
}

function ProjectCard({
  index,
  title,
  duration,
  state = "todo",
  missions = [],
  expanded,
  levelInfo,
}) {
  const stateClass =
    state === "done"
      ? "is-done"
      : state === "current"
        ? "is-current"
        : state === "locked"
          ? "is-locked"
          : "";
  return (
    <div
      className={["cat-project", stateClass, expanded && "is-expanded"]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="cat-project__head">
        <div className="cat-project__icon">
          {state === "done"
            ? "✓"
            : state === "locked"
              ? "🔒"
              : state === "current"
                ? "⚡"
                : index}
        </div>
        <div className="cat-project__body">
          <div className="cat-project__index">Projet {index}</div>
          <div className="cat-project__title">{title}</div>
          <div className="cat-project__meta">
            <span>⏱ {duration}</span>
            {state === "done" && (
              <span style={{ color: "var(--success-600)" }}>· Terminé</span>
            )}
            {state === "current" && (
              <span style={{ color: "var(--primary-600)" }}>
                · {levelInfo || "En cours"}
              </span>
            )}
            {state === "locked" && <span>· Verrouillé</span>}
          </div>
        </div>
        {state !== "locked" && (
          <span className="cat-project__chev">
            <Icon name="chevron-down" size={18} />
          </span>
        )}
        {state === "locked" && (
          <Icon name="lock" size={18} color="var(--ink-400)" />
        )}
      </div>
      {expanded && state !== "locked" && missions.length > 0 && (
        <div className="cat-project__missions">
          {missions.map((m, i) => (
            <MissionItem
              key={i}
              step={m.step}
              title={m.title}
              duration={m.duration}
              state={m.state}
              icon={m.icon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WC01 · Liste par défaut
// ════════════════════════════════════════════════════════
function WC01_List() {
  return (
    <WebAppShell active="catalog" headerTitle="Catalogue">
      <CatalogHeroBand count={24} />

      <div className="cat-filter-bar">
        <div className="cat-filter-bar__chips">
          {CATEGORIES.map((c) => (
            <Tag key={c.id} active={c.id === "all"} color={c.color}>
              {c.label}
            </Tag>
          ))}
        </div>
        <div className="cat-filter-bar__dropdowns">
          <DropdownButton label="Niveau" value="Tous" />
          <DropdownButton label="Prix" value="Tous" />
        </div>
      </div>

      <div className="cat-grid">
        {COURSES_DEFAULT.map((c, i) => (
          <CourseCard key={i} {...c} />
        ))}
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WC02 · Liste filtrée (Robotique)
// ════════════════════════════════════════════════════════
function WC02_Filtered() {
  return (
    <WebAppShell active="catalog" headerTitle="Catalogue">
      <CatalogHeroBand count={3} />

      <div className="cat-filter-bar">
        <div className="cat-filter-bar__chips">
          {CATEGORIES.map((c) => (
            <Tag key={c.id} active={c.id === "robotique"} color={c.color}>
              {c.label}
            </Tag>
          ))}
        </div>
        <div className="cat-filter-bar__dropdowns">
          <DropdownButton label="Niveau" value="Débutant" />
          <DropdownButton label="Prix" value="Tous" />
        </div>
      </div>

      <ActiveFilterBar count={3} filters={["Robotique", "Débutant"]} />

      <div className="cat-grid">
        {COURSES_ROBOTIQUE_DEBUTANT.map((c, i) => (
          <CourseCard key={i} {...c} />
        ))}
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WC02b · Dropdown Niveau ouvert
// ════════════════════════════════════════════════════════
function WC02b_Dropdown() {
  return (
    <WebAppShell active="catalog" headerTitle="Catalogue">
      <CatalogHeroBand count={24} />

      <div className="cat-filter-bar" style={{ position: "relative" }}>
        <div className="cat-filter-bar__chips">
          {CATEGORIES.map((c) => (
            <Tag key={c.id} active={c.id === "all"} color={c.color}>
              {c.label}
            </Tag>
          ))}
        </div>
        <div
          className="cat-filter-bar__dropdowns"
          style={{ position: "relative" }}
        >
          <DropdownButton label="Niveau" value="Tous" open />
          <DropdownButton label="Prix" value="Tous" />
          {/* Popover */}
          <DropdownMenu
            items={[
              { id: "all", label: "Tous niveaux" },
              { id: "beginner", label: "Débutant" },
              { id: "inter", label: "Intermédiaire" },
              { id: "advanced", label: "Avancé" },
            ]}
            value="all"
            style={{ top: 46, right: 90 }}
          />
        </div>
      </div>

      {/* Grille atténuée pour donner du focus au popover */}
      <div
        className="cat-grid"
        style={{ opacity: 0.55, pointerEvents: "none" }}
      >
        {COURSES_DEFAULT.slice(0, 6).map((c, i) => (
          <CourseCard key={i} {...c} />
        ))}
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WC03 · Liste vide
// ════════════════════════════════════════════════════════
function WC03_Empty() {
  return (
    <WebAppShell active="catalog" headerTitle="Catalogue">
      <CatalogHeroBand count={0} />

      <div className="cat-filter-bar">
        <div className="cat-filter-bar__chips">
          {CATEGORIES.map((c) => (
            <Tag key={c.id} active={c.id === "ia"} color={c.color}>
              {c.label}
            </Tag>
          ))}
        </div>
        <div className="cat-filter-bar__dropdowns">
          <DropdownButton label="Niveau" value="Avancé" />
          <DropdownButton label="Prix" value="Gratuit" />
        </div>
      </div>

      <ActiveFilterBar count={0} filters={["IA", "Avancé", "Gratuit"]} />

      <div className="cat-empty">
        <Mascot pose="sad" size={160} hue="var(--primary-500)" />
        <h2>Aucun parcours ne correspond</h2>
        <p>
          Essaie de retirer un filtre ou explore d'autres catégories - on a 24
          parcours dans la base.
        </p>
        <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
          <Button
            variant="outline"
            icon={<Icon name="x" size={16} strokeWidth={3} />}
          >
            Effacer les filtres
          </Button>
          <Button variant="primary">Voir toutes les catégories</Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WC04 · Détail parcours gratuit
// ════════════════════════════════════════════════════════
function WC04_Free() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Initiation à Scratch"
      headerSearch={false}
    >
      <div className="cat-crumb">
        Catalogue › Code › <b>Initiation à Scratch</b>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 308px",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* Colonne gauche */}
        <div>
          <CourseHero
            category="Code · Programmation visuelle"
            color="var(--cat-code)"
            emoji="💻"
            title="Initiation à Scratch"
            level="Débutant"
            duration="8h"
            rating="4.9"
            students="2 140"
            free
          />

          <div className="cat-detail-section">
            <h3>À propos du parcours</h3>
            <p>
              Ce parcours t'initie à la programmation avec Scratch,
              l'environnement visuel développé par le MIT. Tu apprendras à créer
              tes premières animations, jeux et histoires interactives en
              assemblant des blocs colorés.
            </p>
            <p>
              À la fin du parcours, tu seras capable de créer un mini-jeu
              fonctionnel et de comprendre les concepts fondamentaux de la
              programmation : variables, boucles, conditions, événements.
            </p>
          </div>

          <div className="cat-detail-section">
            <h3>Ce que tu vas apprendre</h3>
            <LearnList
              items={[
                "Construire un programme avec des blocs visuels",
                "Utiliser variables et boucles efficacement",
                "Créer des animations et personnages",
                "Gérer des événements clavier/souris",
                "Programmer la logique d'un mini-jeu",
                "Déboguer un programme étape par étape",
              ]}
            />
          </div>

          <div className="cat-detail-section">
            <h3>Programme · 3 projets</h3>
            <CurriculumProject
              index={1}
              title="Premiers blocs et animations"
              duration="2h"
              missions={[
                { title: "Découvrir l'interface", duration: "8 min" },
                { title: "Mes premiers personnages", duration: "12 min" },
                { title: "Animation simple", duration: "15 min" },
              ]}
              expanded
            />
            <CurriculumProject
              index={2}
              title="Variables et boucles"
              duration="3h"
              missions={[
                { title: "Créer une variable", duration: "10 min" },
                { title: "Boucles répéter", duration: "14 min" },
                { title: "Mini-jeu de score", duration: "18 min" },
              ]}
            />
            <CurriculumProject
              index={3}
              title="Mon mini-jeu complet"
              duration="3h"
              missions={[
                { title: "Personnage jouable", duration: "15 min" },
                { title: "Niveaux & obstacles", duration: "20 min" },
                { title: "Écran de fin", duration: "12 min" },
              ]}
            />
          </div>

          <div className="cat-detail-section">
            <h3>Public cible</h3>
            <p>
              Ce parcours est conçu pour les apprenants de <b>10–14 ans</b> qui
              découvrent la programmation. Aucun prérequis technique nécessaire.
            </p>
          </div>
        </div>

        {/* Colonne droite (sticky) */}
        <EnrollCard
          free
          ctaLabel="Commencer le parcours"
          ctaVariant="secondary"
          facts={[
            { icon: "⏱", text: "8h de contenu" },
            { icon: "📦", text: "3 projets" },
            { icon: "🎯", text: "9 missions" },
            { icon: "🏆", text: "3 badges à débloquer" },
            { icon: "📜", text: "Certificat à la fin" },
          ]}
          prereqs={["Savoir lire et écrire", "Un ordinateur avec navigateur"]}
        />
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WC05 · Détail parcours payant
// ════════════════════════════════════════════════════════
function WC05_Paid() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Construis ton robot Bluetooth"
      headerSearch={false}
    >
      <div className="cat-crumb">
        Catalogue › Robotique › <b>Construis ton robot Bluetooth</b>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 308px",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* Colonne gauche */}
        <div>
          <CourseHero
            category="Robotique · Niveau avancé"
            color="var(--cat-robotique)"
            emoji="📡"
            title="Construis ton robot Bluetooth"
            level="Intermédiaire"
            duration="12h"
            rating="4.8"
            students="1 240"
            premium
          />

          <div className="cat-detail-section">
            <h3>À propos du parcours</h3>
            <p>
              Construis ton propre robot mobile contrôlé par smartphone via
              Bluetooth. Ce parcours combine robotique, électronique et
              programmation pour aboutir à un projet concret que tu pourras
              emporter chez toi.
            </p>
            <p>
              Tu apprendras à câbler des composants, programmer un
              microcontrôleur, et établir une communication sans fil. À la fin,
              ton robot répondra à tes commandes depuis l'application Steamy
              mobile.
            </p>
          </div>

          <div className="cat-detail-section">
            <h3>Ce que tu vas apprendre</h3>
            <LearnList
              items={[
                "Câbler une carte microcontrôleur",
                "Programmer un servo-moteur",
                "Configurer un module Bluetooth HC-05",
                "Lire les valeurs d'un capteur",
                "Coder une interface mobile simple",
                "Déboguer un système embarqué",
              ]}
            />
          </div>

          <div className="cat-detail-section">
            <h3>Programme · 4 projets</h3>
            <CurriculumProject
              index={1}
              title="Premiers circuits"
              duration="3h"
              missions={[
                { title: "Composants de base", duration: "20 min" },
                { title: "Loi d'Ohm en pratique", duration: "25 min" },
                { title: "Série & parallèle", duration: "30 min" },
              ]}
              expanded
            />
            <CurriculumProject
              index={2}
              title="Capteurs & moteurs"
              duration="4h"
              missions={[
                { title: "Capteur infrarouge", duration: "35 min" },
                { title: "Servo-moteur", duration: "40 min" },
                { title: "Calibration", duration: "25 min" },
              ]}
            />
            <CurriculumProject
              index={3}
              title="Connexion Bluetooth"
              duration="3h"
              missions={[
                { title: "Module HC-05", duration: "30 min" },
                { title: "Pairing avec téléphone", duration: "25 min" },
                { title: "Protocole de commandes", duration: "35 min" },
              ]}
            />
            <CurriculumProject
              index={4}
              title="Robot complet"
              duration="2h"
              missions={[
                { title: "Assemblage final", duration: "40 min" },
                { title: "Tests autonomie", duration: "20 min" },
                { title: "Personnalisation", duration: "30 min" },
              ]}
            />
          </div>

          <div className="cat-detail-section">
            <h3>Public cible</h3>
            <p>
              Pour les apprenants de <b>12–17 ans</b> ayant déjà fait un peu de
              robotique ou d'électronique de base.
            </p>
          </div>
        </div>

        {/* Colonne droite (sticky) */}
        <EnrollCard
          price="25 000"
          ctaLabel="Acheter le parcours"
          ctaVariant="primary"
          facts={[
            { icon: "⏱", text: "12h de contenu" },
            { icon: "📦", text: "4 projets" },
            { icon: "🎯", text: "12 missions" },
            { icon: "🏆", text: "4 badges + 1 trophée" },
            { icon: "📜", text: "Certificat officiel" },
            { icon: "💬", text: "Support coach inclus" },
          ]}
          prereqs={[
            "Bases d'électronique (avoir fait Premiers circuits)",
            "Smartphone Android compatible Bluetooth",
            "Espace de travail au calme",
          ]}
          kit={
            <KitMiniCard
              name="Kit Robot Bluetooth"
              price="25 000 F · livré en 5 j"
              emoji="🤖"
            />
          }
        />
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WC06a · Inscrit, projets collapsed
// ════════════════════════════════════════════════════════
function WC06a_Collapsed() {
  const projects = [
    { index: 1, title: "Premiers circuits", duration: "3h", state: "done" },
    {
      index: 2,
      title: "Capteurs & moteurs",
      duration: "4h",
      state: "current",
      levelInfo: "Niveau 2/3",
    },
    { index: 3, title: "Connexion Bluetooth", duration: "3h", state: "locked" },
    { index: 4, title: "Robot complet", duration: "2h", state: "locked" },
  ];
  return (
    <WebAppShell
      active="home"
      headerTitle="Construis ton robot Bluetooth"
      headerSearch={false}
      notifDot
    >
      <div className="cat-crumb">
        Mes parcours › <b>Construis ton robot Bluetooth</b>
      </div>

      <div className="cat-hero-compact">
        <div className="cat-hero-compact__body">
          <span className="cat-hero-compact__kicker">
            Robotique · Niveau 2 sur 8
          </span>
          <h2 className="cat-hero-compact__title">
            Construis ton robot Bluetooth
          </h2>
          <div className="cat-hero-compact__progress">
            <div className="bar">
              <span style={{ width: "32%" }} />
            </div>
            <span className="cat-hero-compact__pct">32%</span>
            <span className="cat-hero-compact__remain">· 3h 12m restant</span>
          </div>
        </div>
        <Button
          variant="amber"
          size="lg"
          icon={<Icon name="play" size={18} color="#fff" strokeWidth={3} />}
        >
          Continuer la mission
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 900,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Ton parcours · 4 projets
        </h3>
        <span
          style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}
        >
          1 terminé · 1 en cours · 2 verrouillés
        </span>
      </div>

      {projects.map((p) => (
        <ProjectCard key={p.index} {...p} />
      ))}
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WC06b · Inscrit, projet 2 expanded
// ════════════════════════════════════════════════════════
function WC06b_Expanded() {
  const projects = [
    { index: 1, title: "Premiers circuits", duration: "3h", state: "done" },
    {
      index: 2,
      title: "Capteurs & moteurs",
      duration: "4h",
      state: "current",
      levelInfo: "Niveau 2/3",
      expanded: true,
      missions: [
        {
          step: "Mission 1",
          title: "Capteur infrarouge",
          duration: "45 min",
          state: "done",
          icon: "👁",
        },
        {
          step: "Mission 2",
          title: "Servo-moteur · calibration",
          duration: "1h",
          state: "current",
          icon: "⚙️",
        },
        {
          step: "Mission 3",
          title: "Capteurs avancés",
          duration: "50 min",
          state: "locked",
          icon: "🛰",
        },
      ],
    },
    { index: 3, title: "Connexion Bluetooth", duration: "3h", state: "locked" },
    { index: 4, title: "Robot complet", duration: "2h", state: "locked" },
  ];
  return (
    <WebAppShell
      active="home"
      headerTitle="Construis ton robot Bluetooth"
      headerSearch={false}
      notifDot
    >
      <div className="cat-crumb">
        Mes parcours › <b>Construis ton robot Bluetooth</b>
      </div>

      <div className="cat-hero-compact">
        <div className="cat-hero-compact__body">
          <span className="cat-hero-compact__kicker">
            Robotique · Niveau 2 sur 8
          </span>
          <h2 className="cat-hero-compact__title">
            Construis ton robot Bluetooth
          </h2>
          <div className="cat-hero-compact__progress">
            <div className="bar">
              <span style={{ width: "32%" }} />
            </div>
            <span className="cat-hero-compact__pct">32%</span>
            <span className="cat-hero-compact__remain">· 3h 12m restant</span>
          </div>
        </div>
        <Button
          variant="amber"
          size="lg"
          icon={<Icon name="play" size={18} color="#fff" strokeWidth={3} />}
        >
          Continuer la mission
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 900,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Ton parcours · 4 projets
        </h3>
        <span
          style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}
        >
          1 terminé · 1 en cours · 2 verrouillés
        </span>
      </div>

      {projects.map((p) => (
        <ProjectCard key={p.index} {...p} />
      ))}
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
const catWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};

function CatalogFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="cat-list"
        title="Liste catalogue"
        subtitle="Browse + filtres + dropdown ouvert + état vide."
      >
        <DCArtboard
          id="WC01"
          label="WC01 · Par défaut"
          width={CAT_W}
          height={CAT_H}
          style={catWebStyle}
        >
          <WC01_List />
        </DCArtboard>
        <DCArtboard
          id="WC02"
          label="WC02 · Filtré (Robotique · Débutant)"
          width={CAT_W}
          height={CAT_H}
          style={catWebStyle}
        >
          <WC02_Filtered />
        </DCArtboard>
        <DCArtboard
          id="WC02b"
          label="WC02b · Dropdown Niveau ouvert"
          width={CAT_W}
          height={CAT_H}
          style={catWebStyle}
        >
          <WC02b_Dropdown />
        </DCArtboard>
        <DCArtboard
          id="WC03"
          label="WC03 · Aucun résultat"
          width={CAT_W}
          height={CAT_H}
          style={catWebStyle}
        >
          <WC03_Empty />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="cat-detail"
        title="Détail parcours"
        subtitle="2 colonnes sticky CTA · variantes gratuit & payant."
      >
        <DCArtboard
          id="WC04"
          label="WC04 · Gratuit"
          width={CAT_W}
          height={CAT_H}
          style={catWebStyle}
        >
          <WC04_Free />
        </DCArtboard>
        <DCArtboard
          id="WC05"
          label="WC05 · Payant + kit"
          width={CAT_W}
          height={CAT_H}
          style={catWebStyle}
        >
          <WC05_Paid />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="cat-enrolled"
        title="Mon parcours"
        subtitle="Vue post-inscription · projets et missions."
      >
        <DCArtboard
          id="WC06a"
          label="WC06a · Projets collapsed"
          width={CAT_W}
          height={CAT_H}
          style={catWebStyle}
        >
          <WC06a_Collapsed />
        </DCArtboard>
        <DCArtboard
          id="WC06b"
          label="WC06b · Projet 2 expanded"
          width={CAT_W}
          height={CAT_H}
          style={catWebStyle}
        >
          <WC06b_Expanded />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.CatalogFlowWeb = CatalogFlowWeb;
