// screens-auth-parent-web.jsx - Auth & onboarding PARENT, version web (1240×760).
// 10 écrans (WP01–WP10) : inscription, OTP, mot de passe, branche invitation/
// consentement, onboarding 3 étapes, bienvenue.
// Track parent = mêmes couleurs primaires que l'auth apprenant (cohérence marque SDS).
// La distinction parent/apprenant passe par le copy & le contenu, pas la couleur.
// Registre : vouvoiement (adulte).
// Réutilise WebShell + helpers globaux (Checkbox, PwReq, ChoiceCard, GoalChip,
// UserTypeCard, PhoneInput, OTPInput, PasswordInput, Field, Input, Button,
// Mascot, Icon, Avatar, Badge). Ne s'auto-monte pas. Expose window.AuthParentFlowWeb.

const PARENT_W = 1240,
  PARENT_H = 760;
const PARENT_ACCENT = "var(--primary-500)"; // même primaire que l'auth apprenant
const PARENT_ACCENT2 = "var(--primary-700)";
const PARENT_SELECT = {
  border: 0,
  outline: 0,
  background: "transparent",
  flex: 1,
  font: "700 16px var(--font-sans)",
  color: "var(--ink-900)",
};

// Objectifs qu'un parent peut viser pour son enfant.
// ⟶ Point d'input produit (à affiner) : ces libellés reflètent la persona parent.
const PARENT_GOALS = [
  ["🎓", "Réussite scolaire", true],
  ["🤖", "Découvrir la robotique", true],
  ["💻", "Apprendre à coder", false],
  ["🧠", "S'initier à l'IA", false],
  ["🛠", "Une activité à la maison", true],
  ["🏆", "Participer à des concours", false],
  ["🤝", "Confiance en soi", false],
  ["🚀", "Préparer son orientation", false],
];

// Confetti déco (réutilisé sur les écrans de célébration parent).
function WPConfetti() {
  return (
    <>
      {[
        { x: "8%", y: "12%", c: "var(--amber-500)" },
        { x: "90%", y: "15%", c: "var(--success-500)" },
        { x: "15%", y: "85%", c: "var(--cat-code)" },
        { x: "88%", y: "82%", c: "var(--cat-electronique)" },
        { x: "50%", y: "8%", c: "var(--cat-ia)" },
        { x: "30%", y: "88%", c: "var(--amber-500)" },
        { x: "70%", y: "10%", c: "var(--primary-500)" },
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
    </>
  );
}

// ════════════════════════════════════════════════════════
// WP01 INSCRIPTION PARENT (tel + nom + politique)
// ════════════════════════════════════════════════════════
function WP01_Signup() {
  return (
    <WebShell
      kicker="Espace parent"
      title="Créez votre compte parent"
      sub="Quelques infos pour démarrer. Vous pourrez ensuite accompagner et suivre votre enfant."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
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
            Accompagnez ses premiers pas. 👨‍👩‍👧
          </div>
        </>
      }
      cta={
        <>
          <Button block size="lg">
            Recevoir mon code par SMS
          </Button>
          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink-600)",
            }}
          >
            Vous avez déjà un compte ?{" "}
            <a
              href="#"
              style={{ color: "var(--primary-600)", fontWeight: 900 }}
            >
              Connectez-vous
            </a>
          </div>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Prénom" required>
          <Input value="Marie" />
        </Field>
        <Field label="Nom" required>
          <Input value="Adjovi" />
        </Field>
      </div>
      <Field label="Numéro de téléphone" required>
        <PhoneInput value="01 90 88 77 66" />
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
// WP02 OTP
// ════════════════════════════════════════════════════════
function WP02_OTP() {
  return (
    <WebShell
      kicker="Vérification"
      title="Vérifiez votre numéro"
      sub="Nous avons envoyé un code à 6 chiffres au +229 01 90 88 77 66."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
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
            On vérifie que c'est bien vous avant de continuer.
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
// WP03 MOT DE PASSE
// ════════════════════════════════════════════════════════
function WP03_Password() {
  return (
    <WebShell
      kicker="Sécurité"
      title="Créez votre mot de passe"
      sub="Un mot de passe solide protège votre compte et celui de votre enfant."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
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
            • Mélangez lettres et chiffres
            <br />
            • Évitez les infos personnelles
            <br />• Différent de vos autres comptes
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
        <PasswordInput value="famille2024" />
      </Field>
      <Field label="Confirmez votre mot de passe" required>
        <PasswordInput value="famille2024" />
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
        <PwReq label="Pas trop évident" />
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WP04 BRANCHE INVITATION (Suite à invitation enfant ? / créer un compte)
// ════════════════════════════════════════════════════════
function WP04_Invite() {
  return (
    <WebShell
      kicker="Pourquoi êtes-vous ici ?"
      title="Avez-vous reçu une invitation ?"
      sub="Si votre enfant a commencé son inscription, vous avez reçu un SMS avec un lien. Sinon, créez votre espace dès maintenant."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
      brand={
        <>
          <Mascot pose="idle" size={220} hue="#fff" />
          <div
            style={{
              background: "rgba(255,255,255,.15)",
              padding: "12px 18px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>👀</span> Une demande de votre enfant est peut-être en
            attente.
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
      <UserTypeCard
        emoji="✉️"
        title="Oui, j'ai reçu une invitation"
        sub="Mon enfant a commencé son inscription et a besoin de mon accord."
        color="var(--primary-500)"
        selected
      />
      <UserTypeCard
        emoji="➕"
        title="Non, je crée mon espace"
        sub="Je veux inscrire mon enfant ou suivre ses progrès moi-même."
        color="var(--cat-ia)"
      />
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WP05 DEMANDE DE L'ENFANT (voir infos + accepter/refuser)
// ════════════════════════════════════════════════════════
function WP05_ChildRequest() {
  return (
    <WebShell
      kicker="Demande de consentement"
      title="Votre enfant a besoin de votre accord"
      sub="Vérifiez les informations qu'il/elle a renseignées, puis acceptez ou refusez l'inscription."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
      brand={
        <>
          <Mascot pose="focus" size={200} hue="#fff" />
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
            <strong>Vous gardez le contrôle.</strong>
            <br />
            Les données ne servent qu'au suivi pédagogique, jamais à du
            marketing.
          </div>
        </>
      }
      cta={
        <>
          <Button block size="lg" variant="secondary">
            Accepter la demande
          </Button>
          <Button block variant="ghost">
            Refuser
          </Button>
        </>
      }
    >
      {/* Carte enfant */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: 18,
          borderRadius: 18,
          background: "var(--bg)",
          border: "2px solid var(--ink-100)",
        }}
      >
        <Avatar emoji="🦉" size={56} color="var(--primary-500)" ring />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Léa Adjovi</div>
          <div
            style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-500)" }}
          >
            lea.adjovi · 13 ans
          </div>
        </div>
        <Badge tone="amber">En attente</Badge>
      </div>
      {/* Infos renseignées par l'enfant (étape SeeInfo du flow) */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: "var(--ink-700)",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom: 10,
          }}
        >
          Informations renseignées
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["Lien de parenté", "Vous êtes sa mère"],
            ["Niveau / classe", "4ème"],
            ["Localité", "Cotonou · Cocotomey"],
            ["Centres d'intérêt", "Robots, code, électronique"],
          ].map(([k, v], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "10px 14px",
                background: "#fff",
                border: "1px solid var(--ink-100)",
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 700, color: "var(--ink-500)" }}>
                {k}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: "var(--ink-900)",
                  textAlign: "right",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WP06 DEMANDE ACCEPTÉE (notif enfant → poursuivre)
// ════════════════════════════════════════════════════════
function WP06_Accepted() {
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
      <WPConfetti />
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
            Demande acceptée !
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
            <strong style={{ color: "var(--ink-900)" }}>Léa</strong> vient
            d'être prévenue : elle peut poursuivre son inscription.
            <br />
            Complétez votre profil pour suivre ses progrès.
          </p>
        </div>
        <Button
          size="lg"
          variant="secondary"
          iconRight={
            <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.5} />
          }
        >
          Compléter mon profil
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WP07 ONBOARDING 1/3 - Localisation & contact
// ════════════════════════════════════════════════════════
function WP07_Profile1() {
  return (
    <WebShell
      kicker="Profil parent 1/3"
      step={1}
      total={3}
      title="Où habitez-vous ?"
      sub="Pour la facturation, la livraison des kits et les événements près de chez vous."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
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
            Ces infos restent privées et servent à mieux vous accompagner.
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
      <Field label="Pays de résidence" required>
        <div className="input">
          <span style={{ fontSize: 18 }}>🇧🇯</span>
          <select style={PARENT_SELECT}>
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
      <Field
        label="Email"
        hint="Optionnel - pour les factures et le suivi."
      >
        <Input
          value="marie.adjovi@exemple.bj"
          icon={<Icon name="mail" size={18} color="var(--ink-500)" />}
        />
      </Field>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WP08 ONBOARDING 2/3 - À propos de vous
// ════════════════════════════════════════════════════════
function WP08_Profile2() {
  return (
    <WebShell
      kicker="Profil parent 2/3"
      step={2}
      total={3}
      title="Parlez-nous de vous"
      sub="Ces informations sont facultatives et nous aident à personnaliser votre expérience."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
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
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ink-700)",
            marginBottom: 8,
          }}
        >
          Genre
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <ChoiceCard emoji="👩" label="Femme" selected />
          <ChoiceCard emoji="👨" label="Homme" />
          <ChoiceCard emoji="🌟" label="Autre" />
        </div>
      </div>
      <Field
        label="Situation de handicap"
        hint="On adapte l'accompagnement si besoin."
      >
        <div className="input">
          <select style={PARENT_SELECT}>
            <option>Aucune</option>
            <option>Visuel</option>
            <option>Auditif</option>
            <option>Moteur</option>
            <option>Autre</option>
          </select>
        </div>
      </Field>
      <Field label="Profession" hint="Optionnel.">
        <Input value="" placeholder="Infirmière, commerçante, ingénieur…" />
      </Field>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WP09 ONBOARDING 3/3 - Enfants & objectifs
// ════════════════════════════════════════════════════════
function WP09_Profile3() {
  return (
    <WebShell
      kicker="Profil parent 3/3"
      step={3}
      total={3}
      title="Vos enfants & vos objectifs"
      sub="Pour adapter nos recommandations et le suivi. Choisissez au moins un objectif."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
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
            {["🎓", "🤖", "💻", "🛠", "🏆", "🚀"].map((e, i) => (
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
        <Button block size="lg" variant="secondary">
          Terminer mon profil 🚀
        </Button>
      }
    >
      <Field label="Nombre d'enfants à inscrire" required>
        <div className="input">
          <select style={PARENT_SELECT}>
            <option>1 enfant</option>
            <option>2 enfants</option>
            <option>3 enfants</option>
            <option>4 enfants ou plus</option>
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
          Vos objectifs pour votre enfant{" "}
          <span style={{ color: "var(--error-500)" }}>*</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {PARENT_GOALS.map(([e, l, s], i) => (
            <GoalChip key={i} selected={s}>
              {e} {l}
            </GoalChip>
          ))}
        </div>
      </div>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WP10 BIENVENUE PARENT (full-bleed célébration)
// ════════════════════════════════════════════════════════
function WP10_Welcome() {
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
      <WPConfetti />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 64,
          maxWidth: 960,
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "#fff",
            border: "3px solid var(--primary-500)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 0 var(--primary-200)",
          }}
        >
          <Mascot pose="cheer" size={170} hue="var(--primary-500)" />
        </div>
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
            <span style={{ color: "var(--primary-500)" }}>Marie</span> !{" "}
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
            Votre espace parent est prêt. Suivez la progression de Léa, validez
            ses demandes et gérez les paiements en toute sécurité.
          </p>
          <div
            style={{
              background: "#fff",
              padding: 18,
              borderRadius: 18,
              border: "2px solid var(--ink-100)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 24,
              maxWidth: 420,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "var(--primary-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              👧
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "var(--ink-900)",
                }}
              >
                1 enfant rattaché
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-600)",
                }}
              >
                Léa, 13 ans · inscription en cours
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
              Aller sur mon tableau de bord
            </Button>
            <Button size="lg" variant="outline">
              Ajouter un enfant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WP11 MOTIFS DE REFUS (parent refuse le consentement)
// ════════════════════════════════════════════════════════
function WP11_RefuseReason() {
  return (
    <WebShell
      kicker="Refus de la demande"
      title="Pourquoi refusez-vous ?"
      sub="Indiquez un motif - il sera transmis à votre enfant pour qu'il/elle comprenne."
      accent={PARENT_ACCENT}
      accent2={PARENT_ACCENT2}
      brand={
        <>
          <Mascot pose="focus" size={200} hue="#fff" />
          <div
            style={{
              background: "rgba(255,255,255,.15)",
              padding: 20,
              borderRadius: 18,
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.5,
              maxWidth: 320,
              textAlign: "center",
            }}
          >
            Le refus est définitif pour cette demande. Votre enfant pourra
            refaire une demande plus tard.
          </div>
        </>
      }
      cta={
        <>
          <Button block size="lg" variant="danger">
            Confirmer le refus
          </Button>
          <Button block variant="ghost">
            Annuler
          </Button>
        </>
      }
    >
      <Field label="Motif du refus" required>
        <div className="input">
          <select style={PARENT_SELECT}>
            <option>Mon enfant est trop jeune</option>
            <option>On en discute à la maison d'abord</option>
            <option>Je n'ai pas demandé cette inscription</option>
            <option>Autre raison</option>
          </select>
        </div>
      </Field>
      <Field label="Précisions (optionnel)">
        <textarea
          rows={3}
          placeholder="Un mot pour ton enfant…"
          style={{
            width: "100%",
            border: "2px solid var(--ink-200)",
            borderRadius: 14,
            padding: "12px 16px",
            font: "600 15px var(--font-sans)",
            color: "var(--ink-900)",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </Field>
    </WebShell>
  );
}

// ════════════════════════════════════════════════════════
// WP12 REFUS ENVOYÉ (terminal)
// ════════════════════════════════════════════════════════
function WP12_RefuseSent() {
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
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: "var(--ink-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
          }}
        >
          ✋
        </div>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
            Demande refusée
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
            Léa a été informée de votre décision. Aucune inscription n'a été
            créée.
          </p>
        </div>
        <Button variant="outline">Retour à l'accueil</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CANVAS
// ════════════════════════════════════════════════════════
const parentWebStyle = {
  borderRadius: 18,
  border: "1px solid var(--ink-200)",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(27,17,71,.08)",
  overflow: "hidden",
};

function AuthParentFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection
        id="parent-signup"
        title="Inscription parent"
        subtitle="Téléphone + nom · vérification OTP · mot de passe."
      >
        <DCArtboard
          id="WP01"
          label="WP01 · Créer un compte"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP01_Signup />
        </DCArtboard>
        <DCArtboard
          id="WP02"
          label="WP02 · OTP"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP02_OTP />
        </DCArtboard>
        <DCArtboard
          id="WP03"
          label="WP03 · Mot de passe"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP03_Password />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="parent-consent"
        title="Consentement · suite à invitation enfant"
        subtitle="Branche invitation · voir la demande de l'enfant · accepter."
      >
        <DCArtboard
          id="WP04"
          label="WP04 · Invitation ?"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP04_Invite />
        </DCArtboard>
        <DCArtboard
          id="WP05"
          label="WP05 · Demande de l'enfant"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP05_ChildRequest />
        </DCArtboard>
        <DCArtboard
          id="WP06"
          label="WP06 · Demande acceptée"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP06_Accepted />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="parent-onboarding"
        title="Onboarding parent"
        subtitle="3 étapes : localisation, profil, enfants & objectifs."
      >
        <DCArtboard
          id="WP07"
          label="WP07 · Profil 1 - Localisation"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP07_Profile1 />
        </DCArtboard>
        <DCArtboard
          id="WP08"
          label="WP08 · Profil 2 - À propos"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP08_Profile2 />
        </DCArtboard>
        <DCArtboard
          id="WP09"
          label="WP09 · Profil 3 - Enfants"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP09_Profile3 />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="parent-end"
        title="Arrivée parent"
        subtitle="Compte parent prêt → dashboard parent (P3 à venir)."
      >
        <DCArtboard
          id="WP10"
          label="WP10 · Bienvenue parent"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP10_Welcome />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="parent-refuse"
        title="États dérivés · refus de consentement"
        subtitle="Motifs de refus → notification de refus à l'enfant (terminal)."
      >
        <DCArtboard
          id="WP11"
          label="WP11 · Motifs de refus"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP11_RefuseReason />
        </DCArtboard>
        <DCArtboard
          id="WP12"
          label="WP12 · Refus envoyé"
          width={PARENT_W}
          height={PARENT_H}
          style={parentWebStyle}
        >
          <WP12_RefuseSent />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.AuthParentFlowWeb = AuthParentFlowWeb;
