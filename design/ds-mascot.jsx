// ds-mascot.jsx - Steamy mascot ("Zeti", petit robot guide)
// Petit robot rond + antenne, expressions différentes, palette violet/ambre.
// Usage: <Mascot pose="wave" size={120} />

const MASCOT_POSES = {
  // base · regard centré
  idle: { eyeY: 0, mouth: "smile", cheeks: true, arms: "down" },
  // Salutation
  wave: { eyeY: 0, mouth: "open", cheeks: true, arms: "wave" },
  // Réussite - étoiles dans les yeux
  cheer: { eyeY: -1, mouth: "cheer", cheeks: true, arms: "up", stars: true },
  // Concentré
  focus: { eyeY: 0, mouth: "flat", cheeks: false, arms: "down" },
  // Triste / échec
  sad: { eyeY: 2, mouth: "sad", cheeks: false, arms: "down" },
  // Sommeil (verrouillé / hors-ligne)
  sleep: {
    eyeY: 0,
    mouth: "flat",
    cheeks: false,
    arms: "down",
    sleeping: true,
  },
};

function Mascot({ pose = "idle", size = 120, hue = "#9E1B9A" }) {
  const cfg = MASCOT_POSES[pose] || MASCOT_POSES.idle;
  const accent = "#F89D32";
  const dark = "#1B1147";
  const eye = cfg.sleeping ? null : (
    <>
      {/* yeux */}
      <ellipse
        cx="38"
        cy={62 + cfg.eyeY}
        rx="6"
        ry={cfg.sleeping ? 1 : 7}
        fill={dark}
      />
      <ellipse
        cx="74"
        cy={62 + cfg.eyeY}
        rx="6"
        ry={cfg.sleeping ? 1 : 7}
        fill={dark}
      />
      <circle cx="40.5" cy={60 + cfg.eyeY} r="2" fill="#fff" />
      <circle cx="76.5" cy={60 + cfg.eyeY} r="2" fill="#fff" />
      {cfg.stars && (
        <>
          <path
            d="M38 60 l1.6 1.6 1.6-1.6-1.6-1.6z"
            fill={accent}
            transform="translate(-2 0)"
          />
          <path
            d="M74 60 l1.6 1.6 1.6-1.6-1.6-1.6z"
            fill={accent}
            transform="translate(-2 0)"
          />
        </>
      )}
    </>
  );
  const sleepEye = cfg.sleeping ? (
    <>
      <path
        d="M32 62 q6 -3 12 0"
        stroke={dark}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M68 62 q6 -3 12 0"
        stroke={dark}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ) : null;

  let mouth = null;
  if (cfg.mouth === "smile")
    mouth = (
      <path
        d="M48 80 q8 8 16 0"
        stroke={dark}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    );
  if (cfg.mouth === "open")
    mouth = <ellipse cx="56" cy="82" rx="6" ry="4" fill={dark} />;
  if (cfg.mouth === "cheer")
    mouth = <path d="M44 78 q12 14 24 0 q-12 6 -24 0z" fill={dark} />;
  if (cfg.mouth === "flat")
    mouth = (
      <line
        x1="50"
        y1="82"
        x2="62"
        y2="82"
        stroke={dark}
        strokeWidth="3"
        strokeLinecap="round"
      />
    );
  if (cfg.mouth === "sad")
    mouth = (
      <path
        d="M48 86 q8 -8 16 0"
        stroke={dark}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    );

  return (
    <svg
      viewBox="0 0 112 128"
      width={size}
      height={(size * 128) / 112}
      style={{ display: "block" }}
    >
      {/* Antenne */}
      <line
        x1="56"
        y1="22"
        x2="56"
        y2="10"
        stroke={dark}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="56"
        cy="8"
        r="5"
        fill={accent}
        stroke={dark}
        strokeWidth="2.5"
      />
      <circle cx="54" cy="6" r="1.6" fill="#fff" opacity=".9" />

      {/* Corps (rectangle arrondi sous la tête) */}
      <rect
        x="34"
        y="98"
        width="44"
        height="22"
        rx="11"
        fill={hue}
        stroke={dark}
        strokeWidth="3"
      />
      <rect
        x="44"
        y="105"
        width="24"
        height="8"
        rx="2"
        fill={dark}
        opacity=".25"
      />

      {/* Bras */}
      {cfg.arms === "down" && (
        <>
          <circle
            cx="28"
            cy="106"
            r="8"
            fill={hue}
            stroke={dark}
            strokeWidth="3"
          />
          <circle
            cx="84"
            cy="106"
            r="8"
            fill={hue}
            stroke={dark}
            strokeWidth="3"
          />
        </>
      )}
      {cfg.arms === "wave" && (
        <>
          <circle
            cx="28"
            cy="106"
            r="8"
            fill={hue}
            stroke={dark}
            strokeWidth="3"
          />
          <circle
            cx="92"
            cy="78"
            r="8"
            fill={hue}
            stroke={dark}
            strokeWidth="3"
          />
          <line
            x1="84"
            y1="100"
            x2="92"
            y2="78"
            stroke={dark}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {cfg.arms === "up" && (
        <>
          <circle
            cx="22"
            cy="68"
            r="8"
            fill={hue}
            stroke={dark}
            strokeWidth="3"
          />
          <line
            x1="34"
            y1="98"
            x2="22"
            y2="76"
            stroke={dark}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="92"
            cy="68"
            r="8"
            fill={hue}
            stroke={dark}
            strokeWidth="3"
          />
          <line
            x1="78"
            y1="98"
            x2="92"
            y2="76"
            stroke={dark}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Tête */}
      <rect
        x="20"
        y="28"
        width="72"
        height="68"
        rx="22"
        fill={hue}
        stroke={dark}
        strokeWidth="3"
      />
      {/* Visière / écran sur le front */}
      <rect x="30" y="40" width="52" height="44" rx="14" fill="#FFF" />
      <rect
        x="30"
        y="40"
        width="52"
        height="44"
        rx="14"
        fill="#fff"
        stroke={dark}
        strokeWidth="2.5"
      />

      {eye}
      {sleepEye}
      {mouth}

      {/* Joues */}
      {cfg.cheeks && (
        <>
          <ellipse
            cx="32"
            cy="76"
            rx="4.5"
            ry="3"
            fill="#FF8AA8"
            opacity=".75"
          />
          <ellipse
            cx="80"
            cy="76"
            rx="4.5"
            ry="3"
            fill="#FF8AA8"
            opacity=".75"
          />
        </>
      )}

      {/* Z de sommeil */}
      {cfg.sleeping && (
        <text
          x="92"
          y="38"
          fontSize="14"
          fontFamily="Nunito"
          fontWeight="800"
          fill={dark}
        >
          z
        </text>
      )}
    </svg>
  );
}

window.Mascot = Mascot;
window.MASCOT_POSES = MASCOT_POSES;

// ─── Logo Steamy (image PNG officielle) ───────────────────────────
// Usage: <Logo height={48} /> ou <Logo height={48} white /> sur fonds foncés.
// Le filtre CSS brightness(0) invert(1) blanchit le PNG sans 2ᵉ asset.
function Logo({ height = 48, white = false, style }) {
  return (
    <img
      src={
        white
          ? "assets/logo_landscape_white_tight.png"
          : "assets/steamy_logo.png"
      }
      alt="Steamy"
      style={{
        height,
        width: "auto",
        display: "block",
        ...style,
      }}
    />
  );
}

window.Logo = Logo;
