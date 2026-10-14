// screens-kit-shop-web.jsx - Boutique de kit (P5), version web (1240×760).
// Conforme à user flows/4_boutique_kit.mmd (incl. checkout invité ajouté au flow).
// Happy path : WK01 catalogue → WK02 détail → WK03 panier → WK04 infos invité →
// WK05 livraison → WK06 paiement → WK07 confirmation + suivi livraison.
// Branche <16 → lien parent : réutilise le pattern P4 (WA02), non redupliqué ici.
// Réutilise WebAppShell, WANetworkCard (global, défini dans purchase), atoms/complex.
// Expose window.KitShopFlowWeb.

const KIT_SHOP_W = 1240,
  KIT_SHOP_H = 760;
const kitShopWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};
const KIT_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 16px var(--font-sans)",
  color: "var(--ink-900)",
};

const KIT_CATALOG = [
  {
    name: "Steamy Bot v1",
    price: "35 000 F",
    level: "Débutant",
    emoji: "🤖",
    color: "var(--cat-robotique)",
    desc: "Châssis 2 roues + carte + capteurs pour ton premier robot mobile.",
  },
  {
    name: "Pack Électronique",
    price: "22 000 F",
    level: "Débutant",
    emoji: "⚡",
    color: "var(--cat-electronique)",
    desc: "Breadboard, LEDs, résistances et fils - les bases de l'électronique.",
  },
  {
    name: "Kit Capteurs Pro",
    price: "28 000 F",
    level: "Intermédiaire",
    emoji: "📡",
    color: "var(--cat-ia)",
    desc: "Capteurs ultrason, lumière et température pour projets avancés.",
  },
  {
    name: "Bras Robotisé",
    price: "48 000 F",
    level: "Avancé",
    emoji: "🦾",
    color: "var(--cat-mecanique)",
    desc: "Servomoteurs + structure pour un bras articulé à 4 axes.",
  },
  {
    name: "Kit Énergie Solaire",
    price: "19 000 F",
    level: "Débutant",
    emoji: "🔆",
    color: "var(--cat-energie)",
    desc: "Panneau solaire, moteur et hélices - découvre l'énergie verte.",
  },
  {
    name: "Station Météo",
    price: "31 000 F",
    level: "Intermédiaire",
    emoji: "🌦️",
    color: "var(--cat-code)",
    desc: "Capteurs météo + écran pour ta propre station connectée.",
  },
];

const KIT_CART = [
  {
    name: "Steamy Bot v1",
    emoji: "🤖",
    color: "var(--cat-robotique)",
    price: "35 000 F",
    qty: 1,
  },
  {
    name: "Pack Électronique",
    emoji: "⚡",
    color: "var(--cat-electronique)",
    price: "22 000 F",
    qty: 2,
  },
];

// ─── Helpers locaux ───────────────────────────────────────
function WKKitCard({ k }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid var(--ink-100)",
        borderRadius: 22,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          aspectRatio: "16 / 10",
          background: k.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 64,
        }}
      >
        <span style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.18))" }}>
          {k.emoji}
        </span>
      </div>
      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
        }}
      >
        <div>
          <Badge tone="primary">{k.level}</Badge>
        </div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{k.name}</h3>
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
          {k.desc}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: "var(--primary-700)",
            }}
          >
            {k.price}
          </span>
          <Button
            size="sm"
            icon={<Icon name="cart" size={16} color="#fff" strokeWidth={2.5} />}
          >
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}

function WKQtyStepper({ qty }) {
  const btn = {
    width: 30,
    height: 30,
    borderRadius: 9,
    border: "2px solid var(--ink-200)",
    background: "#fff",
    fontSize: 18,
    fontWeight: 900,
    color: "var(--ink-700)",
    cursor: "pointer",
    lineHeight: 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button style={btn}>−</button>
      <span
        style={{
          fontSize: 15,
          fontWeight: 900,
          minWidth: 16,
          textAlign: "center",
        }}
      >
        {qty}
      </span>
      <button style={btn}>+</button>
    </div>
  );
}

function WKCartRow({ item }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 16,
        background: "#fff",
        border: "1.5px solid var(--ink-100)",
        borderRadius: 16,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: item.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{item.name}</div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--primary-700)",
            marginTop: 2,
          }}
        >
          {item.price}
        </div>
      </div>
      <WKQtyStepper qty={item.qty} />
      <button
        style={{
          background: "transparent",
          border: 0,
          cursor: "pointer",
          color: "var(--ink-400)",
          padding: 6,
        }}
        aria-label="Retirer"
      >
        <Icon name="x" size={20} />
      </button>
    </div>
  );
}

function WKSummaryRow({ label, value, strong }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: strong ? 18 : 14,
        fontWeight: strong ? 900 : 700,
        color: strong ? "var(--ink-900)" : "var(--ink-600)",
      }}
    >
      <span>{label}</span>
      <span style={strong ? { color: "var(--primary-700)" } : undefined}>
        {value}
      </span>
    </div>
  );
}

// Timeline de livraison (préparation → expédié → en cours → livré).
function WKTimeline({ steps }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const color =
          s.state === "done"
            ? "var(--success-500)"
            : s.state === "current"
              ? "var(--primary-500)"
              : "var(--ink-200)";
        return (
          <div key={i} style={{ display: "flex", gap: 16 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {s.state === "done" ? (
                  <Icon name="check" size={16} color="#fff" strokeWidth={3} />
                ) : (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background:
                        s.state === "current" ? "#fff" : "var(--ink-400)",
                    }}
                  />
                )}
              </div>
              {!last && (
                <div
                  style={{
                    width: 3,
                    flex: 1,
                    minHeight: 28,
                    background:
                      s.state === "done"
                        ? "var(--success-500)"
                        : "var(--ink-200)",
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: last ? 0 : 18 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color:
                    s.state === "todo" ? "var(--ink-400)" : "var(--ink-900)",
                }}
              >
                {s.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-500)",
                  marginTop: 2,
                }}
              >
                {s.meta}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WK01 · CATALOGUE KITS
// ════════════════════════════════════════════════════════
function WK01_Catalog() {
  return (
    <WebAppShell active="catalog" headerTitle="Boutique de kits" notifDot>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="filter-strip">
          <Tag active>Tous</Tag>
          <Tag color="var(--cat-robotique)">Robotique</Tag>
          <Tag color="var(--cat-electronique)">Électronique</Tag>
          <Tag color="var(--cat-ia)">Capteurs / IA</Tag>
          <Tag color="var(--cat-energie)">Énergie</Tag>
          <div style={{ flex: 1 }} />
          <button className="section-head__action">
            Trier · Populaires <Icon name="chevron-down" size={14} />
          </button>
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
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WK02 · DÉTAIL KIT
// ════════════════════════════════════════════════════════
function WK02_Detail() {
  const constituants = [
    "1 châssis 2 roues",
    "2 moteurs DC + roues",
    "1 carte de contrôle",
    "1 module Bluetooth",
    "Câbles + visserie",
    "1 notice illustrée",
  ];
  const compatibles = [
    {
      emoji: "🤖",
      title: "Construis ton robot Bluetooth",
      color: "var(--cat-robotique)",
    },
    { emoji: "📡", title: "Contrôle à distance", color: "var(--cat-ia)" },
  ];
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Détail du kit"
      headerSearch={false}
    >
      <div className="crumb">
        Boutique › <b>Steamy Bot v1</b>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              aspectRatio: "16 / 9",
              background: "var(--cat-robotique)",
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 120,
            }}
          >
            🤖
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {["🤖", "🔧", "📡", "🔋"].map((e, i) => (
              <div
                key={i}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 14,
                  background: "var(--ink-50)",
                  border:
                    "2px solid " +
                    (i === 0 ? "var(--primary-500)" : "var(--ink-100)"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  cursor: "pointer",
                }}
              >
                {e}
              </div>
            ))}
          </div>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900 }}>
              Steamy Bot v1
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
              Le kit idéal pour débuter la robotique : assemble un robot mobile,
              branche ses moteurs et programme ses déplacements. Tout est
              inclus, aucune soudure nécessaire.
            </p>
          </div>
          <div>
            <SectionHeader title="Ce que contient le kit" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {constituants.map((c, i) => (
                <div
                  key={i}
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
                  {c}
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeader title="Parcours compatibles" />
            <div style={{ display: "flex", gap: 12 }}>
              {compatibles.map((p, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    background: "#fff",
                    border: "1.5px solid var(--ink-100)",
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: p.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                    }}
                  >
                    {p.emoji}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>
                    {p.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Carte d'achat sticky */}
        <div style={{ position: "sticky", top: 0 }}>
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
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "var(--primary-700)",
              }}
            >
              35 000 F
            </div>
            <div>
              <Badge tone="success">● En stock</Badge>
            </div>
            <Button
              block
              size="lg"
              icon={
                <Icon name="cart" size={18} color="#fff" strokeWidth={2.5} />
              }
            >
              Ajouter au panier
            </Button>
            <Button block variant="outline">
              Acheter maintenant
            </Button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ink-500)",
                justifyContent: "center",
              }}
            >
              🚚 Livraison à Cotonou sous 3–5 jours
            </div>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WK03 · PANIER
// ════════════════════════════════════════════════════════
function WK03_Cart() {
  return (
    <WebAppShell active="catalog" headerTitle="Mon panier" headerSearch={false}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {KIT_CART.map((it, i) => (
            <WKCartRow key={i} item={it} />
          ))}
          <button
            className="section-head__action"
            style={{ alignSelf: "flex-start" }}
          >
            <Icon name="arrow-left" size={14} /> Continuer mes achats
          </button>
        </div>
        <div
          style={{
            position: "sticky",
            top: 0,
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
            Récapitulatif
          </h3>
          <WKSummaryRow label="Sous-total (3 articles)" value="79 000 F" />
          <WKSummaryRow label="Livraison" value="2 000 F" />
          <div style={{ height: 1, background: "var(--ink-100)" }} />
          <WKSummaryRow label="Total" value="81 000 F" strong />
          <Button block size="lg">
            Passer au paiement
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WK04 · INFOS INVITÉ (checkout invité - ajout du flow)
// ════════════════════════════════════════════════════════
function WK04_Guest() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Tes informations"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Panier › <b>Tes informations</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 16,
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
              🛍️
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                Commande en tant qu'invité
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
                Pas besoin de compte pour commander. Tu pourras en créer un plus
                tard pour suivre tes livraisons.
              </p>
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Prénom" required>
              <Input value="" placeholder="Marie" />
            </Field>
            <Field label="Nom" required>
              <Input value="" placeholder="Adjovi" />
            </Field>
          </div>
          <Field
            label="Numéro de téléphone"
            required
            hint="Pour le suivi de livraison par SMS."
          >
            <PhoneInput value="" />
          </Field>
          <Checkbox
            checked
            label="J'accepte la"
            link="politique de confidentialité."
          />
          <Button block size="lg">
            Continuer vers la livraison
          </Button>
          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink-600)",
            }}
          >
            Tu as déjà un compte ?{" "}
            <a
              href="#"
              style={{ color: "var(--primary-600)", fontWeight: 900 }}
            >
              Se connecter
            </a>
          </div>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WK05 · INFO DE LIVRAISON
// ════════════════════════════════════════════════════════
function WK05_Delivery() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Adresse de livraison"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Panier › Infos › <b>Livraison</b>
        </div>
        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
            Où livrer ton kit ?
          </h2>
          <Field label="Pays" required>
            <div className="input">
              <span style={{ fontSize: 18 }}>🇧🇯</span>
              <select style={KIT_SELECT}>
                <option>Bénin</option>
                <option>Togo</option>
                <option>Côte d'Ivoire</option>
              </select>
            </div>
          </Field>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Ville" required>
              <Input value="Cotonou" />
            </Field>
            <Field label="Quartier" required>
              <Input value="Cocotomey" />
            </Field>
          </div>
          <Field
            label="Rue / repère"
            required
            hint="Un point de repère aide le livreur."
          >
            <Input value="Rue 12.45, près de la pharmacie" />
          </Field>
          <Button block size="lg">
            Continuer vers le paiement
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WK06 · PAIEMENT MOBILE MONEY (réutilise WANetworkCard)
// ════════════════════════════════════════════════════════
function WK06_Payment() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Paiement Mobile Money"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Panier › Livraison › <b>Paiement</b>
        </div>
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
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            Total à payer · 3 articles + livraison
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "var(--primary-700)",
            }}
          >
            81 000 F
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
            gap: 16,
          }}
        >
          <Field label="Pays" required>
            <div className="input">
              <span style={{ fontSize: 18 }}>🇧🇯</span>
              <select style={KIT_SELECT}>
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
            <PhoneInput value="01 90 88 77 66" />
          </Field>
          <Button block size="lg" variant="secondary">
            Payer 81 000 F
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
// WK07 · CONFIRMATION DE COMMANDE + SUIVI LIVRAISON
// ════════════════════════════════════════════════════════
function WK07_Confirmation() {
  const steps = [
    { title: "Commande confirmée", meta: "Aujourd'hui · 14:32", state: "done" },
    {
      title: "En préparation",
      meta: "Atelier Steamy · Cotonou",
      state: "current",
    },
    { title: "Expédiée", meta: "À venir", state: "todo" },
    { title: "Livrée", meta: "Estimée sous 3–5 jours", state: "todo" },
  ];
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Commande confirmée"
      headerSearch={false}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            background: "var(--success-50)",
            border: "2px solid var(--success-200)",
            borderRadius: 22,
            padding: 24,
          }}
        >
          <Mascot pose="cheer" size={110} hue="var(--success-500)" />
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 900,
                color: "var(--success-700)",
              }}
            >
              Merci, c'est commandé !
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink-700)",
              }}
            >
              Commande <strong>#KT-7042</strong> · un reçu t'a été envoyé par
              SMS. On te prévient à chaque étape.
            </p>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "2px solid var(--ink-100)",
            borderRadius: 22,
            padding: 24,
          }}
        >
          <SectionHeader title="Suivi de livraison" />
          <div style={{ marginTop: 8 }}>
            <WKTimeline steps={steps} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Button size="lg" variant="outline">
            Télécharger le reçu
          </Button>
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
            Retour à la boutique
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WK08 · PAS L'ÂGE POUR PAYER (kit, <16 → lien parent)
// ════════════════════════════════════════════════════════
function WK08_TooYoung() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Paiement du kit"
      headerSearch={false}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="crumb">
          Panier › Livraison › <b>Paiement</b>
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
              Un parent doit valider l'achat
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
              paiement sécurisé pour ta commande de kit (
              <strong>81 000 F</strong>).
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
// WK09 · PAIEMENT DU KIT ÉCHOUÉ (raison + retry)
// ════════════════════════════════════════════════════════
function WK09_PaymentFailed() {
  return (
    <div
      style={{
        height: "100%",
        background:
          "linear-gradient(180deg, var(--error-50) 0%, var(--bg) 60%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
            La commande de ton kit n'a pas pu être réglée. Aucun montant n'a été
            débité, ton panier est conservé.
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
// WK10 · PANIER VIDE
// ════════════════════════════════════════════════════════
function WK10_EmptyCart() {
  return (
    <WebAppShell active="catalog" headerTitle="Mon panier" headerSearch={false}>
      <div className="empty">
        <Mascot pose="idle" size={170} />
        <h2>Ton panier est vide</h2>
        <p>
          Ajoute un kit robotique pour construire pour de vrai. La livraison se
          fait partout en Afrique de l'Ouest.
        </p>
        <div style={{ marginTop: 8 }}>
          <Button
            size="lg"
            iconRight={
              <Icon name="arrow-right" size={18} color="#fff" strokeWidth={3} />
            }
          >
            Voir les kits
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// WK11 · STOCK ÉPUISÉ (avec « préviens-moi »)
// ════════════════════════════════════════════════════════
function WK11_OutOfStock() {
  return (
    <WebAppShell
      active="catalog"
      headerTitle="Détail du kit"
      headerSearch={false}
    >
      <div className="crumb">
        Boutique › <b>Bras Robotisé</b>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            aspectRatio: "16 / 9",
            background: "var(--cat-mecanique)",
            borderRadius: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 120,
            position: "relative",
          }}
        >
          <span style={{ filter: "grayscale(.3)" }}>🦾</span>
          <span
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              background: "var(--ink-900)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              padding: "6px 12px",
              borderRadius: 999,
            }}
          >
            Rupture de stock
          </span>
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
          <div
            style={{ fontSize: 32, fontWeight: 900, color: "var(--ink-400)" }}
          >
            48 000 F
          </div>
          <Badge tone="error">● Indisponible</Badge>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-600)",
              lineHeight: 1.5,
            }}
          >
            Ce kit est momentanément en rupture. Laisse ton numéro : on te
            prévient dès qu'il revient.
          </p>
          <Field label="Être prévenu·e du retour">
            <PhoneInput value="01 90 12 34 56" />
          </Field>
          <Button block size="lg">
            Me prévenir
          </Button>
          <Button block variant="outline">
            Voir des kits similaires
          </Button>
        </div>
      </div>
    </WebAppShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
function KitShopFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="kit-browse"
        title="Boutique · catalogue & détail"
        subtitle="Liste filtrable · détail kit (constituants, stock, parcours compatibles)."
      >
        <DCArtboard
          id="WK01"
          label="WK01 · Catalogue kits"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK01_Catalog />
        </DCArtboard>
        <DCArtboard
          id="WK02"
          label="WK02 · Détail kit"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK02_Detail />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="kit-checkout"
        title="Panier & checkout"
        subtitle="Panier · infos invité (ajout flow) · livraison · paiement."
      >
        <DCArtboard
          id="WK03"
          label="WK03 · Panier"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK03_Cart />
        </DCArtboard>
        <DCArtboard
          id="WK04"
          label="WK04 · Infos invité"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK04_Guest />
        </DCArtboard>
        <DCArtboard
          id="WK05"
          label="WK05 · Livraison"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK05_Delivery />
        </DCArtboard>
        <DCArtboard
          id="WK06"
          label="WK06 · Paiement"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK06_Payment />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="kit-post"
        title="Post-achat & livraison"
        subtitle="Confirmation de commande + suivi de livraison (timeline)."
      >
        <DCArtboard
          id="WK07"
          label="WK07 · Confirmation & suivi"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK07_Confirmation />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="kit-states"
        title="États dérivés · achat kit"
        subtitle="Panier vide · stock épuisé · paiement réservé au parent · échec de paiement."
      >
        <DCArtboard
          id="WK10"
          label="WK10 · Panier vide"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK10_EmptyCart />
        </DCArtboard>
        <DCArtboard
          id="WK11"
          label="WK11 · Stock épuisé"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK11_OutOfStock />
        </DCArtboard>
        <DCArtboard
          id="WK08"
          label="WK08 · Paiement par le parent"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK08_TooYoung />
        </DCArtboard>
        <DCArtboard
          id="WK09"
          label="WK09 · Paiement échoué"
          width={KIT_SHOP_W}
          height={KIT_SHOP_H}
          style={kitShopWebStyle}
        >
          <WK09_PaymentFailed />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.KitShopFlowWeb = KitShopFlowWeb;
