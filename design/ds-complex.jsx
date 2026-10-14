// ds-complex.jsx - Composants complexes Steamy
// Card parcours, badges niveau/projet, progression, mission, quiz,
// bottom nav, modal, notification.

const dsComplex_styles = `
/* ═══════════════════════════════════════════════════════════════
   CARD PARCOURS
═══════════════════════════════════════════════════════════════ */
.course-card {
  width: 100%;
  background: #fff;
  border-radius: 22px;
  border: 2px solid var(--ink-100);
  overflow: hidden;
  cursor: pointer;
  transition: transform .18s var(--ease-out), box-shadow .18s, border-color .15s;
  display: flex;
  flex-direction: column;
}
.course-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--primary-200);
}
.course-card__media {
  aspect-ratio: 16 / 10;
  background: var(--cat-robotique);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.course-card__media::after {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(255,255,255,.18), transparent 60%);
}
.course-card__pattern {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(255,255,255,.18) 0 20px, transparent 21px),
    radial-gradient(circle at 75% 30%, rgba(255,255,255,.12) 0 14px, transparent 15px);
}
.course-card__media-emoji {
  font-size: 56px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,.18));
  z-index: 1;
}
.course-card__heart {
  position: absolute;
  top: 12px; right: 12px;
  width: 36px; height: 36px;
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  display: flex; align-items: center; justify-content: center;
  border: 0; cursor: pointer;
  z-index: 2;
  color: var(--ink-700);
}
.course-card__heart.is-active { color: var(--error-500); }
.course-card__price {
  position: absolute;
  bottom: 12px; left: 12px;
  background: rgba(15, 13, 38, .82);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  backdrop-filter: blur(8px);
  z-index: 1;
}
.course-card__price--free {
  background: var(--success-500);
}
.course-card__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.course-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.course-card__title {
  font-size: 17px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--ink-900);
  margin: 0;
  text-wrap: pretty;
}
.course-card__author {
  font-size: 13px;
  color: var(--ink-500);
  font-weight: 600;
  display: flex; align-items: center; gap: 6px;
}
.course-card__progress {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.course-card__progress .pct {
  font-size: 13px;
  font-weight: 800;
  color: var(--primary-600);
  min-width: 36px;
  text-align: right;
}

/* ═══════════════════════════════════════════════════════════════
   PROGRESS BAR
═══════════════════════════════════════════════════════════════ */
.progress {
  flex: 1;
  height: 10px;
  background: var(--ink-100);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}
.progress__bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
  border-radius: 999px;
  position: relative;
  transition: width .4s var(--ease-out);
}
.progress__bar::after {
  content: '';
  position: absolute;
  inset: 1px 1px auto 1px;
  height: 3px;
  background: rgba(255,255,255,.4);
  border-radius: 999px;
}
.progress--success .progress__bar { background: linear-gradient(90deg, var(--success-400), var(--success-500)); }
.progress--amber .progress__bar { background: linear-gradient(90deg, var(--amber-400), var(--amber-500)); }
.progress--lg { height: 16px; }

/* progress en étapes (steppé pour leçons) */
.progress-steps { display: flex; gap: 4px; }
.progress-steps .step {
  flex: 1; height: 8px; border-radius: 999px;
  background: var(--ink-100);
}
.progress-steps .step.done { background: var(--success-500); }
.progress-steps .step.current { background: var(--primary-500); }

/* ═══════════════════════════════════════════════════════════════
   BADGE NUMÉRIQUE (trophy-style)
═══════════════════════════════════════════════════════════════ */
.medal {
  width: 96px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.medal__ribbon {
  position: absolute; top: -4px;
  width: 38px; height: 50px;
  background: var(--error-500);
  clip-path: polygon(0 0, 100% 0, 100% 90%, 50% 70%, 0 90%);
  z-index: 0;
}
.medal__disc {
  width: 88px; height: 88px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 25%, var(--amber-300), var(--amber-500) 60%, var(--amber-600));
  border: 4px solid var(--amber-600);
  display: flex; align-items: center; justify-content: center;
  z-index: 1;
  position: relative;
  box-shadow: inset 0 -6px 0 rgba(0,0,0,.12), 0 6px 0 var(--amber-700);
}
.medal__disc--silver {
  background: radial-gradient(circle at 30% 25%, #F1F1F8, #C8C3DB 60%, #8E89A5);
  border-color: #8E89A5;
  box-shadow: inset 0 -6px 0 rgba(0,0,0,.12), 0 6px 0 #6F6A88;
}
.medal__disc--locked {
  background: var(--ink-100);
  border-color: var(--ink-300);
  box-shadow: inset 0 -6px 0 rgba(0,0,0,.04), 0 4px 0 var(--ink-200);
}
.medal__icon { font-size: 36px; z-index: 1; filter: drop-shadow(0 2px 0 rgba(0,0,0,.12)); }
.medal__number {
  position: absolute; top: 6px; left: 50%;
  transform: translateX(-50%);
  background: var(--ink-900); color: #fff;
  font-weight: 900; font-size: 11px;
  padding: 2px 6px; border-radius: 999px;
  z-index: 2;
}
.medal__label {
  margin-top: 12px;
  font-weight: 800;
  font-size: 13px;
  color: var(--ink-700);
  text-align: center;
}

/* ═══════════════════════════════════════════════════════════════
   MISSION ITEM (path / leçon)
═══════════════════════════════════════════════════════════════ */
.mission {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #fff;
  border: 2px solid var(--ink-100);
  border-radius: 18px;
  transition: border-color .15s, transform .12s;
  cursor: pointer;
}
.mission:hover { border-color: var(--primary-200); transform: translateX(2px); }
.mission__icon {
  width: 56px; height: 56px;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: var(--primary-100);
  color: var(--primary-600);
  font-size: 26px;
  position: relative;
}
.mission--done .mission__icon { background: var(--success-500); color: #fff; box-shadow: 0 4px 0 var(--success-700); }
.mission--current .mission__icon { background: var(--primary-500); color: #fff; box-shadow: 0 4px 0 var(--primary-700); animation: pulse 1.6s var(--ease-out) infinite; }
.mission--locked { opacity: .65; cursor: not-allowed; }
.mission--locked .mission__icon { background: var(--ink-100); color: var(--ink-400); box-shadow: none; }
@keyframes pulse {
  0%,100% { box-shadow: 0 4px 0 var(--primary-700), 0 0 0 0 rgba(91,63,224,.4); }
  50% { box-shadow: 0 4px 0 var(--primary-700), 0 0 0 8px rgba(91,63,224,0); }
}
.mission__body { flex: 1; min-width: 0; }
.mission__step {
  font-size: 12px;
  font-weight: 800;
  color: var(--ink-500);
  letter-spacing: .04em;
  text-transform: uppercase;
}
.mission__title { font-size: 15px; font-weight: 800; color: var(--ink-900); margin-top: 2px; }
.mission__meta { font-size: 13px; color: var(--ink-500); font-weight: 600; margin-top: 4px; display: flex; gap: 10px; align-items: center; }

/* ═══════════════════════════════════════════════════════════════
   QUIZ
═══════════════════════════════════════════════════════════════ */
.quiz {
  background: #fff;
  border-radius: 24px;
  padding: 24px;
  border: 2px solid var(--ink-100);
}
.quiz__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.quiz__count { font-weight: 800; color: var(--ink-500); font-size: 14px; }
.quiz__question {
  font-size: 20px;
  font-weight: 800;
  color: var(--ink-900);
  line-height: 1.35;
  margin: 12px 0 20px;
  text-wrap: pretty;
}
.quiz__choices {
  display: grid;
  gap: 12px;
}
.quiz-choice {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 58px;
  padding: 14px 18px;
  border-radius: 18px;
  border: 2px solid var(--ink-200);
  background: #fff;
  cursor: pointer;
  font-weight: 700;
  font-size: 15px;
  color: var(--ink-900);
  text-align: left;
  transition: all .15s;
  position: relative;
  box-shadow: 0 3px 0 var(--ink-200);
}
.quiz-choice:hover { border-color: var(--primary-300); }
.quiz-choice__letter {
  width: 32px; height: 32px;
  border-radius: 10px;
  background: var(--ink-100);
  color: var(--ink-700);
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 14px;
  flex-shrink: 0;
}
.quiz-choice.is-selected {
  border-color: var(--primary-500);
  background: var(--primary-50);
  box-shadow: 0 3px 0 var(--primary-300);
}
.quiz-choice.is-selected .quiz-choice__letter { background: var(--primary-500); color: #fff; }
.quiz-choice.is-correct {
  border-color: var(--success-500);
  background: var(--success-50);
  box-shadow: 0 3px 0 var(--success-300);
}
.quiz-choice.is-correct .quiz-choice__letter { background: var(--success-500); color: #fff; }
.quiz-choice.is-wrong {
  border-color: var(--error-500);
  background: var(--error-50);
  box-shadow: 0 3px 0 var(--error-300);
}
.quiz-choice.is-wrong .quiz-choice__letter { background: var(--error-500); color: #fff; }
.quiz-choice__text {
  flex: 1;
  min-width: 0;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.quiz-choice__icon {
  flex-shrink: 0;
  width: 24px; height: 24px;
  border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
}
.quiz-choice.is-correct .quiz-choice__icon { background: var(--success-500); }
.quiz-choice.is-wrong .quiz-choice__icon { background: var(--error-500); }

.quiz-feedback {
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
}
.quiz-feedback--ok { background: var(--success-50); color: var(--success-700); }
.quiz-feedback--ko { background: var(--error-50); color: var(--error-700); }

/* ═══════════════════════════════════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════════════════════════════════ */
.bottom-nav {
  display: flex;
  background: #fff;
  border-top: 1px solid var(--ink-100);
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  width: 100%;
}
.bottom-nav__item {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px;
  background: transparent; border: 0; cursor: pointer;
  color: var(--ink-500);
  font-weight: 700;
  font-size: 11px;
  position: relative;
}
.bottom-nav__item.is-active { color: var(--primary-600); }
.bottom-nav__item.is-active::before {
  content: '';
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 28px; height: 4px; border-radius: 999px;
  background: var(--primary-500);
}
.bottom-nav__icon {
  width: 36px; height: 36px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: transparent;
}
.bottom-nav__item.is-active .bottom-nav__icon { background: var(--primary-100); }
.bottom-nav__badge {
  position: absolute; top: 4px; right: 50%; margin-right: -22px;
  background: var(--error-500); color: #fff;
  font-size: 10px; font-weight: 900;
  padding: 1px 5px; border-radius: 999px;
  border: 2px solid #fff;
  min-width: 16px; text-align: center;
}

/* ═══════════════════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════════════════ */
.modal-backdrop {
  position: absolute; inset: 0;
  background: rgba(15, 13, 38, .55);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.modal {
  background: #fff;
  border-radius: 24px;
  padding: 28px 24px 24px;
  box-shadow: var(--shadow-modal);
  max-width: 320px;
  width: 100%;
  text-align: center;
  position: relative;
}
.modal__icon {
  width: 72px; height: 72px;
  border-radius: 999px;
  background: var(--primary-100);
  color: var(--primary-600);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
  font-size: 36px;
}
.modal--danger .modal__icon { background: var(--error-100); color: var(--error-600); }
.modal__title { font-size: 22px; font-weight: 900; color: var(--ink-900); margin: 0 0 6px; text-wrap: pretty; }
.modal__body { font-size: 14px; color: var(--ink-600); margin-bottom: 20px; line-height: 1.5; font-weight: 600; }
.modal__actions { display: flex; gap: 10px; }
.modal__actions .btn { flex: 1; }

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION
═══════════════════════════════════════════════════════════════ */
.notif {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: #fff;
  border: 2px solid var(--ink-100);
  position: relative;
}
.notif--unread { border-color: var(--primary-200); background: var(--primary-50); }
.notif--unread::before {
  content: '';
  position: absolute; top: 16px; right: 14px;
  width: 8px; height: 8px;
  background: var(--primary-500);
  border-radius: 999px;
}
.notif__icon {
  width: 44px; height: 44px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-size: 22px;
  background: var(--amber-100);
  color: var(--amber-700);
}
.notif__icon--success { background: var(--success-100); color: var(--success-700); }
.notif__icon--info { background: #DCEEFE; color: #0369A1; }
.notif__icon--primary { background: var(--primary-100); color: var(--primary-700); }
.notif__body { flex: 1; min-width: 0; }
.notif__title { font-weight: 800; font-size: 14px; color: var(--ink-900); margin: 0; line-height: 1.35; }
.notif__msg { font-size: 13px; color: var(--ink-600); margin-top: 3px; font-weight: 600; line-height: 1.45; }
.notif__time { font-size: 12px; color: var(--ink-400); font-weight: 700; margin-top: 6px; }
`;

if (!document.getElementById("ds-complex-styles")) {
  const s = document.createElement("style");
  s.id = "ds-complex-styles";
  s.textContent = dsComplex_styles;
  document.head.appendChild(s);
}

// ─── Card parcours ────────────────────────────────────────────────
function CourseCard({
  title,
  author,
  level,
  price,
  progress,
  color = "#5B3FE0",
  emoji = "🤖",
  favorited,
  onFav,
  free,
}) {
  return (
    <div className="course-card">
      <div className="course-card__media" style={{ background: color }}>
        <div className="course-card__pattern" />
        <div className="course-card__media-emoji">{emoji}</div>
        <button
          className={["course-card__heart", favorited && "is-active"]
            .filter(Boolean)
            .join(" ")}
          onClick={(e) => {
            e.stopPropagation();
            onFav?.();
          }}
        >
          <Icon
            name="heart"
            size={18}
            strokeWidth={2.5}
            color={favorited ? "currentColor" : "currentColor"}
          />
        </button>
        <div
          className={["course-card__price", free && "course-card__price--free"]
            .filter(Boolean)
            .join(" ")}
        >
          {free ? "Gratuit" : price}
        </div>
      </div>
      <div className="course-card__body">
        <div className="course-card__meta">
          {level && <Badge tone="primary">{level}</Badge>}
        </div>
        <h3 className="course-card__title">{title}</h3>
        {author && <div className="course-card__author">Par {author}</div>}
        {progress != null && (
          <div className="course-card__progress">
            <div className="progress">
              <div
                className="progress__bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="pct">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────
function ProgressBar({ value = 0, tone, size, label }) {
  const cls = ["progress"];
  if (tone === "success") cls.push("progress--success");
  if (tone === "amber") cls.push("progress--amber");
  if (size === "lg") cls.push("progress--lg");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
      }}
    >
      {label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            fontWeight: 800,
            color: "var(--ink-700)",
          }}
        >
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      )}
      <div className={cls.join(" ")}>
        <div className="progress__bar" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ProgressSteps({ total = 5, current = 2 }) {
  return (
    <div className="progress-steps">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={["step", i < current && "done", i === current && "current"]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Médaille / Badge numérique ───────────────────────────────────
function Medal({ icon = "🏆", label, number, tone = "gold", size = 96 }) {
  const cls = ["medal__disc"];
  if (tone === "silver") cls.push("medal__disc--silver");
  if (tone === "locked") cls.push("medal__disc--locked");
  return (
    <div className="medal" style={{ width: size }}>
      <div
        className={cls.join(" ")}
        style={{ width: size * 0.92, height: size * 0.92 }}
      >
        <span className="medal__icon" style={{ fontSize: size * 0.4 }}>
          {tone === "locked" ? "🔒" : icon}
        </span>
      </div>
      {number != null && <div className="medal__number">N° {number}</div>}
      {label && <div className="medal__label">{label}</div>}
    </div>
  );
}

// ─── Mission item ─────────────────────────────────────────────────
function MissionItem({ step, title, duration, state = "todo", icon = "🤖" }) {
  const cls = ["mission"];
  if (state === "done") cls.push("mission--done");
  if (state === "current") cls.push("mission--current");
  if (state === "locked") cls.push("mission--locked");
  return (
    <div className={cls.join(" ")}>
      <div className="mission__icon">
        {state === "locked" ? "🔒" : state === "done" ? "✓" : icon}
      </div>
      <div className="mission__body">
        <div className="mission__step">{step}</div>
        <div className="mission__title">{title}</div>
        <div className="mission__meta">
          <span>⏱ {duration}</span>
          {state === "done" && (
            <span style={{ color: "var(--success-600)" }}>· Terminée</span>
          )}
          {state === "current" && (
            <span style={{ color: "var(--primary-600)" }}>· En cours</span>
          )}
        </div>
      </div>
      <Icon name="chevron-right" size={20} color="var(--ink-400)" />
    </div>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────
function Quiz({
  index = 1,
  total = 10,
  question,
  choices = [],
  selected,
  correct,
  showFeedback,
}) {
  return (
    <div className="quiz">
      <div className="quiz__header">
        <span className="quiz__count">
          Question {index}/{total}
        </span>
        <Badge tone="amber" icon={<span>⏱</span>}>
          00:42
        </Badge>
      </div>
      <ProgressBar value={(index / total) * 100} tone="amber" />
      <h3 className="quiz__question">{question}</h3>
      <div className="quiz__choices">
        {choices.map((c, i) => {
          const letter = String.fromCharCode(65 + i);
          const cls = ["quiz-choice"];
          if (showFeedback) {
            if (i === correct) cls.push("is-correct");
            else if (i === selected) cls.push("is-wrong");
          } else if (i === selected) cls.push("is-selected");
          return (
            <div key={i} className={cls.join(" ")}>
              <div className="quiz-choice__letter">{letter}</div>
              <span className="quiz-choice__text">{c}</span>
              <span className="quiz-choice__icon">
                {showFeedback && i === correct && (
                  <Icon name="check" size={15} color="#fff" strokeWidth={3} />
                )}
                {showFeedback && i === selected && i !== correct && (
                  <Icon name="x" size={15} color="#fff" strokeWidth={3} />
                )}
              </span>
            </div>
          );
        })}
      </div>
      {showFeedback && (
        <div
          className={[
            "quiz-feedback",
            selected === correct ? "quiz-feedback--ok" : "quiz-feedback--ko",
          ].join(" ")}
        >
          {selected === correct ? (
            <>🎉 Bravo, c'est bien ça !</>
          ) : (
            <>💪 Pas grave, on retente !</>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────
function BottomNav({ active = "home" }) {
  const items = [
    { id: "home", icon: "home", label: "Accueil" },
    { id: "catalog", icon: "compass", label: "Catalogue" },
    { id: "wishlist", icon: "heart", label: "Souhaits", badge: 2 },
    { id: "badges", icon: "trophy", label: "Badges" },
    { id: "profile", icon: "user", label: "Profil" },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <button
          key={i.id}
          className={["bottom-nav__item", active === i.id && "is-active"]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="bottom-nav__icon">
            <Icon
              name={i.icon}
              size={22}
              strokeWidth={active === i.id ? 2.5 : 2}
            />
          </span>
          {i.label}
          {i.badge && <span className="bottom-nav__badge">{i.badge}</span>}
        </button>
      ))}
    </nav>
  );
}

// ─── Modal ────────────────────────────────────────────────────────
function Modal({
  icon = "🎉",
  title,
  body,
  primaryLabel = "OK",
  secondaryLabel,
  onPrimary,
  onSecondary,
  danger,
}) {
  return (
    <div className="modal-backdrop">
      <div
        className={["modal", danger && "modal--danger"]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="modal__icon">{icon}</div>
        <h3 className="modal__title">{title}</h3>
        <p className="modal__body">{body}</p>
        <div className="modal__actions">
          {secondaryLabel && (
            <Button variant="outline" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
          <Button variant={danger ? "danger" : "primary"} onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Notification item ────────────────────────────────────────────
function NotifItem({ icon = "🏆", tone = "amber", title, msg, time, unread }) {
  return (
    <div
      className={["notif", unread && "notif--unread"].filter(Boolean).join(" ")}
    >
      <div className={["notif__icon", `notif__icon--${tone}`].join(" ")}>
        {icon}
      </div>
      <div className="notif__body">
        <h4 className="notif__title">{title}</h4>
        <p className="notif__msg">{msg}</p>
        <div className="notif__time">{time}</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  CourseCard,
  ProgressBar,
  ProgressSteps,
  Medal,
  MissionItem,
  Quiz,
  BottomNav,
  Modal,
  NotifItem,
});
