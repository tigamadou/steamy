// screens-purchase-web.jsx - Achat parcours (P4), version web (1240×760).
// Conforme à user flows/5_achat_parcours.mmd. Happy path :
// WA01 Kit Code → WA02 (<16 → lien parent) → WA03 paiement Mobile Money →
// WA04 traitement → WA05 succès → accès parcours.
// Démarre après le CTA "Acheter" du détail catalogue (WC05).
// In-app : réutilise WebAppShell (active='catalog'). Expose window.PurchaseFlowWeb.
// États dérivés reportés : code invalide, échec paiement, timeout réseau.

const PURCHASE_W = 1240,
  PURCHASE_H = 760;
const purchaseWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};
const PURCHASE_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 16px var(--font-sans)",
  color: "var(--ink-900)",
};

function WAConfetti() {
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

// Carte de sélection réseau Mobile Money (MTN / Moov / Celtiis…).
function WANetworkCard({ name, dot, selected }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "14px 12px",
        borderRadius: 16,
        background: selected ? "var(--primary-50)" : "#fff",
        border: "2px solid",
        borderColor: selected ? "var(--primary-500)" : "var(--ink-200)",
        boxShadow: selected
          ? "0 4px 0 var(--primary-300)"
          : "0 4px 0 var(--ink-200)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          background: dot,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 900,
          fontSize: 13,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-900)" }}>
        {name}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WA01 · SAISIE KIT CODE (si kit indispensable)
// ════════════════════════════════════════════════════════
function WA01_KitCode() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Débloquer le parcours"
      headerSearch={false}
      notifDot
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Catalogue › Construis ton robot Bluetooth › <b>Code Kit</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--primary-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              📦
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                Ce parcours nécessite un kit
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                  lineHeight: 1.45,
                }}
              >
                Saisis le code livré avec ton kit robotique pour débloquer le
                contenu.
              </p>
            </div>
          </div>
          <Field
            label="Code Kit"
            required
            hint="12 caractères, au dos de la notice du kit."
          >
            <Input
              value=""
              placeholder="STEAMY-XXXX-XXXX"
              icon={<Icon name="gift" size={18} color="var(--ink-500)" />}
            />
          </Field>
          <a
            href="#"
            style={{
              color: "var(--primary-600)",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Où trouver le code ?
          </a>
          <Button block size="lg">
            Valider le code
          </Button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink-500)",
            }}
          >
            Pas encore de kit ?{" "}
            <a
              href="#"
              style={{ color: "var(--primary-600)", fontWeight: 900 }}
            >
              Commander dans la boutique
            </a>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WA02 · PAS L'ÂGE POUR PAYER (<16 → lien au parent)
// ════════════════════════════════════════════════════════
function WA02_TooYoung() {
  return (
    <WebAppShell active="catalog" headerTitle="Paiement" headerSearch={false}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Catalogue › Construis ton robot Bluetooth › <b>Paiement</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: "36px 28px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <Mascot pose="idle" size={140} />
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
              On a besoin d'un parent pour payer
            </h2>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink-600)",
                lineHeight: 1.5,
                maxWidth: 420,
              }}
            >
              C'est ton parent qui règle tes achats. On lui envoie un lien de
              paiement sécurisé. Tu recevras une notif dès que c'est réglé.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              background: "var(--bg)",
              borderRadius: 999,
              border: "2px solid var(--ink-100)",
            }}
          >
            <Loader />
            <span
              style={{ fontSize: 14, fontWeight: 800, color: "var(--ink-700)" }}
            >
              Lien envoyé à Marie · en attente du paiement…
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline">Changer de parent</Button>
            <Button>Renvoyer le lien</Button>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WA03 · PAIEMENT MOBILE MONEY (Pays + Réseau + Numéro)
// ════════════════════════════════════════════════════════
function WA03_Payment() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Paiement Mobile Money"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Catalogue › Construis ton robot Bluetooth › <b>Paiement</b>
        </div>

        {/* Récap commande */}
        <div
          style={{
            background: "var(--primary-50)",
            border: "2px solid var(--primary-100)",
            borderRadius: 18,
            padding: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--cat-robotique)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>
                Construis ton robot Bluetooth
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                }}
              >
                Parcours complet · accès à vie
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "var(--primary-700)",
            }}
          >
            25 000 F
          </div>
        </div>

        {/* Formulaire */}
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Field label="Pays" required>
            <div className="input">
              <span style={{ fontSize: 18 }}>🇧🇯</span>
              <select style={PURCHASE_SELECT}>
                <option>Bénin</option>
                <option>Togo</option>
                <option>Côte d'Ivoire</option>
              </select>
            </div>
          </Field>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink-700)",
                marginBottom: 8,
              }}
            >
              Réseau Mobile Money{" "}
              <span style={{ color: "var(--error-500)" }}>*</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <WANetworkCard name="MTN" dot="#F5A623" selected />
              <WANetworkCard name="Moov" dot="#0066B3" />
              <WANetworkCard name="Celtiis" dot="#E2001A" />
            </div>
          </div>
          <Field label="Numéro Mobile Money" required>
            <PhoneInput value="01 90 12 34 56" />
          </Field>
          <Button block size="lg" variant="secondary">
            Payer 25 000 F
          </Button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ink-500)",
            }}
          >
            <Icon name="lock" size={14} color="var(--ink-500)" /> Paiement
            sécurisé · aucune carte bancaire
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WA04 · PAIEMENT EN COURS (loader + message rassurant)
// ════════════════════════════════════════════════════════
function WA04_Processing() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Paiement en cours"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: "48px 28px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <Mascot pose="focus" size={130} />
          <Loader />
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
              On confirme ton paiement…
            </h2>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink-600)",
                lineHeight: 1.5,
                maxWidth: 400,
              }}
            >
              Valide la demande sur ton téléphone (notification ou code USSD).
              Ça peut prendre quelques secondes - ne ferme pas cette page.
            </p>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WA05 · PAIEMENT RÉUSSI → ACCÈS PARCOURS
// ════════════════════════════════════════════════════════
function WA05_Success() {
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
      <WAConfetti />
      <div
        style={{
          background: "#fff",
          borderRadius: 28,
          padding: "48px 44px",
          maxWidth: 560,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          boxShadow: "0 8px 0 var(--success-200)",
          border: "3px solid var(--success-500)",
        }}
      >
        <Mascot pose="cheer" size={150} hue="var(--success-500)" />
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 900,
              color: "var(--success-700)",
            }}
          >
            Paiement réussi !
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
            Le parcours{" "}
            <strong style={{ color: "var(--ink-900)" }}>
              Construis ton robot Bluetooth
            </strong>{" "}
            est débloqué. Une facture t'a été envoyée par SMS et email.
          </p>
        </div>
        <Button
          size="lg"
          variant="secondary"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Accéder au parcours
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WA06 · CODE KIT INVALIDE (erreur + retry)
// ════════════════════════════════════════════════════════
function WA06_KitInvalid() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Débloquer le parcours"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Catalogue › Construis ton robot Bluetooth › <b>Code Kit</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--error-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ⚠️
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                Code Kit invalide
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                  lineHeight: 1.45,
                }}
              >
                Ce code n'existe pas ou a déjà été utilisé. Vérifie la notice de
                ton kit.
              </p>
            </div>
          </div>
          <Field
            label="Code Kit"
            required
            error="Code invalide - vérifie les 12 caractères."
          >
            <Input
              value="STEAMY-9F2A-001Z"
              error
              icon={<Icon name="gift" size={18} color="var(--error-500)" />}
            />
          </Field>
          <a
            href="#"
            style={{
              color: "var(--primary-600)",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Où trouver le code ?
          </a>
          <Button block size="lg">
            Réessayer
          </Button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink-500)",
            }}
          >
            Le code ne marche pas ?{" "}
            <a
              href="#"
              style={{ color: "var(--primary-600)", fontWeight: 900 }}
            >
              Contacter le support
            </a>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WA07 · PAIEMENT ÉCHOUÉ (raison + retry)
// ════════════════════════════════════════════════════════
function WA07_PaymentFailed() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(180deg, var(--error-50) 0%, var(--bg) 60%)",
        fontFamily: "var(--font-sans)",
      }}
    >
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
          gap: 22,
          boxShadow: "0 8px 0 var(--error-100)",
          border: "3px solid var(--error-300)",
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "var(--error-50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Mascot pose="sad" size={130} />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 900,
              color: "var(--error-700)",
            }}
          >
            Paiement échoué
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
            La transaction n'a pas pu aboutir. Aucun montant n'a été débité.
          </p>
        </div>
        <div
          style={{
            background: "var(--error-50)",
            border: "2px solid var(--error-100)",
            borderRadius: 14,
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 800,
            color: "var(--error-700)",
          }}
        >
          Raison : solde Mobile Money insuffisant.
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="outline">Changer de numéro</Button>
          <Button>Réessayer le paiement</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
function PurchaseFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="purchase-unlock"
        title="Achat parcours · code kit & âge"
        subtitle="Kit Code obligatoire si kit requis · paiement réservé au parent."
      >
        <DCArtboard
          id="WA01"
          label="WA01 · Code Kit"
          width={PURCHASE_W}
          height={PURCHASE_H}
          style={purchaseWebStyle}
        >
          <WA01_KitCode />
        </DCArtboard>
        <DCArtboard
          id="WA02"
          label="WA02 · Paiement par le parent"
          width={PURCHASE_W}
          height={PURCHASE_H}
          style={purchaseWebStyle}
        >
          <WA02_TooYoung />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="purchase-pay"
        title="Paiement Mobile Money"
        subtitle="Pays + réseau + numéro · traitement · succès. (Échec = état dérivé à venir.)"
      >
        <DCArtboard
          id="WA03"
          label="WA03 · Formulaire paiement"
          width={PURCHASE_W}
          height={PURCHASE_H}
          style={purchaseWebStyle}
        >
          <WA03_Payment />
        </DCArtboard>
        <DCArtboard
          id="WA04"
          label="WA04 · Paiement en cours"
          width={PURCHASE_W}
          height={PURCHASE_H}
          style={purchaseWebStyle}
        >
          <WA04_Processing />
        </DCArtboard>
        <DCArtboard
          id="WA05"
          label="WA05 · Paiement réussi"
          width={PURCHASE_W}
          height={PURCHASE_H}
          style={purchaseWebStyle}
        >
          <WA05_Success />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="purchase-states"
        title="États dérivés · achat"
        subtitle="Code Kit invalide (retry) · paiement échoué (raison + retry)."
      >
        <DCArtboard
          id="WA06"
          label="WA06 · Code Kit invalide"
          width={PURCHASE_W}
          height={PURCHASE_H}
          style={purchaseWebStyle}
        >
          <WA06_KitInvalid />
        </DCArtboard>
        <DCArtboard
          id="WA07"
          label="WA07 · Paiement échoué"
          width={PURCHASE_W}
          height={PURCHASE_H}
          style={purchaseWebStyle}
        >
          <WA07_PaymentFailed />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.PurchaseFlowWeb = PurchaseFlowWeb;
