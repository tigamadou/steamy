// screens-parent-a-concevoir-web.jsx - Écrans parent absents de la maquette (C18), version web (1240×760).
// WPD15 · Demande de paiement (D52, S8, C3, C4, C17) : 3 objets (parcours, kit, événement), 8 états,
// modale « Refuser la demande », adresse de kit modifiée, accès refusé, version mobile 360 (lien SMS).
// États manquants de l'étape 4.0 : WPD05 origine enseignant (D60) et lecture seule, modale de
// réinitialisation du mot de passe (WPD03, D26), modale de refus d'une candidature (WPD06, D53).
// Spec : docs/SPEC-ECRANS-3-parent-teacher-admin.md §5.11. Registre : vouvoiement.
// Réutilise WebParentShell, WPD03_KidDetail, WPD06_Events (parent-dashboard-web), WANetworkCard (purchase-web),
// PwReq (auth), Loader, Mascot et le DS. Tokens uniquement.
// Ne s'auto-monte pas : expose window.ParentACSections, appelée par ParentDashFlowWeb.

const WPDAC_W = 1240,
  WPDAC_H = 760;
const wpdacStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-pop-md)",
  overflow: "hidden",
};
const WPDAC_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 16px var(--font-sans)",
  color: "var(--ink-900)",
};
const WPDAC_TEXTAREA = {
  width: "100%",
  minHeight: 90,
  border: "2px solid var(--ink-200)",
  borderRadius: 14,
  padding: "12px 14px",
  font: "600 14px var(--font-sans)",
  color: "var(--ink-900)",
  resize: "none",
  outline: "none",
  boxSizing: "border-box",
};

// ─── Objets de demande (jeu D2 : Léa Adjovi, 13 ans, 4ᵉ ; parent Marie Adjovi) ───
// Montants calculés par le serveur ; libellés FCFA (D2). Prix du catalogue HT ; TVA et AIB s'ajoutent si le personnel les
// active (C25) : taux d'exemple ici (18 % et 1 %), les vrais taux sont ceux des réglages de la plateforme.
const WPDAC_REQUESTS = {
  course: {
    kindLabel: "Parcours",
    icon: "📚",
    title: "Capteurs électroniques",
    color: "var(--cat-electronique)",
    emoji: "⚡",
    lines: [["Parcours complet · accès à vie (HT)", "18 000 FCFA"]],
    taxes: [["TVA (18 %)", "3 240 FCFA"], ["AIB (1 %)", "180 FCFA"]],
    total: "21 420 FCFA",
    requiredKit: "Kit Capteurs Steamy · non inclus (Kit Code à saisir par Léa)",
    note: "Le parcours est débloqué pour Léa dès la confirmation du paiement.",
  },
  kit: {
    kindLabel: "Kit",
    icon: "📦",
    title: "Steamy Bot v1",
    color: "var(--cat-robotique)",
    emoji: "🤖",
    lines: [
      ["Steamy Bot v1 × 1 (HT)", "35 000 FCFA"],
      ["Livraison · zone Cotonou", "1 500 FCFA"],
    ],
    taxes: [["TVA (18 %)", "6 570 FCFA"], ["AIB (1 %)", "365 FCFA"]],
    total: "43 435 FCFA",
    note: "Le kit est réservé pendant 30 min dès que vous lancez le paiement. Le Kit Code imprimé sur la notice débloque le parcours « Construis ton robot Bluetooth ».",
  },
  event: {
    kindLabel: "Événement",
    icon: "📅",
    title: "Atelier Électronique débutant",
    color: "var(--cat-electronique)",
    emoji: "💡",
    lines: [["Inscription · samedi 28 juin 2026 (HT)", "5 000 FCFA"]],
    taxes: [["TVA (18 %)", "900 FCFA"], ["AIB (1 %)", "50 FCFA"]],
    total: "5 950 FCFA",
    note: "L'inscription de Léa est confirmée dès le paiement, dans la limite des places.",
  },
};

// ─── Composants locaux ───────────────────────────────
function WPDACCard({ children, style }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink-100)",
        borderRadius: 22,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function WPDACKicker({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 900, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".06em" }}>
      {children}
    </div>
  );
}

function WPDACNote({ icon = "💡", tone = "primary", children }) {
  const bg = { primary: "var(--primary-50)", amber: "var(--amber-50)", error: "var(--error-50)", ink: "var(--ink-50)", success: "var(--success-50)" }[tone];
  const bd = { primary: "var(--primary-100)", amber: "var(--amber-200)", error: "var(--error-100)", ink: "var(--ink-100)", success: "var(--success-100)" }[tone];
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

// Carte enfant bénéficiaire.
function WPDACChild({ badge }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderRadius: 18,
        background: "var(--bg)",
        border: "2px solid var(--ink-100)",
      }}
    >
      <Avatar emoji="🦉" size={48} color="var(--primary-500)" ring />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>Léa Adjovi</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>13 ans · 4ᵉ · bénéficiaire</div>
      </div>
      {badge}
    </div>
  );
}

// Adresse de livraison en cours de modification (zones et frais : référentiel shop, D38).
function WPDACAddressEdit() {
  return (
    <div style={{ padding: 14, borderRadius: 14, border: "2px solid var(--primary-200)", background: "var(--primary-50)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 900 }}>🚚 Modifier l'adresse de livraison</div>
      <Field label="Zone de livraison" required hint="Les frais dépendent de la zone.">
        <div className="input" style={{ background: "var(--surface)" }}>
          <select style={WPDAC_SELECT}>
            <option>Abomey-Calavi</option>
            <option>Cotonou</option>
            <option>Porto-Novo</option>
          </select>
        </div>
      </Field>
      <Field label="Adresse" required>
        <Input value="Godomey, carré 214, près du marché" />
      </Field>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ flex: 1, display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 700, color: "var(--ink-600)" }}>
          <input type="checkbox" /> Enregistrer comme adresse par défaut
        </label>
        <Button size="sm" variant="outline">
          Annuler
        </Button>
        <Button size="sm">Valider</Button>
      </div>
    </div>
  );
}

// Objet de la demande + détail du montant.
function WPDACObject({ kind = "course", compact, editAddress }) {
  const base = WPDAC_REQUESTS[kind];
  // Adresse modifiée : frais de la nouvelle zone et total recalculés par le serveur.
  const r = editAddress
    ? {
        ...base,
        lines: [base.lines[0], ["Livraison · zone Abomey-Calavi", "2 000 FCFA"]],
        taxes: [["TVA (18 %)", "6 660 FCFA"], ["AIB (1 %)", "370 FCFA"]],
        total: "44 030 FCFA",
      }
    : base;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: r.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            flexShrink: 0,
          }}
        >
          {r.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <Badge tone="primary">
            {r.icon} {r.kindLabel}
          </Badge>
          <div style={{ fontSize: 17, fontWeight: 900, marginTop: 4 }}>{r.title}</div>
        </div>
      </div>
      {r.requiredKit && !compact && (
        <div style={{ display: "flex", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--ink-600)" }}>
          <span>🧰</span>
          <span>
            Kit requis : <b>{r.requiredKit}</b>
          </span>
        </div>
      )}
      {kind === "event" && !compact && (
        <div style={{ display: "flex", gap: 14, fontSize: 13, fontWeight: 700, color: "var(--ink-600)", flexWrap: "wrap" }}>
          <span>📅 Samedi 28 juin 2026 · 14:00 – 16:30</span>
          <span>📍 Porto-Novo · Maison des jeunes</span>
        </div>
      )}
      {kind === "kit" && !compact && editAddress && <WPDACAddressEdit />}
      {kind === "kit" && !compact && !editAddress && (
        <div style={{ padding: 14, borderRadius: 14, border: "2px solid var(--ink-100)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18 }}>🚚</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 900 }}>Adresse de livraison</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-600)", lineHeight: 1.5 }}>
              Marie Adjovi · Cocotomey, rue 12.045, maison Adjovi
              <br />
              Zone : Cotonou · livraison sous 3 à 5 jours
            </div>
          </div>
          <button className="section-head__action">Modifier</button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "2px dashed var(--ink-100)" }}>
        {r.lines.map(([k, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--ink-600)" }}>
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
        {r.taxes.map(([k, v], i) => (
          <div key={`t${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--ink-600)" }}>
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 900 }}>Total à payer</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "var(--primary-700)" }}>{r.total}</span>
        </div>
      </div>
    </div>
  );
}

// Colonne gauche commune : enfant, objet, rappel de la demande.
function WPDACSummary({ kind = "course", badge, metaLine, editAddress }) {
  return (
    <WPDACCard>
      <WPDACKicker>Demande de votre enfant</WPDACKicker>
      <WPDACChild badge={badge} />
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>
        {metaLine || "Reçue le 13 oct. 2026 · valable jusqu'au 20 oct. 2026 (7 jours)"}
      </div>
      <WPDACObject kind={kind} editAddress={editAddress} />
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-600)", lineHeight: 1.5 }}>{WPDAC_REQUESTS[kind].note}</div>
    </WPDACCard>
  );
}

// Formulaire PaymentForm (WA03) dans le shell parent : pays, réseau (référentiel par pays, D76), numéro prérempli (WPD08).
function WPDACPaymentForm({ kind = "course", disabled, total }) {
  const r = WPDAC_REQUESTS[kind];
  return (
    <WPDACCard>
      <div style={{ fontSize: 18, fontWeight: 900 }}>Payer par Mobile Money</div>
      <Field label="Pays" required>
        <div className="input">
          <span style={{ fontSize: 18 }}>🇧🇯</span>
          <select style={WPDAC_SELECT}>
            <option>Bénin</option>
            <option>Togo</option>
            <option>Côte d'Ivoire</option>
          </select>
        </div>
      </Field>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-700)", marginBottom: 8 }}>
          Réseau <span style={{ color: "var(--error-500)" }}>*</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <WANetworkCard name="MTN" dot="var(--amber-400)" selected />
          <WANetworkCard name="Moov" dot="var(--info-500)" />
          <WANetworkCard name="Celtiis" dot="var(--error-500)" />
        </div>
      </div>
      <Field label="Numéro Mobile Money" required hint="Prérempli depuis vos paramètres (Livraison & paiement).">
        <PhoneInput value="01 97 45 22 18" />
      </Field>
      <Button block size="lg" disabled={disabled}>
        Payer {total || r.total}
      </Button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>
        <Icon name="lock" size={14} color="var(--ink-500)" /> Paiement sécurisé · aucune carte bancaire
      </div>
      <div style={{ height: 2, background: "var(--ink-100)" }} />
      <button
        style={{
          border: 0,
          background: "transparent",
          font: "800 14px var(--font-sans)",
          color: "var(--error-600)",
          cursor: "pointer",
          padding: 4,
        }}
      >
        Refuser la demande
      </button>
    </WPDACCard>
  );
}

// Panneau de statut (PaymentStatusPanel du lot 3 rendu dans le shell parent).
function WPDACStatusPanel({ status, mobile }) {
  if (status === "confirming" && mobile)
    return (
      <WPDACCard style={{ alignItems: "center", textAlign: "center", padding: "24px 16px" }}>
        <Mascot pose="focus" size={90} />
        <Loader />
        <div style={{ fontSize: 18, fontWeight: 900 }}>Validez le paiement sur ce téléphone</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-600)", lineHeight: 1.5 }}>
          Une fenêtre MTN Mobile Money va s'afficher : saisissez votre code secret, puis revenez sur cette page. Le statut
          se met à jour tout seul.
        </div>
        <WPDACNote icon="⏱️" tone="ink">
          Rien ne s'affiche ? Composez le menu Mobile Money de votre opérateur pour valider l'opération en attente.
        </WPDACNote>
      </WPDACCard>
    );
  if (status === "confirming")
    return (
      <WPDACCard style={{ alignItems: "center", textAlign: "center", padding: "32px 24px" }}>
        <Mascot pose="focus" size={110} />
        <Loader />
        <div style={{ fontSize: 20, fontWeight: 900 }}>Validez le paiement sur votre téléphone</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-600)", lineHeight: 1.5 }}>
          Une demande de 21 420 FCFA a été envoyée au <b>+229 01 97 45 22 18</b> (MTN). Confirmez-la avec votre code
          secret Mobile Money. Nous vérifions le statut automatiquement : vous pouvez garder cette page ouverte.
        </div>
        <WPDACNote icon="⏱️" tone="ink">
          Pas de notification ? Vérifiez votre réseau, puis composez le menu Mobile Money de votre opérateur pour
          valider l'opération en attente.
        </WPDACNote>
      </WPDACCard>
    );
  if (status === "paid")
    return (
      <WPDACCard style={{ alignItems: "center", textAlign: "center", padding: "28px 24px", border: "3px solid var(--success-500)", boxShadow: "0 6px 0 var(--success-200)" }}>
        <Mascot pose="cheer" size={110} hue="var(--success-500)" />
        <div style={{ fontSize: 24, fontWeight: 900, color: "var(--success-700)" }}>Paiement réussi</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.5 }}>
          Le parcours <b>Capteurs électroniques</b> est débloqué. Léa a été prévenue.
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, padding: 14, borderRadius: 14, background: "var(--success-50)", textAlign: "left" }}>
          {[
            ["Référence", "#CM-2052"],
            ["Montant", "21 420 FCFA"],
            ["Réseau", "MTN · 01 97 •• •• 18"],
            ["Date", "14 oct. 2026 · 18:42"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: "var(--ink-500)" }}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <Button block variant="outline">
            Voir mes commandes
          </Button>
          <Button block>Retour à l'accueil</Button>
        </div>
      </WPDACCard>
    );
  if (status === "failed")
    return (
      <WPDACCard style={{ alignItems: "center", textAlign: "center", padding: "28px 24px", border: "3px solid var(--error-300)" }}>
        <Mascot pose="sad" size={110} />
        <div style={{ fontSize: 24, fontWeight: 900, color: "var(--error-700)" }}>Paiement échoué</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-700)" }}>Aucun montant n'a été débité.</div>
        <div
          style={{
            alignSelf: "stretch",
            background: "var(--error-50)",
            border: "2px solid var(--error-100)",
            borderRadius: 14,
            padding: "12px 14px",
            fontSize: 13,
            fontWeight: 800,
            color: "var(--error-700)",
          }}
        >
          Raison communiquée par l'opérateur : solde Mobile Money insuffisant.
        </div>
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <Button block variant="outline">
            Changer de numéro
          </Button>
          <Button block>Réessayer</Button>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>La demande reste valable jusqu'au 20 oct. 2026.</div>
      </WPDACCard>
    );
  // États clos : lecture seule, aucun paiement possible.
  const closed = {
    refused: {
      mascot: "idle",
      title: "Vous avez refusé cette demande",
      body: "Refusée le 14 oct. 2026. Motif transmis à Léa : « On en reparle après les examens. »",
      cta: "Retour à l'accueil",
    },
    expired: {
      mascot: "sleep",
      title: "Cette demande a expiré",
      body: "Elle n'a pas été réglée avant le 20 oct. 2026 (7 jours). Léa peut vous envoyer une nouvelle demande depuis son espace.",
      cta: "Retour à l'accueil",
    },
    cancelled: {
      mascot: "idle",
      title: "Léa a annulé sa demande",
      body: "Annulée le 15 oct. 2026. Il n'y a plus rien à régler.",
      cta: "Retour à l'accueil",
    },
  }[status];
  if (closed)
    return (
      <WPDACCard style={{ alignItems: "center", textAlign: "center", padding: "32px 24px", background: "var(--ink-50)" }}>
        <Mascot pose={closed.mascot} size={110} />
        <div style={{ fontSize: 20, fontWeight: 900 }}>{closed.title}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-600)", lineHeight: 1.5 }}>{closed.body}</div>
        <Button variant="outline">{closed.cta}</Button>
      </WPDACCard>
    );
  // Kit en rupture : paiement impossible, refus proposé.
  return (
    <WPDACCard style={{ border: "2px solid var(--amber-300)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "var(--amber-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          📭
        </div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Kit en rupture de stock</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-700)", lineHeight: 1.5 }}>
        Le <b>Steamy Bot v1</b> n'est plus disponible pour le moment : le paiement est impossible. Vous pouvez refuser la
        demande ; Léa en sera informée et pourra la renvoyer quand le kit sera de retour.
      </div>
      <Button block size="lg" disabled>
        Payer 43 435 FCFA
      </Button>
      <Button block variant="danger">
        Refuser la demande
      </Button>
    </WPDACCard>
  );
}

function WPDACStatusBadge({ status }) {
  const map = {
    pending: ["amber", "À payer"],
    confirming: ["info", "Confirmation…"],
    paid: ["success", "Payée"],
    failed: ["error", "Échec"],
    refused: ["neutral", "Refusée"],
    expired: ["neutral", "Expirée"],
    cancelled: ["neutral", "Annulée"],
    outofstock: ["amber", "Rupture"],
  };
  const [tone, label] = map[status] || map.pending;
  return <Badge tone={tone}>{label}</Badge>;
}

// ════════════════════════════════════════════════════════
// WPD15 · DEMANDE DE PAIEMENT
// ════════════════════════════════════════════════════════
function WPD15_PaymentRequest({ kind = "course", status = "pending", modal, editAddress }) {
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <WebParentShell active="home" headerTitle="Demande de paiement" notifDot>
        <div className="crumb">
          Accueil › À valider › <b>Demande de paiement</b>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 420px", gap: 22, alignItems: "flex-start" }}>
          <WPDACSummary kind={kind} badge={<WPDACStatusBadge status={status} />} editAddress={editAddress} />
          {status === "pending" ? (
            <WPDACPaymentForm kind={kind} total={editAddress ? "44 030 FCFA" : undefined} />
          ) : (
            <WPDACStatusPanel status={status} />
          )}
        </div>
      </WebParentShell>
      {modal && <WPDACRefuseModal />}
    </div>
  );
}

// Modale « Refuser la demande » (motif facultatif, l'enfant est notifié).
function WPDACRefuseModal() {
  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 460, textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Refuser la demande de Léa ?</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-600)", lineHeight: 1.5 }}>
          Parcours <b>Capteurs électroniques</b> · 21 420 FCFA (taxes comprises). Léa sera prévenue de votre refus.
        </div>
        <Field label="Motif (facultatif)" hint="Il sera transmis à Léa.">
          <textarea style={WPDAC_TEXTAREA} defaultValue="On en reparle après les examens." />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Button block variant="outline">
            Annuler
          </Button>
          <Button block variant="danger">
            Refuser la demande
          </Button>
        </div>
      </div>
    </div>
  );
}

// Accès refusé : lien d'une autre famille, ou demande supprimée.
function WPD15_NotFound() {
  return (
    <WebParentShell active="home" headerTitle="Demande de paiement">
      <div style={{ maxWidth: 520, margin: "40px auto 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Mascot pose="sad" size={140} />
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Demande introuvable</h2>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink-600)", lineHeight: 1.5 }}>
          Ce lien ne correspond à aucune demande de vos enfants. Vérifiez que vous êtes connecté avec le bon compte
          parent.
        </p>
        <Button>Voir mes demandes à valider</Button>
      </div>
    </WebParentShell>
  );
}

// Version mobile 360 : le lien SMS est ouvert sur le téléphone du parent.
function WPD15_Mobile({ kind = "course", status = "pending" }) {
  const r = WPDAC_REQUESTS[kind];
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg)", fontFamily: "var(--font-sans)", color: "var(--ink-900)" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--ink-100)",
        }}
      >
        <Icon name="arrow-left" size={20} color="var(--ink-700)" />
        <div style={{ flex: 1, fontSize: 16, fontWeight: 900 }}>Demande de paiement</div>
        <Icon name="bell" size={20} color="var(--ink-700)" />
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <WPDACChild badge={<WPDACStatusBadge status={status} />} />
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>Reçue le 13 oct. · valable jusqu'au 20 oct.</div>
        <WPDACCard style={{ padding: 16 }}>
          <WPDACObject kind={kind} />
        </WPDACCard>
        {status !== "pending" ? (
          <WPDACStatusPanel status={status} mobile />
        ) : (
          <>
            <WPDACCard style={{ padding: 16 }}>
              <Field label="Pays" required>
                <div className="input">
                  <span style={{ fontSize: 18 }}>🇧🇯</span>
                  <select style={WPDAC_SELECT}>
                    <option>Bénin</option>
                  </select>
                </div>
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <WANetworkCard name="MTN" dot="var(--amber-400)" selected />
                <WANetworkCard name="Moov" dot="var(--info-500)" />
                <WANetworkCard name="Celtiis" dot="var(--error-500)" />
              </div>
              <Field label="Numéro Mobile Money" required>
                <PhoneInput value="01 97 45 22 18" />
              </Field>
              <Button block size="lg">
                Payer {r.total}
              </Button>
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>
                🔒 Paiement sécurisé · aucune carte bancaire
              </div>
            </WPDACCard>
            <button style={{ border: 0, background: "transparent", font: "800 14px var(--font-sans)", color: "var(--error-600)", padding: 8 }}>
              Refuser la demande
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ÉTATS MANQUANTS DE L'ÉTAPE 4.0
// ════════════════════════════════════════════════════════
// WPD05 · origine enseignant (D60) : la demande vient d'une classe ; l'acceptation ouvre la création de l'identifiant.
function WPDACTeacherOrigin() {
  return (
    <div style={{ display: "flex", gap: 12, padding: 14, borderRadius: 16, background: "var(--amber-50)", border: "2px solid var(--amber-200)" }}>
      <Avatar name="Koffi" size={40} color="var(--cat-ia)" />
      <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--ink-700)", lineHeight: 1.5 }}>
        <b style={{ color: "var(--ink-900)" }}>Demande envoyée par M. Koffi A., enseignant</b>
        <br />
        Classe « Club STEM · Samedi » · Complexe scolaire Les Lauréats, Cotonou
        <br />
        Parcours suivi : <b>Initiation à Scratch</b> · pris en charge par l'école, aucun paiement
      </div>
    </div>
  );
}

// readOnly : "expired" (7 jours sans réponse, D21) ou "done" (déjà traitée, par exemple depuis le lien SMS).
function WPD05_TeacherConsent({ readOnly }) {
  return (
    <WebParentShell active="home" headerTitle="Demande de consentement">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="crumb">
          Accueil › <b>Demande de consentement</b>
        </div>
        <WPDACCard style={{ padding: 26, gap: 16 }}>
          {readOnly === "expired" && (
            <WPDACNote icon="⌛" tone="ink">
              Cette demande a expiré le 20 oct. 2026 (7 jours sans réponse) : elle est en lecture seule. L'enseignant peut
              vous en renvoyer une.
            </WPDACNote>
          )}
          {readOnly === "done" && (
            <WPDACNote icon="✅" tone="success">
              Vous avez déjà accepté cette demande le 14 oct. 2026 : le compte d'Inès est créé et elle a rejoint la classe.
              Retrouvez-la dans « Mes enfants ».
            </WPDACNote>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, background: "var(--bg)", border: "2px solid var(--ink-100)" }}>
            <Avatar name="Inès" size={52} color="var(--cat-code)" ring />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Inès Adjovi</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}>12 ans · lien de parenté indiqué : vous êtes sa mère</div>
            </div>
            <Badge tone={{ expired: "neutral", done: "success" }[readOnly] || "amber"}>
              {{ expired: "Expirée", done: "Acceptée" }[readOnly] || "En attente"}
            </Badge>
          </div>
          <WPDACTeacherOrigin />
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-600)", lineHeight: 1.5 }}>
            En acceptant, vous créez le compte d'Inès (identifiant et mot de passe) : elle rejoint ensuite la classe. Vous
            restez son responsable légal et suivez sa progression depuis votre espace.
          </div>
          {readOnly === "done" ? (
            <Button variant="outline" block>
              Voir le profil d'Inès
            </Button>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <Button variant="secondary" block disabled={!!readOnly}>
                Accepter et créer son compte
              </Button>
              <Button variant="outline" block disabled={!!readOnly}>
                Refuser
              </Button>
            </div>
          )}
        </WPDACCard>
      </div>
    </WebParentShell>
  );
}

// Étape suivant l'acceptation : champs de WPD04 préremplis.
function WPD05_TeacherAccountStep() {
  return (
    <WebParentShell active="home" headerTitle="Créer le compte d'Inès">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="crumb">
          Accueil › Demande de consentement › <b>Créer le compte</b>
        </div>
        <WPDACCard style={{ padding: 26, gap: 14 }}>
          <WPDACTeacherOrigin />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Prénom" required>
              <Input value="Inès" />
            </Field>
            <Field label="Nom" required>
              <Input value="Adjovi" />
            </Field>
            <Field label="Date de naissance" required hint="Entre 10 et 17 ans.">
              <Input value="" placeholder="jj/mm/aaaa" />
            </Field>
            <Field label="Lien de parenté" required>
              <div className="input">
                <select style={WPDAC_SELECT}>
                  <option>Mère</option>
                </select>
              </div>
            </Field>
          </div>
          <Field label="Identifiant" required hint="Inès l'utilisera pour se connecter.">
            <Input value="ines.adjovi" />
          </Field>
          <Field label="Mot de passe initial" required>
            <PasswordInput value="" />
          </Field>
          <div style={{ display: "flex", gap: 16 }}>
            <PwReq ok={false} label="Au moins 8 caractères" />
            <PwReq ok={false} label="Au moins une lettre et un chiffre" />
          </div>
          <Button block size="lg" variant="secondary">
            Créer le compte et rejoindre la classe
          </Button>
        </WPDACCard>
      </div>
    </WebParentShell>
  );
}

// WPD03 · modale « Réinitialiser le mot de passe » (D26).
function WPD03_ResetPasswordModal() {
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <WPD03_KidDetail />
      <div className="modal-backdrop">
        <div className="modal" style={{ maxWidth: 440, textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Nouveau mot de passe pour Léa</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-600)", lineHeight: 1.5 }}>
            Identifiant : <b>lea.adjovi</b>. L'ancien mot de passe ne fonctionnera plus.
          </div>
          <Field label="Nouveau mot de passe" required>
            <PasswordInput value="robot2026" />
          </Field>
          <Field label="Confirmation" required>
            <PasswordInput value="robot2026" />
          </Field>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <PwReq ok label="Au moins 8 caractères" />
            <PwReq ok label="Au moins une lettre et un chiffre" />
          </div>
          <WPDACNote icon="💬" tone="amber">
            Communiquez-le à votre enfant.
          </WPDACNote>
          <div style={{ display: "flex", gap: 10 }}>
            <Button block variant="outline">
              Annuler
            </Button>
            <Button block>Enregistrer</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// WPD06 · modale de refus d'une candidature (motif facultatif, notifié à l'enfant, D53).
function WPD06_RefuseApplicationModal() {
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <WPD06_Events />
      <div className="modal-backdrop">
        <div className="modal" style={{ maxWidth: 440, textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Refuser la participation de Léa ?</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-600)", lineHeight: 1.5 }}>
            Challenge Robot Sumo · 14 juin 2026 · Cotonou. Léa sera prévenue de votre refus.
          </div>
          <Field label="Motif (facultatif)" hint="Il sera transmis à Léa.">
            <textarea style={WPDAC_TEXTAREA} defaultValue="Nous serons en déplacement ce week-end." />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Button block variant="outline">
              Annuler
            </Button>
            <Button block variant="danger">
              Refuser
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS : sections ajoutées à la vue « Dashboard parent » (ParentDashFlowWeb)
// ════════════════════════════════════════════════════════
function ParentACSections() {
  const ab = (id, label, node, w = WPDAC_W, h = WPDAC_H) => (
    <DCArtboard key={id} id={id} label={label} width={w} height={h} style={wpdacStyle}>
      {node}
    </DCArtboard>
  );
  return [
    <DCSection
      key="ac-wpd15-objets"
      id="ac-wpd15-objets"
      title="À valider (C18) · WPD15 Demande de paiement · objets"
      subtitle="Cible du lien SMS et des notifications (D52). Parent du bénéficiaire uniquement. Montant calculé par le serveur. Parcours : kit requis éventuel. Kit : adresse préremplie depuis WPD08, modifiable (zone du référentiel, frais et total recalculés par le serveur) ; stock réservé à l'initiation du paiement (D38). Événement : inscription confirmée au paiement (C3). « Payer » en magenta (C1). Mobile 360 d'abord : le lien SMS s'ouvre sur le téléphone qui valide aussi le paiement."
    >
      {ab("WPD15", "WPD15 · Parcours · à payer", <WPD15_PaymentRequest kind="course" />)}
      {ab("WPD15-kit", "WPD15 · Kit · à payer", <WPD15_PaymentRequest kind="kit" />)}
      {ab("WPD15-evenement", "WPD15 · Événement · à payer", <WPD15_PaymentRequest kind="event" />)}
      {ab("WPD15-kit-adresse", "WPD15 · Kit · adresse modifiée", <WPD15_PaymentRequest kind="kit" editAddress />)}
      {ab("WPD15-mobile", "WPD15 · Mobile 360 (lien SMS)", <WPD15_Mobile />, 360, 760)}
      {ab("WPD15-mobile-kit", "WPD15 · Mobile 360 · kit", <WPD15_Mobile kind="kit" />, 360, 760)}
      {ab("WPD15-mobile-confirmation", "WPD15 · Mobile 360 · confirmation", <WPD15_Mobile status="confirming" />, 360, 760)}
    </DCSection>,
    <DCSection
      key="ac-wpd15-etats"
      id="ac-wpd15-etats"
      title="À valider (C18) · WPD15 · états"
      subtitle="Attente de confirmation (WA04) → payée (WA05, lien WPD07) ou échec (WA07) via PaymentStatusPanel dans le shell parent ; webhook source de vérité (S9). Refusée, expirée (7 jours, C4), annulée par l'enfant : lecture seule. Kit en rupture : paiement impossible, refus proposé."
    >
      {ab("WPD15-confirmation", "WPD15 · Attente de confirmation", <WPD15_PaymentRequest status="confirming" />)}
      {ab("WPD15-payee", "WPD15 · Payée", <WPD15_PaymentRequest status="paid" />)}
      {ab("WPD15-echec", "WPD15 · Échec", <WPD15_PaymentRequest status="failed" />)}
      {ab("WPD15-refus", "WPD15 · Modale « Refuser la demande »", <WPD15_PaymentRequest modal />)}
      {ab("WPD15-refusee", "WPD15 · Refusée", <WPD15_PaymentRequest status="refused" />)}
      {ab("WPD15-expiree", "WPD15 · Expirée", <WPD15_PaymentRequest status="expired" />)}
      {ab("WPD15-annulee", "WPD15 · Annulée par l'enfant", <WPD15_PaymentRequest status="cancelled" />)}
      {ab("WPD15-rupture", "WPD15 · Kit en rupture", <WPD15_PaymentRequest kind="kit" status="outofstock" />)}
      {ab("WPD15-introuvable", "WPD15 · Demande introuvable", <WPD15_NotFound />)}
    </DCSection>,
    <DCSection
      key="ac-wpd-etats"
      id="ac-wpd-etats"
      title="À valider (C18) · États manquants de l'espace parent (étape 4.0)"
      subtitle="WPD05 origine enseignant (D60) : prénom, nom, âge, lien de parenté (D20) ; acceptation → création de l'identifiant (champs de WPD04 préremplis) → l'élève rejoint la classe ; expirée ou déjà traitée : lecture seule. WPD03 : réinitialisation du mot de passe (D26). WPD06 : refus d'une candidature (D53)."
    >
      {ab("WPD05-enseignant", "WPD05 · Origine enseignant", <WPD05_TeacherConsent />)}
      {ab("WPD05-enseignant-compte", "WPD05 · Création du compte", <WPD05_TeacherAccountStep />)}
      {ab("WPD05-expiree", "WPD05 · Expirée (lecture seule)", <WPD05_TeacherConsent readOnly="expired" />)}
      {ab("WPD05-traitee", "WPD05 · Déjà traitée (lecture seule)", <WPD05_TeacherConsent readOnly="done" />)}
      {ab("WPD03-mdp", "WPD03 · Modale mot de passe", <WPD03_ResetPasswordModal />)}
      {ab("WPD06-refus", "WPD06 · Modale de refus", <WPD06_RefuseApplicationModal />)}
    </DCSection>,
  ];
}

window.ParentACSections = ParentACSections;
