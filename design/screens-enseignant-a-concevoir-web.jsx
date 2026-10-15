// screens-enseignant-a-concevoir-web.jsx - Écran enseignant absent de la maquette (C18), version web (1240×760).
// WT13 · Créer une classe (§8.11, D61, D62) : une classe = un parcours de l'offre B2B de l'école.
// États : formulaire, erreurs serveur, quota atteint, édition (parcours verrouillé), classe créée (WT04 vide).
// Spec : docs/SPEC-ECRANS-3-parent-teacher-admin.md §5.12 « WT13 ». Registre : vouvoiement.
// Réutilise WebTeacherShell (teacher-dashboard-web) et le DS. Tokens uniquement.
// Ne s'auto-monte pas : expose window.TeacherACSections, appelée par TeacherDashFlowWeb.

const WTAC_W = 1240,
  WTAC_H = 760;
const wtacStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-pop-md)",
  overflow: "hidden",
};

// Barre de progression : classes .progress du DS, sans le flex: 1 qui l'écrase dans une colonne flex.
function WTACBar({ value = 0, tone }) {
  return (
    <div className={["progress", tone && `progress--${tone}`].filter(Boolean).join(" ")} style={{ flex: "none", width: "100%" }}>
      <div className="progress__bar" style={{ width: `${value}%` }} />
    </div>
  );
}
const WTAC_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 16px var(--font-sans)",
  color: "var(--ink-900)",
};

// Parcours couverts par l'offre B2B de l'école (servis par l'API, D61).
const WTAC_OFFER = [
  { title: "Construis ton robot Bluetooth", emoji: "📡", color: "var(--cat-robotique)", level: "Intermédiaire", meta: "4 projets · kit requis par élève" },
  { title: "Initiation à Scratch", emoji: "💻", color: "var(--cat-code)", level: "Débutant", meta: "3 projets · aucun matériel" },
  { title: "L'IA pour les débutants", emoji: "🤖", color: "var(--cat-ia)", level: "Débutant", meta: "3 projets · aucun matériel" },
];

function WTACCourseOption({ c, selected, disabled }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 16,
        border: "2px solid",
        borderColor: selected ? "var(--primary-500)" : "var(--ink-200)",
        background: selected ? "var(--primary-50)" : "var(--surface)",
        boxShadow: selected ? "0 4px 0 var(--primary-300)" : "0 4px 0 var(--ink-200)",
        opacity: disabled && !selected ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          border: "2px solid",
          borderColor: selected ? "var(--primary-500)" : "var(--ink-300)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {selected && <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--primary-500)" }} />}
      </div>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: c.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {c.emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{c.title}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>
          {c.level} · {c.meta}
        </div>
      </div>
      {selected && disabled && <Icon name="lock" size={16} color="var(--ink-500)" />}
    </div>
  );
}

// Encart quota de l'offre (D61) : classes et élèves restants.
function WTACQuota({ full }) {
  const Row = ({ label, used, max }) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
        <span style={{ color: "var(--ink-700)" }}>{label}</span>
        <span style={{ color: used >= max ? "var(--error-600)" : "var(--ink-500)" }}>
          {used} / {max}
        </span>
      </div>
      <WTACBar value={Math.round((used / max) * 100)} tone={used >= max ? undefined : "success"} />
    </div>
  );
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "2px solid",
        borderColor: full ? "var(--error-100)" : "var(--ink-100)",
        borderRadius: 20,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Offre de l'établissement
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>Offre École · 2026-2027</div>
      </div>
      <Row label="Classes" used={full ? 5 : 3} max={5} />
      <Row label="Élèves" used={full ? 120 : 54} max={120} />
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)", lineHeight: 1.5 }}>
        {full
          ? "Le quota de classes de l'offre est atteint. Pour l'augmenter, contactez la direction de votre établissement."
          : "Il reste 2 classes et 66 places d'élèves. Les élèves ne paient pas : l'accès au parcours est couvert par l'offre."}
      </div>
    </div>
  );
}

// Formulaire de classe. mode : create | errors | full | edit.
function WTACClassForm({ mode = "create" }) {
  const edit = mode === "edit";
  const errors = mode === "errors";
  const full = mode === "full";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 22, alignItems: "flex-start" }}>
      <div
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink-100)",
          borderRadius: 22,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {full && (
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 14,
              background: "var(--error-50)",
              border: "2px solid var(--error-100)",
              fontSize: 13,
              fontWeight: 800,
              color: "var(--error-700)",
            }}
          >
            ⛔ Quota de classes atteint (5 sur 5) : impossible de créer une nouvelle classe pour le moment.
          </div>
        )}
        <Field
          label="Nom de la classe"
          required
          hint={edit ? null : "Par exemple « 4ᵉ B · Robotique ». Unique dans l'établissement."}
          error={errors ? "Une classe porte déjà ce nom dans votre établissement." : null}
        >
          <Input value={edit ? "Club STEM · Samedi matin" : errors ? "3ème B · Robotique" : "4ᵉ B · Robotique"} error={errors} />
        </Field>
        <Field label="Parcours" required error={errors ? "Ce parcours ne fait plus partie de l'offre de l'école. Choisissez-en un autre." : null}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {WTAC_OFFER.map((c, i) => (
              <WTACCourseOption key={i} c={c} selected={edit ? i === 1 : i === 0} disabled={edit || full} />
            ))}
          </div>
        </Field>
        {edit ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
            🔒 12 élèves sont inscrits : le parcours n'est plus modifiable.
          </div>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
            Une classe suit un seul parcours. Seuls les parcours inclus dans l'offre de votre école sont proposés.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12 }}>
          <Field label="Niveau scolaire" hint="Facultatif">
            <div className="input">
              <select style={WTAC_SELECT} defaultValue={edit ? "Mixte" : "4ᵉ"}>
                <option>—</option>
                <option>6ᵉ</option>
                <option>5ᵉ</option>
                <option>4ᵉ</option>
                <option>3ᵉ</option>
                <option>Mixte</option>
              </select>
            </div>
          </Field>
          <Field label="Établissement">
            <div className="input" style={{ background: "var(--ink-50)" }}>
              <Icon name="lock" size={16} color="var(--ink-400)" />
              <input value="Complexe scolaire Les Lauréats · Cotonou" readOnly style={{ color: "var(--ink-600)" }} />
            </div>
          </Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
          <Button variant="outline">Annuler</Button>
          <Button disabled={full} icon={edit ? null : <Icon name="plus" size={18} color="var(--surface)" strokeWidth={3} />}>
            {edit ? "Enregistrer" : "Créer la classe"}
          </Button>
        </div>
      </div>
      <WTACQuota full={full} />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WT13 · CRÉER UNE CLASSE
// ════════════════════════════════════════════════════════
function WT13_CreateClass({ mode = "create" }) {
  const edit = mode === "edit";
  return (
    <WebTeacherShell active="classes" headerTitle={edit ? "Modifier la classe" : "Créer une classe"}>
      <div className="crumb">
        Mes classes › {edit ? <>Club STEM · Samedi › <b>Modifier</b></> : <b>Créer une classe</b>}
      </div>
      <WTACClassForm mode={mode} />
    </WebTeacherShell>
  );
}

// Après création : WT04 de la nouvelle classe, état vide → WT06.
function WT13_Created() {
  return (
    <WebTeacherShell
      active="classes"
      headerTitle="4ᵉ B · Robotique"
      headerActions={<Button icon={<Icon name="plus" size={18} color="var(--surface)" strokeWidth={3} />}>Ajouter des apprenants</Button>}
    >
      <div className="crumb">
        Mes classes › <b>4ᵉ B · Robotique</b> · 0 apprenant
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 14,
          background: "var(--success-50)",
          border: "2px solid var(--success-100)",
          fontSize: 14,
          fontWeight: 800,
          color: "var(--success-700)",
          marginBottom: 18,
        }}
      >
        <Icon name="check" size={18} color="var(--success-600)" strokeWidth={3} />
        Classe créée · parcours « Construis ton robot Bluetooth »
      </div>
      <div className="welcome-card">
        <div className="welcome-card__body">
          <h1>Ajoutez vos premiers élèves</h1>
          <p>
            Un par un ou par import d'un fichier. Chaque parent reçoit une demande de consentement par SMS ; l'élève
            rejoint la classe après son accord.
          </p>
          <Button size="lg" iconRight={<Icon name="arrow-right" size={18} color="var(--surface)" strokeWidth={3} />}>
            Ajouter des apprenants
          </Button>
        </div>
        <Mascot pose="wave" size={170} />
      </div>
    </WebTeacherShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS : section ajoutée à la vue « Dashboard formateur » (TeacherDashFlowWeb)
// ════════════════════════════════════════════════════════
function TeacherACSections() {
  const ab = (id, label, node) => (
    <DCArtboard key={id} id={id} label={label} width={WTAC_W} height={WTAC_H} style={wtacStyle}>
      {node}
    </DCArtboard>
  );
  return [
    <DCSection
      key="ac-wt13"
      id="ac-wt13"
      title="À valider (C18) · WT13 Créer une classe"
      subtitle="Depuis WT03 et l'état vide de WT01 ; nav « Mes classes ». Une classe = un parcours de l'offre (D62), quotas contrôlés par le serveur (D61). « Créer la classe » → WT04 vide → WT06 · « Annuler » → WT03. Erreurs serveur au champ (D4). Même formulaire en édition depuis WT04."
    >
      {ab("WT13", "WT13 · Créer une classe", <WT13_CreateClass />)}
      {ab("WT13-erreurs", "WT13 · Erreurs serveur", <WT13_CreateClass mode="errors" />)}
      {ab("WT13-quota", "WT13 · Quota atteint", <WT13_CreateClass mode="full" />)}
      {ab("WT13-edition", "WT13 · Modifier (parcours verrouillé)", <WT13_CreateClass mode="edit" />)}
      {ab("WT13-creee", "WT13 · Classe créée → WT04 vide", <WT13_Created />)}
    </DCSection>,
  ];
}

window.TeacherACSections = TeacherACSections;
