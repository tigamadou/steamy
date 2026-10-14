// screens-journey-web.jsx - Déroulement parcours (P6), version web (1240×760).
// Conforme à user flows/6_deroulement_parcours.mmd. Happy path :
// WJ01 détail projet (contenu + niveaux) → WJ02 intro niveau (vidéo + résumé) →
// WJ03 contenu mission → WJ04 évaluation formative → WJ05 revue résultats (≥70%) →
// WJ06 badge de niveau débloqué → WJ07 fin de parcours (certif + ticket + reco).
// La sommative réutilise le même pattern que la formative (less granular).
// Retour "concept échoué" (<seuil) = état dérivé reporté.
// In-app : réutilise WebAppShell (active='catalog') + Quiz/Medal/MissionItem/Progress.
// Expose window.JourneyFlowWeb.

const JOURNEY_W = 1240,
  JOURNEY_H = 760;
const journeyWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};

function WJConfetti() {
  return (
    <>
      {[
        { x: "10%", y: "14%", c: "var(--amber-500)" },
        { x: "88%", y: "12%", c: "var(--success-500)" },
        { x: "14%", y: "80%", c: "var(--cat-code)" },
        { x: "86%", y: "82%", c: "var(--primary-500)" },
        { x: "50%", y: "7%", c: "var(--cat-ia)" },
        { x: "72%", y: "88%", c: "var(--amber-500)" },
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

// Bloc d'info titré (objectifs / prérequis / cibles).
function WJInfoBlock({ icon, title, items }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid var(--ink-100)",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>{title}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((t, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-700)",
              lineHeight: 1.45,
            }}
          >
            <span style={{ marginTop: 2, flexShrink: 0 }}>
              <Icon
                name="check"
                size={14}
                color="var(--success-600)"
                strokeWidth={3}
              />
            </span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WJ01 · DÉTAIL PROJET (contenu + liste des niveaux)
// ════════════════════════════════════════════════════════
function WJ01_Project() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Construis ton robot Bluetooth"
      headerSearch={false}
      notifDot
    >
      <div className="crumb">
        Mon parcours › <b>Projet 1 · Le châssis mobile</b>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* Colonne gauche */}
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
              Projet 1 / 4
            </span>
            <h1 style={{ margin: "12px 0 8px", fontSize: 26, fontWeight: 900 }}>
              Le châssis mobile
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                opacity: 0.9,
                lineHeight: 1.5,
                maxWidth: 520,
              }}
            >
              Assemble la base roulante de ton robot et programme ses premiers
              déplacements.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <WJInfoBlock
              icon="🎯"
              title="Objectifs"
              items={[
                "Monter un châssis 2 roues",
                "Câbler 2 moteurs DC",
                "Lancer un 1ᵉʳ déplacement",
              ]}
            />
            <WJInfoBlock
              icon="📋"
              title="Prérequis"
              items={["Aucun - projet débutant", "Avoir le kit Steamy Bot v1"]}
            />
            <WJInfoBlock
              icon="👥"
              title="Pour qui ?"
              items={["Dès 10 ans", "Curieux de robotique"]}
            />
            <WJInfoBlock
              icon="🧰"
              title="Matériel"
              items={[
                "Châssis + 2 moteurs",
                "Carte + câbles",
                "Tournevis fourni",
              ]}
            />
          </div>

          <div>
            <SectionHeader title="Les niveaux de ce projet" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <MissionItem
                step="Niveau 1"
                title="Monter le châssis"
                duration="35 min"
                state="done"
                icon="🔧"
              />
              <MissionItem
                step="Niveau 2"
                title="Brancher les moteurs"
                duration="40 min"
                state="current"
                icon="⚙️"
              />
              <MissionItem
                step="Niveau 3"
                title="Premiers déplacements"
                duration="45 min"
                state="locked"
                icon="🤖"
              />
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="side-card"
            style={{ alignItems: "stretch", textAlign: "left" }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
              Ta progression
            </h3>
            <ProgressBar value={33} label="Projet 1" />
            <div
              style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}
            >
              1 niveau sur 3 terminé
            </div>
            <div className="side-card__actions">
              <Button
                block
                iconRight={
                  <Icon name="play" size={16} color="#fff" strokeWidth={3} />
                }
              >
                Continuer le niveau 2
              </Button>
            </div>
          </div>
          <div
            className="side-card"
            style={{ alignItems: "flex-start", textAlign: "left" }}
          >
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>
              Récompenses du projet
            </h4>
            <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
              <Medal icon="🔧" tone="gold" size={64} />
              <Medal tone="locked" size={64} />
              <Medal tone="locked" size={64} />
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-600)" }}
            >
              1 badge sur 3 débloqué - un badge par niveau, + un badge de projet
              à la fin.
            </div>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ02 · INTRO NIVEAU (vidéo + résumé écrit)
// ════════════════════════════════════════════════════════
function WJ02_LevelIntro() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Niveau 2 · Brancher les moteurs"
      headerSearch={false}
    >
      <div className="crumb">
        Mon parcours › Projet 1 › <b>Niveau 2</b>
      </div>
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Vidéo intro */}
        <div
          style={{
            position: "relative",
            borderRadius: 22,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, var(--cat-robotique), #3D27B8)",
            aspectRatio: "16 / 8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            style={{
              width: 80,
              height: 80,
              borderRadius: 999,
              background: "rgba(255,255,255,.95)",
              border: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,.25)",
            }}
          >
            <Icon name="play" size={32} color="var(--primary-600)" />
          </button>
          <span
            style={{
              position: "absolute",
              bottom: 14,
              right: 14,
              background: "rgba(0,0,0,.7)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            3 min 20
          </span>
          <span
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              background: "rgba(255,255,255,.9)",
              color: "var(--ink-900)",
              fontSize: 12,
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            Vidéo d'intro
          </span>
        </div>

        {/* Résumé écrit */}
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 20,
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900 }}>
            Au programme de ce niveau
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink-700)",
              lineHeight: 1.6,
            }}
          >
            Tu vas connecter les deux moteurs à la carte, comprendre le sens de
            rotation et tester l'alimentation. À la fin, ton châssis pourra
            avancer en ligne droite - et tu valideras un quiz pour gagner ton
            badge.
          </p>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <MissionItem
              step="Mission 1"
              title="Identifier les moteurs"
              duration="10 min"
              state="todo"
              icon="🔌"
            />
            <MissionItem
              step="Mission 2"
              title="Câbler la carte"
              duration="15 min"
              state="todo"
              icon="🔋"
            />
            <MissionItem
              step="Mission 3"
              title="Tester la rotation"
              duration="12 min"
              state="todo"
              icon="🔄"
            />
          </div>
        </div>

        <Button
          size="lg"
          block
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Commencer la 1ʳᵉ mission
        </Button>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ03 · CONTENU MISSION (mission par mission)
// ════════════════════════════════════════════════════════
function WJ03_Mission() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Mission 1 · Identifier les moteurs"
      headerSearch={false}
    >
      <div className="crumb">
        Projet 1 › Niveau 2 › <b>Mission 1 / 3</b>
      </div>
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <ProgressSteps total={3} current={0} />

        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 20,
            padding: 28,
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 900 }}>
            Identifier les moteurs
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink-700)",
              lineHeight: 1.6,
            }}
          >
            Un moteur à courant continu transforme l'électricité en mouvement de
            rotation. Ton kit en contient deux : un pour la roue gauche, un pour
            la roue droite. Chacun a deux bornes - une positive, une négative.
          </p>
          <div
            style={{
              borderRadius: 16,
              background: "var(--ink-50)",
              border: "1px solid var(--ink-100)",
              aspectRatio: "16 / 7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              margin: "16px 0",
            }}
          >
            🔌
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink-700)",
              lineHeight: 1.6,
            }}
          >
            Repère les fils rouge et noir : le rouge se branche sur le +, le
            noir sur le −. Si tu inverses, le moteur tournera simplement dans
            l'autre sens.
          </p>
          <div
            style={{
              background: "var(--amber-100)",
              borderRadius: 14,
              padding: 16,
              display: "flex",
              gap: 12,
              marginTop: 16,
            }}
          >
            <span style={{ fontSize: 22 }}>💡</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--amber-700)",
                lineHeight: 1.5,
              }}
            >
              Astuce : un petit + est gravé sur le moteur, près de la borne
              positive.
            </span>
          </div>
        </div>

        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <Button variant="outline" icon={<Icon name="arrow-left" size={18} />}>
            Précédent
          </Button>
          <Button
            variant="secondary"
            iconRight={
              <Icon name="check" size={18} color="#fff" strokeWidth={3} />
            }
          >
            Marquer comme terminée
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ04 · ÉVALUATION FORMATIVE (quiz fin de niveau)
// ════════════════════════════════════════════════════════
function WJ04_Formative() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Évaluation formative · Niveau 2"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--primary-50)",
            border: "2px solid var(--primary-100)",
            borderRadius: 16,
            padding: "14px 18px",
          }}
        >
          <span style={{ fontSize: 24 }}>📝</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>
              Quiz de fin de niveau
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-600)" }}
            >
              Obtiens au moins 70 % pour valider le niveau et gagner ton badge.
            </div>
          </div>
        </div>

        <Quiz
          index={3}
          total={6}
          question="Quel composant fait tourner les roues du robot ?"
          choices={[
            "Le capteur de lumière",
            "Le moteur à courant continu",
            "La résistance",
            "Le buzzer",
          ]}
          selected={1}
          correct={1}
          showFeedback
        />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            size="lg"
            iconRight={
              <Icon
                name="arrow-right"
                size={20}
                color="#fff"
                strokeWidth={2.5}
              />
            }
          >
            Question suivante
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ05 · REVUE DES RÉSULTATS (≥70% → niveau validé)
// ════════════════════════════════════════════════════════
function WJ05_Review() {
  const recap = [
    {
      ok: true,
      q: "Quel composant fait tourner les roues ?",
      a: "Tu as répondu : « Le moteur à courant continu » ✓",
    },
    {
      ok: true,
      q: "Sur quelle borne branche-t-on le fil rouge ?",
      a: "Tu as répondu : « La borne + » ✓",
    },
    {
      ok: true,
      q: "Que se passe-t-il si on inverse les fils ?",
      a: "Tu as répondu : « Le moteur tourne à l'envers » ✓",
    },
    {
      ok: false,
      q: "Quelle est la tension d'alimentation des moteurs ?",
      a: "Ta réponse : « 9 V » · Bonne réponse : « 6 V »",
    },
    {
      ok: true,
      q: "Combien de moteurs sur le châssis ?",
      a: "Tu as répondu : « 2 » ✓",
    },
  ];
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Résultats · Niveau 2"
      headerSearch={false}
    >
      <div className="crumb">
        Projet 1 › Niveau 2 › <b>Résultats</b>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="score-hero">
            <div>
              <div className="dash-hero__kicker">Score formatif</div>
              <div className="score-hero__big">
                83<small>%</small>
              </div>
            </div>
            <div className="score-hero__meta">
              <Badge tone="success" solid>
                ✓ Niveau validé
              </Badge>
              <div className="score-hero__bar">
                <span style={{ width: "83%" }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>
                5 bonnes réponses sur 6 · seuil de validation 70 %
              </div>
            </div>
          </div>

          <div>
            <SectionHeader title="Récapitulatif des questions" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recap.map((row, i) => (
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="side-card">
            <Mascot pose="cheer" size={120} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              Bien joué !
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
              Tu as validé le niveau 2. Un nouveau badge t'attend juste après.
            </p>
            <div className="side-card__actions">
              <Button block variant="secondary">
                Voir mon badge
              </Button>
              <Button block variant="outline">
                Revoir le niveau
              </Button>
            </div>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ06 · BADGE DE NIVEAU DÉBLOQUÉ (célébration)
// ════════════════════════════════════════════════════════
function WJ06_Badge() {
  return (
    <div
      style={{
        height: "100%",
        background:
          "linear-gradient(180deg, var(--amber-100) 0%, var(--bg) 60%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-sans)",
      }}
    >
      <WJConfetti />
      <div
        style={{
          background: "#fff",
          borderRadius: 28,
          padding: "48px 44px",
          maxWidth: 520,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          boxShadow: "0 8px 0 var(--amber-200)",
          border: "3px solid var(--amber-400)",
        }}
      >
        <Medal icon="⚙️" number={2} tone="gold" size={140} />
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: "var(--amber-700)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Badge de niveau débloqué
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 30, fontWeight: 900 }}>
            Niveau 2 terminé !
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink-700)",
              lineHeight: 1.5,
            }}
          >
            Tu maîtrises le branchement des moteurs.{" "}
            <strong style={{ color: "var(--ink-900)" }}>+200 points</strong> et
            un badge de plus dans ta collection.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Button
            size="lg"
            iconRight={
              <Icon
                name="arrow-right"
                size={20}
                color="#fff"
                strokeWidth={2.5}
              />
            }
          >
            Niveau suivant
          </Button>
          <Button size="lg" variant="outline">
            Voir mes badges
          </Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WJ07 · FIN DE PARCOURS (certification + ticket + reco)
// ════════════════════════════════════════════════════════
function WJ07_Certificate() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Parcours terminé 🎓"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Certificat */}
        <div
          style={{
            position: "relative",
            borderRadius: 24,
            padding: 36,
            background: "linear-gradient(135deg, #fff, var(--primary-50))",
            border: "3px solid var(--primary-200)",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: "var(--primary-600)",
              letterSpacing: ".1em",
              textTransform: "uppercase",
            }}
          >
            Certification Steamy
          </div>
          <h1 style={{ margin: "10px 0 6px", fontSize: 32, fontWeight: 900 }}>
            Construis ton robot Bluetooth
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink-600)",
            }}
          >
            décerné à{" "}
            <strong style={{ color: "var(--ink-900)" }}>Léa Adjovi</strong> ·
            Mai 2026
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              margin: "20px 0",
            }}
          >
            <Medal icon="🔧" tone="gold" size={88} />
            <Medal icon="⚙️" tone="gold" size={88} />
            <Medal icon="🤖" tone="gold" size={88} />
            <Medal icon="🏆" tone="gold" size={88} />
          </div>
          <Button
            size="lg"
            icon={<Icon name="check" size={18} color="#fff" strokeWidth={3} />}
          >
            Télécharger la certification (PDF)
          </Button>
        </div>

        {/* Ticket Steamy Events offert */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            background: "var(--amber-100)",
            border: "2px solid var(--amber-300)",
            borderRadius: 20,
            padding: 20,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "var(--amber-500)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            🎟️
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              Ticket Steamy Events offert !
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-700)" }}
            >
              Participe gratuitement au prochain challenge robotique de Cotonou.
            </div>
          </div>
          <Button variant="amber">Voir l'événement</Button>
        </div>

        {/* Recommandations */}
        <div>
          <SectionHeader title="Continue ton aventure" action="Voir tout" />
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
              emoji="🤖"
            />
            <CourseCard
              title="Capteurs électroniques"
              level="Intermédiaire"
              price="18 000 F"
              color="var(--cat-electronique)"
              emoji="⚡"
            />
            <CourseCard
              title="Crée ton premier jeu"
              level="Débutant"
              price="15 000 F"
              color="var(--cat-code)"
              emoji="🎮"
            />
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ08 · ÉCHEC ÉVALUATION (<70% → retour concept échoué)
// ════════════════════════════════════════════════════════
function WJ08_EvalFailed() {
  const recap = [
    {
      ok: true,
      q: "Quel composant fait tourner les roues ?",
      a: "Bonne réponse ✓",
    },
    {
      ok: false,
      q: "Sur quelle borne branche-t-on le fil rouge ?",
      a: "Ta réponse : « La borne − » · Bonne réponse : « La borne + »",
    },
    {
      ok: false,
      q: "Quelle est la tension d'alimentation des moteurs ?",
      a: "Ta réponse : « 9 V » · Bonne réponse : « 6 V »",
    },
    {
      ok: true,
      q: "Combien de moteurs sur le châssis ?",
      a: "Bonne réponse ✓",
    },
    {
      ok: false,
      q: "À quoi sert le pont en H ?",
      a: "Ta réponse : « Alimenter » · Bonne réponse : « Inverser le sens »",
    },
  ];
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Résultats · Niveau 2"
      headerSearch={false}
    >
      <div className="crumb">
        Projet 1 › Niveau 2 › <b>Résultats</b>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="score-hero"
            style={{
              background:
                "linear-gradient(135deg, var(--error-500), var(--error-700))",
            }}
          >
            <div>
              <div className="dash-hero__kicker">Score formatif</div>
              <div className="score-hero__big">
                50<small>%</small>
              </div>
            </div>
            <div className="score-hero__meta">
              <Badge tone="error" solid>
                Niveau non validé
              </Badge>
              <div className="score-hero__bar">
                <span style={{ width: "50%" }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                3 bonnes réponses sur 6 · seuil 70 % - on revoit ça ensemble !
              </div>
            </div>
          </div>

          <div>
            <SectionHeader title="Questions à revoir" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recap.map((row, i) => (
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="side-card">
            <Mascot pose="focus" size={120} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              Pas grave, on y retourne !
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
              Revois le concept des branchements, puis retente le quiz pour
              valider le niveau.
            </p>
            <div className="side-card__actions">
              <Button
                block
                iconRight={
                  <Icon
                    name="arrow-right"
                    size={16}
                    color="#fff"
                    strokeWidth={3}
                  />
                }
              >
                Revoir « Câbler la carte »
              </Button>
              <Button block variant="outline">
                Réessayer le quiz
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
              {[
                "Polarité + / − des moteurs",
                "Tension d'alimentation",
                "Rôle du pont en H",
              ].map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink-700)",
                  }}
                >
                  <Icon name="book" size={14} color="var(--primary-500)" /> {c}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ09 · PARCOURS INCOMPLET (feedback + notif parent <16)
// ════════════════════════════════════════════════════════
function WJ09_Incomplete() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Revue du parcours"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 24,
          }}
        >
          <Mascot pose="focus" size={120} />
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
              Tu y es presque !
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink-600)",
                lineHeight: 1.5,
              }}
            >
              Il te reste 1 projet à terminer pour débloquer ta certification.
              Continue - chaque mission compte !
            </p>
          </div>
        </div>

        <div>
          <SectionHeader title="Tes projets" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MissionItem
              step="Projet 1"
              title="Le châssis mobile"
              duration="terminé"
              state="done"
              icon="🔧"
            />
            <MissionItem
              step="Projet 2"
              title="Capteurs & lumière"
              duration="terminé"
              state="done"
              icon="💡"
            />
            <MissionItem
              step="Projet 3"
              title="Contrôle Bluetooth"
              duration="2 niveaux restants"
              state="current"
              icon="📡"
            />
            <MissionItem
              step="Projet 4"
              title="Le robot autonome"
              duration="verrouillé"
              state="locked"
              icon="🤖"
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "var(--primary-50)",
            border: "2px solid var(--primary-100)",
            borderRadius: 16,
            padding: "14px 18px",
          }}
        >
          <span style={{ fontSize: 22 }}>👨‍👩‍👧</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink-700)",
              lineHeight: 1.5,
            }}
          >
            On a envoyé un point d'avancement à ton parent pour qu'il
            t'encourage.
          </span>
        </div>

        <Button
          size="lg"
          block
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Continuer le projet 3
        </Button>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ10 · ÉVALUATION SOMMATIVE (fin de projet, seuil 80%)
// ════════════════════════════════════════════════════════
function WJ10_Summative() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Évaluation sommative · Projet 1"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--amber-100)",
            border: "2px solid var(--amber-300)",
            borderRadius: 16,
            padding: "14px 18px",
          }}
        >
          <span style={{ fontSize: 24 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>
              Évaluation sommative de fin de projet
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-700)" }}
            >
              Quiz récapitulatif · obtiens au moins <strong>80 %</strong> pour
              valider le projet et gagner ton badge.
            </div>
          </div>
        </div>
        <Quiz
          index={4}
          total={10}
          question="Quel ensemble de composants permet à ton robot d'avancer en ligne droite ?"
          choices={[
            "1 moteur + 1 roue",
            "2 moteurs synchronisés",
            "1 capteur + 1 LED",
            "1 buzzer + 1 carte",
          ]}
          selected={1}
          correct={1}
          showFeedback
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            size="lg"
            iconRight={
              <Icon
                name="arrow-right"
                size={20}
                color="#fff"
                strokeWidth={2.5}
              />
            }
          >
            Question suivante
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WJ11 · PROJET VALIDÉ + BADGE DE PROJET (célébration)
// ════════════════════════════════════════════════════════
function WJ11_ProjectBadge() {
  return (
    <div
      style={{
        height: "100%",
        background:
          "linear-gradient(180deg, var(--success-100) 0%, var(--bg) 60%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-sans)",
      }}
    >
      <WJConfetti />
      <div
        style={{
          background: "#fff",
          borderRadius: 28,
          padding: "48px 44px",
          maxWidth: 540,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          boxShadow: "0 8px 0 var(--success-200)",
          border: "3px solid var(--success-500)",
        }}
      >
        <Medal icon="🏅" tone="gold" size={150} />
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: "var(--success-700)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Badge de projet débloqué
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 30, fontWeight: 900 }}>
            Projet 1 validé ! 🎉
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink-700)",
              lineHeight: 1.5,
            }}
          >
            Tu as réussi la sommative avec{" "}
            <strong style={{ color: "var(--ink-900)" }}>88 %</strong>. Le projet
            « Le châssis mobile » est terminé - direction le projet suivant !
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Button
            size="lg"
            variant="secondary"
            iconRight={
              <Icon
                name="arrow-right"
                size={20}
                color="#fff"
                strokeWidth={2.5}
              />
            }
          >
            Projet suivant
          </Button>
          <Button size="lg" variant="outline">
            Voir mes badges
          </Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
function JourneyFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="journey-content"
        title="Déroulement · projet → niveau → mission"
        subtitle="Détail projet (contenu + niveaux) · intro niveau (vidéo + résumé) · contenu mission."
      >
        <DCArtboard
          id="WJ01"
          label="WJ01 · Détail projet"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ01_Project />
        </DCArtboard>
        <DCArtboard
          id="WJ02"
          label="WJ02 · Intro niveau"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ02_LevelIntro />
        </DCArtboard>
        <DCArtboard
          id="WJ03"
          label="WJ03 · Contenu mission"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ03_Mission />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="journey-eval"
        title="Évaluations & badges"
        subtitle="Formative (≥70%) → revue résultats → badge de niveau. Sommative = même pattern · retour concept (<seuil) à venir."
      >
        <DCArtboard
          id="WJ04"
          label="WJ04 · Évaluation formative"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ04_Formative />
        </DCArtboard>
        <DCArtboard
          id="WJ05"
          label="WJ05 · Revue des résultats"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ05_Review />
        </DCArtboard>
        <DCArtboard
          id="WJ06"
          label="WJ06 · Badge débloqué"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ06_Badge />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="journey-summative"
        title="Évaluation sommative & badge projet"
        subtitle="Quiz récap fin de projet (≥80%) → projet validé + badge de projet."
      >
        <DCArtboard
          id="WJ10"
          label="WJ10 · Évaluation sommative"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ10_Summative />
        </DCArtboard>
        <DCArtboard
          id="WJ11"
          label="WJ11 · Projet validé + badge"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ11_ProjectBadge />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="journey-end"
        title="Fin de parcours"
        subtitle="Certification PDF · ticket Steamy Events offert · recommandations."
      >
        <DCArtboard
          id="WJ07"
          label="WJ07 · Certification & fin"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ07_Certificate />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="journey-states"
        title="États dérivés · pédagogique"
        subtitle="Échec d'évaluation (<seuil → retour concept) · parcours incomplet (feedback + notif parent)."
      >
        <DCArtboard
          id="WJ08"
          label="WJ08 · Échec évaluation"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ08_EvalFailed />
        </DCArtboard>
        <DCArtboard
          id="WJ09"
          label="WJ09 · Parcours incomplet"
          width={JOURNEY_W}
          height={JOURNEY_H}
          style={journeyWebStyle}
        >
          <WJ09_Incomplete />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.JourneyFlowWeb = JourneyFlowWeb;
