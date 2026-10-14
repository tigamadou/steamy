// screens-auth-web.jsx - versions desktop web first des 16 écrans d'auth.
// Layout principal : split-screen (panneau brand gauche + form droite),
// quelques exceptions pour splash/welcome/avatar.

const WEB_W = 1240,
  WEB_H = 760;

// ════════════════════════════════════════════════════════
// SHELL : split brand/form
// ════════════════════════════════════════════════════════
function WebShell({
  kicker,
  title,
  sub,
  step,
  total,
  children,
  cta,
  brand,
  accent = "var(--primary-500)",
  accent2 = "var(--primary-700)",
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        fontFamily: "var(--font-sans)",
        color: "var(--ink-900)",
        background: "#fff",
      }}
    >
      {/* Brand panel */}
      <div
        style={{
          width: 480,
          position: "relative",
          background: `linear-gradient(160deg, ${accent} 0%, ${accent2} 100%)`,
          color: "#fff",
          padding: 48,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        {/* deco bg */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255,255,255,.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -40,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
          }}
        />
        {[
          { x: "15%", y: "20%", s: 8, c: "var(--amber-400)" },
          { x: "78%", y: "18%", s: 6, c: "#fff" },
          { x: "85%", y: "78%", s: 10, c: "var(--amber-400)" },
          { x: "12%", y: "85%", s: 6, c: "#fff" },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.s,
              height: p.s,
              borderRadius: "50%",
              background: p.c,
              boxShadow: `0 0 20px ${p.c}`,
            }}
          />
        ))}
        {/* logo */}
        <div style={{ position: "relative" }}>
          <Logo height={32} white />
        </div>
        {/* central illustration */}
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {brand}
        </div>
        {/* footer */}
        <div
          style={{
            position: "relative",
            fontSize: 12,
            fontWeight: 700,
            opacity: 0.7,
          }}
        >
          La plateforme robotique & STEM des jeunes d'Afrique francophone.
        </div>
      </div>

      {/* Form panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* topbar */}
        <div
          style={{
            height: 64,
            padding: "0 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--ink-100)",
          }}
        >
          {step != null ? (
            <div style={{ display: "flex", gap: 8, flex: 1, maxWidth: 280 }}>
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background:
                      i < step ? "var(--primary-500)" : "var(--ink-100)",
                  }}
                />
              ))}
            </div>
          ) : (
            <div />
          )}
          <div
            style={{ fontSize: 13, color: "var(--ink-500)", fontWeight: 700 }}
          >
            Besoin d'aide ?{" "}
            <a
              href="#"
              style={{ color: "var(--primary-600)", fontWeight: 800 }}
            >
              Nous contacter
            </a>
          </div>
        </div>
        {/* content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            padding: "48px 48px 24px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            <div>
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
                  fontSize: 36,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  margin: "8px 0 0",
                  letterSpacing: "-0.02em",
                }}
              >
                {title}
              </h1>
              {sub && (
                <p
                  style={{
                    fontSize: 16,
                    color: "var(--ink-600)",
                    margin: "12px 0 0",
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {sub}
                </p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {children}
            </div>
            {cta && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {cta}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// W01 SPLASH (full-bleed)
// ════════════════════════════════════════════════════════
function W01_Splash() {
  return (
    <div
      style={{
        height: "100%",
        background:
          "linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {[
        { x: "8%", y: "15%", s: 12, c: "var(--amber-400)" },
        { x: "85%", y: "20%", s: 8, c: "#fff" },
        { x: "20%", y: "78%", s: 10, c: "var(--amber-400)" },
        { x: "78%", y: "75%", s: 14, c: "#fff" },
        { x: "50%", y: "90%", s: 8, c: "var(--amber-400)" },
        { x: "90%", y: "50%", s: 10, c: "#fff" },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.s,
            height: p.s,
            borderRadius: "50%",
            background: p.c,
            boxShadow: `0 0 20px ${p.c}`,
          }}
        />
      ))}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          color: "#fff",
        }}
      >
        <Mascot pose="wave" size={200} hue="#fff" />
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <Logo height={100} white />
          <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.85 }}>
            Apprends · Construis · Joue
          </div>
        </div>
        <Loader />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// W02 WELCOME (split)
// ════════════════════════════════════════════════════════
function W02_Welcome() {
  return (
    <WebShell
      kicker="Bienvenue"
      title={
        <>
          Apprends à{" "}
          <span style={{ color: "var(--primary-500)" }}>construire</span>
          <br />
          les robots de demain.
        </>
      }
      sub="Steamy, c'est des parcours STEM ludiques, des kits, des challenges - pour les 10–17 ans."
      brand={
        <>
          <Mascot pose="cheer" size={260} hue="#fff" />
          <div
            style={{
              background: "rgba(255,255,255,.15)",
              backdropFilter: "blur(6px)",
              padding: "12px 18px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--success-400)",
              }}
            />
            Plus de 12 000 jeunes inscrits
          </div>
        </>
      }
      cta={
        <>
          <Button block size="lg">
            Créer un compte gratuit
          </Button>
          <Button block variant="outline">
            J'ai déjà un compte
          </Button>
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--ink-500)",
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            En continuant, tu acceptes nos{" "}
            <a href="#" style={{ color: "var(--primary-600)" }}>
              conditions
            </a>{" "}
            et notre{" "}
            <a href="#" style={{ color: "var(--primary-600)" }}>
              politique de confidentialité
            </a>
            .
          </div>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          ["🤖", "Parcours guidés", "Robotique, IA, code"],
          ["📦", "Kits physiques", "Livrés chez toi"],
          ["🏆", "Challenges", "Concours mensuels"],
          ["👨‍👩‍👧", "Suivi parent", "En toute sécurité"],
        ].map(([e, t, s], i) => (
          <div
            key={i}
            style={{
              padding: 14,
              borderRadius: 16,
              background: "var(--bg)",
              border: "2px solid var(--ink-100)",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{e}</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{t}</div>
            <div
              style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 600 }}
            >
              {s}
            </div>
          </div>
        ))}
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W03 USER TYPE
// ════════════════════════════════════════════════════════
function W03_UserType() {
  return (
    <WebShell
      kicker="Étape 1"
      title="Tu es… ?"
      sub="Choisis ton profil pour qu'on adapte Steamy à toi."
      brand={<Mascot pose="idle" size={240} hue="#fff" />}
      cta={
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Continuer
        </Button>
      }
    >
      <UserTypeCard
        emoji="🚀"
        title="Un·e apprenant·e"
        sub="J'ai entre 10 et 17 ans et je veux apprendre la robotique, le code, l'IA…"
        color="var(--primary-500)"
        selected
      />
      <UserTypeCard
        emoji="👨‍👩‍👧"
        title="Un parent"
        sub="Je veux inscrire mon enfant ou suivre ses progrès et achats."
        color="var(--cat-ia)"
      />
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W04 SIGNUP
// ════════════════════════════════════════════════════════
function W04_Signup() {
  return (
    <WebShell
      kicker="Étape 1/4 · Créer un compte"
      title="Crée ton compte"
      sub="On a juste besoin de quelques infos pour commencer."
      brand={
        <>
          <Mascot pose="wave" size={220} hue="#fff" />
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            Bienvenue !<br />
            On t'attendait. 🚀
          </div>
        </>
      }
      cta={
        <>
          <Button
            block
            size="lg"
            iconRight={
              <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
            }
          >
            Continuer
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
              Connecte-toi
            </a>
          </div>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Prénom" required>
          <Input value="Léa" />
        </Field>
        <Field label="Nom" required>
          <Input value="Adjovi" />
        </Field>
      </div>
      <Field
        label="Identifiant"
        required
        hint="C'est ce que tu utiliseras pour te connecter."
      >
        <Input value="lea.adjovi" />
      </Field>
      <div style={{ marginTop: 4 }}>
        <Checkbox
          checked
          label="J'accepte la"
          link="politique de confidentialité."
        />
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W05 ÂGE
// ════════════════════════════════════════════════════════
function W05_Age() {
  return (
    <WebShell
      kicker="Étape 1/4"
      title="Quel âge as-tu ?"
      sub="On adapte tes parcours à ton âge. Un parent validera toujours ton inscription."
      brand={
        <>
          <Mascot pose="focus" size={200} hue="#fff" />
          <div
            style={{
              background: "rgba(255,255,255,.12)",
              padding: 18,
              borderRadius: 18,
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.5,
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            Ton parent ou tuteur recevra un message pour valider ton inscription
            et suivre tes progrès.
          </div>
        </>
      }
      cta={
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Continuer
        </Button>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          justifyContent: "center",
          padding: "20px 0",
        }}
      >
        <button
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "#fff",
            border: "2px solid var(--ink-200)",
            boxShadow: "0 4px 0 var(--ink-200)",
            cursor: "pointer",
            fontSize: 32,
            fontWeight: 900,
          }}
        >
          −
        </button>
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 32,
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
                fontSize: 100,
                fontWeight: 900,
                color: "var(--primary-600)",
                lineHeight: 1,
              }}
            >
              13
            </div>
            <div
              style={{ fontSize: 14, fontWeight: 800, color: "var(--ink-500)" }}
            >
              ans
            </div>
          </div>
        </div>
        <button
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "var(--primary-500)",
            border: 0,
            boxShadow: "0 4px 0 var(--primary-700)",
            cursor: "pointer",
            fontSize: 32,
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
          padding: 16,
          borderRadius: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: 22 }}>👨‍👩‍👧</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--amber-700)",
            lineHeight: 1.5,
          }}
        >
          On va demander l'accord d'un parent à l'étape suivante : c'est lui qui
          gère ton compte et tes achats.
        </span>
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W06 NUMÉRO PARENT
// ════════════════════════════════════════════════════════
function W06_ParentNumber() {
  return (
    <WebShell
      kicker="Étape 2/4 · Consentement parental"
      title="Numéro d'un parent"
      sub="On va lui envoyer un message pour qu'il accepte ton inscription. Ça prend 1 min."
      accent="var(--cat-ia)"
      accent2="#7B23DA"
      brand={
        <>
          <Mascot pose="idle" size={200} hue="#fff" />
          <div
            style={{
              background: "rgba(255,255,255,.15)",
              padding: 24,
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.5,
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <strong>On protège tes infos.</strong>
            <br />
            Tes données ne servent qu'à valider ton inscription, jamais à du
            marketing.
          </div>
        </>
      }
      cta={
        <Button block size="lg">
          Envoyer la demande au parent
        </Button>
      }
    >
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
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W07 ATTENTE CONSENTEMENT (centered)
// ════════════════════════════════════════════════════════
function W07_WaitingConsent() {
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
          background: "#fff",
          borderRadius: 28,
          padding: "56px 48px",
          maxWidth: 540,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 8px 0 var(--ink-100)",
          border: "2px solid var(--ink-100)",
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "var(--primary-50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Mascot pose="sleep" size={160} />
        </div>
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              margin: 0,
              color: "var(--ink-900)",
            }}
          >
            On attend l'accord
            <br />
            de ton parent…
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-600)",
              fontWeight: 600,
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            On a envoyé un SMS au{" "}
            <strong style={{ color: "var(--ink-900)" }}>
              +229 01 90 88 77 66
            </strong>
            .<br />
            Tu recevras un message dès qu'il/elle aura répondu.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            background: "var(--bg)",
            borderRadius: 999,
            border: "2px solid var(--ink-100)",
          }}
        >
          <Loader />
          <span
            style={{ fontSize: 14, fontWeight: 800, color: "var(--ink-700)" }}
          >
            En attente…
          </span>
        </div>
        <Button variant="ghost">Renvoyer la demande</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// W08 ACCORD REÇU
// ════════════════════════════════════════════════════════
function W08_ConsentGranted() {
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
      {[
        { x: "8%", y: "12%", c: "var(--amber-500)" },
        { x: "90%", y: "15%", c: "var(--success-500)" },
        { x: "15%", y: "85%", c: "var(--cat-code)" },
        { x: "88%", y: "82%", c: "var(--cat-electronique)" },
        { x: "50%", y: "8%", c: "var(--primary-500)" },
        { x: "30%", y: "88%", c: "var(--amber-500)" },
        { x: "70%", y: "10%", c: "var(--cat-ia)" },
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
            transform: `rotate(${i * 30}deg)`,
          }}
        />
      ))}
      <div
        style={{
          background: "#fff",
          borderRadius: 28,
          padding: "56px 48px",
          maxWidth: 580,
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
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "var(--success-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Mascot pose="cheer" size={190} hue="var(--success-500)" />
        </div>
        <div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              margin: 0,
              color: "var(--success-700)",
              letterSpacing: "-0.02em",
            }}
          >
            Super, c'est validé !
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--ink-700)",
              fontWeight: 600,
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--ink-900)" }}>Marie</strong> a accepté
            ton inscription.
            <br />
            Tu peux poursuivre ton aventure Steamy. 🎉
          </p>
        </div>
        <Button
          size="lg"
          variant="secondary"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// W09 OTP
// ════════════════════════════════════════════════════════
function W09_OTP() {
  return (
    <WebShell
      kicker="Étape 2/4"
      title="Vérifie ton numéro"
      sub="On t'a envoyé un code à 6 chiffres au +229 01 90 12 34 56."
      brand={
        <>
          <Mascot pose="focus" size={200} hue="#fff" />
          <div style={{ fontSize: 56, fontWeight: 900 }}>🔐</div>
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
            On vérifie que c'est bien toi avant de t'envoyer dans l'aventure.
          </div>
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
        <OTPInput value="3214" activeIndex={4} />
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
// W10 MOT DE PASSE
// ════════════════════════════════════════════════════════
function W10_Password() {
  return (
    <WebShell
      kicker="Étape 3/4"
      title="Crée ton mot de passe"
      sub="Choisis un mot de passe que tu vas retenir, mais que personne ne peut deviner."
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
              💡 Un bon mot de passe
            </div>
            • Au moins 8 caractères
            <br />
            • Mélange lettres, chiffres
            <br />
            • Pas ton prénom ni ta date de naissance
            <br />• Différent de tes autres comptes
          </div>
        </>
      }
      cta={
        <Button block size="lg">
          Valider mon mot de passe
        </Button>
      }
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
          padding: 16,
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
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W11 PROFIL · INFOS
// ════════════════════════════════════════════════════════
function W11_Profile1() {
  return (
    <WebShell
      kicker="Profil 1/4"
      step={1}
      total={4}
      title="Parle-nous de toi"
      sub="Pour te proposer des parcours adaptés à ton âge et ton niveau."
      brand={
        <>
          <Mascot pose="wave" size={220} hue="#fff" />
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              textAlign: "center",
              maxWidth: 280,
              lineHeight: 1.4,
            }}
          >
            Plus tu nous en dis sur toi, plus on peut t'envoyer des parcours qui
            te plairont !
          </div>
        </>
      }
      cta={
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Suivant
        </Button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
      </div>
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
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W12 PROFIL · ÉCOLE
// ════════════════════════════════════════════════════════
function W12_Profile2() {
  return (
    <WebShell
      kicker="Profil 2/4"
      step={2}
      total={4}
      title="Ton école, ton genre"
      sub="On adaptera la difficulté et le ton."
      brand={<Mascot pose="focus" size={220} hue="#fff" />}
      cta={
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Suivant
        </Button>
      }
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
        <div style={{ display: "flex", gap: 12 }}>
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
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W13 OBJECTIFS
// ════════════════════════════════════════════════════════
function W13_Goals() {
  return (
    <WebShell
      kicker="Profil 3/4"
      step={3}
      total={4}
      title="Tes objectifs"
      sub="Choisis ce qui t'intéresse - tu pourras changer plus tard. Sélectionne au moins 2 objectifs."
      brand={
        <>
          <Mascot pose="cheer" size={220} hue="#fff" />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              maxWidth: 320,
            }}
          >
            {["🤖", "💻", "🧠", "⚡", "🎮", "🚀"].map((e, i) => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "rgba(255,255,255,.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                {e}
              </div>
            ))}
          </div>
        </>
      }
      cta={
        <Button
          block
          size="lg"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Suivant · 4 sélectionnés
        </Button>
      }
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
          ["🎨", "Créativité numérique", false],
        ].map(([e, l, s], i) => (
          <GoalChip key={i} selected={s}>
            {e} {l}
          </GoalChip>
        ))}
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W14 AVATAR (centered grid)
// ════════════════════════════════════════════════════════
function W14_Avatar() {
  return (
    <div
      style={{
        height: "100%",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          height: 64,
          padding: "0 48px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--ink-100)",
        }}
      >
        <div style={{ display: "flex", gap: 8, flex: 1, maxWidth: 280 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                background: i <= 4 ? "var(--primary-500)" : "var(--ink-100)",
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          padding: "32px 48px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 600 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "var(--primary-600)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Profil 4/4
          </div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              margin: "8px 0 0",
              letterSpacing: "-0.02em",
            }}
          >
            Choisis ton avatar
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--ink-600)",
              fontWeight: 600,
              marginTop: 12,
            }}
          >
            C'est ta tête sur Steamy - tu pourras le changer plus tard.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 16,
            maxWidth: 720,
          }}
        >
          {[
            ["🦊", "var(--cat-mecanique)"],
            ["🐼", "var(--cat-ia)"],
            ["🐸", "var(--success-500)"],
            ["🐯", "var(--amber-500)"],
            ["🐙", "var(--cat-code)"],
            ["🦉", "var(--primary-500)"],
            ["🐲", "var(--error-500)"],
            ["🐝", "var(--cat-energie)"],
            ["🦄", "var(--cat-electronique)"],
            ["🐢", "var(--primary-700)"],
          ].map(([e, c], i) => (
            <div
              key={i}
              style={{
                width: 120,
                height: 120,
                borderRadius: 24,
                background: c,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
                position: "relative",
                boxShadow:
                  i === 5
                    ? "0 0 0 4px var(--bg), 0 0 0 8px var(--amber-500)"
                    : "0 4px 0 rgba(0,0,0,.15)",
                cursor: "pointer",
              }}
            >
              {e}
              {i === 5 && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: "var(--amber-500)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,.2)",
                  }}
                >
                  <Icon name="check" size={16} color="#fff" strokeWidth={3.5} />
                </div>
              )}
            </div>
          ))}
        </div>
        <Button size="lg" variant="secondary">
          Terminer mon profil 🚀
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// W15 BIENVENUE (full-bleed celebration)
// ════════════════════════════════════════════════════════
function W15_Welcome() {
  return (
    <div
      style={{
        height: "100%",
        background:
          "linear-gradient(180deg, var(--primary-50) 0%, var(--bg) 60%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-sans)",
      }}
    >
      {[
        { x: "8%", y: "15%", c: "var(--amber-500)" },
        { x: "88%", y: "12%", c: "var(--success-500)" },
        { x: "12%", y: "78%", c: "var(--cat-code)" },
        { x: "85%", y: "82%", c: "var(--cat-electronique)" },
        { x: "50%", y: "6%", c: "var(--primary-500)" },
        { x: "92%", y: "50%", c: "var(--cat-ia)" },
        { x: "5%", y: "50%", c: "var(--amber-500)" },
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
            transform: `rotate(${i * 30}deg)`,
          }}
        />
      ))}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 64,
          maxWidth: 960,
        }}
      >
        <Avatar emoji="🦉" size={200} color="var(--primary-500)" ring />
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Bienvenue,
            <br />
            <span style={{ color: "var(--primary-500)" }}>Léa</span> !{" "}
            <span style={{ color: "var(--amber-500)" }}>🎉</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "var(--ink-700)",
              fontWeight: 600,
              marginTop: 16,
              lineHeight: 1.5,
              maxWidth: 460,
            }}
          >
            Ton compte est prêt. Tu peux maintenant explorer les parcours et
            commencer ton aventure robotique.
          </p>
          <div
            style={{
              background: "#fff",
              padding: 18,
              borderRadius: 18,
              border: "2px solid var(--amber-300)",
              boxShadow: "0 4px 0 var(--amber-200)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 24,
              maxWidth: 380,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "var(--amber-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              🎁
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "var(--ink-900)",
                }}
              >
                Cadeau de bienvenue
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                }}
              >
                1 parcours gratuit débloqué !
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
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
              Découvrir le catalogue
            </Button>
            <Button size="lg" variant="outline">
              Aller sur mon dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// W16 CONNEXION
// ════════════════════════════════════════════════════════
function W16_Login() {
  return (
    <WebShell
      title={
        <>
          Bon retour, on
          <br />
          t'avait gardé une place !
        </>
      }
      sub="Connecte-toi pour reprendre tes parcours."
      brand={
        <>
          <Mascot pose="wave" size={240} hue="#fff" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,.15)",
              padding: "12px 18px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <span>👀</span> Tu as 3 missions en attente.
          </div>
        </>
      }
      cta={
        <>
          <Button block size="lg">
            Se connecter
          </Button>
          <div
            style={{
              textAlign: "center",
              fontSize: 14,
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
        </>
      }
    >
      <Field label="Identifiant" required>
        <Input value="lea.adjovi" />
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
          fontSize: 14,
          cursor: "pointer",
          padding: 0,
        }}
      >
        Mot de passe oublié ?
      </button>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W17 OTP INVALIDE (état d'erreur)
// ════════════════════════════════════════════════════════
function W17_OTPError() {
  return (
    <WebShell
      kicker="Étape 2/4"
      title="Code incorrect"
      sub="Le code saisi ne correspond pas. Vérifie le SMS et réessaie."
      brand={
        <>
          <Mascot pose="sad" size={200} hue="#fff" />
          <div style={{ fontSize: 56, fontWeight: 900 }}>🔐</div>
        </>
      }
      cta={
        <Button block size="lg">
          Réessayer
        </Button>
      }
    >
      <div
        style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}
      >
        <OTPInput value="321987" activeIndex={6} error />
      </div>
      <div className="field__error" style={{ justifyContent: "center" }}>
        <Icon name="x" size={14} color="var(--error-500)" strokeWidth={3} />{" "}
        Code incorrect - il te reste 2 essais.
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
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
          Renvoyer le code
        </button>
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// W18 REFUS DE CONSENTEMENT (enfant - terminal)
// ════════════════════════════════════════════════════════
function W18_ConsentRefused() {
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
          background: "#fff",
          borderRadius: 28,
          padding: "56px 48px",
          maxWidth: 560,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 8px 0 var(--ink-100)",
          border: "2px solid var(--ink-100)",
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "var(--error-50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Mascot pose="sad" size={160} />
        </div>
        <div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 900,
              margin: 0,
              color: "var(--ink-900)",
            }}
          >
            Inscription non validée
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-600)",
              fontWeight: 600,
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--ink-900)" }}>Marie</strong> n'a pas
            accepté ton inscription pour le moment.
            <br />
            Tu peux en discuter avec elle, puis réessayer plus tard.
          </p>
        </div>
        <div
          style={{
            background: "var(--bg)",
            borderRadius: 14,
            padding: 14,
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ink-600)",
            maxWidth: 420,
          }}
        >
          Motif indiqué : « On en reparle à la maison d'abord. »
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="outline">Changer de parent</Button>
          <Button>Réessayer plus tard</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// W19 NUMÉRO DÉJÀ UTILISÉ (erreur inscription)
// ════════════════════════════════════════════════════════
function W19_SignupError() {
  return (
    <WebShell
      kicker="Étape 1/4 · Créer un compte"
      title="Cet identifiant est déjà pris"
      sub="Il semble que cet identifiant soit déjà utilisé. Connecte-toi, ou choisis-en un autre."
      brand={
        <>
          <Mascot pose="focus" size={220} hue="#fff" />
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            On se connaît
            <br />
            déjà ? 🤔
          </div>
        </>
      }
      cta={
        <>
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
            Mauvais identifiant ?{" "}
            <a
              href="#"
              style={{ color: "var(--primary-600)", fontWeight: 900 }}
            >
              Réessayer l'inscription
            </a>
          </div>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Prénom" required>
          <Input value="Léa" />
        </Field>
        <Field label="Nom" required>
          <Input value="Adjovi" />
        </Field>
      </div>
      <Field
        label="Identifiant"
        required
        error="Cet identifiant est déjà associé à un compte Steamy."
      >
        <Input value="lea.adjovi" error />
      </Field>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS WEB
// ════════════════════════════════════════════════════════
const webStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};

function AuthFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="entry-w"
        title="Entrée · Web"
        subtitle="Splash, accueil, choix du type d'utilisateur."
      >
        <DCArtboard
          id="W01"
          label="01 · Splash"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W01_Splash />
        </DCArtboard>
        <DCArtboard
          id="W02"
          label="02 · Accueil"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W02_Welcome />
        </DCArtboard>
        <DCArtboard
          id="W03"
          label="03 · Type d'utilisateur"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W03_UserType />
        </DCArtboard>
      </DCSection>
      <DCSection
        id="signup-w"
        title="Inscription · branche apprenant"
        subtitle="Identité + identifiant · âge · numéro du parent (obligatoire) · consentement."
      >
        <DCArtboard
          id="W04"
          label="04 · Identité & identifiant"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W04_Signup />
        </DCArtboard>
        <DCArtboard
          id="W05"
          label="05 · Âge"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W05_Age />
        </DCArtboard>
        <DCArtboard
          id="W06"
          label="06 · Numéro du parent"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W06_ParentNumber />
        </DCArtboard>
        <DCArtboard
          id="W07"
          label="07 · Attente consentement"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W07_WaitingConsent />
        </DCArtboard>
        <DCArtboard
          id="W08"
          label="08 · Accord reçu"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W08_ConsentGranted />
        </DCArtboard>
      </DCSection>
      <DCSection
        id="verify-w"
        title="Sécurité du compte"
        subtitle="Création du mot de passe."
      >
        <DCArtboard
          id="W10"
          label="10 · Mot de passe"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W10_Password />
        </DCArtboard>
      </DCSection>
      <DCSection
        id="profile-w"
        title="Onboarding profil apprenant"
        subtitle="4 étapes : infos, école, objectifs, avatar."
      >
        <DCArtboard
          id="W11"
          label="11 · Profil 1 - Infos"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W11_Profile1 />
        </DCArtboard>
        <DCArtboard
          id="W12"
          label="12 · Profil 2 - École"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W12_Profile2 />
        </DCArtboard>
        <DCArtboard
          id="W13"
          label="13 · Objectifs"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W13_Goals />
        </DCArtboard>
        <DCArtboard
          id="W14"
          label="14 · Avatar"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W14_Avatar />
        </DCArtboard>
      </DCSection>
      <DCSection id="end-w" title="Arrivée & connexion existant">
        <DCArtboard
          id="W15"
          label="15 · Bienvenue"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W15_Welcome />
        </DCArtboard>
        <DCArtboard
          id="W16"
          label="16 · Connexion existant"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W16_Login />
        </DCArtboard>
      </DCSection>
      <DCSection
        id="states-w"
        title="États dérivés · auth"
        subtitle="Refus de consentement (terminal) · identifiant déjà utilisé."
      >
        <DCArtboard
          id="W18"
          label="18 · Consentement refusé"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W18_ConsentRefused />
        </DCArtboard>
        <DCArtboard
          id="W19"
          label="19 · Identifiant déjà utilisé"
          width={WEB_W}
          height={WEB_H}
          style={webStyle}
        >
          <W19_SignupError />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.AuthFlowWeb = AuthFlowWeb;
window.WebShell = WebShell;
