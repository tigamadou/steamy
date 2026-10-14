// screens-wishlist-web.jsx - Mes souhaits, version web (1240×760).
// 3 écrans : avec items · vide · toast après retrait.
// Réutilise WebAppShell + CourseCard + Toast (DS), expose window.WishlistFlowWeb.

const WISH_W = 1240,
  WISH_H = 760;

// ════════════════════════════════════════════════════════
// STYLES locaux (juste de quoi positionner le toast)
// ════════════════════════════════════════════════════════
const wishlistWeb_styles = `
.wish-band {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  background: var(--ink-50);
  border-radius: 14px;
  margin-bottom: 20px;
}
.wish-band__count { font-size: 15px; font-weight: 800; color: var(--ink-900); }
.wish-band__count b { color: var(--primary-600); }
.wish-band__sub { font-size: 13px; font-weight: 600; color: var(--ink-500); margin-left: 4px; }
.wish-band__sort {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 12px;
  background: #fff;
  border: 1.5px solid var(--ink-200);
  border-radius: 12px;
  font: 800 13px var(--font-sans);
  color: var(--ink-900);
  cursor: pointer;
}
.wish-band__sort:hover { border-color: var(--primary-300); }

.wish-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.wish-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  gap: 16px;
  max-width: 480px;
  margin: 32px auto;
}
.wish-empty h2 { font-size: 24px; font-weight: 900; margin: 8px 0 0; letter-spacing: -0.01em; }
.wish-empty p { font-size: 14px; font-weight: 600; color: var(--ink-600); margin: 0; line-height: 1.5; }

/* Toast positioning inside the artboard's content area */
.wish-toast-wrap {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}
.wish-toast-undo {
  background: transparent;
  border: 0;
  color: var(--amber-400);
  font: 800 13px var(--font-sans);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
}
.wish-toast-undo:hover { background: rgba(255,255,255,.1); }
`;

if (!document.getElementById("wishlist-web-styles")) {
  const s = document.createElement("style");
  s.id = "wishlist-web-styles";
  s.textContent = wishlistWeb_styles;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════
const WISHLIST_FULL = [
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
    title: "L'IA pour les débutants",
    cat: "ia",
    emoji: "🧠",
    level: "Débutant",
    free: true,
    color: "var(--cat-ia)",
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
    title: "Énergie solaire DIY",
    cat: "energie",
    emoji: "☀️",
    level: "Débutant",
    price: "15 000 F",
    color: "var(--cat-energie)",
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
    title: "Engrenages & mécanismes",
    cat: "mecanique",
    emoji: "⚙️",
    level: "Débutant",
    free: true,
    color: "var(--cat-mecanique)",
  },
];

// Pour WW03 : on a "retiré" le 4ᵉ (Énergie solaire) → 5 cards restantes
const WISHLIST_AFTER_REMOVE = WISHLIST_FULL.filter(
  (c) => c.title !== "Énergie solaire DIY",
);

// ════════════════════════════════════════════════════════
// HELPERS internes
// ════════════════════════════════════════════════════════
function WishHeader({ count }) {
  return (
    <div className="wish-band">
      <div>
        <span className="wish-band__count">
          <b>
            {count} parcours sauvegardé{count > 1 ? "s" : ""}
          </b>
        </span>
        <span className="wish-band__sub">
          · garde un œil sur ce qui te plaît
        </span>
      </div>
      <button className="wish-band__sort">
        <span style={{ color: "var(--ink-500)", fontWeight: 700 }}>
          Trier ·
        </span>
        <span>Plus récents</span>
        <Icon name="chevron-down" size={14} color="var(--ink-500)" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WW01 · Wishlist avec items
// ════════════════════════════════════════════════════════
function WW01_List() {
  return (
    <WebAppShell active="wishlist" headerTitle="Mes souhaits" notifDot>
      <WishHeader count={WISHLIST_FULL.length} />
      <div className="wish-grid">
        {WISHLIST_FULL.map((c, i) => (
          <CourseCard key={i} {...c} favorited />
        ))}
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WW02 · Wishlist vide
// ════════════════════════════════════════════════════════
function WW02_Empty() {
  return (
    <WebAppShell active="wishlist" headerTitle="Mes souhaits">
      <div className="wish-empty">
        <Mascot pose="wave" size={180} />
        <h2>Aucun parcours en souhaits</h2>
        <p>
          Repère tes parcours préférés en cliquant sur le cœur ❤ - tu les
          retrouveras ici pour les commencer plus tard.
        </p>
        <div style={{ marginTop: 8 }}>
          <Button
            size="lg"
            iconRight={
              <Icon name="arrow-right" size={18} color="#fff" strokeWidth={3} />
            }
          >
            Découvrir le catalogue
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WW03 · Toast après retrait
// ════════════════════════════════════════════════════════
function WW03_Toast() {
  return (
    <WebAppShell active="wishlist" headerTitle="Mes souhaits">
      <WishHeader count={WISHLIST_AFTER_REMOVE.length} />
      <div className="wish-grid">
        {WISHLIST_AFTER_REMOVE.map((c, i) => (
          <CourseCard key={i} {...c} favorited />
        ))}
      </div>
      <div className="wish-toast-wrap">
        <Toast
          tone="success"
          title="Parcours retiré des souhaits"
          action={<button className="wish-toast-undo">Annuler</button>}
        />
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
const wishWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
  position: "relative",
};

function WishlistFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="wishlist"
        title="Mes souhaits"
        subtitle="Parcours sauvegardés · état vide · undo après retrait."
      >
        <DCArtboard
          id="WW01"
          label="WW01 · Avec items"
          width={WISH_W}
          height={WISH_H}
          style={wishWebStyle}
        >
          <WW01_List />
        </DCArtboard>
        <DCArtboard
          id="WW02"
          label="WW02 · Vide"
          width={WISH_W}
          height={WISH_H}
          style={wishWebStyle}
        >
          <WW02_Empty />
        </DCArtboard>
        <DCArtboard
          id="WW03"
          label="WW03 · Toast après retrait"
          width={WISH_W}
          height={WISH_H}
          style={wishWebStyle}
        >
          <WW03_Toast />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.WishlistFlowWeb = WishlistFlowWeb;
