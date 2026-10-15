import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type PasswordRule = {
  id: "length" | "letter-digit";
  label: string;
  test: (password: string) => boolean;
};

/**
 * Politique de mot de passe (D25), source unique côté front. Miroir de
 * `apps/api/apps/accounts/password_validation.py` (mêmes libellés, mêmes règles) : indicatif, le serveur juge.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: "length", label: "Au moins 8 caractères", test: (pw) => [...pw].length >= 8 },
  {
    id: "letter-digit",
    label: "Au moins une lettre et un chiffre",
    // Lettre et chiffre Unicode (« é », « ٣ »… comptent), comme `[^\W\d_]` et `\d` côté Python
    test: (pw) => /\p{L}/u.test(pw) && /\p{Nd}/u.test(pw),
  },
];

export type PasswordCheck = { id: PasswordRule["id"]; label: string; ok: boolean };

/** Résultat de chaque règle pour un mot de passe. */
export function checkPassword(password: string): PasswordCheck[] {
  return PASSWORD_RULES.map(({ id, label, test }) => ({ id, label, ok: test(password) }));
}

/** Vrai quand toutes les règles sont respectées. */
export function isPasswordValid(password: string) {
  return PASSWORD_RULES.every(({ test }) => test(password));
}

export type PwReqProps = {
  password: string;
  /** Erreur (soumission ou refus serveur) : les règles non respectées passent en rouge. */
  error?: boolean;
  id?: string;
  className?: string;
};

/** Liste des règles du mot de passe avec leur état, mise à jour au fil de la saisie. */
export function PwReq({ password, error = false, id, className }: PwReqProps) {
  return (
    <ul id={id} aria-live="polite" className={cx("flex flex-col gap-1.5", className)}>
      {checkPassword(password).map(({ id: ruleId, label, ok }) => (
        <li
          key={ruleId}
          className={cx(
            "flex items-center gap-2 text-[13px] font-bold",
            ok ? "text-success-700" : error ? "text-error-600" : "text-ink-600",
          )}
        >
          <span
            aria-hidden
            className={cx(
              "flex size-4 shrink-0 items-center justify-center rounded-full text-white",
              ok ? "bg-success-500" : error ? "bg-error-500" : "bg-ink-200",
            )}
          >
            {ok ? (
              <Icon name="check" size={10} strokeWidth={3.5} />
            ) : (
              error && <Icon name="x" size={10} strokeWidth={3.5} />
            )}
          </span>
          {label}
          <span className="sr-only">{ok ? " (respectée)" : " (non respectée)"}</span>
        </li>
      ))}
    </ul>
  );
}
