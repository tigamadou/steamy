// screens-auth.jsx - Onboarding & Authentification Steamy
// 16 écrans suivant le user flow. Mobile 360×780.

const S = {
  bg: { background: "var(--bg)" },
  pad: { padding: "0 20px" },
  font: { fontFamily: "var(--font-sans)", color: "var(--ink-900)" },
};

// Status bar mobile
function StatusBar({ dark }) {
  const c = dark ? "#fff" : "var(--ink-900)";
  return (
    <div
      style={{
        height: 36,
        padding: "0 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
        fontWeight: 800,
        color: c,
        flexShrink: 0,
      }}
    >
      <span>9:41</span>
      <div
        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
      >
        <span>•••</span>
        <span>📶</span>
        <span
          style={{
            width: 22,
            height: 11,
            border: `1.5px solid ${c}`,
            borderRadius: 3,
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 1,
              background: c,
              borderRadius: 1,
              width: "70%",
            }}
          />
        </span>
      </div>
    </div>
  );
}

// Top bar (back + step dots)
function TopBar({ onBack = true, step, total, right }) {
  return (
    <div
      style={{
        height: 56,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}
    >
      {onBack && (
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
            cursor: "pointer",
          }}
        >
          <Icon name="arrow-left" size={20} color="var(--ink-900)" />
        </button>
      )}
      {step != null && (
        <div style={{ flex: 1, display: "flex", gap: 6, padding: "0 8px" }}>
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                background: i < step ? "var(--primary-500)" : "var(--ink-100)",
              }}
            />
          ))}
        </div>
      )}
      {right}
    </div>
  );
}

// Phone shell wrapper to use inside artboards
function Phone({ children, bg = "var(--bg)" }) {
  return (
    <div
      style={{
        ...S.font,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: bg,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

// Title block
function ScreenTitle({ kicker, title, sub }) {
  return (
    <div
      style={{
        padding: "8px 20px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {kicker && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "var(--primary-600)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          {kicker}
        </div>
      )}
      <h1
        style={{
          fontSize: 26,
          fontWeight: 900,
          lineHeight: 1.15,
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>
      {sub && (
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-600)",
            margin: 0,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// Sticky CTA
function CTA({ children }) {
  return (
    <div
      style={{
        padding: "12px 20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: "auto",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 01 SPLASH
// ════════════════════════════════════════════════════════
function S01_Splash() {
  return (
    <Phone bg="linear-gradient(180deg, var(--primary-500) 0%, var(--primary-700) 100%)">
      <StatusBar dark />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          color: "#fff",
          position: "relative",
        }}
      >
        {/* sparkles bg */}
        {["10% 20%", "85% 15%", "15% 80%", "80% 75%", "45% 10%"].map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.split(" ")[0],
              top: p.split(" ")[1],
              width: 6,
              height: 6,
              background: "var(--amber-400)",
              borderRadius: "50%",
              boxShadow: "0 0 12px var(--amber-300)",
            }}
          />
        ))}
        <Mascot pose="wave" size={140} hue="#fff" />
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Logo height={56} white />
          <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>
            Apprends · Construis · Joue
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "0 0 36px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Loader />
      </div>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 02 WELCOME
// ════════════════════════════════════════════════════════
function S02_Welcome() {
  return (
    <Phone>
      <StatusBar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          textAlign: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "var(--primary-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 18,
              width: 10,
              height: 10,
              background: "var(--amber-500)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 24,
              right: 14,
              width: 14,
              height: 14,
              background: "var(--success-500)",
              borderRadius: "50%",
            }}
          />
          <Mascot pose="cheer" size={150} />
        </div>
        <div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 900,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Bienvenue chez
            <br />
            <span style={{ color: "var(--primary-500)" }}>Steamy</span>
            <span style={{ color: "var(--amber-500)" }}>.</span>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-600)",
              fontWeight: 600,
              margin: "12px 0 0",
              lineHeight: 1.5,
            }}
          >
            La plateforme robotique & STEM pour devenir le créateur de demain.
            🚀
          </p>
        </div>
      </div>
      <CTA>
        <Button block size="lg">
          Créer un compte
        </Button>
        <Button block variant="outline">
          J'ai déjà un compte
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 03 TYPE UTILISATEUR
// ════════════════════════════════════════════════════════
function UserTypeCard({ emoji, title, sub, color, selected }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 22,
        background: selected ? color : "#fff",
        border: "2px solid",
        borderColor: selected ? color : "var(--ink-100)",
        boxShadow: selected ? `0 6px 0 ${color}` : "0 4px 0 var(--ink-100)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        cursor: "pointer",
        color: selected ? "#fff" : "var(--ink-900)",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: selected ? "rgba(255,255,255,.2)" : color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
        }}
      >
        {emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            opacity: selected ? 0.9 : 0.7,
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      </div>
      <Icon
        name="chevron-right"
        size={24}
        color={selected ? "#fff" : "var(--ink-400)"}
        strokeWidth={2.5}
      />
    </div>
  );
}

function S03_UserType() {
  return (
    <Phone>
      <StatusBar />
      <TopBar />
      <ScreenTitle
        title="Tu es… ?"
        sub="Choisis ton profil pour qu'on adapte Steamy à toi."
      />
      <div
        style={{ ...S.pad, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <UserTypeCard
          emoji="🚀"
          title="Un·e apprenant·e"
          sub="J'ai entre 10 et 17 ans et je veux apprendre."
          color="var(--primary-500)"
          selected
        />
        <UserTypeCard
          emoji="👨‍👩‍👧"
          title="Un parent"
          sub="Je veux inscrire mon enfant ou suivre ses progrès."
          color="var(--cat-ia)"
        />
      </div>
      <CTA>
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Continuer
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 04 INSCRIPTION (tel + nom + politique)
// ════════════════════════════════════════════════════════
function Checkbox({ checked, label, link }) {
  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          background: checked ? "var(--primary-500)" : "#fff",
          border: "2px solid",
          borderColor: checked ? "var(--primary-500)" : "var(--ink-300)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {checked && (
          <Icon name="check" size={14} color="#fff" strokeWidth={3} />
        )}
      </div>
      <span
        style={{
          fontSize: 13,
          color: "var(--ink-700)",
          fontWeight: 600,
          lineHeight: 1.45,
        }}
      >
        {label}{" "}
        <a
          href="#"
          style={{
            color: "var(--primary-600)",
            fontWeight: 800,
            textDecoration: "underline",
          }}
        >
          {link}
        </a>
      </span>
    </label>
  );
}

function S04_Signup() {
  return (
    <Phone>
      <StatusBar />
      <TopBar />
      <ScreenTitle
        kicker="Étape 1/4"
        title="Crée ton compte"
        sub="On a juste besoin de quelques infos pour commencer."
      />
      <div
        style={{
          ...S.pad,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flex: 1,
          overflow: "auto",
        }}
      >
        <Field label="Prénom" required>
          <Input value="Léa" />
        </Field>
        <Field label="Nom" required>
          <Input value="Adjovi" />
        </Field>
        <Field label="Numéro de téléphone" required>
          <PhoneInput value="01 90 12 34 56" />
        </Field>
        <div style={{ marginTop: 4 }}>
          <Checkbox
            checked
            label="J'accepte la"
            link="politique de confidentialité."
          />
        </div>
      </div>
      <CTA>
        <Button block size="lg">
          Recevoir mon code
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 05 ÂGE
// ════════════════════════════════════════════════════════
function S05_Age() {
  return (
    <Phone>
      <StatusBar />
      <TopBar />
      <ScreenTitle
        kicker="Étape 1/4"
        title="Quel âge as-tu ?"
        sub="Pour les moins de 16 ans, on demandera l'accord de tes parents."
      />
      <div
        style={{
          ...S.pad,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "#fff",
              border: "2px solid var(--ink-200)",
              boxShadow: "0 4px 0 var(--ink-200)",
              cursor: "pointer",
              fontSize: 28,
              fontWeight: 900,
              color: "var(--ink-900)",
            }}
          >
            −
          </button>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 28,
              background: "#fff",
              border: "3px solid var(--primary-500)",
              boxShadow: "0 6px 0 var(--primary-300)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 80,
                  fontWeight: 900,
                  color: "var(--primary-600)",
                  lineHeight: 1,
                }}
              >
                13
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--ink-500)",
                }}
              >
                ans
              </div>
            </div>
          </div>
          <button
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "var(--primary-500)",
              border: 0,
              boxShadow: "0 4px 0 var(--primary-700)",
              cursor: "pointer",
              fontSize: 28,
              fontWeight: 900,
              color: "#fff",
            }}
          >
            +
          </button>
        </div>
        <div
          style={{
            background: "var(--amber-100)",
            padding: 14,
            borderRadius: 16,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            maxWidth: 300,
          }}
        >
          <span style={{ fontSize: 22 }}>👨‍👩‍👧</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--amber-700)",
              lineHeight: 1.45,
            }}
          >
            Tu as moins de 16 ans : on va demander l'accord d'un parent à
            l'étape suivante.
          </span>
        </div>
      </div>
      <CTA>
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Continuer
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 06 NUMÉRO PARENT
// ════════════════════════════════════════════════════════
function S06_ParentNumber() {
  return (
    <Phone>
      <StatusBar />
      <TopBar />
      <ScreenTitle
        kicker="Étape 2/4"
        title="Numéro d'un parent"
        sub="On va lui envoyer un message pour qu'il accepte ton inscription."
      />
      <div
        style={{ ...S.pad, display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div
          style={{
            background: "var(--primary-50)",
            padding: 18,
            borderRadius: 20,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <Mascot pose="idle" size={56} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "var(--primary-700)",
              }}
            >
              Pas de panique !
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-700)",
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              Ton parent recevra juste un SMS pour valider ton inscription. Ça
              prend 1 min.
            </div>
          </div>
        </div>
        <Field
          label="Numéro de téléphone du parent"
          required
          hint="Maman, papa, tutrice, oncle… une personne adulte qui s'occupe de toi."
        >
          <PhoneInput value="" />
        </Field>
        <Field label="Lien de parenté">
          <div className="input">
            <select
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                flex: 1,
                font: "700 16px var(--font-sans)",
                color: "var(--ink-900)",
              }}
            >
              <option>Mère</option>
              <option>Père</option>
              <option>Tuteur·rice</option>
              <option>Autre</option>
            </select>
          </div>
        </Field>
      </div>
      <CTA>
        <Button block size="lg">
          Envoyer la demande
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 07 ATTENTE CONSENTEMENT
// ════════════════════════════════════════════════════════
function S07_WaitingConsent() {
  return (
    <Phone>
      <StatusBar />
      <TopBar />
      <div
        style={{
          ...S.pad,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "var(--primary-50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Mascot pose="sleep" size={150} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
            On attend l'accord
            <br />
            de ton parent…
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-600)",
              fontWeight: 600,
              marginTop: 10,
              lineHeight: 1.5,
              padding: "0 12px",
            }}
          >
            On a envoyé un SMS au{" "}
            <strong style={{ color: "var(--ink-900)" }}>
              +229 01 90 88 77 66
            </strong>
            . Tu recevras un message dès qu'il/elle aura répondu.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            background: "#fff",
            borderRadius: 999,
            border: "2px solid var(--ink-100)",
          }}
        >
          <Loader />
          <span
            style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-700)" }}
          >
            En attente
          </span>
        </div>
      </div>
      <CTA>
        <Button block variant="ghost">
          Renvoyer la demande
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 08 ACCORD PARENT REÇU
// ════════════════════════════════════════════════════════
function S08_ConsentGranted() {
  return (
    <Phone>
      <StatusBar />
      <div
        style={{
          ...S.pad,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 22,
          position: "relative",
        }}
      >
        {/* Confetti */}
        {[
          { x: "10%", y: "15%", c: "var(--amber-500)" },
          { x: "85%", y: "20%", c: "var(--success-500)" },
          { x: "15%", y: "75%", c: "var(--cat-code)" },
          { x: "80%", y: "70%", c: "var(--cat-electronique)" },
          { x: "50%", y: "8%", c: "var(--primary-500)" },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: 12,
              height: 12,
              background: p.c,
              borderRadius: 3,
              transform: `rotate(${i * 30}deg)`,
            }}
          />
        ))}
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
          <Mascot pose="cheer" size={170} hue="var(--success-500)" />
        </div>
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              margin: 0,
              color: "var(--success-700)",
            }}
          >
            Super, c'est validé !
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-700)",
              fontWeight: 600,
              marginTop: 12,
              lineHeight: 1.5,
              padding: "0 8px",
            }}
          >
            <strong style={{ color: "var(--ink-900)" }}>Marie</strong> a accepté
            ton inscription. Tu peux poursuivre ton aventure Steamy. 🎉
          </p>
        </div>
      </div>
      <CTA>
        <Button
          block
          size="lg"
          variant="secondary"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Continuer
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 09 OTP
// ════════════════════════════════════════════════════════
function S09_OTP() {
  return (
    <Phone>
      <StatusBar />
      <TopBar />
      <ScreenTitle
        kicker="Étape 2/4"
        title="Vérifie ton numéro"
        sub="On t'a envoyé un code à 6 chiffres au +229 01 90 12 34 56."
      />
      <div
        style={{
          ...S.pad,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <OTPInput value="3214" activeIndex={4} />
        <div style={{ fontSize: 13, color: "var(--ink-500)", fontWeight: 700 }}>
          Renvoyer le code dans{" "}
          <strong style={{ color: "var(--primary-600)" }}>00:42</strong>
        </div>
        <button
          style={{
            background: "transparent",
            border: 0,
            color: "var(--primary-600)",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Modifier le numéro
        </button>
      </div>
      <CTA>
        <Button block size="lg">
          Vérifier
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 10 MOT DE PASSE
// ════════════════════════════════════════════════════════
function PwReq({ ok, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        fontWeight: 700,
        color: ok ? "var(--success-600)" : "var(--ink-500)",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: ok ? "var(--success-500)" : "var(--ink-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {ok && <Icon name="check" size={10} color="#fff" strokeWidth={3.5} />}
      </span>
      {label}
    </div>
  );
}

function S10_Password() {
  return (
    <Phone>
      <StatusBar />
      <TopBar />
      <ScreenTitle
        kicker="Étape 3/4"
        title="Crée ton mot de passe"
        sub="Choisis un mot de passe que tu vas retenir, mais que personne ne peut deviner."
      />
      <div
        style={{ ...S.pad, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Field label="Mot de passe" required>
          <PasswordInput value="superrobot42" />
        </Field>
        <Field label="Confirme ton mot de passe" required>
          <PasswordInput value="superrobot42" />
        </Field>
        <div
          style={{
            background: "var(--bg)",
            padding: 14,
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            border: "2px solid var(--ink-100)",
          }}
        >
          <PwReq ok label="Au moins 8 caractères" />
          <PwReq ok label="Une lettre majuscule ou un chiffre" />
          <PwReq label="Pas trop évident (pas ton prénom !)" />
        </div>
      </div>
      <CTA>
        <Button block size="lg">
          Valider mon mot de passe
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 11 PROFIL · ÉTAPE 1
// ════════════════════════════════════════════════════════
function S11_Profile1() {
  return (
    <Phone>
      <StatusBar />
      <TopBar step={1} total={4} />
      <ScreenTitle
        kicker="Profil 1/4"
        title="Parle-nous de toi"
        sub="Pour te proposer des parcours adaptés."
      />
      <div
        style={{
          ...S.pad,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flex: 1,
          overflow: "auto",
        }}
      >
        <Field label="Date de naissance" required>
          <Input value="14 / 03 / 2012" />
        </Field>
        <Field label="Pays de résidence" required>
          <div className="input">
            <span style={{ fontSize: 18 }}>🇧🇯</span>
            <select
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                flex: 1,
                font: "700 16px var(--font-sans)",
                color: "var(--ink-900)",
              }}
            >
              <option>Bénin</option>
              <option>Togo</option>
              <option>Côte d'Ivoire</option>
              <option>Burkina Faso</option>
            </select>
          </div>
        </Field>
        <Field label="Localité (ville / quartier)" required>
          <Input value="Cotonou · Cocotomey" />
        </Field>
        <Field label="Email" hint="Optionnel - pour la facture et les news.">
          <Input
            value=""
            placeholder="lea.adjovi@exemple.bj"
            icon={<Icon name="mail" size={18} color="var(--ink-500)" />}
          />
        </Field>
      </div>
      <CTA>
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Suivant
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 12 PROFIL · ÉTAPE 2
// ════════════════════════════════════════════════════════
function ChoiceCard({ emoji, label, selected }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 16,
        background: selected ? "var(--primary-500)" : "#fff",
        border: "2px solid",
        borderColor: selected ? "var(--primary-500)" : "var(--ink-200)",
        boxShadow: selected
          ? "0 4px 0 var(--primary-700)"
          : "0 4px 0 var(--ink-200)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        color: selected ? "#fff" : "var(--ink-900)",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 28 }}>{emoji}</span>
      {label}
    </div>
  );
}

function S12_Profile2() {
  return (
    <Phone>
      <StatusBar />
      <TopBar step={2} total={4} />
      <ScreenTitle kicker="Profil 2/4" title="Ton école, ton genre" />
      <div
        style={{
          ...S.pad,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          flex: 1,
          overflow: "auto",
        }}
      >
        <Field label="Niveau d'études / classe" required>
          <div className="input">
            <select
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                flex: 1,
                font: "700 16px var(--font-sans)",
                color: "var(--ink-900)",
              }}
            >
              <option>5ème</option>
              <option>6ème</option>
              <option>4ème</option>
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
            Genre <span style={{ color: "var(--error-500)" }}>*</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <ChoiceCard emoji="👧" label="Fille" selected />
            <ChoiceCard emoji="👦" label="Garçon" />
            <ChoiceCard emoji="🌟" label="Autre" />
          </div>
        </div>
        <Field
          label="Situation de handicap"
          hint="On adapte les parcours en fonction si besoin."
        >
          <div className="input">
            <select
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                flex: 1,
                font: "700 16px var(--font-sans)",
                color: "var(--ink-900)",
              }}
            >
              <option>Aucune</option>
              <option>Visuel</option>
              <option>Auditif</option>
              <option>Moteur</option>
              <option>Autre</option>
            </select>
          </div>
        </Field>
      </div>
      <CTA>
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Suivant
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 13 PROFIL · OBJECTIFS
// ════════════════════════════════════════════════════════
function GoalChip({ children, selected }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 999,
        background: selected ? "var(--primary-500)" : "#fff",
        color: selected ? "#fff" : "var(--ink-800)",
        border: "2px solid",
        borderColor: selected ? "var(--primary-500)" : "var(--ink-200)",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </div>
  );
}

function S13_Goals() {
  return (
    <Phone>
      <StatusBar />
      <TopBar step={3} total={4} />
      <ScreenTitle
        kicker="Profil 3/4"
        title="Tes objectifs"
        sub="Choisis ce qui t'intéresse - tu pourras changer plus tard."
      />
      <div style={{ ...S.pad, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[
          ["🤖", "Construire des robots", true],
          ["💻", "Apprendre à coder", true],
          ["🧠", "Découvrir l'IA", false],
          ["⚡", "Comprendre l'électronique", true],
          ["🎮", "Créer un jeu", false],
          ["🚀", "Concourir aux challenges", false],
          ["🛠", "Bricoler chez moi", false],
          ["📡", "Domotique", false],
          ["🪐", "Aller plus loin que l'école", true],
        ].map(([e, l, s], i) => (
          <GoalChip key={i} selected={s}>
            {e} {l}
          </GoalChip>
        ))}
      </div>
      <CTA>
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Suivant
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 14 AVATAR
// ════════════════════════════════════════════════════════
const AVATARS = [
  ["🦊", "var(--cat-mecanique)"],
  ["🐼", "var(--cat-ia)"],
  ["🐸", "var(--success-500)"],
  ["🐯", "var(--amber-500)"],
  ["🐙", "var(--cat-code)"],
  ["🦉", "var(--primary-500)"],
  ["🐲", "var(--error-500)"],
  ["🐝", "var(--cat-energie)"],
  ["🦄", "var(--cat-electronique)"],
];

function S14_Avatar() {
  return (
    <Phone>
      <StatusBar />
      <TopBar step={4} total={4} />
      <ScreenTitle
        kicker="Profil 4/4"
        title="Choisis ton avatar"
        sub="C'est ta tête sur Steamy - tu pourras le changer."
      />
      <div
        style={{
          ...S.pad,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          flex: 1,
        }}
      >
        {AVATARS.map(([e, c], i) => (
          <div
            key={i}
            style={{
              aspectRatio: 1,
              borderRadius: 22,
              background: c,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              position: "relative",
              boxShadow:
                i === 5 ? "0 0 0 4px #fff, 0 0 0 8px var(--amber-500)" : "none",
              cursor: "pointer",
            }}
          >
            {e}
            {i === 5 && (
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: "var(--amber-500)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="check" size={14} color="#fff" strokeWidth={3.5} />
              </div>
            )}
          </div>
        ))}
      </div>
      <CTA>
        <Button block size="lg" variant="secondary">
          Terminer mon profil 🚀
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 15 BIENVENUE FINAL
// ════════════════════════════════════════════════════════
function S15_Welcome() {
  return (
    <Phone bg="linear-gradient(180deg, var(--primary-50) 0%, var(--bg) 50%)">
      <StatusBar />
      <div
        style={{
          ...S.pad,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 18,
        }}
      >
        <Avatar emoji="🦉" size={120} color="var(--primary-500)" ring />
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Bienvenue,
            <br />
            <span style={{ color: "var(--primary-500)" }}>Léa</span> !{" "}
            <span style={{ color: "var(--amber-500)" }}>🎉</span>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-600)",
              fontWeight: 600,
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            Ton compte est prêt. Tu peux maintenant explorer les parcours et
            commencer ton aventure.
          </p>
        </div>
        <div
          style={{
            background: "#fff",
            padding: 16,
            borderRadius: 18,
            border: "2px solid var(--ink-100)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            maxWidth: 280,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "var(--amber-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            🎁
          </div>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div
              style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-900)" }}
            >
              Cadeau de bienvenue
            </div>
            <div
              style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-600)" }}
            >
              1 parcours gratuit débloqué !
            </div>
          </div>
        </div>
      </div>
      <CTA>
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Découvrir le catalogue
        </Button>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// 16 CONNEXION (compte existant)
// ════════════════════════════════════════════════════════
function S16_Login() {
  return (
    <Phone>
      <StatusBar />
      <TopBar />
      <div
        style={{
          padding: "8px 20px 28px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Mascot pose="wave" size={120} />
      </div>
      <ScreenTitle
        title="Bon retour !"
        sub="Connecte-toi pour reprendre tes parcours."
      />
      <div
        style={{ ...S.pad, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Field label="Numéro de téléphone" required>
          <PhoneInput value="01 90 12 34 56" />
        </Field>
        <Field label="Mot de passe" required>
          <PasswordInput value="superrobot42" />
        </Field>
        <button
          style={{
            alignSelf: "flex-end",
            background: "transparent",
            border: 0,
            color: "var(--primary-600)",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Mot de passe oublié ?
        </button>
      </div>
      <CTA>
        <Button block size="lg">
          Se connecter
        </Button>
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ink-600)",
          }}
        >
          Pas de compte ?{" "}
          <a
            href="#"
            style={{
              color: "var(--primary-600)",
              fontWeight: 900,
              textDecoration: "underline",
            }}
          >
            Inscris-toi
          </a>
        </div>
      </CTA>
    </Phone>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
const PHONE_W = 360,
  PHONE_H = 760;
const phoneStyle = {
  borderRadius: 34,
  border: "6px solid var(--ink-900)",
  background: "#fff",
};

function AuthFlow() {
  return (
    <DesignCanvas>
      <DCSection
        id="entry"
        title="Entrée"
        subtitle="Splash, accueil, choix du type d'utilisateur."
      >
        <DCArtboard
          id="01"
          label="01 · Splash"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S01_Splash />
        </DCArtboard>
        <DCArtboard
          id="02"
          label="02 · Accueil"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S02_Welcome />
        </DCArtboard>
        <DCArtboard
          id="03"
          label="03 · Type d'utilisateur"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S03_UserType />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="signup"
        title="Inscription · branche apprenant"
        subtitle="Tel + nom · âge · si <16 ans, accord parent."
      >
        <DCArtboard
          id="04"
          label="04 · Téléphone & nom"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S04_Signup />
        </DCArtboard>
        <DCArtboard
          id="05"
          label="05 · Âge"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S05_Age />
        </DCArtboard>
        <DCArtboard
          id="06"
          label="06 · Numéro parent (<16)"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S06_ParentNumber />
        </DCArtboard>
        <DCArtboard
          id="07"
          label="07 · Attente consentement"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S07_WaitingConsent />
        </DCArtboard>
        <DCArtboard
          id="08"
          label="08 · Accord reçu"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S08_ConsentGranted />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="verify"
        title="Vérification & sécurité"
        subtitle="OTP, mot de passe."
      >
        <DCArtboard
          id="09"
          label="09 · OTP"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S09_OTP />
        </DCArtboard>
        <DCArtboard
          id="10"
          label="10 · Mot de passe"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S10_Password />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="profile"
        title="Onboarding profil apprenant"
        subtitle="4 étapes : infos, école, objectifs, avatar."
      >
        <DCArtboard
          id="11"
          label="11 · Profil 1 - Infos"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S11_Profile1 />
        </DCArtboard>
        <DCArtboard
          id="12"
          label="12 · Profil 2 - École"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S12_Profile2 />
        </DCArtboard>
        <DCArtboard
          id="13"
          label="13 · Objectifs"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S13_Goals />
        </DCArtboard>
        <DCArtboard
          id="14"
          label="14 · Avatar"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S14_Avatar />
        </DCArtboard>
      </DCSection>

      <DCSection id="end" title="Arrivée & connexion existant">
        <DCArtboard
          id="15"
          label="15 · Bienvenue"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S15_Welcome />
        </DCArtboard>
        <DCArtboard
          id="16"
          label="16 · Connexion existant"
          width={PHONE_W}
          height={PHONE_H}
          style={phoneStyle}
        >
          <S16_Login />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.AuthFlow = AuthFlow;
window.UserTypeCard = UserTypeCard;
window.Checkbox = Checkbox;
window.PwReq = PwReq;
window.ChoiceCard = ChoiceCard;
window.GoalChip = GoalChip;

// ════════════════════════════════════════════════════════
// APP : toggle Mobile / Web
// ════════════════════════════════════════════════════════
function ViewToggle({ value, onChange }) {
  const opts = [
    { id: "mobile", label: "Mobile", icon: "📱" },
    { id: "web", label: "Web", icon: "🖥" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        background: "var(--ink-900)",
        borderRadius: 999,
        padding: 4,
        display: "flex",
        gap: 2,
        boxShadow: "0 8px 24px rgba(27,17,71,.25)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            padding: "8px 18px",
            borderRadius: 999,
            border: 0,
            cursor: "pointer",
            background: value === o.id ? "var(--primary-500)" : "transparent",
            color: value === o.id ? "#fff" : "rgba(255,255,255,.6)",
            fontWeight: 800,
            fontSize: 13,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 120ms",
          }}
        >
          <span>{o.icon}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function App() {
  const [view, setView] = React.useState(
    () => localStorage.getItem("steamy-auth-view") || "web",
  );
  React.useEffect(() => {
    localStorage.setItem("steamy-auth-view", view);
  }, [view]);
  return (
    <>
      <ViewToggle value={view} onChange={setView} />
      {view === "mobile" ? <AuthFlow /> : <window.AuthFlowWeb />}
    </>
  );
}

if (!window.STEAMY_NO_AUTOMOUNT) {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}
