// ds-canvas.jsx - Steamy Design System · présentation canvas
// Toutes les fondations, atomes et composants complexes sur un canvas
// pan/zoom organisé par section.

const T = {
  font: "var(--font-sans)",
  body: { fontFamily: "var(--font-sans)", color: "var(--ink-900)" },
  cardPad: {
    padding: 24,
    height: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  h: { fontWeight: 900, fontSize: 18, color: "var(--ink-900)", margin: 0 },
  hSm: {
    fontSize: 12,
    fontWeight: 800,
    color: "var(--ink-500)",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    margin: 0,
  },
  caption: { fontSize: 12, color: "var(--ink-500)", fontWeight: 700 },
  surface: { background: "#fff", height: "100%", boxSizing: "border-box" },
};

// (Logo est défini globalement dans ds-mascot.jsx - utilisable directement ici.)

// ─── Swatch ───────────────────────────────────────────────────────
function Swatch({ color, name, value, light }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          height: 64,
          background: color,
          borderRadius: 14,
          border: light ? "2px solid var(--ink-200)" : "none",
        }}
      />
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 800,
          color: "var(--ink-900)",
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink-500)",
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Row({ children, gap = 10 }) {
  return (
    <div style={{ display: "flex", gap, alignItems: "flex-start" }}>
      {children}
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={T.hSm}>{title}</div>
        {sub && <div style={{ ...T.caption, marginTop: 4 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MARQUE
// ═════════════════════════════════════════════════════════════════
function ArtBrand() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <Section
        title="Logotype"
        sub="Logo officiel Steamy : symbole gradient orange-magenta + wordmark + tagline. Deux assets distincts : steamy_logo.png sur fond clair, logo_landscape_white_tight.png (prop `white`) sur fond sombre. Jamais de filtre CSS."
      >
        <div
          style={{
            background: "var(--bg)",
            borderRadius: 16,
            padding: "32px 28px",
            border: "2px solid var(--ink-100)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Logo height={72} />
        </div>
        <Row gap={12}>
          <div
            style={{
              flex: 1,
              background: "var(--primary-500)",
              borderRadius: 16,
              padding: "32px 28px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Logo height={56} white />
          </div>
          <div
            style={{
              flex: 1,
              background: "var(--ink-900)",
              borderRadius: 16,
              padding: "32px 28px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Logo height={56} white />
          </div>
        </Row>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MASCOTTE
// ═════════════════════════════════════════════════════════════════
function ArtMascot() {
  const poses = [
    { p: "idle", l: "Repos" },
    { p: "wave", l: "Salut !" },
    { p: "cheer", l: "Bravo !" },
    { p: "focus", l: "Concentré" },
    { p: "sad", l: "Oups" },
    { p: "sleep", l: "Verrouillé" },
  ];
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Section
        title="Zeti - la mascotte Steamy"
        sub="Petit robot guide. Apparaît dans l'onboarding, l'attente, les célébrations, les états vides."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {poses.map(({ p, l }) => (
            <div
              key={p}
              style={{
                background: "var(--bg)",
                borderRadius: 16,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                border: "2px solid var(--ink-100)",
              }}
            >
              <Mascot pose={p} size={88} />
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "var(--ink-700)",
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// COULEURS
// ═════════════════════════════════════════════════════════════════
function ArtColors() {
  const primary = [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
  ];
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        overflow: "auto",
      }}
    >
      <Section
        title="Primaire · Indigo Steamy"
        sub="500 = couleur signature. Utiliser 500–700 pour les actions, 50–100 pour fonds doux."
      >
        <Row gap={6}>
          {primary.map((s) => (
            <Swatch
              key={s}
              color={`var(--primary-${s})`}
              name={s}
              value={`primary-${s}`}
              light={s === "50"}
            />
          ))}
        </Row>
      </Section>
      <Section title="Secondaire · Vert d'action">
        <Row gap={6}>
          {["50", "100", "300", "500", "600", "700"].map((s) => (
            <Swatch
              key={s}
              color={`var(--success-${s})`}
              name={s}
              value={`success-${s}`}
              light={s === "50"}
            />
          ))}
        </Row>
      </Section>
      <Section title="Tertiaire · Ambre récompense">
        <Row gap={6}>
          {["50", "100", "300", "500", "600", "700"].map((s) => (
            <Swatch
              key={s}
              color={`var(--amber-${s})`}
              name={s}
              value={`amber-${s}`}
              light={s === "50"}
            />
          ))}
        </Row>
      </Section>
      <Section title="Sémantiques">
        <Row gap={6}>
          <Swatch
            color="var(--success-500)"
            name="Succès"
            value="success-500"
          />
          <Swatch
            color="var(--amber-500)"
            name="Avertissement"
            value="amber-500"
          />
          <Swatch color="var(--error-500)" name="Erreur" value="error-500" />
          <Swatch color="var(--info-500)" name="Info" value="info-500" />
        </Row>
      </Section>
      <Section
        title="Catégories de parcours"
        sub="Couleurs pour fonds de cards et tags. Une couleur = une famille STEAM."
      >
        <Row gap={6}>
          <Swatch
            color="var(--cat-robotique)"
            name="Robotique"
            value="cat-robotique"
          />
          <Swatch
            color="var(--cat-electronique)"
            name="Électronique"
            value="cat-electronique"
          />
          <Swatch color="var(--cat-code)" name="Code" value="cat-code" />
          <Swatch color="var(--cat-ia)" name="IA" value="cat-ia" />
          <Swatch
            color="var(--cat-mecanique)"
            name="Mécanique"
            value="cat-mecanique"
          />
          <Swatch
            color="var(--cat-energie)"
            name="Énergie"
            value="cat-energie"
          />
        </Row>
      </Section>
      <Section title="Neutres warm · ink">
        <Row gap={6}>
          {[
            "50",
            "100",
            "200",
            "300",
            "400",
            "500",
            "600",
            "700",
            "800",
            "900",
          ].map((s) => (
            <Swatch
              key={s}
              color={`var(--ink-${s})`}
              name={s}
              value={`ink-${s}`}
              light={["50", "100", "200"].includes(s)}
            />
          ))}
        </Row>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// TYPOGRAPHIE
// ═════════════════════════════════════════════════════════════════
function ArtType() {
  const scale = [
    {
      name: "Display 4xl",
      size: 56,
      weight: 900,
      sample: "Apprends en t'amusant",
      usage: "écrans héros / célébrations",
    },
    {
      name: "Display 3xl",
      size: 44,
      weight: 900,
      sample: "Bravo Léa !",
      usage: "titres splash / réussites",
    },
    {
      name: "Title 2xl",
      size: 36,
      weight: 800,
      sample: "Mes parcours",
      usage: "titres de section",
    },
    {
      name: "Title xl",
      size: 28,
      weight: 800,
      sample: "Construis ton premier robot",
      usage: "titres de page",
    },
    {
      name: "Title lg",
      size: 22,
      weight: 800,
      sample: "Mission 3 - Le moteur",
      usage: "titres de carte",
    },
    {
      name: "Body md",
      size: 18,
      weight: 600,
      sample: "Lis le code Python ligne par ligne.",
      usage: "corps emphase",
    },
    {
      name: "Body base",
      size: 16,
      weight: 500,
      sample: "Bienvenue, prêt à découvrir un nouveau parcours ?",
      usage: "corps standard",
    },
    {
      name: "Caption sm",
      size: 14,
      weight: 700,
      sample: "Niveau · Débutant",
      usage: "métadonnées, labels",
    },
    {
      name: "Tiny xs",
      size: 12,
      weight: 800,
      sample: "NIVEAU 1",
      usage: "overline, badges",
    },
  ];
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Section
        title="Nunito · échelle"
        sub="Une seule famille, ronde et lisible. Poids 500–900 selon emphase."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {scale.map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                paddingBottom: 12,
                borderBottom: "1px dashed var(--ink-100)",
              }}
            >
              <div style={{ width: 100, flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "var(--ink-700)",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-500)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {s.size}px · {s.weight}
                </div>
              </div>
              <div
                style={{
                  fontSize: s.size,
                  fontWeight: s.weight,
                  lineHeight: 1.15,
                  color: "var(--ink-900)",
                  letterSpacing: s.size > 30 ? "-0.02em" : 0,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.sample}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-500)",
                  fontWeight: 600,
                  width: 140,
                  flexShrink: 0,
                }}
              >
                {s.usage}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// SPACING / RADIUS / SHADOWS / GRID
// ═════════════════════════════════════════════════════════════════
function ArtSpacing() {
  const spaces = [
    { v: 4, n: "sp-1" },
    { v: 8, n: "sp-2" },
    { v: 12, n: "sp-3" },
    { v: 16, n: "sp-4" },
    { v: 24, n: "sp-6" },
    { v: 32, n: "sp-8" },
    { v: 48, n: "sp-12" },
  ];
  const radii = [
    { v: 8, n: "r-sm" },
    { v: 12, n: "r-md" },
    { v: 16, n: "r-lg" },
    { v: 20, n: "r-xl" },
    { v: 28, n: "r-2xl" },
    { v: 999, n: "r-pill", label: "pill" },
  ];
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <Section
        title="Espacement · grille 4/8"
        sub="Base 4px. Privilégier 8 / 16 / 24 pour les paddings."
      >
        <Row gap={8}>
          {spaces.map((s) => (
            <div
              key={s.n}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                flex: 1,
              }}
            >
              <div
                style={{ height: 48, display: "flex", alignItems: "flex-end" }}
              >
                <div
                  style={{
                    width: s.v,
                    height: s.v,
                    background: "var(--primary-500)",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--ink-700)",
                }}
              >
                {s.v}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-500)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {s.n}
              </div>
            </div>
          ))}
        </Row>
      </Section>
      <Section
        title="Rayons"
        sub="Coins ronds - plus c'est interactif/important, plus c'est rond."
      >
        <Row gap={10}>
          {radii.map((r) => (
            <div
              key={r.n}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "var(--primary-100)",
                  border: "2px solid var(--primary-300)",
                  borderRadius: r.v,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--ink-700)",
                }}
              >
                {r.label || `${r.v}px`}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-500)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {r.n}
              </div>
            </div>
          ))}
        </Row>
      </Section>
      <Section
        title="Ombres"
        sub="Style ‘candy' - élévation marquée vers le bas, esprit Duolingo."
      >
        <Row gap={10}>
          <div
            style={{
              flex: 1,
              padding: 16,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "var(--shadow-pop-sm)",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            pop-sm
          </div>
          <div
            style={{
              flex: 1,
              padding: 16,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "var(--shadow-pop-md)",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            pop-md
          </div>
          <div
            style={{
              flex: 1,
              padding: 16,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "var(--shadow-card)",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            card
          </div>
          <div
            style={{
              flex: 1,
              padding: 16,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "var(--shadow-card-hover)",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            card-hover
          </div>
        </Row>
      </Section>
      <Section
        title="Grille mobile · 4 colonnes"
        sub="Marges 16px · gouttières 16px sur 360–390px viewport."
      >
        <div
          style={{
            background: "var(--bg)",
            padding: 16,
            borderRadius: 14,
            border: "2px solid var(--ink-100)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 80,
                  background: "var(--primary-100)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "var(--primary-600)",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// ICONOGRAPHIE
// ═════════════════════════════════════════════════════════════════
function ArtIcons() {
  const icons = [
    "home",
    "compass",
    "heart",
    "trophy",
    "user",
    "bell",
    "play",
    "lock",
    "check",
    "x",
    "arrow-right",
    "chevron-right",
    "star",
    "eye",
    "mail",
    "phone",
    "gear",
    "search",
    "plus",
    "cart",
    "book",
    "sparkle",
    "flame",
    "rocket",
    "gift",
  ];
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Section
        title="Icônes line · 24px"
        sub="Stroke 2, traits ronds, esprit friendly."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
          }}
        >
          {icons.map((n) => (
            <div
              key={n}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: 10,
                background: "var(--bg)",
                borderRadius: 12,
                border: "2px solid var(--ink-100)",
              }}
            >
              <Icon name={n} size={24} color="var(--ink-800)" />
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                }}
              >
                {n}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section
        title="Emojis catégorie"
        sub="On utilise aussi de gros emojis pour les visuels de cards et missions."
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            "🤖",
            "⚡",
            "💻",
            "🧠",
            "⚙️",
            "🔋",
            "🛠",
            "🚀",
            "🪐",
            "🔬",
            "🎮",
            "📡",
          ].map((e) => (
            <div
              key={e}
              style={{
                width: 48,
                height: 48,
                background: "var(--bg)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                border: "2px solid var(--ink-100)",
              }}
            >
              {e}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// BOUTONS
// ═════════════════════════════════════════════════════════════════
function ArtButtons() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <Section title="Variantes">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Button>Continuer</Button>
          <Button variant="secondary">Valider</Button>
          <Button variant="amber">Réclamer</Button>
          <Button variant="outline">Annuler</Button>
          <Button variant="ghost">Plus tard</Button>
          <Button variant="danger">Supprimer</Button>
          <Button disabled>Indisponible</Button>
        </div>
      </Section>
      <Section title="Tailles">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>
      <Section title="Avec icônes & pleine largeur">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxWidth: 320,
          }}
        >
          <Button
            block
            icon={<Icon name="play" size={18} color="#fff" strokeWidth={2.5} />}
          >
            Commencer la mission
          </Button>
          <Button
            variant="secondary"
            block
            iconRight={
              <Icon
                name="arrow-right"
                size={18}
                color="#fff"
                strokeWidth={2.5}
              />
            }
          >
            Suivant
          </Button>
          <Button variant="outline" block>
            S'inscrire
          </Button>
        </div>
      </Section>
      <Section
        title="Note d'interaction"
        sub="Pression visible : translateY(2px) + ombre comprimée. Ressenti ‘candy button'."
      >
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Button>Repos</Button>
            <span style={T.caption}>au repos</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <button
              className="btn"
              style={{
                transform: "translateY(2px)",
                boxShadow: "0 2px 0 var(--primary-700)",
              }}
            >
              Pressé
            </button>
            <span style={T.caption}>:active</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// INPUTS
// ═════════════════════════════════════════════════════════════════
function ArtInputs() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Section
        title="Champs de saisie"
        sub="Coins doux 14px, focus violet avec halo, état erreur clair."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Prénom" required>
            <Input value="Léa" />
          </Field>
          <Field
            label="Numéro de téléphone"
            required
            hint="Ton parent recevra un message pour valider ton inscription."
          >
            <PhoneInput value="01 90 12 34 56" />
          </Field>
          <Field label="Mot de passe" required>
            <PasswordInput value="superrobot" />
          </Field>
          <Field label="Email" hint="Optionnel - pour récupérer ton compte.">
            <Input
              value=""
              placeholder="lea@exemple.bj"
              icon={<Icon name="mail" size={18} color="var(--ink-500)" />}
            />
          </Field>
          <Field
            label="Numéro de téléphone"
            required
            error="Ce numéro est déjà utilisé."
          >
            <PhoneInput value="01 90 99 99 99" error />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function ArtOTP() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <Section
        title="OTP · Code à 6 chiffres"
        sub="Cellule remplie = violet. Active = halo. Erreur = secousse + rouge."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={T.caption}>Vide</div>
            <div style={{ marginTop: 8 }}>
              <OTPInput value="" activeIndex={0} />
            </div>
          </div>
          <div>
            <div style={T.caption}>En cours de saisie</div>
            <div style={{ marginTop: 8 }}>
              <OTPInput value="3214" activeIndex={4} />
            </div>
          </div>
          <div>
            <div style={T.caption}>Validé</div>
            <div style={{ marginTop: 8 }}>
              <OTPInput value="321487" />
            </div>
          </div>
          <div>
            <div style={T.caption}>Erreur - code invalide</div>
            <div style={{ marginTop: 8 }}>
              <OTPInput value="111111" error />
            </div>
          </div>
          <div>
            <div style={T.caption}>Format court · 4 chiffres</div>
            <div style={{ marginTop: 8 }}>
              <OTPInput length={4} value="79" activeIndex={2} />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// BADGES, TAGS, AVATARS, LOADERS, TOASTS
// ═════════════════════════════════════════════════════════════════
function ArtBadgesTags() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <Section title="Badges de statut">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Badge tone="success" icon={<span>✓</span>}>
            Terminé
          </Badge>
          <Badge tone="primary">En cours</Badge>
          <Badge tone="amber">Bientôt</Badge>
          <Badge tone="error">Échoué</Badge>
          <Badge tone="info">Nouveau</Badge>
          <Badge>Brouillon</Badge>
          <Badge solid>Niv. 3</Badge>
        </div>
      </Section>
      <Section title="Tags catégorie · sélection multiple">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Tag active>Tous</Tag>
          <Tag color="var(--cat-robotique)">Robotique</Tag>
          <Tag color="var(--cat-electronique)">Électronique</Tag>
          <Tag color="var(--cat-code)">Code</Tag>
          <Tag color="var(--cat-ia)">IA</Tag>
          <Tag color="var(--cat-mecanique)">Mécanique</Tag>
          <Tag color="var(--cat-energie)">Énergie</Tag>
        </div>
      </Section>
      <Section
        title="Avatars"
        sub="Initiales colorées · ring d'achievement · indicateur de présence."
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Avatar name="Léa" size={56} />
          <Avatar name="Mo" size={56} color="var(--success-500)" />
          <Avatar name="Aïs" size={56} color="var(--amber-500)" />
          <Avatar name="Yann" size={56} ring />
          <Avatar name="Tia" size={56} status />
          <Avatar emoji="🦊" size={56} color="var(--cat-mecanique)" />
          <Avatar emoji="🐼" size={56} color="var(--cat-ia)" />
        </div>
      </Section>
      <Section title="Loaders">
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Loader />
          <Loader kind="spin" />
          <span style={T.caption}>dots · spin</span>
        </div>
      </Section>
      <Section title="Toasts / Snackbars">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Toast title="Mission validée à 100% 🎉" onClose={() => {}} />
          <Toast
            tone="error"
            title="Mauvais code KIT, réessaie."
            onClose={() => {}}
          />
          <Toast
            tone="warning"
            title="Pense à demander à un parent."
            onClose={() => {}}
          />
          <Toast
            tone="info"
            title="Ton parent a accepté ta demande."
            onClose={() => {}}
          />
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// CARD PARCOURS
// ═════════════════════════════════════════════════════════════════
function ArtCourseCards() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Section
        title="Card parcours"
        sub="Image, niveau, titre, prix, progression. États au survol."
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <CourseCard
            title="Construis ton premier robot Bluetooth"
            author="Atelier Cotonou"
            level="Débutant"
            price="12 000 FCFA"
            color="var(--cat-robotique)"
            emoji="🤖"
          />
          <CourseCard
            title="Initiation à la programmation Scratch"
            author="Steamy Studio"
            level="Débutant"
            free
            color="var(--cat-code)"
            emoji="💻"
            progress={45}
            favorited
          />
          <CourseCard
            title="Comprendre les capteurs électroniques"
            author="Steamy Studio"
            level="Intermédiaire"
            price="18 000 FCFA"
            color="var(--cat-electronique)"
            emoji="⚡"
            progress={100}
          />
          <CourseCard
            title="L'IA pour les débutants"
            author="Steamy Studio"
            level="Avancé"
            price="25 000 FCFA"
            color="var(--cat-ia)"
            emoji="🧠"
          />
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// PROGRESSION & MÉDAILLES
// ═════════════════════════════════════════════════════════════════
function ArtProgressMedals() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <Section title="Barres de progression">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ProgressBar value={32} label="Parcours en cours" />
          <ProgressBar value={75} tone="success" label="Mission" />
          <ProgressBar
            value={50}
            tone="amber"
            size="lg"
            label="Quiz en cours"
          />
        </div>
      </Section>
      <Section
        title="Progression par étapes"
        sub="Pour les leçons / missions d'un niveau."
      >
        <ProgressSteps total={6} current={3} />
      </Section>
      <Section
        title="Badges numériques"
        sub="Trophy-style, ombre marquée. Or = niveau · ambre projet · gris verrouillé."
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            justifyContent: "space-around",
            padding: "8px 0",
          }}
        >
          <Medal icon="🤖" label="Robot Bluetooth" number={3} tone="gold" />
          <Medal icon="⚡" label="Électronique" number={1} tone="silver" />
          <Medal label="À débloquer" tone="locked" />
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MISSION & QUIZ
// ═════════════════════════════════════════════════════════════════
function ArtMissionQuiz() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <Section title="Item de mission · états">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <MissionItem
            step="Mission 1"
            title="Présentation du robot"
            duration="5 min"
            state="done"
            icon="🤖"
          />
          <MissionItem
            step="Mission 2"
            title="Brancher le module Bluetooth"
            duration="12 min"
            state="current"
            icon="📡"
          />
          <MissionItem
            step="Mission 3"
            title="Premier programme moteur"
            duration="15 min"
            state="todo"
            icon="⚙️"
          />
          <MissionItem
            step="Mission 4"
            title="Quiz intermédiaire"
            duration="8 min"
            state="locked"
          />
        </div>
      </Section>
    </div>
  );
}

function ArtQuiz() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <Section title="Composant quiz · états">
        <Quiz
          index={3}
          total={10}
          question="Quel composant détecte la lumière dans un circuit ?"
          choices={[
            "Une LED",
            "Une photorésistance (LDR)",
            "Un moteur",
            "Un haut-parleur",
          ]}
          selected={1}
        />
      </Section>
      <Section title="Avec feedback succès">
        <Quiz
          index={3}
          total={10}
          question="Quel composant détecte la lumière dans un circuit ?"
          choices={[
            "Une LED",
            "Une photorésistance (LDR)",
            "Un moteur",
            "Un haut-parleur",
          ]}
          selected={1}
          correct={1}
          showFeedback
        />
      </Section>
    </div>
  );
}

function ArtQuizError() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <Section title="Composant quiz · feedback échec">
        <Quiz
          index={3}
          total={10}
          question="Quel composant détecte la lumière dans un circuit ?"
          choices={[
            "Une LED",
            "Une photorésistance (LDR)",
            "Un moteur",
            "Un haut-parleur",
          ]}
          selected={0}
          correct={1}
          showFeedback
        />
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// BOTTOM NAV
// ═════════════════════════════════════════════════════════════════
function ArtBottomNav() {
  return (
    <div
      style={{
        ...T.body,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flex: 1,
        }}
      >
        <div style={T.hSm}>Bottom nav · 5 onglets</div>
        <div style={T.caption}>
          Indicateur actif en haut · pastille notifications.
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 14,
              padding: "12px 0",
              border: "2px solid var(--ink-100)",
            }}
          >
            <BottomNav active="home" />
          </div>
          <div style={{ ...T.caption, marginTop: 4 }}>
            Onglet ‘Catalogue' actif :
          </div>
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 14,
              padding: "12px 0",
              border: "2px solid var(--ink-100)",
            }}
          >
            <BottomNav active="catalog" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MODAL
// ═════════════════════════════════════════════════════════════════
function ArtModal() {
  return (
    <div
      style={{
        ...T.body,
        height: "100%",
        position: "relative",
        background: "var(--bg)",
      }}
    >
      {/* Faux écran derrière */}
      <div style={{ padding: 20, opacity: 0.6 }}>
        <div
          style={{
            height: 16,
            width: "60%",
            background: "var(--ink-200)",
            borderRadius: 8,
            marginBottom: 12,
          }}
        />
        <div
          style={{
            height: 12,
            width: "90%",
            background: "var(--ink-100)",
            borderRadius: 8,
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 12,
            width: "70%",
            background: "var(--ink-100)",
            borderRadius: 8,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            height: 120,
            background: "var(--ink-100)",
            borderRadius: 14,
          }}
        />
      </div>
      <Modal
        icon="🎉"
        title="Niveau 1 terminé !"
        body="Bravo Léa, tu as réussi le quiz à 85%. Tu peux passer au niveau suivant."
        primaryLabel="Suivant"
        secondaryLabel="Plus tard"
      />
    </div>
  );
}

function ArtModalDanger() {
  return (
    <div
      style={{
        ...T.body,
        height: "100%",
        position: "relative",
        background: "var(--bg)",
      }}
    >
      <div style={{ padding: 20, opacity: 0.6 }}>
        <div
          style={{
            height: 16,
            width: "50%",
            background: "var(--ink-200)",
            borderRadius: 8,
            marginBottom: 12,
          }}
        />
        <div
          style={{
            height: 12,
            width: "90%",
            background: "var(--ink-100)",
            borderRadius: 8,
          }}
        />
      </div>
      <Modal
        danger
        icon="⚠️"
        title="Supprimer ton compte ?"
        body="Cette action est irréversible. Toute ta progression sera effacée."
        primaryLabel="Supprimer"
        secondaryLabel="Annuler"
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═════════════════════════════════════════════════════════════════
function ArtNotifs() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <Section title="Notifications · liste">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <NotifItem
            unread
            tone="amber"
            icon="🏆"
            title="Nouveau badge débloqué !"
            msg="Tu as gagné le badge ‘Robot Bluetooth · niveau 3'."
            time="il y a 2 min"
          />
          <NotifItem
            unread
            tone="primary"
            icon="🚀"
            title="Mission disponible"
            msg="La mission ‘Premier programme moteur' t'attend."
            time="il y a 1 h"
          />
          <NotifItem
            tone="success"
            icon="✓"
            title="Ton parent a accepté"
            msg="Tu peux maintenant continuer ton inscription."
            time="hier"
          />
          <NotifItem
            tone="info"
            icon="🎁"
            title="Nouveau parcours recommandé"
            msg="L'IA pour les débutants - basé sur ton profil."
            time="hier"
          />
        </div>
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// APERÇU INTÉGRÉ - mini dashboard pour montrer le système au travail
// ═════════════════════════════════════════════════════════════════
function ArtMiniDash() {
  return (
    <div
      style={{
        ...T.body,
        height: "100%",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* status bar */}
      <div
        style={{
          height: 28,
          padding: "0 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          fontWeight: 800,
          color: "var(--ink-900)",
        }}
      >
        <span>9:41</span>
        <span>● ● ●</span>
      </div>
      {/* header */}
      <div
        style={{
          padding: "16px 18px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Avatar name="Léa" size={44} ring />
        <div style={{ flex: 1 }}>
          <div
            style={{ fontSize: 13, color: "var(--ink-500)", fontWeight: 700 }}
          >
            Salut
          </div>
          <div
            style={{ fontSize: 18, fontWeight: 900, color: "var(--ink-900)" }}
          >
            Léa <span style={{ color: "var(--amber-500)" }}>👋</span>
          </div>
        </div>
        <button
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#fff",
            border: "2px solid var(--ink-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            cursor: "pointer",
          }}
        >
          <Icon name="bell" size={20} color="var(--ink-700)" />
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--error-500)",
            }}
          />
        </button>
      </div>
      {/* hero card */}
      <div
        style={{
          margin: "4px 18px 16px",
          padding: 18,
          borderRadius: 22,
          background:
            "linear-gradient(135deg, var(--primary-500), var(--primary-700))",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -10, top: -8 }}>
          <Mascot pose="cheer" size={92} hue="#fff" />
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            opacity: 0.85,
            letterSpacing: ".06em",
          }}
        >
          EN COURS · NIVEAU 2
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            marginTop: 4,
            maxWidth: "70%",
          }}
        >
          Construis ton robot Bluetooth
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
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
            <div
              style={{
                width: "62%",
                height: "100%",
                background: "var(--amber-400)",
                borderRadius: 999,
              }}
            />
          </div>
          <span style={{ fontSize: 12, fontWeight: 900 }}>62%</span>
        </div>
      </div>
      {/* Continuer button */}
      <div style={{ padding: "0 18px 12px" }}>
        <Button
          block
          size="lg"
          variant="amber"
          icon={<Icon name="play" size={18} color="#fff" strokeWidth={3} />}
        >
          Continuer la mission
        </Button>
      </div>
      {/* recommandations row */}
      <div
        style={{
          padding: "0 18px 8px",
          fontSize: 13,
          fontWeight: 800,
          color: "var(--ink-700)",
        }}
      >
        Pour toi
      </div>
      <div
        style={{
          padding: "0 18px 12px",
          display: "flex",
          gap: 10,
          overflow: "hidden",
        }}
      >
        <div style={{ width: 140, flexShrink: 0 }}>
          <CourseCard
            title="Initiation Scratch"
            level="Débutant"
            free
            color="var(--cat-code)"
            emoji="💻"
          />
        </div>
        <div style={{ width: 140, flexShrink: 0 }}>
          <CourseCard
            title="Capteurs élec."
            level="Inter."
            price="18k"
            color="var(--cat-electronique)"
            emoji="⚡"
          />
        </div>
      </div>
      {/* nav */}
      <div style={{ marginTop: "auto" }}>
        <BottomNav active="home" />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// DATA-VIZ · primitives ds-charts.jsx (usage back-office / rapports)
// ═════════════════════════════════════════════════════════════════
function ArtChartsPrimitives() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 26,
      }}
    >
      <Section
        title="Sparkline"
        sub="Tendance compacte, SVG polyline. Prop `area` pour le remplissage."
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <Sparkline data={[4, 9, 6, 12, 10, 17, 15, 22]} />
          <Sparkline data={[4, 9, 6, 12, 10, 17, 15, 22]} area />
          <Sparkline
            data={[22, 15, 17, 10, 12, 6, 9, 4]}
            color="var(--error-600)"
          />
        </div>
      </Section>

      <Section
        title="BarChart"
        sub="Valeurs par période. La dernière barre est mise en avant (`highlightLast`)."
      >
        <BarChart
          data={[18, 26, 21, 34, 29, 41, 47]}
          labels={["L", "M", "M", "J", "V", "S", "D"]}
          width={300}
        />
      </Section>

      <Section
        title="DonutChart"
        sub="Ratio simple. `label` et `caption` remplacent le pourcentage calculé."
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <DonutChart value={68} />
          <DonutChart
            value={412}
            total={600}
            label="412"
            caption="apprenants"
          />
          <DonutChart
            value={91}
            size={82}
            thickness={10}
            color="var(--success-600)"
          />
        </div>
      </Section>

      <Section
        title="SegmentedControl"
        sub="Bascule de période ou de vue. Contrôlé (`value` + `onChange`)."
      >
        <SegmentedControl
          options={["7 jours", "30 jours", "Trimestre"]}
          value="30 jours"
        />
      </Section>
    </div>
  );
}

function ArtChartsStats() {
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <Section
        title="StatCard"
        sub="Grand chiffre + delta + sparkline. `deltaTone` : success / error / neutral."
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <StatCard
            label="Apprenants actifs"
            value="1 284"
            sub="ce mois-ci"
            delta="+12,4 %"
            deltaTone="success"
            spark={[12, 18, 15, 24, 21, 29, 34]}
          />
          <StatCard
            label="Parcours terminés"
            value="317"
            sub="objectif 400"
            delta="-3,1 %"
            deltaTone="error"
            spark={[34, 29, 31, 24, 26, 21, 19]}
          />
          <StatCard
            label="Kits expédiés"
            value="96"
            sub="7 en attente"
            delta="stable"
            deltaTone="neutral"
            icon={<Icon name="cart" size={16} />}
          />
          <StatCard
            label="Revenu (FCFA)"
            value="4,2 M"
            sub="Mobile Money"
            delta="+8,0 %"
            deltaTone="success"
            spark={[2.1, 2.6, 3.0, 3.2, 3.8, 4.0, 4.2]}
          />
        </div>
      </Section>
    </div>
  );
}

function ArtChartsTable() {
  const columns = [
    { key: "name", label: "Apprenant", width: "1.4fr" },
    { key: "course", label: "Parcours" },
    { key: "score", label: "Score", align: "right", width: ".6fr" },
  ];
  const rows = [
    { name: <b>Léa Adjovi</b>, course: "Robot Bluetooth", score: "92 %" },
    { name: <b>Kofi Adékambi</b>, course: "Scratch", score: "78 %" },
    { name: <b>Rita Sossou</b>, course: "Capteurs", score: "64 %" },
  ];
  return (
    <div
      style={{
        ...T.cardPad,
        ...T.body,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <Section
        title="DataTable"
        sub="CSS grid, zebra, cellules en slot JSX. `onRowClick` rend les lignes cliquables."
      >
        <DataTable columns={columns} rows={rows} onRowClick={() => {}} />
      </Section>

      <Section title="DataTable · dense" sub="Prop `dense` pour les longues listes.">
        <DataTable columns={columns} rows={rows} dense />
      </Section>

      <Section
        title="DataTable · vide"
        sub="État vide obligatoire, message via la prop `empty`."
      >
        <DataTable
          columns={columns}
          rows={[]}
          empty="Aucun apprenant sur cette période."
        />
      </Section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// CANVAS
// ═════════════════════════════════════════════════════════════════
function SteamyDS() {
  return (
    <DesignCanvas>
      <DCSection
        id="brand"
        title="Identité"
        subtitle="Logotype + mascotte. La mascotte ‘Zeti' guide les jeunes apprenants tout au long du parcours."
      >
        <DCArtboard id="logo" label="Logotype" width={520} height={420}>
          <ArtBrand />
        </DCArtboard>
        <DCArtboard
          id="mascot"
          label="Mascotte · 6 poses"
          width={520}
          height={420}
        >
          <ArtMascot />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="found"
        title="Fondations"
        subtitle="Couleurs, typographie, espacement, rayons, ombres, grille, icônes."
      >
        <DCArtboard id="colors" label="Couleurs" width={760} height={680}>
          <ArtColors />
        </DCArtboard>
        <DCArtboard
          id="type"
          label="Typographie · Nunito"
          width={680}
          height={680}
        >
          <ArtType />
        </DCArtboard>
        <DCArtboard
          id="spacing"
          label="Espacement · rayons · ombres"
          width={620}
          height={680}
        >
          <ArtSpacing />
        </DCArtboard>
        <DCArtboard id="icons" label="Icônes" width={520} height={680}>
          <ArtIcons />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="atoms"
        title="Composants atomiques"
        subtitle="Boutons, champs, OTP, badges, tags, avatars, loaders, toasts."
      >
        <DCArtboard id="buttons" label="Boutons" width={520} height={520}>
          <ArtButtons />
        </DCArtboard>
        <DCArtboard id="inputs" label="Inputs" width={460} height={620}>
          <ArtInputs />
        </DCArtboard>
        <DCArtboard id="otp" label="OTP" width={460} height={620}>
          <ArtOTP />
        </DCArtboard>
        <DCArtboard
          id="badges"
          label="Badges, tags, avatars, loaders, toasts"
          width={520}
          height={680}
        >
          <ArtBadgesTags />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="complex"
        title="Composants complexes"
        subtitle="Card parcours, progression, médailles, mission, quiz, nav, modale, notifs."
      >
        <DCArtboard id="cards" label="Cards parcours" width={620} height={620}>
          <ArtCourseCards />
        </DCArtboard>
        <DCArtboard
          id="progress"
          label="Progression · médailles"
          width={460}
          height={580}
        >
          <ArtProgressMedals />
        </DCArtboard>
        <DCArtboard id="missions" label="Mission item" width={460} height={420}>
          <ArtMissionQuiz />
        </DCArtboard>
        <DCArtboard
          id="quiz-pick"
          label="Quiz · sélection + succès"
          width={460}
          height={780}
        >
          <ArtQuiz />
        </DCArtboard>
        <DCArtboard id="quiz-ko" label="Quiz · échec" width={460} height={520}>
          <ArtQuizError />
        </DCArtboard>
        <DCArtboard id="nav" label="Bottom nav" width={420} height={360}>
          <ArtBottomNav />
        </DCArtboard>
        <DCArtboard
          id="modal"
          label="Modal · célébration"
          width={360}
          height={520}
        >
          <ArtModal />
        </DCArtboard>
        <DCArtboard
          id="modal-danger"
          label="Modal · destructif"
          width={360}
          height={520}
        >
          <ArtModalDanger />
        </DCArtboard>
        <DCArtboard id="notifs" label="Notifications" width={460} height={520}>
          <ArtNotifs />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="charts"
        title="Data-viz"
        subtitle="Primitives de ds-charts.jsx. Monochrome par défaut (tokens --ink-*) : réservées au back-office admin et aux rapports, la couleur ne sert qu'aux statuts."
      >
        <DCArtboard
          id="charts-primitives"
          label="Sparkline · Bar · Donut · Segmented"
          width={460}
          height={640}
        >
          <ArtChartsPrimitives />
        </DCArtboard>
        <DCArtboard id="charts-stats" label="StatCard" width={520} height={340}>
          <ArtChartsStats />
        </DCArtboard>
        <DCArtboard
          id="charts-table"
          label="DataTable · 3 états"
          width={560}
          height={620}
        >
          <ArtChartsTable />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="preview"
        title="Le système au travail"
        subtitle="Aperçu d'un dashboard apprenant assemblé à partir des composants ci-dessus."
      >
        <DCArtboard
          id="dash"
          label="Mini dashboard"
          width={360}
          height={760}
          style={{ borderRadius: 28, border: "4px solid var(--ink-900)" }}
        >
          <ArtMiniDash />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SteamyDS />);
