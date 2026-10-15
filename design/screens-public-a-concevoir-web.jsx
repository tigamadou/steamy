// screens-public-a-concevoir-web.jsx - Écrans publics absents de la maquette (C18), version web (1240×760).
// WL22 · Fiche parcours publique (D11) · WL23 · Fiche événement (S8, C3) · WL24 · Aide & contact (D17).
// Spec : docs/SPEC-ECRANS-1-public-auth.md §1.14 à §1.16.
// Réutilise WLFooter, WLJoinBanner, WL_WRAP (public-web), LearnList (catalog-web), WDACShell
// (apprenant-a-concevoir), WebParentShell (parent-dashboard-web) et le DS.
// Aucune donnée de mineur (D15). Tokens uniquement.
// Ne s'auto-monte pas : expose window.PublicACSections, appelée par PublicFlowWeb.

const WLAC_W = 1240,
  WLAC_H = 760;
const wlacStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-pop-md)",
  overflow: "hidden",
};

// Barre de progression : classes .progress du DS, sans le flex: 1 qui l'écrase dans une colonne flex.
function WLACBar({ value = 0, tone }) {
  return (
    <div className={["progress", tone && `progress--${tone}`].filter(Boolean).join(" ")} style={{ flex: "none", width: "100%" }}>
      <div className="progress__bar" style={{ width: `${value}%` }} />
    </div>
  );
}
const WLAC_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 16px var(--font-sans)",
  color: "var(--ink-900)",
};
const WLAC_TEXTAREA = {
  width: "100%",
  minHeight: 120,
  border: "2px solid var(--ink-200)",
  borderRadius: 14,
  padding: "12px 16px",
  font: "600 15px var(--font-sans)",
  color: "var(--ink-900)",
  resize: "vertical",
  outline: "none",
  boxSizing: "border-box",
};
// Voile clair sur fond coloré, dérivé du token de surface.
const WLAC_VEIL = "color-mix(in srgb, var(--surface) 22%, transparent)";

// ─── Chrome public aligné sur la spec (§1.1) ─────────
// Sans « Défis » (WL13 reporté, S7) ; menu Ressources réduit à Blog, Événements, Guides
// (Ateliers fusionnés dans Événements, S8 ; Communauté et Tutoriels reportés). Les écrans
// historiques gardent WLNavBar.
const WLAC_RESOURCES = [
  ["blog", "Blog", "📰"],
  ["evenements", "Événements", "📅"],
  ["guides", "Guides gratuits", "📥"],
];

function WLACNavBar({ active }) {
  const items = [
    ["accueil", "Accueil"],
    ["parcours", "Parcours"],
    ["boutique", "Boutique"],
    ["ecoles", "Écoles"],
  ];
  const linkStyle = (id) => ({
    fontSize: 14,
    fontWeight: 800,
    color: active === id ? "var(--primary-600)" : "var(--ink-700)",
    textDecoration: "none",
    cursor: "pointer",
  });
  const resActive = WLAC_RESOURCES.some((r) => r[0] === active);
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "color-mix(in srgb, var(--surface) 95%, transparent)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--ink-100)",
      }}
    >
      <div style={{ ...WL_WRAP, padding: "12px 32px", display: "flex", alignItems: "center", gap: 18 }}>
        <Logo height={32} />
        <nav style={{ display: "flex", gap: 16, marginLeft: 8, alignItems: "center" }}>
          {items.map(([id, label]) => (
            <a key={id} style={linkStyle(id)}>
              {label}
            </a>
          ))}
          <span
            title={WLAC_RESOURCES.map((r) => r[1]).join(" · ")}
            style={{ ...linkStyle(resActive ? active : ""), display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            Ressources
            <Icon name="chevron-down" size={14} color={resActive ? "var(--primary-600)" : "var(--ink-700)"} />
          </span>
          <a style={linkStyle("apropos")}>À propos</a>
        </nav>
        <div style={{ flex: 1 }} />
        <Button variant="ghost">Se connecter</Button>
        <Button>Créer un compte</Button>
      </div>
    </div>
  );
}

// Shell public des écrans à concevoir : même structure que PublicShell, nav alignée.
// onWheel : artefact du canvas (défilement dans l'artboard), à ne pas porter.
function WLACPublicShell({ active, children }) {
  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      style={{ height: "100%", overflowY: "auto", background: "var(--surface)", fontFamily: "var(--font-sans)", color: "var(--ink-900)" }}
    >
      <WLACNavBar active={active} />
      {children}
      <WLFooter />
    </div>
  );
}

// ─── Composants partagés du fichier ───────────────────
function WLACCrumb({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)", marginBottom: 16 }}>{children}</div>
  );
}

function WLACCard({ children, style }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink-100)",
        borderRadius: 22,
        padding: 22,
        boxShadow: "var(--shadow-pop-md)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function WLACNote({ icon = "💡", tone = "primary", children }) {
  const bg = { primary: "var(--primary-50)", amber: "var(--amber-50)", ink: "var(--ink-50)" }[tone];
  const bd = { primary: "var(--primary-100)", amber: "var(--amber-200)", ink: "var(--ink-100)" }[tone];
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 14,
        background: bg,
        border: `2px solid ${bd}`,
        fontSize: 13,
        fontWeight: 700,
        color: "var(--ink-700)",
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1.3 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function WLACSection({ title, children }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}

function WLACFact({ icon, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, fontWeight: 700, color: "var(--ink-700)" }}>
      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WL22 · FICHE PARCOURS PUBLIQUE (D11)
// ════════════════════════════════════════════════════════
// Plan du parcours : projets → niveaux → titres des missions uniquement (aucun contenu, aucune durée).
const WLAC_PLAN_SCRATCH = [
  {
    title: "Premiers blocs et animations",
    levels: [
      { title: "Découvrir Scratch", missions: ["Découvrir l'interface", "Mes premiers personnages", "Animation simple"] },
      { title: "Faire bouger un lutin", missions: ["Déplacements au clavier", "Costumes et décors", "Mon premier dessin animé"] },
    ],
  },
  {
    title: "Variables et boucles",
    levels: [
      { title: "Compter et retenir", missions: ["Créer une variable", "Afficher un score", "Le chronomètre"] },
      { title: "Répéter sans se fatiguer", missions: ["Boucles « répéter »", "Boucles « pour toujours »", "Mini-jeu de score"] },
    ],
  },
  {
    title: "Mon mini-jeu complet",
    levels: [
      { title: "Construire le jeu", missions: ["Personnage jouable", "Niveaux et obstacles", "Écran de fin"] },
      { title: "Le peaufiner", missions: ["Sons et musique", "Tester et corriger", "Partager avec ma classe"] },
    ],
  },
];

function WLACPlanProject({ index, p, expanded }) {
  const nMissions = p.levels.reduce((n, l) => n + l.missions.length, 0);
  return (
    <div
      style={{
        border: "2px solid",
        borderColor: expanded ? "var(--primary-200)" : "var(--ink-100)",
        borderRadius: 18,
        marginBottom: 10,
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: expanded ? "var(--primary-500)" : "var(--ink-100)",
            color: expanded ? "var(--surface)" : "var(--ink-700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
          }}
        >
          {index}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "var(--ink-500)", letterSpacing: ".06em", textTransform: "uppercase" }}>
            Projet {index}
          </div>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{p.title}</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
          {p.levels.length} niveaux · {nMissions} missions
        </span>
        <span style={{ display: "inline-flex", transform: expanded ? "rotate(180deg)" : "none" }}>
          <Icon name="chevron-down" size={18} color="var(--ink-500)" />
        </span>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 14px 64px", display: "flex", flexDirection: "column", gap: 12 }}>
          {p.levels.map((l, i) => (
            <div key={i}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--primary-700)", marginBottom: 6 }}>
                Niveau {i + 1} · {l.title}
              </div>
              {l.missions.map((m, j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 0",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--ink-700)",
                  }}
                >
                  <Icon name="lock" size={14} color="var(--ink-400)" />
                  {m}
                </div>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>
            Chaque niveau se termine par un quiz, chaque projet par une évaluation finale.
          </div>
        </div>
      )}
    </div>
  );
}

// Hero de fiche publique : visuel, catégorie, difficulté, titre, durée indicative (pas de note ni d'inscrits).
function WLACCourseHero({ category, color, emoji, title, level, duration, price, kit }) {
  return (
    <div
      style={{
        borderRadius: 24,
        background: color,
        color: "var(--surface)",
        padding: "28px 28px",
        display: "flex",
        gap: 24,
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <span
          style={{
            alignSelf: "flex-start",
            background: WLAC_VEIL,
            borderRadius: 999,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: ".04em",
            textTransform: "uppercase",
          }}
        >
          {category}
        </span>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, lineHeight: 1.15 }}>{title}</h1>
        <div style={{ display: "flex", gap: 16, fontSize: 14, fontWeight: 800, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="trophy" size={14} color="var(--surface)" /> {level}
          </span>
          <span>⏱ {duration} environ</span>
          <span>📜 Certification à la clé</span>
          {kit && <span>📦 Kit requis</span>}
        </div>
        <div>
          {price ? (
            <Badge tone="amber">{price}</Badge>
          ) : kit ? (
            <Badge tone="amber">📦 Avec le Kit Code</Badge>
          ) : (
            <Badge tone="success">Gratuit</Badge>
          )}
        </div>
      </div>
      <div
        style={{
          width: 220,
          height: 150,
          borderRadius: 18,
          background: WLAC_VEIL,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 64 }}>{emoji}</span>
        <button
          aria-label="Lire la bande-annonce"
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            width: 44,
            height: 44,
            borderRadius: 999,
            border: 0,
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-pop-md)",
          }}
        >
          <Icon name="play" size={20} color="var(--ink-900)" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// Encart d'inscription public (sticky) : 3 variantes gratuit / payant / kit requis.
function WLACEnrollCard({ kind = "free", facts }) {
  return (
    <div style={{ position: "sticky", top: 84 }}>
      <WLACCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {kind === "free" && (
          <>
            <div>
              <Badge tone="success">Gratuit · accès complet</Badge>
            </div>
            <Button block size="lg" variant="secondary" icon={<Icon name="play" size={18} color="var(--surface)" strokeWidth={3} />}>
              Commencer
            </Button>
          </>
        )}
        {kind === "paid" && (
          <>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "var(--ink-900)" }}>
                18 000 <span style={{ fontSize: 16, color: "var(--ink-500)" }}>FCFA</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
                📱 Payé par ton parent en Mobile Money · accès à vie
              </div>
            </div>
            <Button block size="lg" icon={<Icon name="user" size={18} color="var(--surface)" strokeWidth={2.5} />}>
              Demander à mon parent
            </Button>
          </>
        )}
        {kind === "kit" && (
          <>
            <WLACNote icon="📦" tone="amber">
              Ce parcours s'obtient avec le <b>Kit Code</b> fourni avec le kit. Pas de paiement séparé.
            </WLACNote>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 16,
                border: "2px solid var(--ink-100)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--cat-robotique)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                🤖
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 900 }}>Steamy Bot v1</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>35 000 FCFA · livré au Bénin</div>
              </div>
            </div>
            <Button block size="lg" icon={<Icon name="cart" size={18} color="var(--surface)" strokeWidth={2.5} />}>
              Voir le kit
            </Button>
          </>
        )}
        <Button block variant="ghost">
          {kind === "kit" ? "J'ai déjà un Kit Code · Se connecter" : "J'ai déjà un compte · Se connecter"}
        </Button>
        <div style={{ height: 2, background: "var(--ink-100)", borderRadius: 2 }} />
        <div style={{ fontSize: 12, fontWeight: 900, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Inclus dans le parcours
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {facts.map((f, i) => (
            <WLACFact key={i} icon={f[0]}>
              {f[1]}
            </WLACFact>
          ))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)", lineHeight: 1.5 }}>
          Un compte est nécessaire : ton parent valide ton inscription en 1 min.
        </div>
      </WLACCard>
    </div>
  );
}

function WLACCertification() {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        padding: 18,
        borderRadius: 18,
        background: "var(--amber-50)",
        border: "2px solid var(--amber-200)",
      }}
    >
      <Medal icon="📜" tone="gold" size={72} />
      <div>
        <div style={{ fontSize: 16, fontWeight: 900 }}>Certification Steamy</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.5 }}>
          Délivrée en PDF quand toutes les missions et toutes les évaluations finales sont réussies. Elle
          s'accompagne d'un ticket offert pour un Steamy Event.
        </div>
      </div>
    </div>
  );
}

function WL22_PublicCourse() {
  return (
    <WLACPublicShell active="parcours">
      <div style={{ ...WL_WRAP, padding: "28px 32px 56px" }}>
        <WLACCrumb>
          Parcours › Code › <b style={{ color: "var(--ink-900)" }}>Initiation à Scratch</b>
        </WLACCrumb>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 28, alignItems: "flex-start" }}>
          <div>
            <WLACCourseHero
              category="Code · Programmation visuelle"
              color="var(--cat-code)"
              emoji="💻"
              title="Initiation à Scratch"
              level="Débutant"
              duration="8 h"
            />
            <WLACSection title="À propos du parcours">
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.6, margin: 0 }}>
                Ce parcours t'initie à la programmation avec Scratch, l'environnement visuel où l'on code en
                assemblant des blocs colorés. Tu crées tes premières animations, puis un vrai mini-jeu que tu
                peux montrer à ta classe.
              </p>
            </WLACSection>
            <WLACSection title="Ce que tu vas apprendre">
              <LearnList
                items={[
                  "Construire un programme avec des blocs",
                  "Utiliser variables et boucles",
                  "Animer des personnages",
                  "Réagir au clavier et à la souris",
                  "Programmer la logique d'un mini-jeu",
                  "Trouver et corriger une erreur",
                ]}
              />
            </WLACSection>
            <WLACSection title="Plan du parcours · 3 projets, 6 niveaux, 18 missions">
              {WLAC_PLAN_SCRATCH.map((p, i) => (
                <WLACPlanProject key={i} index={i + 1} p={p} expanded={i === 0} />
              ))}
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
                🔒 Le contenu des missions (vidéos, activités, quiz) est accessible après inscription.
              </div>
            </WLACSection>
            <WLACSection title="Certification délivrée">
              <WLACCertification />
            </WLACSection>
            <WLACSection title="Pour qui ?">
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.6, margin: 0 }}>
                Pour les <b>10–14 ans</b> qui découvrent la programmation. Aucun prérequis : savoir lire et avoir un
                ordinateur avec un navigateur suffit.
              </p>
            </WLACSection>
          </div>
          <WLACEnrollCard
            kind="free"
            facts={[
              ["⏱", "8 h de contenu environ"],
              ["📦", "3 projets · 6 niveaux"],
              ["🎯", "18 missions"],
              ["🏆", "Badges de niveau et de projet"],
              ["📜", "Certification PDF"],
            ]}
          />
        </div>
        <WLJoinBanner />
      </div>
    </WLACPublicShell>
  );
}

// Variantes « payant » et « kit requis » : seul l'en-tête et l'encart changent.
function WL22_Variant({ kind }) {
  const paid = kind === "paid";
  return (
    <WLACPublicShell active="parcours">
      <div style={{ ...WL_WRAP, padding: "28px 32px 56px" }}>
        <WLACCrumb>
          Parcours › {paid ? "Électronique" : "Robotique"} ›{" "}
          <b style={{ color: "var(--ink-900)" }}>{paid ? "Capteurs électroniques" : "Construis ton robot Bluetooth"}</b>
        </WLACCrumb>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 28, alignItems: "flex-start" }}>
          <div>
            {paid ? (
              <WLACCourseHero
                category="Électronique"
                color="var(--cat-electronique)"
                emoji="⚡"
                title="Capteurs électroniques"
                level="Intermédiaire"
                duration="10 h"
                price="18 000 FCFA"
              />
            ) : (
              <WLACCourseHero
                category="Robotique"
                color="var(--cat-robotique)"
                emoji="📡"
                title="Construis ton robot Bluetooth"
                level="Intermédiaire"
                duration="12 h"
                kit
              />
            )}
            <WLACSection title="À propos du parcours">
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.6, margin: 0 }}>
                {paid
                  ? "Lumière, température, distance : tu apprends à lire des capteurs et à faire réagir un circuit à son environnement."
                  : "Construis un robot mobile piloté depuis un smartphone en Bluetooth. Câblage, programmation de la carte et communication sans fil : tout se fait avec le kit Steamy Bot v1."}
              </p>
            </WLACSection>
            <WLACSection title={paid ? "Plan du parcours · 3 projets, 6 niveaux, 18 missions" : "Plan du parcours · 4 projets, 8 niveaux, 24 missions"}>
              <WLACPlanProject
                index={1}
                p={{
                  title: paid ? "Lire le monde" : "Premiers circuits",
                  levels: [
                    { title: paid ? "La lumière" : "Les composants", missions: paid ? ["Photorésistance", "Seuil de luminosité", "Veilleuse automatique"] : ["Composants de base", "Loi d'Ohm en pratique", "Série et parallèle"] },
                    { title: paid ? "La chaleur" : "Le courant", missions: ["a", "b", "c"] },
                  ],
                }}
              />
              <WLACPlanProject
                index={2}
                p={{
                  title: paid ? "Mesurer" : "Capteurs et moteurs",
                  levels: [
                    { title: "1", missions: ["a", "b", "c"] },
                    { title: "2", missions: ["a", "b", "c"] },
                  ],
                }}
              />
            </WLACSection>
          </div>
          <WLACEnrollCard
            kind={kind}
            facts={
              paid
                ? [["⏱", "10 h de contenu environ"], ["🎯", "18 missions"], ["📜", "Certification PDF"]]
                : [["⏱", "12 h de contenu environ"], ["🎯", "24 missions"], ["📦", "Kit Steamy Bot v1 requis"], ["📜", "Certification PDF"]]
            }
          />
        </div>
      </div>
    </WLACPublicShell>
  );
}

function WL22_Loading() {
  return (
    <WLACPublicShell active="parcours">
      <div style={{ ...WL_WRAP, padding: "28px 32px 56px" }}>
        <SkeletonBlock w={260} h={14} r={6} style={{ marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SkeletonBlock h={206} r={24} />
            <SkeletonBlock w={220} h={22} r={8} />
            <SkeletonBlock h={14} r={6} />
            <SkeletonBlock w="80%" h={14} r={6} />
            <SkeletonBlock h={66} r={18} />
            <SkeletonBlock h={66} r={18} />
          </div>
          <SkeletonBlock h={420} r={22} />
        </div>
      </div>
    </WLACPublicShell>
  );
}

function WLACNotFound({ title, body, cta }) {
  return (
    <div style={{ ...WL_WRAP, padding: "64px 32px 80px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
      <Mascot pose="sad" size={150} />
      <div style={{ fontSize: 13, fontWeight: 900, color: "var(--primary-600)", letterSpacing: ".08em" }}>ERREUR 404</div>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink-600)", maxWidth: 460, lineHeight: 1.5 }}>{body}</p>
      <Button size="lg">{cta}</Button>
    </div>
  );
}

function WL22_NotFound() {
  return (
    <WLACPublicShell active="parcours">
      <WLACNotFound
        title="Ce parcours est introuvable"
        body="Il n'existe pas ou n'est plus publié. Plein d'autres parcours t'attendent dans le catalogue."
        cta="Voir tous les parcours"
      />
    </WLACPublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL23 · FICHE ÉVÉNEMENT (S8, C3)
// ════════════════════════════════════════════════════════
const WLAC_EVENT = {
  title: "Atelier Électronique débutant",
  category: "Atelier · Électronique",
  color: "var(--cat-electronique)",
  day: "28",
  month: "JUIN",
  date: "Samedi 28 juin 2026",
  time: "14:00 – 16:30",
  place: "Porto-Novo · Maison des jeunes",
  ages: "12 – 15 ans",
  price: "5 000 FCFA",
  seatsLeft: 8,
  seats: 20,
};

function WLACEventHero({ e = WLAC_EVENT }) {
  return (
    <div style={{ borderRadius: 24, background: e.color, color: "var(--surface)", padding: 26, display: "flex", gap: 22, alignItems: "center" }}>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 20,
          background: "var(--surface)",
          color: "var(--ink-900)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "var(--shadow-pop-md)",
        }}
      >
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1 }}>{e.day}</div>
        <div style={{ fontSize: 13, fontWeight: 900, color: "var(--ink-500)" }}>{e.month}</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            alignSelf: "flex-start",
            background: WLAC_VEIL,
            borderRadius: 999,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          {e.category}
        </span>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, lineHeight: 1.15 }}>{e.title}</h1>
        <div style={{ display: "flex", gap: 16, fontSize: 14, fontWeight: 800, flexWrap: "wrap" }}>
          <span>📅 {e.date}</span>
          <span>🕒 {e.time}</span>
          <span>📍 {e.place}</span>
          <span>👥 {e.ages}</span>
        </div>
      </div>
    </div>
  );
}

function WLACEventBody() {
  return (
    <>
      <WLACSection title="L'atelier">
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.6, margin: 0 }}>
          Deux heures et demie pour monter tes premiers circuits avec une animatrice Steamy : LED, interrupteurs,
          résistances… Tu repars en sachant lire un schéma simple et avec ton circuit « veilleuse ».
        </p>
      </WLACSection>
      <WLACSection title="Infos pratiques">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <WLACNote icon="🧰" tone="ink">
            Matériel fourni sur place, rien à acheter.
          </WLACNote>
          <WLACNote icon="🗺️" tone="ink">
            Maison des jeunes, quartier Ouando, Porto-Novo.
          </WLACNote>
        </div>
      </WLACSection>
    </>
  );
}

// Encart d'action : la variante dépend du visiteur et de l'état de l'événement.
function WLACEventCTA({ variant = "visitor", free, e = WLAC_EVENT }) {
  const closed = variant === "full" || variant === "past";
  const pct = Math.round(((e.seats - e.seatsLeft) / e.seats) * 100);
  return (
    <WLACCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>{free ? "Gratuit" : e.price}</div>
        {!free && <Badge tone="primary">Payant</Badge>}
      </div>
      {variant === "past" ? (
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-500)" }}>Cet événement a eu lieu le 28 juin 2026.</div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: "var(--ink-700)", marginBottom: 6 }}>
            <span>{variant === "full" ? "Complet" : `${e.seatsLeft} places restantes`}</span>
            <span style={{ color: "var(--ink-500)" }}>sur {e.seats}</span>
          </div>
          <WLACBar value={variant === "full" ? 100 : pct} tone={variant === "full" ? undefined : "amber"} />
        </div>
      )}
      {variant === "visitor" && (
        <>
          <Button block size="lg">
            Participer
          </Button>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)", textAlign: "center" }}>
            Pas encore de compte ?{" "}
            <a href="#" style={{ color: "var(--primary-600)", fontWeight: 900 }}>
              Créer un compte
            </a>
          </div>
        </>
      )}
      {variant === "learner" && (
        <Button block size="lg" icon={<Icon name="rocket" size={18} color="var(--surface)" strokeWidth={2.5} />}>
          Demander à participer
        </Button>
      )}
      {variant === "learner-sent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Badge tone="amber">⏳ Demande envoyée · en attente de ton parent</Badge>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-600)", lineHeight: 1.5 }}>
            Ta place est confirmée dès que ton parent accepte{free ? "." : " et règle l'inscription."}
          </div>
        </div>
      )}
      {variant === "parent" && (
        <Button block size="lg" icon={<Icon name="user" size={18} color="var(--surface)" strokeWidth={2.5} />}>
          Inscrire mon enfant
        </Button>
      )}
      {variant === "full" && (
        <>
          <Button block size="lg" disabled>
            Complet
          </Button>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)", textAlign: "center" }}>
            Les {e.seats} places sont prises.{" "}
            <a href="#" style={{ color: "var(--primary-600)", fontWeight: 900 }}>
              Voir les autres événements
            </a>
          </div>
        </>
      )}
      {variant === "past" && (
        <>
          <Button block size="lg" disabled>
            Événement terminé
          </Button>
          <a href="#" style={{ color: "var(--primary-600)", fontWeight: 900, fontSize: 13, textAlign: "center" }}>
            Voir les prochains événements
          </a>
        </>
      )}
      {!closed && variant !== "learner-sent" && (
        <WLACNote icon="👨‍👩‍👧" tone="amber">
          {variant === "parent"
            ? "Vous inscrivez directement votre enfant : votre accord est acquis" + (free ? "." : ", le paiement se fait à l'étape suivante.")
            : "Participation soumise à l'accord du parent" + (free ? "." : ", qui règle aussi l'inscription en Mobile Money.")}
        </WLACNote>
      )}
    </WLACCard>
  );
}

function WL23_Event() {
  return (
    <WLACPublicShell active="evenements">
      <div style={{ ...WL_WRAP, padding: "28px 32px 56px" }}>
        <WLACCrumb>
          Événements › <b style={{ color: "var(--ink-900)" }}>{WLAC_EVENT.title}</b>
        </WLACCrumb>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 28, alignItems: "flex-start" }}>
          <div>
            <WLACEventHero />
            <WLACEventBody />
          </div>
          <div style={{ position: "sticky", top: 84 }}>
            <WLACEventCTA variant="visitor" />
          </div>
        </div>
      </div>
    </WLACPublicShell>
  );
}

// Réutilisation dans l'espace apprenant (WD10 → WL23) : même contenu dans l'AppShell.
function WL23_EventLearner() {
  return (
    <WDACShell active="home" headerTitle="Steamy Events">
      <div className="crumb">
        Steamy Events › <b>{WLAC_EVENT.title}</b>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 24, alignItems: "flex-start" }}>
        <div>
          <WLACEventHero />
          <WLACEventBody />
        </div>
        <WLACEventCTA variant="learner" />
      </div>
    </WDACShell>
  );
}

// Planche des états de l'encart d'action.
function WL23_CTAStates() {
  const col = (label, node) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      {node}
    </div>
  );
  return (
    <div style={{ height: "100%", background: "var(--bg)", padding: 28, fontFamily: "var(--font-sans)", overflow: "hidden" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900 }}>WL23 · Encart d'action selon le visiteur et l'état</h2>
      <p style={{ margin: "0 0 18px", fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
        Visiteur → W16 puis retour sur la fiche · Apprenant → candidature (WD11) · Parent → WPD12 · Complet ou passé : CTA désactivé avec motif.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {col("Apprenant · demande envoyée", <WLACEventCTA variant="learner-sent" />)}
        {col("Parent connecté", <WLACEventCTA variant="parent" />)}
        {col("Gratuit · visiteur", <WLACEventCTA variant="visitor" free />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginTop: 18 }}>
        {col("Complet", <WLACEventCTA variant="full" />)}
        {col("Passé", <WLACEventCTA variant="past" />)}
        <div />
      </div>
    </div>
  );
}

function WL23_NotFound() {
  return (
    <WLACPublicShell active="evenements">
      <WLACNotFound
        title="Cet événement est introuvable"
        body="Il a peut-être été retiré du calendrier. Retrouve tous les prochains rendez-vous Steamy."
        cta="Voir les événements"
      />
    </WLACPublicShell>
  );
}

// ════════════════════════════════════════════════════════
// WL24 · AIDE & CONTACT (D17)
// ════════════════════════════════════════════════════════
const WLAC_FAQ = [
  {
    id: "compte",
    icon: "👨‍👩‍👧",
    title: "Compte et consentement",
    qs: [
      {
        q: "Pourquoi le parent doit-il valider l'inscription ?",
        a: "Chaque apprenant est rattaché à un parent ou responsable légal. Le parent reçoit un SMS, accepte la demande depuis son espace en une minute, puis l'apprenant peut se connecter.",
      },
      { q: "La demande de consentement a expiré, que faire ?" },
      { q: "Comment changer le parent rattaché à un compte ?" },
    ],
  },
  { id: "paiement", icon: "📱", title: "Paiement Mobile Money", qs: [{ q: "Quels réseaux sont acceptés ?" }, { q: "Le paiement a échoué mais j'ai été débité" }] },
  { id: "kits", icon: "📦", title: "Kits et livraison", qs: [{ q: "Où trouver le Kit Code ?" }, { q: "Quels sont les délais de livraison ?" }] },
  { id: "events", icon: "📅", title: "Événements", qs: [{ q: "Comment participer à un Steamy Event ?" }] },
  {
    id: "mdp",
    icon: "🔑",
    title: "Mot de passe oublié",
    qs: [{ q: "Je suis apprenant et j'ai oublié mon mot de passe" }, { q: "Je suis parent et j'ai oublié mon mot de passe" }],
  },
];

function WLACFaqItem({ q, a, open }) {
  return (
    <div style={{ border: "2px solid", borderColor: open ? "var(--primary-200)" : "var(--ink-100)", borderRadius: 16, background: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>{q}</span>
        <span style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "none" }}>
          <Icon name="chevron-down" size={18} color="var(--ink-500)" />
        </span>
      </div>
      {open && (
        <div style={{ padding: "0 16px 16px", fontSize: 14, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.6 }}>{a}</div>
      )}
    </div>
  );
}

function WLACHelpHero() {
  return (
    <div style={{ background: "var(--primary-50)", borderBottom: "1px solid var(--primary-100)" }}>
      <div style={{ ...WL_WRAP, padding: "36px 32px 30px", display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--primary-600)", letterSpacing: ".08em" }}>CENTRE D'AIDE</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 36, fontWeight: 900 }}>Aide & contact</h1>
          <p style={{ margin: "8px 0 16px", fontSize: 16, fontWeight: 600, color: "var(--ink-600)", maxWidth: 560 }}>
            Les réponses aux questions les plus fréquentes. Vous ne trouvez pas ? Écrivez-nous.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {WLAC_FAQ.map((t) => (
              <Tag key={t.id}>
                {t.icon} {t.title}
              </Tag>
            ))}
            <Tag active>✉️ Nous contacter</Tag>
          </div>
        </div>
        <Mascot pose="wave" size={150} />
      </div>
    </div>
  );
}

function WLACFaq() {
  return (
    <div id="faq" style={{ ...WL_WRAP, padding: "32px 32px 8px", display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {WLAC_FAQ.map((t, i) => (
          <div
            key={t.id}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              background: i === 0 ? "var(--primary-50)" : "transparent",
              color: i === 0 ? "var(--primary-700)" : "var(--ink-700)",
            }}
          >
            {t.icon} {t.title}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {WLAC_FAQ.slice(0, 2).map((t) => (
          <React.Fragment key={t.id}>
            <h3 style={{ margin: "4px 0 2px", fontSize: 18, fontWeight: 900 }}>
              {t.icon} {t.title}
            </h3>
            {t.qs.map((q, i) => (
              <WLACFaqItem key={i} q={q.q} a={q.a} open={!!q.a} />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Formulaire de contact (vouvoiement). state : idle | errors | sent | failed. subject : valeur présélectionnée.
function WLACContact({ state = "idle", subject = "Question" }) {
  const errors = state === "errors";
  return (
    <div id="contact" style={{ ...WL_WRAP, padding: "28px 32px 48px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 28, alignItems: "flex-start" }}>
      <WLACCard style={{ padding: 28 }}>
        {state === "sent" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "20px 0" }}>
            <Mascot pose="cheer" size={130} hue="var(--success-500)" />
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "var(--success-700)" }}>Message envoyé</h2>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.5, maxWidth: 440 }}>
              Merci Marie. Notre équipe vous répondra à <b>marie.adjovi@example.com</b>. Un accusé de réception vient de vous
              être envoyé.
            </p>
            <Button variant="outline">Envoyer un autre message</Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Nous contacter</h2>
              <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: "var(--ink-600)" }}>
                Tous les champs sont obligatoires.
              </p>
            </div>
            {state === "failed" && (
              <WLACNote icon="⚠️" tone="amber">
                Votre message n'a pas pu être envoyé (connexion interrompue). Il est conservé ci-dessous :{" "}
                <b>réessayez dans un instant</b>.
              </WLACNote>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nom" required error={errors ? "Indiquez votre nom." : null}>
                <Input value={errors ? "" : "Marie Adjovi"} placeholder="Votre nom" error={errors} />
              </Field>
              <Field label="Email ou téléphone" required error={errors ? "Email ou numéro de téléphone invalide." : null}>
                <Input value={errors ? "marie.adjovi@" : "marie.adjovi@example.com"} error={errors} />
              </Field>
            </div>
            <Field label="Sujet" required hint={subject === "Candidature" ? "Présélectionné depuis « Rejoindre l'équipe »." : null}>
              <div className="input">
                <select style={WLAC_SELECT} defaultValue={subject}>
                  <option>Question</option>
                  <option>Paiement</option>
                  <option>Livraison</option>
                  <option>Changement de parent</option>
                  <option>Candidature</option>
                  <option>Autre</option>
                </select>
              </div>
            </Field>
            <Field label="Message" required error={errors ? "Votre message doit contenir au moins 20 caractères." : null}>
              <textarea
                style={{ ...WLAC_TEXTAREA, borderColor: errors ? "var(--error-500)" : "var(--ink-200)" }}
                defaultValue={
                  errors
                    ? "Bonjour"
                    : subject === "Candidature"
                      ? "Bonjour, je suis ingénieure en électronique à Cotonou et j'aimerais animer des ateliers Steamy…"
                      : "Bonjour, ma fille n'arrive pas à saisir le Kit Code reçu avec son kit Steamy Bot v1. Pouvez-vous m'aider ?"
                }
              />
            </Field>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Button size="lg" icon={<Icon name="mail" size={18} color="var(--surface)" strokeWidth={2.5} />}>
                {state === "failed" ? "Réessayer l'envoi" : "Envoyer"}
              </Button>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)", lineHeight: 1.5 }}>
                Vos coordonnées servent uniquement à vous répondre (voir Confidentialité).
              </span>
            </div>
          </div>
        )}
      </WLACCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <WLACCard style={{ padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 8 }}>Avant d'écrire</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <WLACFact icon="🔑">Mot de passe oublié : un apprenant le fait réinitialiser par son parent ; un parent utilise « Mot de passe oublié ».</WLACFact>
            <WLACFact icon="🧾">Pour un paiement, indiquez la référence de commande.</WLACFact>
          </div>
        </WLACCard>
        <WLACNote icon="📍" tone="ink">
          Steamy · Cotonou, Bénin
        </WLACNote>
      </div>
    </div>
  );
}

function WL24_Help() {
  return (
    <WLACPublicShell>
      <WLACHelpHero />
      <WLACFaq />
      <WLACContact />
    </WLACPublicShell>
  );
}

// Arrivée sur l'ancre #contact avec ?sujet=candidature (« Rejoindre l'équipe » de WL01).
function WL24_ContactState({ state, subject }) {
  return (
    <WLACPublicShell>
      <div style={{ ...WL_WRAP, padding: "24px 32px 0" }}>
        <WLACCrumb>
          Aide & contact › <b style={{ color: "var(--ink-900)" }}>Nous contacter</b>
        </WLACCrumb>
      </div>
      <WLACContact state={state} subject={subject} />
    </WLACPublicShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS : sections ajoutées à la vue « Steamy site » (PublicFlowWeb)
// ════════════════════════════════════════════════════════
function PublicACSections() {
  const ab = (id, label, node) => (
    <DCArtboard key={id} id={id} label={label} width={WLAC_W} height={WLAC_H} style={wlacStyle}>
      {node}
    </DCArtboard>
  );
  return [
    <DCSection
      key="ac-wl22"
      id="ac-wl22"
      title="À valider (C18) · WL22 Fiche parcours publique"
      subtitle="Variante publique de WC04 (D11), sans contenu des missions : titres seulement. « Commencer » / « Demander à mon parent » → W03, retour sur la fiche · « Se connecter » → W16 · connecté : redirection vers WC04 · kit requis (D36) : « Voir le kit » → WK02."
    >
      {ab("WL22", "WL22 · Fiche parcours · gratuit", <WL22_PublicCourse />)}
      {ab("WL22-payant", "WL22 · Payant", <WL22_Variant kind="paid" />)}
      {ab("WL22-kit", "WL22 · Kit requis", <WL22_Variant kind="kit" />)}
      {ab("WL22-chargement", "WL22 · Chargement", <WL22_Loading />)}
      {ab("WL22-404", "WL22 · Introuvable", <WL22_NotFound />)}
    </DCSection>,
    <DCSection
      key="ac-wl23"
      id="ac-wl23"
      title="À valider (C18) · WL23 Fiche événement"
      subtitle="Publique, réutilisée dans les espaces connectés (WD10, WPD06, WT09). Prix et places restantes servis par l'API. L'accord du parent, plus le paiement si payant, confirme la place (C3)."
    >
      {ab("WL23", "WL23 · Fiche événement · visiteur", <WL23_Event />)}
      {ab("WL23-apprenant", "WL23 · Apprenant connecté", <WL23_EventLearner />)}
      {ab("WL23-etats", "WL23 · États de l'encart", <WL23_CTAStates />)}
      {ab("WL23-404", "WL23 · Introuvable", <WL23_NotFound />)}
    </DCSection>,
    <DCSection
      key="ac-wl24"
      id="ac-wl24"
      title="À valider (C18) · WL24 Aide & contact"
      subtitle="FAQ statique par thème (#faq) + formulaire au vouvoiement (#contact), sujet présélectionnable par ?sujet= (question, paiement, livraison, changement-parent, candidature, autre). Confirmation en place."
    >
      {ab("WL24", "WL24 · Aide & contact", <WL24_Help />)}
      {ab("WL24-candidature", "WL24 · #contact ?sujet=candidature", <WL24_ContactState subject="Candidature" />)}
      {ab("WL24-erreurs", "WL24 · Erreurs de saisie", <WL24_ContactState state="errors" />)}
      {ab("WL24-echec", "WL24 · Échec d'envoi", <WL24_ContactState state="failed" />)}
      {ab("WL24-envoye", "WL24 · Message envoyé", <WL24_ContactState state="sent" />)}
    </DCSection>,
  ];
}

window.PublicACSections = PublicACSections;
