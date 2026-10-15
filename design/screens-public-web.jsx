// screens-public-web.jsx - « Steamy site » : site public / pré-login, version web (1240×760).
// Couvre l'architecture publique du sitemap : Accueil, À propos, Projets & Parcours,
// Boutique, Écoles, Profil public, Défis, Classements, Tutoriels, Catégories,
// Ressources (Blog/Article, Ateliers, Communauté, Guides, Événements), + reset MDP.
// Nav publique enrichie (header + mega-menu Ressources) via WLNavBar/PublicShell.
// Réutilise WebShell + helpers globaux. Ne s'auto-monte pas. Expose window.PublicFlowWeb.

const PUBLIC_W = 1240,
  PUBLIC_H = 760;
const WL_WRAP = { maxWidth: 1120, margin: "0 auto" }; // conteneur centré des pages publiques

// Confetti déco (écran de succès reset).
function WLConfetti() {
  return (
    <>
      {[
        { x: "8%", y: "14%", c: "var(--amber-500)" },
        { x: "90%", y: "12%", c: "var(--success-500)" },
        { x: "14%", y: "82%", c: "var(--cat-code)" },
        { x: "86%", y: "84%", c: "var(--primary-500)" },
        { x: "50%", y: "7%", c: "var(--cat-ia)" },
        { x: "70%", y: "90%", c: "var(--amber-500)" },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: 14,
            height: 14,
            background: p.c,
            borderRadius: 3,
            transform: `rotate(${i * 35}deg)`,
          }}
        />
      ))}
    </>
  );
}

// ════════════════════════════════════════════════════════
// WL01 LANDING (page publique pré-login) - candy DS
// ════════════════════════════════════════════════════════
const LANDING_PILLARS = [
  {
    emoji: "🤖",
    title: "Parcours guidés",
    desc: "Robotique, code, IA, électronique - projet par projet, à ton rythme.",
    color: "var(--cat-robotique)",
  },
  {
    emoji: "📦",
    title: "Kits physiques",
    desc: "Reçois ton kit à la maison et construis pour de vrai.",
    color: "var(--cat-electronique)",
  },
  {
    emoji: "🏆",
    title: "Badges & certif",
    desc: "Gagne des badges et décroche ta certification PDF.",
    color: "var(--amber-500)",
  },
  {
    emoji: "👨‍👩‍👧",
    title: "Suivi parent",
    desc: "Tes parents suivent tes progrès et valident en sécurité.",
    color: "var(--cat-ia)",
  },
];

const WL_RESOURCES = [
  ["blog", "Blog", "📰"],
  ["ateliers", "Ateliers & Masterclass", "🎓"],
  ["communaute", "Communauté", "💬"],
  ["guides", "Guides gratuits", "📥"],
  ["evenements", "Événements", "📅"],
  ["tutos", "Tutoriels partagés", "▶️"],
];
const WL_RES_IDS = WL_RESOURCES.map((r) => r[0]);

function WLNavBar({ active }) {
  const [resOpen, setResOpen] = React.useState(false);
  const items = [
    ["accueil", "Accueil"],
    ["parcours", "Parcours"],
    ["boutique", "Boutique"],
    ["ecoles", "Écoles"],
    ["defis", "Défis"],
  ];
  const linkStyle = (id) => ({
    fontSize: 14,
    fontWeight: 800,
    color: active === id ? "var(--primary-600)" : "var(--ink-700)",
    textDecoration: "none",
    cursor: "pointer",
  });
  const resActive = WL_RES_IDS.includes(active);
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(255,255,255,.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--ink-100)",
      }}
    >
      <div
        style={{
          ...WL_WRAP,
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Logo height={32} />
        <nav
          style={{
            display: "flex",
            gap: 16,
            marginLeft: 8,
            alignItems: "center",
          }}
        >
          {items.map(([id, label]) => (
            <a key={id} style={linkStyle(id)}>
              {label}
            </a>
          ))}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setResOpen((o) => !o)}
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                font: "800 14px var(--font-sans)",
                color: resActive ? "var(--primary-600)" : "var(--ink-700)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: 0,
              }}
            >
              Ressources{" "}
              <Icon
                name="chevron-down"
                size={14}
                color={resActive ? "var(--primary-600)" : "var(--ink-700)"}
              />
            </button>
            {resOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 14px)",
                  left: 0,
                  background: "#fff",
                  border: "1px solid var(--ink-100)",
                  borderRadius: 16,
                  boxShadow: "var(--shadow-modal)",
                  padding: 10,
                  width: 320,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 4,
                  zIndex: 30,
                }}
              >
                {WL_RESOURCES.map(([id, label, ic]) => (
                  <a
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      textDecoration: "none",
                      cursor: "pointer",
                      background:
                        active === id ? "var(--primary-50)" : "transparent",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{ic}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "var(--ink-800)",
                      }}
                    >
                      {label}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <a style={linkStyle("apropos")}>À propos</a>
        </nav>
        <div style={{ flex: 1 }} />
        <Button variant="ghost">Se connecter</Button>
        <Button>Créer un compte</Button>
      </div>
    </div>
  );
}

// Icônes réseaux sociaux (assets SVG). `light` = fond clair (icône sombre) ;
// par défaut fond foncé → icône blanchie via filtre.
function WLSocial({ light, size = 18 }) {
  const nets = [
    ["insta", "Instagram"],
    ["x", "X"],
    ["linkedin", "LinkedIn"],
  ];
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      {nets.map(([f, label]) => (
        <a
          key={f}
          href="#"
          aria-label={label}
          style={{
            display: "flex",
            cursor: "pointer",
            opacity: light ? 0.65 : 0.85,
          }}
        >
          <img
            src={`assets/${f}.svg`}
            alt={label}
            width={size}
            height={size}
            style={{
              display: "block",
              filter: light ? undefined : "brightness(0) invert(1)",
            }}
          />
        </a>
      ))}
    </div>
  );
}

function WLFooter() {
  const section = { maxWidth: 1120, margin: "0 auto", padding: "0 32px" };
  return (
    <div style={{ background: "var(--ink-900)", color: "#fff" }}>
      <div
        style={{
          ...section,
          padding: "48px 32px 32px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 32,
        }}
      >
        <div>
          <Logo height={34} white />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              opacity: 0.7,
              lineHeight: 1.6,
              marginTop: 14,
              maxWidth: 260,
            }}
          >
            Nous formons les inventeurs de demain. Notre mission : faire naître
            des champions du numérique, partout en Afrique francophone.
          </p>
        </div>
        <WLFooterCol
          title="Produit"
          links={["Parcours", "Boutique de kits", "Steamy Events", "Tarifs"]}
        />
        <WLFooterCol
          title="Aide"
          links={["Centre d'aide", "Nous contacter", "Consentement parent"]}
        />
        <WLFooterCol
          title="Légal"
          links={["CGU", "Mentions légales", "Confidentialité"]}
        />
      </div>
      <div
        style={{
          ...section,
          padding: "18px 32px",
          borderTop: "1px solid rgba(255,255,255,.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>
          © 2026 Steamy · Cotonou, Bénin
        </span>
        <WLSocial size={18} />
      </div>
    </div>
  );
}

// Bandeau de conversion réutilisé sur les pages publiques.
function WLJoinBanner() {
  return (
    <div
      style={{
        marginTop: 32,
        borderRadius: 24,
        background:
          "linear-gradient(135deg, var(--primary-500), var(--primary-700))",
        color: "#fff",
        padding: "32px 40px",
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
          Crée ton compte gratuit pour commencer
        </h3>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 15,
            fontWeight: 600,
            opacity: 0.9,
          }}
        >
          Chaque apprenant est rattaché à un parent qui valide en 1 min.
          Paiement Mobile Money, sans carte bancaire.
        </p>
      </div>
      <Button variant="amber" size="lg">
        Créer un compte
      </Button>
    </div>
  );
}

// Shell des pages publiques pré-login : nav + contenu scrollable + footer.
function PublicShell({ active, children }) {
  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      style={{
        height: "100%",
        overflowY: "auto",
        background: "#fff",
        fontFamily: "var(--font-sans)",
        color: "var(--ink-900)",
      }}
    >
      <WLNavBar active={active} />
      {children}
      <WLFooter />
    </div>
  );
}

function WLSectionHead({ kicker, title }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "var(--primary-600)",
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}
      >
        {kicker}
      </div>
      <h2
        style={{
          fontSize: 32,
          fontWeight: 900,
          margin: "8px 0 0",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function WLPillarCard({ p }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid var(--ink-100)",
        borderRadius: 20,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: p.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        {p.emoji}
      </div>
      <div style={{ fontSize: 17, fontWeight: 900 }}>{p.title}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--ink-600)",
          lineHeight: 1.5,
        }}
      >
        {p.desc}
      </div>
    </div>
  );
}

function WLStep({ n, title, desc }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: "var(--primary-500)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 900,
          boxShadow: "0 4px 0 var(--primary-700)",
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 17, fontWeight: 900 }}>{title}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--ink-600)",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>
  );
}

function WLFooterCol({ title, links }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map((l, i) => (
          <a
            key={i}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              opacity: 0.7,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            {l}
          </a>
        ))}
      </div>
    </div>
  );
}

function WL01_Landing() {
  const section = { maxWidth: 1120, margin: "0 auto", padding: "0 32px" };
  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      style={{
        height: "100%",
        overflowY: "auto",
        background: "#fff",
        fontFamily: "var(--font-sans)",
        color: "var(--ink-900)",
      }}
    >
      <WLNavBar active="accueil" />

      {/* HERO */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(180deg, var(--primary-50) 0%, #fff 100%)",
        }}
      >
        {[
          { x: "6%", y: "18%", s: 12, c: "var(--amber-400)" },
          { x: "46%", y: "10%", s: 8, c: "var(--primary-300)" },
          { x: "90%", y: "60%", s: 14, c: "var(--cat-ia)" },
          { x: "70%", y: "85%", s: 8, c: "var(--amber-400)" },
        ].map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: d.s,
              height: d.s,
              borderRadius: 999,
              background: d.c,
              boxShadow: `0 0 16px ${d.c}`,
            }}
          />
        ))}
        <div
          style={{
            ...section,
            display: "grid",
            gridTemplateColumns: "1.1fr .9fr",
            gap: 40,
            alignItems: "center",
            padding: "56px 32px 64px",
          }}
        >
          <div>
            <Badge tone="primary">🚀 Plateforme STEM des 10–17 ans</Badge>
            <h1
              style={{
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: "16px 0 0",
              }}
            >
              Apprends à construire les{" "}
              <span style={{ color: "var(--primary-500)" }}>robots</span> de
              demain.
            </h1>
            <p
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ink-600)",
                lineHeight: 1.5,
                margin: "18px 0 0",
                maxWidth: 480,
              }}
            >
              Une communauté de jeunes créatifs qui apprennent la robotique, le
              code et l'IA{" "}
              <strong style={{ color: "var(--ink-800)" }}>
                par la pratique
              </strong>{" "}
              - kits livrés chez toi, challenges et badges à la clé.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <Button size="lg">Créer un compte gratuit</Button>
              <Button
                size="lg"
                variant="outline"
                iconRight={
                  <Icon
                    name="play"
                    size={18}
                    color="var(--ink-900)"
                    strokeWidth={3}
                  />
                }
              >
                Comment ça marche
              </Button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 24,
              }}
            >
              <div style={{ display: "flex" }}>
                {["🦊", "🐼", "🦉", "🐯"].map((e, i) => (
                  <div
                    key={i}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: "#fff",
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 1px var(--ink-200)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      marginLeft: i ? -10 : 0,
                    }}
                  >
                    {e}
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink-600)",
                }}
              >
                <strong style={{ color: "var(--ink-900)" }}>1 000+</strong>{" "}
                apprenants au Bénin & alentours
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Mascot pose="cheer" size={300} />
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ background: "var(--ink-900)", color: "#fff" }}>
        <div
          style={{
            ...section,
            padding: "36px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
            textAlign: "center",
          }}
        >
          {[
            ["1 000+", "Apprenants"],
            ["2 500", "Certifications"],
            ["350", "Parcours & cours"],
            ["20", "Instructeurs"],
          ].map(([v, l], i) => (
            <div key={i}>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{v}</div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7 }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PILIERS */}
      <div style={{ ...section, padding: "56px 32px" }}>
        <WLSectionHead
          kicker="Pourquoi Steamy"
          title="Tout pour apprendre en faisant"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginTop: 24,
          }}
        >
          {LANDING_PILLARS.map((p, i) => (
            <WLPillarCard key={i} p={p} />
          ))}
        </div>
      </div>

      {/* PARCOURS POPULAIRES */}
      <div style={{ background: "var(--bg)" }}>
        <div style={{ ...section, padding: "56px 32px" }}>
          <WLSectionHead kicker="Catalogue" title="Parcours populaires" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              marginTop: 24,
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
              title="Capteurs électroniques"
              level="Intermédiaire"
              price="18 000 F"
              color="var(--cat-electronique)"
              emoji="⚡"
            />
          </div>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Button variant="outline" size="lg">
              Explorer tout le catalogue
            </Button>
          </div>
        </div>
      </div>

      {/* COMMENT ÇA MARCHE */}
      <div style={{ ...section, padding: "56px 32px" }}>
        <WLSectionHead kicker="En 3 étapes" title="Comment ça marche" />
        <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
          <WLStep
            n="1"
            title="Crée ton compte"
            desc="Inscris-toi gratuitement : ton compte est rattaché à un parent qui valide en 1 min."
          />
          <WLStep
            n="2"
            title="Explore le catalogue"
            desc="Parcours notre catalogue et choisis le parcours qui te convient le mieux."
          />
          <WLStep
            n="3"
            title="Paie & commence"
            desc="Paie par Mobile Money et démarre ta formation sans plus attendre."
          />
        </div>
      </div>

      {/* BOUTIQUE TEASER */}
      <div style={{ ...section, padding: "0 32px 56px" }}>
        <div
          style={{
            borderRadius: 24,
            background:
              "linear-gradient(135deg, var(--cat-electronique), #0866A8)",
            color: "#fff",
            padding: 40,
            display: "flex",
            alignItems: "center",
            gap: 32,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div style={{ flex: 1 }}>
            <Badge solid>🛒 Boutique</Badge>
            <h2 style={{ fontSize: 30, fontWeight: 900, margin: "14px 0 8px" }}>
              Des kits robotiques livrés chez toi
            </h2>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                opacity: 0.92,
                lineHeight: 1.5,
                maxWidth: 520,
              }}
            >
              Châssis, capteurs, cartes… tout le matériel pour construire pour
              de vrai. Paiement et livraison Mobile Money partout en Afrique de
              l'Ouest.
            </p>
            <div style={{ marginTop: 20 }}>
              <Button variant="amber" size="lg">
                Voir la boutique
              </Button>
            </div>
          </div>
          <div style={{ fontSize: 72 }}>🤖⚡🦾</div>
        </div>
      </div>

      {/* PARENTS */}
      <div style={{ background: "var(--bg)" }}>
        <div
          style={{
            ...section,
            padding: "56px 32px",
            display: "grid",
            gridTemplateColumns: ".9fr 1.1fr",
            gap: 40,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Mascot pose="idle" size={220} />
          </div>
          <div>
            <Badge tone="primary">👨‍👩‍👧 Espace parent</Badge>
            <h2 style={{ fontSize: 30, fontWeight: 900, margin: "14px 0 8px" }}>
              Vos enfants apprennent en sécurité
            </h2>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--ink-600)",
                lineHeight: 1.5,
                maxWidth: 520,
              }}
            >
              Vous validez chaque inscription et chaque paiement, suivez la
              progression et gérez plusieurs enfants - sans carte bancaire,
              uniquement en Mobile Money.
            </p>
            <div style={{ marginTop: 20 }}>
              <Button size="lg" variant="outline">
                Créer un compte parent
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* INSTRUCTEUR */}
      <div style={{ ...section, padding: "0 32px 56px" }}>
        <div
          style={{
            borderRadius: 24,
            background: "#fff",
            border: "2px solid var(--ink-100)",
            padding: "32px 40px",
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "var(--amber-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🎓
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
              Devenir instructeur
            </h3>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink-600)",
                lineHeight: 1.5,
              }}
            >
              Partagez vos connaissances et gagnez votre vie en faisant ce que
              vous aimez - accompagnez la prochaine génération d'inventeurs.
            </p>
          </div>
          <Button variant="outline" size="lg">
            Rejoindre l'équipe
          </Button>
        </div>
      </div>

      {/* CTA FINAL */}
      <div style={{ ...section, padding: "64px 32px" }}>
        <div
          style={{
            borderRadius: 28,
            background:
              "linear-gradient(135deg, var(--primary-500), var(--primary-700))",
            color: "#fff",
            padding: 48,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Mascot pose="wave" size={120} hue="#fff" />
          <h2 style={{ fontSize: 36, fontWeight: 900, margin: "12px 0 8px" }}>
            Prêt·e à devenir inventeur·e ?
          </h2>
          <p style={{ fontSize: 17, fontWeight: 600, opacity: 0.9, margin: 0 }}>
            Rejoins Steamy gratuitement et commence ton premier parcours
            aujourd'hui.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <Button size="lg" variant="amber">
              Créer un compte gratuit
            </Button>
            <Button
              size="lg"
              variant="outline"
              style={{
                background: "rgba(255,255,255,.1)",
                color: "#fff",
                borderColor: "rgba(255,255,255,.4)",
                boxShadow: "0 4px 0 rgba(0,0,0,.15)",
              }}
            >
              J'ai déjà un compte
            </Button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <WLFooter />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WL06 · CATALOGUE PUBLIC (non-connecté)
// ════════════════════════════════════════════════════════
function WL06_PublicCatalog() {
  return (
    <PublicShell active="parcours">
      <div
        style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 32px 56px" }}
      >
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Catalogue des parcours
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Robotique, code, IA, électronique… Trouve le parcours qui te
          ressemble. Crée un compte gratuit pour commencer à apprendre.
        </p>
        <div className="filter-strip" style={{ margin: "24px 0" }}>
          <Tag active>Tous</Tag>
          <Tag color="var(--cat-robotique)">Robotique</Tag>
          <Tag color="var(--cat-code)">Programmation</Tag>
          <Tag color="var(--cat-electronique)">Électronique</Tag>
          <Tag color="var(--cat-ia)">IA</Tag>
        </div>
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
            emoji="🧠"
          />
          <CourseCard
            title="Construis ton robot Bluetooth"
            level="Intermédiaire"
            price="25 000 F"
            color="var(--cat-robotique)"
            emoji="📡"
          />
          <CourseCard
            title="Crée ton premier jeu"
            level="Débutant"
            price="15 000 F"
            color="var(--cat-code)"
            emoji="🎮"
          />
        </div>
        <WLJoinBanner />
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL07 · BOUTIQUE PUBLIQUE (non-connecté)
// ════════════════════════════════════════════════════════
function WL07_PublicShop() {
  return (
    <PublicShell active="boutique">
      <div
        style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 32px 56px" }}
      >
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Boutique de kits
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Des kits robotiques livrés chez toi pour construire pour de vrai.
          Paiement et livraison Mobile Money partout en Afrique de l'Ouest.
        </p>
        <div className="filter-strip" style={{ margin: "24px 0" }}>
          <Tag active>Tous</Tag>
          <Tag color="var(--cat-robotique)">Robotique</Tag>
          <Tag color="var(--cat-electronique)">Électronique</Tag>
          <Tag color="var(--cat-ia)">Capteurs / IA</Tag>
          <Tag color="var(--cat-energie)">Énergie</Tag>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {KIT_CATALOG.map((k, i) => (
            <WKKitCard key={i} k={k} />
          ))}
        </div>
        <WLJoinBanner />
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL08 · ATELIERS / STEAMY EVENTS (public)
// ════════════════════════════════════════════════════════
function WL08_PublicWorkshops() {
  const events = [
    {
      emoji: "🤖",
      title: "Challenge Robot Sumo",
      date: "14 juin 2026",
      place: "Cotonou",
      price: "Gratuit",
      color: "var(--cat-robotique)",
      desc: "Affronte d'autres jeunes makers dans une battle de robots.",
    },
    {
      emoji: "💡",
      title: "Atelier Électronique",
      date: "28 juin 2026",
      place: "Porto-Novo",
      price: "5 000 F",
      color: "var(--cat-electronique)",
      desc: "Apprends à souder et à monter ton premier circuit.",
    },
    {
      emoji: "🧠",
      title: "Hackathon IA Junior",
      date: "12 juil. 2026",
      place: "En ligne",
      price: "Gratuit",
      color: "var(--cat-ia)",
      desc: "24 h pour créer un projet d'intelligence artificielle en équipe.",
    },
  ];
  return (
    <PublicShell active="ateliers">
      <div
        style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 32px 56px" }}
      >
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Ateliers & Steamy Events
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Challenges, compétitions et ateliers pratiques près de chez toi. Crée
          un compte pour t'inscrire et postuler.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginTop: 24,
          }}
        >
          {events.map((e, i) => (
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
                  height: 110,
                  background: e.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
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
                <div style={{ fontSize: 16, fontWeight: 900 }}>{e.title}</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                  }}
                >
                  📅 {e.date} · 📍 {e.place}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink-600)",
                    lineHeight: 1.45,
                    flex: 1,
                  }}
                >
                  {e.desc}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                  }}
                >
                  <Badge tone={e.price === "Gratuit" ? "success" : "primary"}>
                    {e.price}
                  </Badge>
                  <Button size="sm">S'inscrire</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <WLJoinBanner />
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL09 · PAGES LÉGALES (CGU / Mentions / Confidentialité)
// ════════════════════════════════════════════════════════
function WL09_Legal() {
  const [tab, setTab] = React.useState("cgu");
  const content = {
    cgu: {
      title: "Conditions générales d'utilisation",
      blocks: [
        [
          "1. Objet",
          "Steamy fournit une plateforme e-learning de robotique et STEM destinée aux jeunes de 10 à 17 ans en Afrique francophone.",
        ],
        [
          "2. Compte & âge",
          "La création d'un compte pour un mineur de moins de 16 ans requiert le consentement d'un parent ou tuteur légal.",
        ],
        [
          "3. Paiements",
          "Les paiements s'effectuent exclusivement par Mobile Money. Aucune donnée de carte bancaire n'est collectée.",
        ],
        [
          "4. Contenus",
          "Les parcours, kits et badges restent la propriété de Steamy / Tech It All Engineering & Services.",
        ],
      ],
    },
    mentions: {
      title: "Mentions légales",
      blocks: [
        ["Éditeur", "Tech It All Engineering & Services - Cotonou, Bénin."],
        [
          "Hébergement",
          "Serveurs partenaires conformes aux standards de protection des données.",
        ],
        ["Contact", "contact@steamy.bj"],
      ],
    },
    privacy: {
      title: "Politique de confidentialité",
      blocks: [
        [
          "Données collectées",
          "Nom, prénom, numéro, âge, localité - strictement pour le suivi pédagogique et la livraison.",
        ],
        [
          "Mineurs",
          "Les données des moins de 16 ans sont placées sous le contrôle du parent référent.",
        ],
        [
          "Aucun marketing tiers",
          "Tes données ne sont jamais revendues ni utilisées à des fins publicitaires.",
        ],
        [
          "Tes droits",
          "Tu peux demander la suppression de ton compte et de tes données à tout moment.",
        ],
      ],
    },
  };
  const tabs = [
    ["cgu", "CGU"],
    ["mentions", "Mentions légales"],
    ["privacy", "Confidentialité"],
  ];
  const c = content[tab];
  return (
    <PublicShell active="aide">
      <div
        style={{ maxWidth: 820, margin: "0 auto", padding: "40px 32px 56px" }}
      >
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Informations légales
        </h1>
        <div className="tabs-pill" style={{ margin: "20px 0" }}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={["tabs-pill__btn", tab === id && "is-active"]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          style={{
            background: "#fff",
            border: "1.5px solid var(--ink-100)",
            borderRadius: 18,
            padding: 28,
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 900 }}>
            {c.title}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {c.blocks.map(([h, b], i) => (
              <div key={i}>
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: 15,
                    fontWeight: 900,
                    color: "var(--ink-900)",
                  }}
                >
                  {h}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink-600)",
                    lineHeight: 1.6,
                  }}
                >
                  {b}
                </p>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ink-400)",
            }}
          >
            Dernière mise à jour : mai 2026
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL02 MOT DE PASSE OUBLIÉ (saisie numéro)
// ════════════════════════════════════════════════════════
function WL02_Forgot() {
  return (
    <WebShell
      kicker="Mot de passe oublié"
      title="Pas de panique !"
      sub="Indique ton numéro de téléphone : on t'envoie un code pour réinitialiser ton mot de passe."
      brand={
        <>
          <Mascot pose="focus" size={220} hue="#fff" />
          <div style={{ fontSize: 56, fontWeight: 900 }}>🔑</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              opacity: 0.85,
              textAlign: "center",
              maxWidth: 280,
              lineHeight: 1.5,
            }}
          >
            Ça arrive à tout le monde - on te remet en selle en 1 minute.
          </div>
        </>
      }
      cta={
        <>
          <Button block size="lg">
            Recevoir le code
          </Button>
          <div
            style={{
              textAlign: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink-600)",
            }}
          >
            Tu t'en souviens ?{" "}
            <a
              href="#"
              style={{ color: "var(--primary-600)", fontWeight: 900 }}
            >
              Se connecter
            </a>
          </div>
        </>
      }
    >
      <Field
        label="Numéro de téléphone"
        required
        hint="Le numéro lié à ton compte Steamy."
      >
        <PhoneInput value="01 90 12 34 56" />
      </Field>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WL03 OTP DE RÉINITIALISATION
// ════════════════════════════════════════════════════════
function WL03_OTP() {
  return (
    <WebShell
      kicker="Réinitialisation · étape 2"
      title="Entre le code reçu"
      sub="On t'a envoyé un code à 6 chiffres au +229 01 90 12 34 56."
      brand={
        <>
          <Mascot pose="idle" size={210} hue="#fff" />
          <div style={{ fontSize: 56, fontWeight: 900 }}>📩</div>
        </>
      }
      cta={
        <Button block size="lg">
          Vérifier le code
        </Button>
      }
    >
      <div
        style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}
      >
        <OTPInput value="0421" activeIndex={4} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 14, color: "var(--ink-500)", fontWeight: 700 }}>
          Renvoyer le code dans{" "}
          <strong style={{ color: "var(--primary-600)" }}>00:38</strong>
        </div>
        <button
          style={{
            background: "transparent",
            border: 0,
            color: "var(--primary-600)",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            padding: 6,
          }}
        >
          Modifier le numéro
        </button>
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WL04 NOUVEAU MOT DE PASSE
// ════════════════════════════════════════════════════════
function WL04_NewPassword() {
  return (
    <WebShell
      kicker="Réinitialisation · étape 3"
      title="Choisis un nouveau mot de passe"
      sub="Évite de réutiliser un ancien mot de passe."
      brand={
        <>
          <Mascot pose="idle" size={200} hue="#fff" />
          <div
            style={{
              background: "rgba(255,255,255,.15)",
              padding: 20,
              borderRadius: 18,
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.5,
              maxWidth: 320,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>
              🛡️ Astuce sécurité
            </div>
            Un bon mot de passe mélange lettres et chiffres, et fait au moins 8
            caractères.
          </div>
        </>
      }
      cta={
        <Button block size="lg">
          Enregistrer le mot de passe
        </Button>
      }
    >
      <Field label="Nouveau mot de passe" required>
        <PasswordInput value="nouveaurobot7" />
      </Field>
      <Field label="Confirme le mot de passe" required>
        <PasswordInput value="nouveaurobot7" />
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
        <PwReq ok label="Au moins 8 caractères" />
        <PwReq ok label="Une lettre et un chiffre" />
        <PwReq label="Différent de l'ancien" />
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WL05 MOT DE PASSE RÉINITIALISÉ (succès)
// ════════════════════════════════════════════════════════
function WL05_Done() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(180deg, var(--success-100) 0%, var(--bg) 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-sans)",
      }}
    >
      <WLConfetti />
      <div
        style={{
          background: "#fff",
          borderRadius: 28,
          padding: "56px 48px",
          maxWidth: 540,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 8px 0 var(--success-200)",
          border: "3px solid var(--success-500)",
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "var(--success-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Mascot pose="cheer" size={160} hue="var(--success-500)" />
        </div>
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              margin: 0,
              color: "var(--success-700)",
            }}
          >
            Mot de passe modifié !
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-700)",
              fontWeight: 600,
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            Tu peux maintenant te connecter avec ton nouveau mot de passe.
          </p>
        </div>
        <Button
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Se connecter
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WL10 · À PROPOS
// ════════════════════════════════════════════════════════
function WL10_About() {
  return (
    <PublicShell active="apropos">
      <div
        style={{
          background:
            "linear-gradient(180deg, var(--primary-50) 0%, #fff 100%)",
        }}
      >
        <div style={{ ...WL_WRAP, padding: "56px 32px", textAlign: "center" }}>
          <Badge tone="primary">Notre mission</Badge>
          <h1
            style={{
              fontSize: 46,
              fontWeight: 900,
              margin: "14px 0 0",
              lineHeight: 1.1,
            }}
          >
            Former les{" "}
            <span style={{ color: "var(--primary-500)" }}>inventeurs</span> de
            demain
          </h1>
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink-600)",
              maxWidth: 620,
              margin: "16px auto 0",
              lineHeight: 1.5,
            }}
          >
            Steamy rend la robotique, le code et l'IA accessibles à chaque jeune
            d'Afrique francophone - par la pratique, avec des kits et une
            communauté.
          </p>
        </div>
      </div>
      <div style={{ background: "var(--ink-900)", color: "#fff" }}>
        <div
          style={{
            ...WL_WRAP,
            padding: "36px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
            textAlign: "center",
          }}
        >
          {[
            ["2024", "Création"],
            ["1 000+", "Apprenants"],
            ["12", "Villes"],
            ["350", "Parcours & cours"],
          ].map(([v, l], i) => (
            <div key={i}>
              <div style={{ fontSize: 34, fontWeight: 900 }}>{v}</div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7 }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...WL_WRAP, padding: "56px 32px" }}>
        <WLSectionHead kicker="Nos valeurs" title="Ce qui nous fait avancer" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginTop: 24,
          }}
        >
          <WLPillarCard
            p={{
              emoji: "🛠",
              title: "Apprendre en faisant",
              desc: "On construit pour de vrai : robots, circuits, programmes.",
              color: "var(--cat-robotique)",
            }}
          />
          <WLPillarCard
            p={{
              emoji: "🌍",
              title: "Accessible à tous",
              desc: "Mobile Money, contenus offline-friendly, prix adaptés au contexte local.",
              color: "var(--cat-ia)",
            }}
          />
          <WLPillarCard
            p={{
              emoji: "🤝",
              title: "En communauté",
              desc: "Défis, ateliers et entraide : on apprend mieux ensemble.",
              color: "var(--amber-500)",
            }}
          />
        </div>
      </div>
      <div style={{ background: "var(--bg)" }}>
        <div style={{ ...WL_WRAP, padding: "56px 32px" }}>
          <WLSectionHead kicker="L'équipe" title="Des passionnés de STEM" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginTop: 24,
            }}
          >
            {[
              ["Koffi A.", "Fondateur", "🦉", "var(--primary-500)"],
              ["Marie D.", "Pédagogie", "🦊", "var(--cat-ia)"],
              ["Yann S.", "Robotique", "🐯", "var(--amber-500)"],
              ["Inès K.", "Communauté", "🐼", "var(--cat-code)"],
            ].map(([n, r, e, c], i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: "1.5px solid var(--ink-100)",
                  borderRadius: 18,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Avatar emoji={e} size={72} color={c} ring />
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, marginTop: 12 }}>
                  {n}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                  }}
                >
                  {r}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ ...WL_WRAP, padding: "0 32px 56px" }}>
        <WLJoinBanner />
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL11 · ÉCOLES - OFFRE (B2B)
// ════════════════════════════════════════════════════════
function WL11_Schools() {
  const plans = [
    {
      name: "Classe",
      price: "50 000 F",
      unit: "/ mois",
      feats: [
        "1 classe (jusqu'à 30 élèves)",
        "Suivi formateur",
        "Rapports de progression",
      ],
      color: "var(--cat-code)",
    },
    {
      name: "École",
      price: "180 000 F",
      unit: "/ mois",
      feats: [
        "Jusqu'à 5 classes",
        "Tableau de bord établissement",
        "Kits à tarif préférentiel",
        "Formation des formateurs",
      ],
      color: "var(--primary-500)",
      featured: true,
    },
    {
      name: "Réseau",
      price: "Sur devis",
      unit: "",
      feats: [
        "Classes illimitées",
        "Multi-établissements",
        "Accompagnement dédié",
        "API & intégrations",
      ],
      color: "var(--cat-ia)",
    },
  ];
  return (
    <PublicShell active="ecoles">
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--primary-600), var(--primary-800))",
          color: "#fff",
        }}
      >
        <div
          style={{
            ...WL_WRAP,
            padding: "56px 32px",
            display: "grid",
            gridTemplateColumns: "1.2fr .8fr",
            gap: 32,
            alignItems: "center",
          }}
        >
          <div>
            <Badge solid>🏫 Pour les écoles</Badge>
            <h1
              style={{
                fontSize: 44,
                fontWeight: 900,
                margin: "14px 0 8px",
                lineHeight: 1.1,
              }}
            >
              Amenez la robotique dans vos classes
            </h1>
            <p
              style={{
                fontSize: 17,
                fontWeight: 600,
                opacity: 0.92,
                lineHeight: 1.5,
                maxWidth: 520,
              }}
            >
              Parcours clé en main, kits, formation des formateurs et suivi des
              élèves - adaptés au programme et au contexte local.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <Button variant="amber" size="lg">
                Demander une démo
              </Button>
              <Button
                size="lg"
                variant="outline"
                style={{
                  background: "rgba(255,255,255,.1)",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,.4)",
                  boxShadow: "0 4px 0 rgba(0,0,0,.15)",
                }}
              >
                Télécharger la brochure
              </Button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Mascot pose="focus" size={200} hue="#fff" />
          </div>
        </div>
      </div>
      <div style={{ ...WL_WRAP, padding: "56px 32px" }}>
        <WLSectionHead
          kicker="Nos offres"
          title="Une formule pour chaque établissement"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginTop: 24,
            alignItems: "flex-start",
          }}
        >
          {plans.map((p, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: "2px solid",
                borderColor: p.featured
                  ? "var(--primary-500)"
                  : "var(--ink-100)",
                borderRadius: 22,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: p.featured
                  ? "0 12px 32px rgba(158,27,154,.18)"
                  : "none",
              }}
            >
              {p.featured && <Badge solid>Le plus choisi</Badge>}
              <div style={{ fontSize: 18, fontWeight: 900 }}>{p.name}</div>
              <div>
                <span style={{ fontSize: 30, fontWeight: 900, color: p.color }}>
                  {p.price}
                </span>{" "}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                  }}
                >
                  {p.unit}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {p.feats.map((f, j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink-700)",
                    }}
                  >
                    <Icon
                      name="check"
                      size={16}
                      color="var(--success-600)"
                      strokeWidth={3}
                    />{" "}
                    {f}
                  </div>
                ))}
              </div>
              <Button
                block
                variant={p.featured ? "primary" : "outline"}
                style={{ marginTop: 8 }}
              >
                Choisir
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "var(--bg)" }}>
        <div
          style={{
            ...WL_WRAP,
            padding: "56px 32px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "center",
          }}
        >
          <div>
            <WLSectionHead
              kicker="Pourquoi Steamy"
              title="Pensé pour les formateurs"
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 20,
              }}
            >
              {[
                "Gestion de classes & import d'élèves par lot",
                "Suivi des évaluations formatives et sommatives",
                "Commentaires aux élèves et aux parents",
                "Rapports d'activité hebdomadaires",
              ].map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink-700)",
                  }}
                >
                  <Icon
                    name="check"
                    size={18}
                    color="var(--success-600)"
                    strokeWidth={3}
                  />{" "}
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              border: "2px solid var(--ink-100)",
              borderRadius: 22,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              Demander un devis
            </h3>
            <Field label="Nom de l'établissement" required>
              <Input value="" placeholder="Collège Les Pépinières" />
            </Field>
            <Field label="Personne à contacter" required>
              <Input value="" placeholder="Nom & prénom" />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Email" required>
                <Input
                  value=""
                  placeholder="ecole@exemple.bj"
                  icon={<Icon name="mail" size={18} color="var(--ink-500)" />}
                />
              </Field>
              <Field label="Téléphone" required>
                <PhoneInput value="" />
              </Field>
            </div>
            <Button block size="lg">
              Envoyer la demande
            </Button>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL12 · PROFIL PUBLIC (instructeur)
// ════════════════════════════════════════════════════════
function WL12_PublicProfile() {
  return (
    <PublicShell active="">
      <div style={{ ...WL_WRAP, padding: "40px 32px 56px" }}>
        <div className="crumb">
          Steamy site › Profils › <b>Koffi Adékambi</b>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "2px solid var(--ink-100)",
              borderRadius: 22,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 12,
            }}
          >
            <Avatar emoji="🦉" size={104} color="var(--primary-500)" ring />
            <div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                Koffi Adékambi
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                }}
              >
                Instructeur · Robotique & électronique
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, padding: "8px 0" }}>
              {[
                ["18", "Parcours"],
                ["1.2k", "Apprenants"],
                ["4.9★", "Note"],
              ].map(([v, l], i) => (
                <div key={i}>
                  <div style={{ fontSize: 17, fontWeight: 900 }}>{v}</div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
            <Button block>Suivre</Button>
            <Button block variant="outline">
              Voir ses parcours
            </Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                background: "#fff",
                border: "1.5px solid var(--ink-100)",
                borderRadius: 18,
                padding: 20,
              }}
            >
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 900 }}>
                À propos
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                  lineHeight: 1.6,
                }}
              >
                Ingénieur passionné, j'enseigne la robotique depuis 6 ans.
                J'aime transmettre par le projet : on apprend vraiment quand on
                construit. Mes parcours vont du premier robot mobile à l'IA
                embarquée.
              </p>
            </div>
            <div>
              <SectionHeader title="Badges & distinctions" />
              <div style={{ display: "flex", gap: 16 }}>
                <Medal icon="🏅" tone="gold" size={80} />
                <Medal icon="🤖" tone="gold" size={80} />
                <Medal icon="⭐" tone="silver" size={80} />
                <Medal tone="locked" size={80} />
              </div>
            </div>
            <div>
              <SectionHeader title="Parcours créés" action="Voir tout" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 16,
                }}
              >
                <CourseCard
                  title="Construis ton robot Bluetooth"
                  level="Intermédiaire"
                  price="25 000 F"
                  color="var(--cat-robotique)"
                  emoji="🤖"
                />
                <CourseCard
                  title="Premiers circuits"
                  level="Débutant"
                  free
                  color="var(--cat-electronique)"
                  emoji="⚡"
                />
                <CourseCard
                  title="IA embarquée"
                  level="Avancé"
                  price="30 000 F"
                  color="var(--cat-ia)"
                  emoji="🧠"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL13 · DÉFIS (challenges)
// ════════════════════════════════════════════════════════
function WL13_Challenges() {
  const ch = [
    {
      emoji: "🤖",
      title: "Robot Sumo 2026",
      prize: "Kit avancé + ticket",
      deadline: "14 juin",
      level: "Tous niveaux",
      color: "var(--cat-robotique)",
      n: 240,
    },
    {
      emoji: "🌦️",
      title: "Station météo connectée",
      prize: "Badge exclusif",
      deadline: "30 juin",
      level: "Intermédiaire",
      color: "var(--cat-electronique)",
      n: 96,
    },
    {
      emoji: "🎮",
      title: "Crée ton mini-jeu",
      prize: "Certification offerte",
      deadline: "12 juil.",
      level: "Débutant",
      color: "var(--cat-code)",
      n: 318,
    },
    {
      emoji: "🧠",
      title: "Défi IA Junior",
      prize: "Mentorat 1-1",
      deadline: "20 juil.",
      level: "Avancé",
      color: "var(--cat-ia)",
      n: 54,
    },
  ];
  return (
    <PublicShell active="defis">
      <div style={{ ...WL_WRAP, padding: "40px 32px 56px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Défis Steamy
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 580,
            lineHeight: 1.5,
          }}
        >
          Relève des défis, gagne des récompenses et grimpe au classement.
          Ouverts à tous - crée un compte pour participer.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
            marginTop: 24,
          }}
        >
          {ch.map((c, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: "1.5px solid var(--ink-100)",
                borderRadius: 20,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: 120,
                  background: c.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 52,
                  flexShrink: 0,
                }}
              >
                {c.emoji}
              </div>
              <div
                style={{
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: 1,
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 900 }}>{c.title}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge tone="amber" icon={<span>🏆</span>}>
                    {c.prize}
                  </Badge>
                  <Badge>{c.level}</Badge>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                  }}
                >
                  ⏳ Clôture le {c.deadline} · 👥 {c.n} participants
                </div>
                <div style={{ marginTop: "auto" }}>
                  <Button size="sm">Participer</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <WLJoinBanner />
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL14 · CLASSEMENTS (leaderboard)
// ════════════════════════════════════════════════════════
function WL14_Leaderboard() {
  const [tab, setTab] = React.useState("week");
  const top = [
    {
      rank: 2,
      name: "Noé S.",
      emoji: "🦊",
      pts: "4 820",
      color: "var(--cat-mecanique)",
    },
    {
      rank: 1,
      name: "Léa A.",
      emoji: "🦉",
      pts: "6 140",
      color: "var(--primary-500)",
    },
    {
      rank: 3,
      name: "Inès K.",
      emoji: "🐯",
      pts: "4 510",
      color: "var(--amber-500)",
    },
  ];
  const rest = [
    { rank: 4, name: "Yann D.", emoji: "🐲", pts: "3 980", badges: 7 },
    { rank: 5, name: "Awa T.", emoji: "🐼", pts: "3 740", badges: 6 },
    { rank: 6, name: "Sami B.", emoji: "🐢", pts: "3 200", badges: 5 },
    { rank: 7, name: "Fatou C.", emoji: "🦄", pts: "2 980", badges: 5 },
  ];
  const podH = { 1: 150, 2: 116, 3: 96 };
  return (
    <PublicShell active="defis">
      <div style={{ ...WL_WRAP, padding: "40px 32px 56px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
            Classements
          </h1>
          <div className="tabs-pill">
            <button
              className={["tabs-pill__btn", tab === "week" && "is-active"]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTab("week")}
            >
              Cette semaine
            </button>
            <button
              className={["tabs-pill__btn", tab === "all" && "is-active"]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTab("all")}
            >
              Tous les temps
            </button>
          </div>
        </div>
        {/* Podium */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 16,
            margin: "32px 0",
          }}
        >
          {top.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                width: 150,
              }}
            >
              <Avatar
                emoji={t.emoji}
                size={t.rank === 1 ? 72 : 56}
                color={t.color}
                ring={t.rank === 1}
              />
              <div style={{ fontSize: 14, fontWeight: 900 }}>{t.name}</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--primary-600)",
                }}
              >
                {t.pts} pts
              </div>
              <div
                style={{
                  width: "100%",
                  height: podH[t.rank],
                  borderRadius: "12px 12px 0 0",
                  background:
                    t.rank === 1
                      ? "linear-gradient(180deg, var(--amber-400), var(--amber-500))"
                      : "var(--ink-100)",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: 10,
                  fontSize: 26,
                  fontWeight: 900,
                  color: t.rank === 1 ? "#fff" : "var(--ink-500)",
                }}
              >
                {t.rank}
              </div>
            </div>
          ))}
        </div>
        {/* Liste */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rest.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 18px",
                background: "#fff",
                border: "1px solid var(--ink-100)",
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  width: 28,
                  fontSize: 15,
                  fontWeight: 900,
                  color: "var(--ink-500)",
                }}
              >
                {r.rank}
              </div>
              <Avatar emoji={r.emoji} size={40} />
              <div style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>
                {r.name}
              </div>
              <Badge tone="amber">🏅 {r.badges}</Badge>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: "var(--primary-600)",
                  minWidth: 80,
                  textAlign: "right",
                }}
              >
                {r.pts} pts
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL15 · TUTORIELS PARTAGÉS (communauté)
// ════════════════════════════════════════════════════════
function WL15_Tutorials() {
  const tut = [
    {
      emoji: "🤖",
      title: "Faire avancer son robot en ligne droite",
      author: "Léa A.",
      dur: "6 min",
      likes: 128,
      color: "var(--cat-robotique)",
    },
    {
      emoji: "💡",
      title: "Allumer une LED avec une résistance",
      author: "Yann D.",
      dur: "4 min",
      likes: 96,
      color: "var(--cat-electronique)",
    },
    {
      emoji: "💻",
      title: "Ma première boucle en Scratch",
      author: "Inès K.",
      dur: "8 min",
      likes: 210,
      color: "var(--cat-code)",
    },
    {
      emoji: "🧠",
      title: "Reconnaître une image avec l'IA",
      author: "Noé S.",
      dur: "12 min",
      likes: 74,
      color: "var(--cat-ia)",
    },
    {
      emoji: "🔆",
      title: "Brancher un panneau solaire",
      author: "Awa T.",
      dur: "5 min",
      likes: 52,
      color: "var(--cat-energie)",
    },
    {
      emoji: "🦾",
      title: "Piloter un servomoteur",
      author: "Sami B.",
      dur: "9 min",
      likes: 88,
      color: "var(--cat-mecanique)",
    },
  ];
  return (
    <PublicShell active="tutos">
      <div style={{ ...WL_WRAP, padding: "40px 32px 56px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Tutoriels partagés
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 580,
            lineHeight: 1.5,
          }}
        >
          Des mini-tutos créés par la communauté Steamy. Apprends une astuce,
          puis partage les tiennes.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginTop: 24,
          }}
        >
          {tut.map((t, i) => (
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
                  height: 120,
                  background: t.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  position: "relative",
                }}
              >
                {t.emoji}
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: "rgba(255,255,255,.92)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="play" size={18} color="var(--primary-600)" />
                </div>
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
                <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>
                  {t.title}
                </div>
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                  }}
                >
                  <span>
                    Par {t.author} · {t.dur}
                  </span>
                  <span>❤ {t.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <WLJoinBanner />
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL16 · CATÉGORIES
// ════════════════════════════════════════════════════════
function WL16_Categories() {
  const cats = [
    { emoji: "🤖", name: "Robotique", n: 42, color: "var(--cat-robotique)" },
    {
      emoji: "⚡",
      name: "Électronique",
      n: 28,
      color: "var(--cat-electronique)",
    },
    { emoji: "💻", name: "Programmation", n: 36, color: "var(--cat-code)" },
    {
      emoji: "🧠",
      name: "Intelligence artificielle",
      n: 18,
      color: "var(--cat-ia)",
    },
    { emoji: "🦾", name: "Mécanique", n: 15, color: "var(--cat-mecanique)" },
    { emoji: "🔆", name: "Énergie", n: 12, color: "var(--cat-energie)" },
  ];
  return (
    <PublicShell active="parcours">
      <div style={{ ...WL_WRAP, padding: "40px 32px 56px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Explore par catégorie
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Choisis un domaine et découvre tous les parcours, kits et ateliers
          associés.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginTop: 24,
          }}
        >
          {cats.map((c, i) => (
            <div
              key={i}
              style={{
                borderRadius: 22,
                overflow: "hidden",
                border: "1.5px solid var(--ink-100)",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <div
                style={{
                  height: 120,
                  background: c.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 56,
                }}
              >
                {c.emoji}
              </div>
              <div
                style={{
                  padding: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900 }}>{c.name}</div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                    }}
                  >
                    {c.n} parcours
                  </div>
                </div>
                <Icon name="arrow-right" size={20} color="var(--ink-400)" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL17 · BLOG (liste)
// ════════════════════════════════════════════════════════
function WL17_Blog() {
  const posts = [
    {
      emoji: "🤖",
      cat: "Robotique",
      title: "Débuter en robotique à 12 ans : par où commencer ?",
      date: "28 mai 2026",
      color: "var(--cat-robotique)",
    },
    {
      emoji: "👨‍👩‍👧",
      cat: "Parents",
      title: "Accompagner son enfant dans le STEM sans être expert",
      date: "21 mai 2026",
      color: "var(--cat-ia)",
    },
    {
      emoji: "🏆",
      cat: "Communauté",
      title: "Retour sur le Challenge Robot Sumo 2025",
      date: "14 mai 2026",
      color: "var(--amber-500)",
    },
    {
      emoji: "💻",
      cat: "Code",
      title: "5 projets Scratch pour s'amuser cet été",
      date: "7 mai 2026",
      color: "var(--cat-code)",
    },
  ];
  return (
    <PublicShell active="blog">
      <div style={{ ...WL_WRAP, padding: "40px 32px 56px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Le blog Steamy
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Conseils, retours d'expérience et actus du STEM en Afrique
          francophone.
        </p>
        {/* À la une */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 24,
            margin: "24px 0",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: 22,
              overflow: "hidden",
              border: "1.5px solid var(--ink-100)",
              background: "#fff",
            }}
          >
            <div
              style={{
                height: 260,
                background:
                  "linear-gradient(135deg, var(--cat-robotique), #3D27B8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 88,
              }}
            >
              🤖
            </div>
            <div style={{ padding: 24 }}>
              <Badge tone="primary">À la une · Robotique</Badge>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  margin: "12px 0 8px",
                  lineHeight: 1.25,
                }}
              >
                Débuter en robotique à 12 ans : par où commencer ?
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                  lineHeight: 1.6,
                }}
              >
                Le guide complet pour se lancer sans matériel coûteux, étape par
                étape, avec les bons réflexes.
              </p>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                }}
              >
                Par Koffi A. · 28 mai 2026 · 6 min de lecture
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.slice(1).map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: 14,
                  background: "#fff",
                  border: "1.5px solid var(--ink-100)",
                  borderRadius: 16,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 72,
                    borderRadius: 12,
                    background: p.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 30,
                    flexShrink: 0,
                  }}
                >
                  {p.emoji}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--primary-600)",
                    }}
                  >
                    {p.cat}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      lineHeight: 1.3,
                      marginTop: 2,
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      marginTop: 4,
                    }}
                  >
                    {p.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL18 · ARTICLE (détail blog)
// ════════════════════════════════════════════════════════
function WL18_Article() {
  return (
    <PublicShell active="blog">
      <div
        style={{ maxWidth: 760, margin: "0 auto", padding: "40px 32px 56px" }}
      >
        <div className="crumb">
          Blog › Robotique › <b>Débuter en robotique à 12 ans</b>
        </div>
        <Badge tone="primary">Robotique</Badge>
        <h1
          style={{
            fontSize: 38,
            fontWeight: 900,
            margin: "14px 0 12px",
            lineHeight: 1.15,
          }}
        >
          Débuter en robotique à 12 ans : par où commencer ?
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Avatar emoji="🦉" size={40} color="var(--primary-500)" />
          <div
            style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}
          >
            Koffi Adékambi · 28 mai 2026 · 6 min de lecture
          </div>
        </div>
        <div
          style={{
            height: 280,
            borderRadius: 22,
            background:
              "linear-gradient(135deg, var(--cat-robotique), #3D27B8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 96,
            marginBottom: 24,
          }}
        >
          🤖
        </div>
        {[
          [
            "Pas besoin d'un labo",
            "On peut commencer la robotique avec très peu : un kit de base, de la curiosité, et un objectif concret. L'erreur la plus commune est de vouloir tout comprendre avant de construire.",
          ],
          [
            "Construire d'abord, comprendre ensuite",
            "Le cerveau retient mieux quand les mains travaillent. Branche, teste, observe ce qui marche - puis demande-toi pourquoi. C'est le cœur de la pédagogie Steamy.",
          ],
          [
            "Trois projets pour démarrer",
            "Un robot qui avance en ligne droite, une LED qui clignote, un capteur qui réagit à la lumière. Trois projets, trois semaines, et déjà les bases de la robotique mobile.",
          ],
        ].map(([h, b], i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>
              {h}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 500,
                color: "var(--ink-700)",
                lineHeight: 1.7,
              }}
            >
              {b}
            </p>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 0",
            borderTop: "1px solid var(--ink-100)",
            marginTop: 8,
          }}
        >
          <span
            style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-600)" }}
          >
            Partager :
          </span>
          <WLSocial light size={20} />
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL19 · COMMUNAUTÉ
// ════════════════════════════════════════════════════════
function WL19_Community() {
  const discussions = [
    {
      emoji: "🤖",
      title: "Mon robot tourne en rond, une idée ?",
      author: "Léa A.",
      replies: 12,
      tag: "Robotique",
    },
    {
      emoji: "💻",
      title: "Partagez vos meilleurs projets Scratch",
      author: "Inès K.",
      replies: 34,
      tag: "Code",
    },
    {
      emoji: "🔋",
      title: "Quelle batterie pour le Steamy Bot v1 ?",
      author: "Yann D.",
      replies: 8,
      tag: "Électronique",
    },
  ];
  return (
    <PublicShell active="communaute">
      <div
        style={{
          background:
            "linear-gradient(180deg, var(--primary-50) 0%, #fff 100%)",
        }}
      >
        <div style={{ ...WL_WRAP, padding: "48px 32px", textAlign: "center" }}>
          <Badge tone="primary">💬 Communauté</Badge>
          <h1 style={{ fontSize: 40, fontWeight: 900, margin: "14px 0 0" }}>
            Apprends, partage, progresse ensemble
          </h1>
          <p
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--ink-600)",
              maxWidth: 560,
              margin: "14px auto 0",
              lineHeight: 1.5,
            }}
          >
            Pose tes questions, montre tes projets et inspire-toi des autres
            jeunes makers.
          </p>
          <div
            style={{
              display: "flex",
              gap: 28,
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            {[
              ["3 200", "Membres"],
              ["1 450", "Projets partagés"],
              ["8 900", "Discussions"],
            ].map(([v, l], i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "var(--primary-600)",
                  }}
                >
                  {v}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        style={{
          ...WL_WRAP,
          padding: "48px 32px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 28,
          alignItems: "flex-start",
        }}
      >
        <div>
          <SectionHeader title="Discussions récentes" action="Tout voir" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {discussions.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
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
                    background: "var(--primary-100)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  {d.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{d.title}</div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                    }}
                  >
                    Par {d.author} ·{" "}
                    <span style={{ color: "var(--primary-600)" }}>{d.tag}</span>
                  </div>
                </div>
                <Badge>💬 {d.replies}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: "var(--bg)",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 24,
            textAlign: "center",
          }}
        >
          <Mascot pose="wave" size={120} />
          <h3 style={{ margin: "8px 0 6px", fontSize: 18, fontWeight: 900 }}>
            Rejoins la communauté
          </h3>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-600)",
              lineHeight: 1.5,
            }}
          >
            Crée ton compte gratuit pour poster, commenter et partager tes
            projets.
          </p>
          <Button block size="lg">
            Créer un compte
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL20 · GUIDES GRATUITS / TÉLÉCHARGEMENTS (lead capture)
// ════════════════════════════════════════════════════════
function WL20_Guides() {
  const guides = [
    {
      emoji: "📘",
      title: "Le guide du jeune roboticien",
      pages: "24 pages",
      color: "var(--cat-robotique)",
    },
    {
      emoji: "⚡",
      title: "Bases de l'électronique illustrées",
      pages: "18 pages",
      color: "var(--cat-electronique)",
    },
    {
      emoji: "💻",
      title: "Scratch : 10 mini-projets",
      pages: "20 pages",
      color: "var(--cat-code)",
    },
  ];
  return (
    <PublicShell active="guides">
      <div style={{ ...WL_WRAP, padding: "40px 32px 56px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Guides gratuits
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Des ressources PDF gratuites pour apprendre à ton rythme. Laisse ton
          email, on te les envoie.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 24,
            marginTop: 24,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {guides.map((g, i) => (
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
                    height: 140,
                    background: g.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 56,
                  }}
                >
                  {g.emoji}
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
                  <div
                    style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}
                  >
                    {g.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                    }}
                  >
                    PDF · {g.pages}
                  </div>
                  <div style={{ marginTop: "auto" }}>
                    <Button
                      size="sm"
                      variant="outline"
                      iconRight={
                        <Icon name="arrow-right" size={14} strokeWidth={3} />
                      }
                    >
                      Télécharger
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              position: "sticky",
              top: 80,
              background: "var(--primary-50)",
              border: "2px solid var(--primary-100)",
              borderRadius: 22,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 30 }}>📥</div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              Reçois tous les guides
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-600)",
                lineHeight: 1.5,
              }}
            >
              Un seul email pour débloquer la bibliothèque complète.
            </p>
            <Field label="Ton email" required>
              <Input
                value=""
                placeholder="toi@exemple.bj"
                icon={<Icon name="mail" size={18} color="var(--ink-500)" />}
              />
            </Field>
            <Button block size="lg">
              Recevoir les guides
            </Button>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-500)",
                textAlign: "center",
              }}
            >
              Zéro spam. Désinscription en 1 clic.
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL21 · ÉVÉNEMENTS / CALENDRIER (+ inscription)
// ════════════════════════════════════════════════════════
function WL21_Events() {
  const events = [
    {
      d: "14",
      m: "JUIN",
      title: "Challenge Robot Sumo",
      place: "Cotonou · Espace TIA",
      time: "09:00 – 17:00",
      price: "Gratuit",
      color: "var(--cat-robotique)",
    },
    {
      d: "28",
      m: "JUIN",
      title: "Atelier Électronique débutant",
      place: "Porto-Novo",
      time: "14:00 – 16:30",
      price: "5 000 F",
      color: "var(--cat-electronique)",
    },
    {
      d: "12",
      m: "JUIL",
      title: "Hackathon IA Junior",
      place: "En ligne",
      time: "48 h",
      price: "Gratuit",
      color: "var(--cat-ia)",
    },
    {
      d: "26",
      m: "JUIL",
      title: "Masterclass : ton premier jeu",
      place: "En ligne",
      time: "15:00 – 17:00",
      price: "Gratuit",
      color: "var(--cat-code)",
    },
  ];
  return (
    <PublicShell active="evenements">
      <div style={{ ...WL_WRAP, padding: "40px 32px 56px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
          Événements & ateliers
        </h1>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink-600)",
            margin: "10px 0 0",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Le calendrier des prochains rendez-vous Steamy. Inscris-toi en
          quelques secondes.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 24,
          }}
        >
          {events.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: 16,
                background: "#fff",
                border: "1.5px solid var(--ink-100)",
                borderRadius: 18,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: e.color,
                  color: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>
                  {e.d}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.9 }}>
                  {e.m}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{e.title}</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    marginTop: 2,
                  }}
                >
                  📍 {e.place} · 🕒 {e.time}
                </div>
              </div>
              <Badge tone={e.price === "Gratuit" ? "success" : "primary"}>
                {e.price}
              </Badge>
              <Button>S'inscrire</Button>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
const publicWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};

function PublicFlowWeb() {
  return (
    <DesignCanvas>
      {/* Écrans à concevoir (C18) : screens-*-a-concevoir-web.jsx */}
      {window.PublicACSections && window.PublicACSections()}
      <DCSection
        id="site-home"
        title="Steamy site · Accueil & présentation"
        subtitle="Landing publique · page À propos (mission, valeurs, équipe)."
      >
        <DCArtboard
          id="WL01"
          label="WL01 · Accueil"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL01_Landing />
        </DCArtboard>
        <DCArtboard
          id="WL10"
          label="WL10 · À propos"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL10_About />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="site-catalog"
        title="Catalogue & boutique"
        subtitle="Projets & parcours · catégories · boutique de kits · ateliers (vue publique)."
      >
        <DCArtboard
          id="WL06"
          label="WL06 · Projets & Parcours"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL06_PublicCatalog />
        </DCArtboard>
        <DCArtboard
          id="WL16"
          label="WL16 · Catégories"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL16_Categories />
        </DCArtboard>
        <DCArtboard
          id="WL07"
          label="WL07 · Boutique de kits"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL07_PublicShop />
        </DCArtboard>
        <DCArtboard
          id="WL08"
          label="WL08 · Ateliers"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL08_PublicWorkshops />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="site-engage"
        title="Écoles · profil · défis"
        subtitle="Offre écoles (B2B) · profil public · défis · classements."
      >
        <DCArtboard
          id="WL11"
          label="WL11 · Écoles - Offre"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL11_Schools />
        </DCArtboard>
        <DCArtboard
          id="WL12"
          label="WL12 · Profil public"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL12_PublicProfile />
        </DCArtboard>
        <DCArtboard
          id="WL13"
          label="WL13 · Défis"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL13_Challenges />
        </DCArtboard>
        <DCArtboard
          id="WL14"
          label="WL14 · Classements"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL14_Leaderboard />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="site-resources"
        title="Ressources"
        subtitle="Blog + article · communauté · tutoriels · guides gratuits · événements."
      >
        <DCArtboard
          id="WL17"
          label="WL17 · Blog"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL17_Blog />
        </DCArtboard>
        <DCArtboard
          id="WL18"
          label="WL18 · Article"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL18_Article />
        </DCArtboard>
        <DCArtboard
          id="WL19"
          label="WL19 · Communauté"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL19_Community />
        </DCArtboard>
        <DCArtboard
          id="WL15"
          label="WL15 · Tutoriels partagés"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL15_Tutorials />
        </DCArtboard>
        <DCArtboard
          id="WL20"
          label="WL20 · Guides gratuits"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL20_Guides />
        </DCArtboard>
        <DCArtboard
          id="WL21"
          label="WL21 · Événements"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL21_Events />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="site-account"
        title="Légal & accès au compte"
        subtitle="Pages légales · réinitialisation du mot de passe (numéro → OTP → nouveau MDP → succès)."
      >
        <DCArtboard
          id="WL09"
          label="WL09 · Pages légales"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL09_Legal />
        </DCArtboard>
        <DCArtboard
          id="WL02"
          label="WL02 · Mot de passe oublié"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL02_Forgot />
        </DCArtboard>
        <DCArtboard
          id="WL03"
          label="WL03 · Code OTP"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL03_OTP />
        </DCArtboard>
        <DCArtboard
          id="WL04"
          label="WL04 · Nouveau mot de passe"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL04_NewPassword />
        </DCArtboard>
        <DCArtboard
          id="WL05"
          label="WL05 · Réinitialisé ✓"
          width={PUBLIC_W}
          height={PUBLIC_H}
          style={publicWebStyle}
        >
          <WL05_Done />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.PublicFlowWeb = PublicFlowWeb;
