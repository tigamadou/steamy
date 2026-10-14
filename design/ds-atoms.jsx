// ds-atoms.jsx - Composants atomiques Steamy
// Boutons (Duolingo-style "candy"), inputs, OTP, badges, tags, avatars,
// loaders, toasts.

const dsAtoms_styles = `
/* === Bouton "candy" - pression visible, ombre marquée bas === */
.btn {
  --btn-bg: var(--primary-500);
  --btn-fg: #fff;
  --btn-shadow: var(--primary-700);
  --btn-hover-bg: var(--primary-400);

  appearance: none;
  border: 0;
  font-family: var(--font-sans);
  font-weight: 800;
  font-size: 16px;
  line-height: 1;
  letter-spacing: 0.01em;
  background: var(--btn-bg);
  color: var(--btn-fg);
  border-radius: 16px;
  padding: 14px 22px;
  cursor: pointer;
  position: relative;
  box-shadow: 0 4px 0 var(--btn-shadow);
  transition: transform .08s var(--ease-out), background .15s, box-shadow .08s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  user-select: none;
  white-space: nowrap;
}
.btn:hover { background: var(--btn-hover-bg); }
.btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--btn-shadow);
}
.btn[disabled], .btn.is-disabled {
  background: var(--ink-200);
  color: var(--ink-400);
  box-shadow: 0 4px 0 var(--ink-300);
  cursor: not-allowed;
  pointer-events: none;
}
.btn--secondary {
  --btn-bg: var(--success-500);
  --btn-shadow: var(--success-700);
  --btn-hover-bg: var(--success-400);
}
.btn--amber {
  --btn-bg: var(--amber-500);
  --btn-shadow: var(--amber-700);
  --btn-hover-bg: var(--amber-400);
}
.btn--outline {
  background: #fff;
  color: var(--ink-900);
  border: 2px solid var(--ink-200);
  box-shadow: 0 4px 0 var(--ink-200);
  font-weight: 800;
}
.btn--outline:hover { background: var(--ink-50); }
.btn--ghost {
  background: transparent;
  color: var(--primary-600);
  box-shadow: none;
  font-weight: 700;
}
.btn--ghost:hover { background: var(--primary-50); }
.btn--ghost:active { transform: none; }
.btn--danger {
  --btn-bg: var(--error-500);
  --btn-shadow: var(--error-700);
  --btn-hover-bg: var(--error-300);
}
.btn--lg { font-size: 18px; padding: 18px 28px; border-radius: 18px; }
.btn--sm { font-size: 14px; padding: 10px 16px; border-radius: 12px; box-shadow: 0 3px 0 var(--btn-shadow); }
.btn--block { width: 100%; }
.btn--icon { width: 44px; height: 44px; padding: 0; border-radius: 14px; }

/* === Input === */
.field { display: flex; flex-direction: column; gap: 6px; }
.field__label {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-700);
  display: flex;
  align-items: center;
  gap: 4px;
}
.field__label .req { color: var(--error-500); }
.input {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid var(--ink-200);
  border-radius: 14px;
  padding: 0 16px;
  height: 56px;
  transition: border-color .15s, box-shadow .15s;
  font-size: 16px;
  color: var(--ink-900);
  gap: 10px;
}
.input:focus-within {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 4px var(--primary-100);
}
.input--error {
  border-color: var(--error-500);
  box-shadow: 0 0 0 4px var(--error-100);
}
.input input {
  border: 0;
  outline: 0;
  background: transparent;
  flex: 1;
  font: 700 16px var(--font-sans);
  color: var(--ink-900);
  min-width: 0;
}
.input input::placeholder { color: var(--ink-400); font-weight: 600; }
.input__prefix {
  font-weight: 800;
  color: var(--ink-700);
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 8px;
  border-right: 2px solid var(--ink-100);
}
.field__hint { font-size: 13px; color: var(--ink-500); font-weight: 600; }
.field__error { font-size: 13px; color: var(--error-500); font-weight: 700; display: flex; align-items: center; gap: 4px; }

/* === OTP === */
.otp { display: flex; gap: 10px; justify-content: center; }
.otp__cell {
  width: 48px; height: 60px;
  border: 2px solid var(--ink-200);
  border-radius: 14px;
  background: #fff;
  font: 800 24px var(--font-sans);
  color: var(--ink-900);
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.otp__cell.is-filled { border-color: var(--primary-500); background: var(--primary-50); }
.otp__cell.is-active { border-color: var(--primary-500); box-shadow: 0 0 0 4px var(--primary-100); }
.otp__cell.is-error { border-color: var(--error-500); background: var(--error-50); animation: shake .35s; }
@keyframes shake {
  0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)}
}

/* === Badge / Tag === */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-size: 13px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--ink-100);
  color: var(--ink-700);
  white-space: nowrap;
}
.badge--success { background: var(--success-100); color: var(--success-700); }
.badge--amber { background: var(--amber-100); color: var(--amber-700); }
.badge--error { background: var(--error-100); color: var(--error-700); }
.badge--primary { background: var(--primary-100); color: var(--primary-700); }
.badge--info { background: #DCEEFE; color: #0369A1; }
.badge--solid { background: var(--primary-500); color: #fff; }
.badge--solid.badge--amber-solid { background: var(--amber-500); color: #fff; }

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff;
  color: var(--ink-700);
  border: 2px solid var(--ink-200);
}
.tag.is-active {
  background: var(--ink-900);
  color: #fff;
  border-color: var(--ink-900);
}
.tag .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--cat-robotique); }

/* === Loader === */
.loader-dots { display: inline-flex; gap: 6px; }
.loader-dots span {
  width: 8px; height: 8px; border-radius: 999px;
  background: var(--primary-500);
  animation: bounceDot 1s var(--ease-out) infinite;
}
.loader-dots span:nth-child(2) { animation-delay: .15s; background: var(--success-500); }
.loader-dots span:nth-child(3) { animation-delay: .3s; background: var(--amber-500); }
@keyframes bounceDot {
  0%,80%,100%{transform:translateY(0);opacity:.6}
  40%{transform:translateY(-8px);opacity:1}
}
.loader-spin {
  width: 24px; height: 24px;
  border: 3px solid var(--primary-100);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* === Toast === */
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 16px;
  background: var(--ink-900);
  color: #fff;
  font-weight: 700;
  box-shadow: var(--shadow-modal);
  max-width: 320px;
}
.toast__icon {
  width: 28px; height: 28px; border-radius: 999px;
  background: var(--success-500);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.toast--error .toast__icon { background: var(--error-500); }
.toast--warning .toast__icon { background: var(--amber-500); }
.toast--info .toast__icon { background: var(--info-500); }
.toast__close {
  background: transparent; border: 0; color: rgba(255,255,255,.6);
  cursor: pointer; padding: 4px; margin-left: auto;
}

/* === Avatar === */
.avatar {
  width: 48px; height: 48px;
  border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900;
  color: #fff;
  background: var(--primary-500);
  flex-shrink: 0;
  position: relative;
}
.avatar--ring { box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--amber-500); }
.avatar__status {
  position: absolute; bottom: 0; right: 0;
  width: 12px; height: 12px; border-radius: 999px;
  background: var(--success-500);
  border: 2px solid #fff;
}
`;

if (!document.getElementById("ds-atoms-styles")) {
  const s = document.createElement("style");
  s.id = "ds-atoms-styles";
  s.textContent = dsAtoms_styles;
  document.head.appendChild(s);
}

// ─── Bouton ───────────────────────────────────────────────────────
function Button({
  children,
  variant = "primary",
  size = "md",
  block,
  icon,
  iconRight,
  disabled,
  onClick,
  ...rest
}) {
  const cls = ["btn"];
  if (variant === "secondary") cls.push("btn--secondary");
  if (variant === "amber") cls.push("btn--amber");
  if (variant === "outline") cls.push("btn--outline");
  if (variant === "ghost") cls.push("btn--ghost");
  if (variant === "danger") cls.push("btn--danger");
  if (size === "lg") cls.push("btn--lg");
  if (size === "sm") cls.push("btn--sm");
  if (block) cls.push("btn--block");
  if (disabled) cls.push("is-disabled");
  return (
    <button
      className={cls.join(" ")}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────
function Field({ label, required, hint, error, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label">
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="field__error">{error}</div>
      ) : (
        hint && <div className="field__hint">{hint}</div>
      )}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  error,
  prefix,
}) {
  const cls = ["input"];
  if (error) cls.push("input--error");
  return (
    <div className={cls.join(" ")}>
      {prefix && <div className="input__prefix">{prefix}</div>}
      {icon}
      <input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </div>
  );
}

// Saisie téléphone - préfixe pays Bénin + drapeau
function PhoneInput({ value, onChange, error }) {
  return (
    <div
      className={["input", error && "input--error"].filter(Boolean).join(" ")}
    >
      <div className="input__prefix">
        <span style={{ fontSize: 18 }}>🇧🇯</span>
        <span>+229</span>
      </div>
      <input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="01 90 12 34 56"
        inputMode="tel"
      />
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder = "Mot de passe",
  error,
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div
      className={["input", error && "input--error"].filter(Boolean).join(" ")}
    >
      <input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        type={show ? "text" : "password"}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          background: "none",
          border: 0,
          color: "var(--ink-500)",
          cursor: "pointer",
          padding: 4,
        }}
      >
        <Icon name={show ? "eye-off" : "eye"} size={20} />
      </button>
    </div>
  );
}

// ─── OTP ──────────────────────────────────────────────────────────
function OTPInput({ length = 6, value = "", activeIndex = 0, error = false }) {
  const cells = Array.from({ length }, (_, i) => value[i] || "");
  return (
    <div className="otp">
      {cells.map((c, i) => {
        const cls = ["otp__cell"];
        if (c) cls.push("is-filled");
        if (i === activeIndex && !c) cls.push("is-active");
        if (error) cls.push("is-error");
        return (
          <div key={i} className={cls.join(" ")}>
            {c}
          </div>
        );
      })}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────
function Badge({ children, tone = "neutral", solid, icon }) {
  const cls = ["badge"];
  if (tone === "success") cls.push("badge--success");
  if (tone === "amber") cls.push("badge--amber");
  if (tone === "error") cls.push("badge--error");
  if (tone === "primary") cls.push("badge--primary");
  if (tone === "info") cls.push("badge--info");
  if (solid) cls.push("badge--solid");
  return (
    <span className={cls.join(" ")}>
      {icon}
      {children}
    </span>
  );
}

// ─── Tag de catégorie ─────────────────────────────────────────────
function Tag({ children, active, color, onClick }) {
  return (
    <button
      className={["tag", active && "is-active"].filter(Boolean).join(" ")}
      onClick={onClick}
      style={{ border: 0, cursor: "pointer", font: "inherit" }}
    >
      {color && <span className="dot" style={{ background: color }} />}
      {children}
    </button>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#5B3FE0",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#0EA5E9",
  "#14B8A6",
];
function Avatar({ name = "L", size = 48, ring, status, emoji, color }) {
  const bg =
    color || AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div
      className={["avatar", ring && "avatar--ring"].filter(Boolean).join(" ")}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.4,
      }}
    >
      {emoji || initials}
      {status && <div className="avatar__status" />}
    </div>
  );
}

// ─── Loader ───────────────────────────────────────────────────────
function Loader({ kind = "dots" }) {
  if (kind === "spin") return <div className="loader-spin" />;
  return (
    <div className="loader-dots">
      <span />
      <span />
      <span />
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────
function Toast({ tone = "success", title, action, onClose }) {
  const ICONS = { success: "check", error: "x", warning: "star", info: "bell" };
  return (
    <div
      className={["toast", tone !== "success" && `toast--${tone}`]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="toast__icon">
        <Icon name={ICONS[tone]} size={16} color="#fff" strokeWidth={3} />
      </div>
      <div style={{ flex: 1 }}>{title}</div>
      {action}
      {onClose && (
        <button className="toast__close" onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}

Object.assign(window, {
  Button,
  Field,
  Input,
  PhoneInput,
  PasswordInput,
  OTPInput,
  Badge,
  Tag,
  Avatar,
  Loader,
  Toast,
});
