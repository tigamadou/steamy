// screens-states-web.jsx - États transversaux (web 1240×760).
// Hors-ligne, erreur réseau, chargement - non rattachés à un flow précis.
// CLAUDE.md : contexte connectivité Afrique de l'Ouest → messages rassurants.
// Réutilise Mascot/Loader/Button. Expose window.StatesFlowWeb. Préfixe WX.

const STATES_W = 1240,
  STATES_H = 760;
const statesWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};

// Carte d'état plein écran réutilisable.
function WXState({
  pose = "sad",
  emoji,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  bg = "var(--bg)",
  circle = "var(--ink-50)",
  border = "var(--ink-100)",
  shadow = "var(--ink-100)",
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        fontFamily: "var(--font-sans)",
      }}
    >
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
          boxShadow: `0 8px 0 ${shadow}`,
          border: `2px solid ${border}`,
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: circle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <Mascot pose={pose} size={160} />
          {emoji && (
            <div
              style={{
                position: "absolute",
                bottom: 6,
                right: 6,
                fontSize: 42,
              }}
            >
              {emoji}
            </div>
          )}
        </div>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>{title}</h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-600)",
              fontWeight: 600,
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            {body}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {secondaryLabel && (
            <Button variant="outline">{secondaryLabel}</Button>
          )}
          {primaryLabel && <Button>{primaryLabel}</Button>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WX01 · HORS LIGNE
// ════════════════════════════════════════════════════════
function WX01_Offline() {
  return (
    <WXState
      pose="sleep"
      emoji="📡"
      title="Tu es hors ligne"
      body="Vérifie ta connexion internet. Steamy reprend tout seul dès que le réseau revient - rien n'est perdu."
      secondaryLabel="Mode hors ligne"
      primaryLabel="Réessayer"
    />
  );
}

// ════════════════════════════════════════════════════════
// WX02 · ERREUR RÉSEAU
// ════════════════════════════════════════════════════════
function WX02_NetworkError() {
  return (
    <WXState
      pose="sad"
      emoji="⚠️"
      title="Oups, ça a coupé"
      body="On n'a pas pu charger cette page. Le réseau est parfois capricieux - réessaie dans un instant."
      secondaryLabel="Retour"
      primaryLabel="Réessayer"
    />
  );
}

// ════════════════════════════════════════════════════════
// WX03 · CHARGEMENT (contenu lent - message rassurant)
// ════════════════════════════════════════════════════════
function WX03_Loading() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Mascot pose="focus" size={150} />
        <Loader />
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
            On prépare ton contenu…
          </h2>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-600)",
              marginTop: 10,
              maxWidth: 380,
              lineHeight: 1.5,
            }}
          >
            Le réseau est parfois un peu lent par ici - merci de patienter
            quelques secondes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
function StatesFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="states"
        title="États transversaux"
        subtitle="Hors-ligne · erreur réseau · chargement - réutilisables sur tous les flows (contexte connectivité)."
      >
        <DCArtboard
          id="WX01"
          label="WX01 · Hors ligne"
          width={STATES_W}
          height={STATES_H}
          style={statesWebStyle}
        >
          <WX01_Offline />
        </DCArtboard>
        <DCArtboard
          id="WX02"
          label="WX02 · Erreur réseau"
          width={STATES_W}
          height={STATES_H}
          style={statesWebStyle}
        >
          <WX02_NetworkError />
        </DCArtboard>
        <DCArtboard
          id="WX03"
          label="WX03 · Chargement"
          width={STATES_W}
          height={STATES_H}
          style={statesWebStyle}
        >
          <WX03_Loading />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.StatesFlowWeb = StatesFlowWeb;
