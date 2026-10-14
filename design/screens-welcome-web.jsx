// screens-welcome-web.jsx - editorial home page for Steamy.
// Split layout: text-led left column + pixel still-life on the right,
// inside a corner-bracket frame. Mounted by index.html.

const INK = "#161325";
const CREAM = "#f0eee9";

// ════════════════════════════════════════════════════════
// Corner-bracket frame (fixed to viewport corners)
// ════════════════════════════════════════════════════════
function CornerFrame() {
  const stroke = `1.5px solid ${INK}`;
  const arm = 22;
  const inset = 22;
  const base = {
    position: "fixed",
    width: arm,
    height: arm,
    pointerEvents: "none",
    zIndex: 1,
  };
  return (
    <>
      <div
        style={{
          ...base,
          top: inset,
          left: inset,
          borderTop: stroke,
          borderLeft: stroke,
        }}
      />
      <div
        style={{
          ...base,
          top: inset,
          right: inset,
          borderTop: stroke,
          borderRight: stroke,
        }}
      />
      <div
        style={{
          ...base,
          bottom: inset,
          left: inset,
          borderBottom: stroke,
          borderLeft: stroke,
        }}
      />
      <div
        style={{
          ...base,
          bottom: inset,
          right: inset,
          borderBottom: stroke,
          borderRight: stroke,
        }}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════
// Small mark glyphs (inline SVG, no icon-set dependency)
// ════════════════════════════════════════════════════════
function SteamyMark({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      <rect x="0" y="0" width="6" height="6" fill={INK} />
      <rect x="8" y="0" width="6" height="6" fill={INK} />
      <rect x="0" y="8" width="6" height="6" fill={INK} />
      <rect
        x="8"
        y="8"
        width="6"
        height="6"
        fill="none"
        stroke={INK}
        strokeWidth="1"
      />
    </svg>
  );
}

function IconWindowGrid({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      shapeRendering="crispEdges"
    >
      <rect
        x="0.75"
        y="0.75"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="12.25"
        y="0.75"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="0.75"
        y="12.25"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="12.25"
        y="12.25"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconDotGrid({ size = 22 }) {
  const dots = [];
  [4, 11, 18].forEach((y) => {
    [4, 11, 18].forEach((x) => {
      dots.push(
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="currentColor" />,
      );
    });
  });
  return (
    <svg width={size} height={size} viewBox="0 0 22 22">
      {dots}
    </svg>
  );
}

function ArrowRight({ size = 10 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      shapeRendering="crispEdges"
    >
      <path
        d="M1 5 L8 5 M5 2 L8 5 L5 8"
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════
// Door card - the two clickable tiles
// ════════════════════════════════════════════════════════
function DoorCard({ icon, title, caption, href }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        padding: "20px 22px",
        minHeight: 144,
        background: hover ? "#fff" : "rgba(255,255,255,.5)",
        border: `1.5px solid ${hover ? "var(--ink-700)" : "var(--ink-300)"}`,
        borderRadius: 14,
        color: INK,
        textDecoration: "none",
        boxShadow: hover
          ? "0 10px 28px rgba(22,19,37,.10), 0 1px 0 rgba(22,19,37,.04)"
          : "0 1px 0 rgba(22,19,37,.04)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all 200ms cubic-bezier(.22,1,.36,1)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: INK,
        }}
      >
        {icon}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `1.5px solid ${INK}`,
            display: "grid",
            placeItems: "center",
            transform: hover ? "translateX(4px)" : "none",
            transition: "transform 200ms cubic-bezier(.22,1,.36,1)",
            background: hover ? INK : "transparent",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d="M1 5 L8 5 M5 2 L8 5 L5 8"
              fill="none"
              stroke={hover ? "#fff" : INK}
              strokeWidth="1.5"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink-500)",
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {caption}
        </div>
      </div>
    </a>
  );
}

// ════════════════════════════════════════════════════════
// Halftone panel - hosts the pixel art on a dotted gray field
// ════════════════════════════════════════════════════════
function HalftonePanel({ children }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 540,
        aspectRatio: "1 / 1",
        position: "relative",
        backgroundColor: "#c8c5be",
        backgroundImage:
          "radial-gradient(circle at 1.5px 1.5px, rgba(22,19,37,.45) 1.1px, transparent 1.4px)",
        backgroundSize: "5px 5px",
        border: `1.5px solid ${INK}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// Pixel STEM still-life - a chunky monochrome Steamy bot
// (Inline SVG, no external assets. Built on a 480×480 grid
//  with 10px "pixels" and shape-rendering: crispEdges.)
// ════════════════════════════════════════════════════════
function PixelStillLife() {
  const lite = "#eae7df";
  const mid = "#8b8780";

  return (
    <svg
      viewBox="0 0 480 480"
      width="88%"
      height="88%"
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      {/* Antenna bulb */}
      <rect x="220" y="40" width="40" height="20" fill={INK} />
      <rect x="210" y="50" width="60" height="30" fill={INK} />
      <rect x="220" y="58" width="20" height="14" fill={lite} />
      <rect x="250" y="62" width="10" height="10" fill={lite} />
      {/* Antenna stem */}
      <rect x="232" y="80" width="16" height="30" fill={INK} />

      {/* Head outer */}
      <rect x="120" y="110" width="240" height="170" fill={INK} />
      {/* Head screen inset */}
      <rect x="140" y="130" width="200" height="130" fill={lite} />
      {/* Screen scanlines */}
      {[135, 155, 175, 195, 215, 235].map((y) => (
        <rect
          key={y}
          x="140"
          y={y}
          width="200"
          height="3"
          fill={mid}
          opacity=".35"
        />
      ))}

      {/* Eyes */}
      <rect x="175" y="160" width="35" height="40" fill={INK} />
      <rect x="270" y="160" width="35" height="40" fill={INK} />
      <rect x="180" y="165" width="10" height="10" fill={lite} />
      <rect x="275" y="165" width="10" height="10" fill={lite} />

      {/* Mouth */}
      <rect x="200" y="225" width="80" height="8" fill={INK} />
      <rect x="215" y="233" width="50" height="8" fill={INK} />

      {/* Neck */}
      <rect x="210" y="280" width="60" height="20" fill={INK} />
      <rect x="220" y="294" width="40" height="4" fill={lite} opacity=".5" />

      {/* Body */}
      <rect x="80" y="300" width="320" height="120" fill={INK} />
      <rect x="100" y="320" width="280" height="80" fill={lite} />

      {/* Buttons / LEDs */}
      <rect x="120" y="340" width="16" height="16" fill={INK} />
      <rect x="146" y="340" width="16" height="16" fill={INK} />
      <rect x="172" y="340" width="16" height="16" fill={INK} />
      <rect x="124" y="344" width="8" height="8" fill={lite} />
      <rect x="120" y="370" width="80" height="6" fill={mid} opacity=".5" />

      {/* Speaker grille */}
      <rect x="240" y="335" width="120" height="50" fill={INK} />
      {[345, 365].map((y) =>
        [250, 270, 290, 310, 330].map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="10"
            height="10"
            fill={mid}
          />
        )),
      )}

      {/* Feet */}
      <rect x="100" y="420" width="80" height="30" fill={INK} />
      <rect x="300" y="420" width="80" height="30" fill={INK} />
      <rect x="110" y="430" width="60" height="8" fill={lite} opacity=".35" />
      <rect x="310" y="430" width="60" height="8" fill={lite} opacity=".35" />

      {/* Drift / noise pixels */}
      <rect x="50" y="80" width="10" height="10" fill={INK} opacity=".55" />
      <rect x="420" y="120" width="10" height="10" fill={INK} opacity=".45" />
      <rect x="40" y="220" width="10" height="10" fill={INK} opacity=".65" />
      <rect x="440" y="280" width="10" height="10" fill={INK} opacity=".45" />
      <rect x="60" y="380" width="10" height="10" fill={INK} opacity=".4" />
      <rect x="430" y="400" width="10" height="10" fill={INK} opacity=".55" />
      <rect x="30" y="320" width="6" height="6" fill={INK} opacity=".5" />
      <rect x="450" y="200" width="6" height="6" fill={INK} opacity=".5" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════
// Top bar: Steamy mark · author chip
// ════════════════════════════════════════════════════════
function TopBar() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 17,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          color: INK,
        }}
      >
        <SteamyMark size={14} />
        Steamy
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--primary-500)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".02em",
          }}
        >
          SG
        </div> */}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// Bottom bar: theme icon · copyright
// ════════════════════════════════════════════════════════
function BottomBar() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginTop: 28,
        position: "relative",
        zIndex: 2,
      }}
    >
      <button
        aria-label="Theme"
        style={{
          width: 32,
          height: 32,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          padding: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            d="M14.5 11.4A6 6 0 1 1 6.6 3.5 5 5 0 0 0 14.5 11.4z"
            fill={INK}
          />
        </svg>
      </button>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-400)",
          letterSpacing: ".08em",
        }}
      >
        © 2026
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WelcomeFlow - top-level layout
// ════════════════════════════════════════════════════════
function WelcomeFlow() {
  return (
    <div
      className="welcome-shell"
      style={{
        minHeight: "100%",
        background: CREAM,
        color: INK,
        fontFamily: "var(--font-sans)",
        position: "relative",
        padding: "60px 80px 28px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CornerFrame />
      <TopBar />

      <div
        className="welcome-grid"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
          gap: 56,
          alignItems: "center",
          marginTop: 40,
        }}
      >
        {/* Left column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
            maxWidth: 540,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--ink-700)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                background: INK,
                display: "inline-block",
              }}
            />
            Steamy · Design portfolio
          </div>

          <h1 style={{ margin: 0, lineHeight: 1.04, letterSpacing: "-0.02em" }}>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: "clamp(40px, 5.2vw, 60px)",
                color: INK,
              }}
            >
              Bienvenue sur
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif",
                fontWeight: 400,
                fontStyle: "italic",
                fontSize: "clamp(40px, 5.2vw, 60px)",
                color: "var(--ink-500)",
              }}
            >
              Steamy Design
            </span>
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.55,
              color: "var(--ink-600)",
              fontWeight: 500,
              maxWidth: 470,
            }}
          >
            Plateforme e‑learning robotique & STEM pour les 10–17 ans. Explore
            les écrans de l'app ou plonge dans le design system pour voir
            comment c'est construit.
          </p>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <DoorCard
              icon={<IconWindowGrid />}
              title="Explorer les écrans"
              caption="Auth, dashboard, catalogue, souhaits…"
              href="App.html"
            />
            <DoorCard
              icon={<IconDotGrid />}
              title="Voir le Design System"
              caption="Atomes, composants, tokens."
              href="design-system.html"
            />
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--ink-500)",
              fontWeight: 600,
              lineHeight: 1.7,
              marginTop: 4,
            }}
          >
            Designed by{" "}
            <span style={{ color: INK, fontWeight: 800 }}>
              Seth‑Pharès Gnavo
            </span>{" "}
            · Client{" "}
            <span style={{ color: INK, fontWeight: 800 }}>
              Tech It All Eng.
            </span>{" "}
            · © 2026
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <HalftonePanel>
            <PixelStillLife />
          </HalftonePanel>
        </div>
      </div>

      <BottomBar />
    </div>
  );
}

window.WelcomeFlow = WelcomeFlow;
