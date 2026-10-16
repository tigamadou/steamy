"use client";

import type { Schemas } from "@steamy/api-client";
import { useState } from "react";

import { SettingsRow, Tabs } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";
import { routes } from "@/lib/routes";

type Preferences = Schemas["Preferences"];
type Category = Schemas["CategoryEnum"];

const l = routes.learner;

/** Ce que couvre chaque catégorie de l'apprenant (SPEC-ECRANS-2, WD06) ; le libellé vient de l'API. */
const DESCRIPTIONS: Partial<Record<Category, string>> = {
  learning: "Rappels de missions, nouveaux parcours recommandés, quiz à refaire.",
  rewards: "Badges débloqués, nouveau rang.",
  coaching: "Commentaires de ton enseignant.",
  events: "Annonces Steamy Events, réponse à une candidature.",
  payments: "Demande réglée ou refusée par ton parent.",
};

const HEADING = "m-0 mb-2.5 text-[13px] font-black tracking-[0.06em] text-ink-700 uppercase";

/**
 * WD06 · préférences de notification : l'application est un canal toujours actif ; l'email se règle par catégorie,
 * seulement si une adresse est renseignée (D30, C12 : ni SMS ni push). Chaque interrupteur est enregistré aussitôt
 * (`PATCH notifications/preferences/`, un à la fois), et revient en arrière si l'enregistrement échoue.
 */
export function PreferencesForm({ initial }: { initial: Preferences }) {
  const [preferences, setPreferences] = useState(initial);
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);
  // Un enregistrement à la fois : les interrupteurs attendent la réponse du précédent (pas de PATCH concurrents)
  const [saving, setSaving] = useState(false);
  const hasEmail = preferences.emailAddress !== null;

  async function toggle(category: Category, email: boolean) {
    const previous = preferences;
    setPreferences({
      ...preferences,
      categories: preferences.categories.map((c) => (c.category === category ? { ...c, email } : c)),
    });
    setStatus(null);
    setSaving(true);
    const result = await apiCall((api) =>
      api.PATCH("/api/notifications/preferences/", { body: { categories: [{ category, email }] } }),
    );
    setSaving(false);
    if (!result.ok) {
      setPreferences(previous);
      setStatus({ error: true, text: errorMessage(result, "tu") });
      return;
    }
    setPreferences(result.data);
    setStatus({ error: false, text: "Préférence enregistrée." });
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <Tabs
        label="Notifications"
        activeHref={l.notificationPreferences}
        items={[
          { href: l.notificationList(), label: "Notifications" },
          { href: l.notificationPreferences, label: "Paramètres" },
        ]}
      />

      <section aria-labelledby="canaux" className="flex flex-col gap-2">
        <h2 id="canaux" className={HEADING}>
          Canaux
        </h2>
        <SettingsRow
          label="Dans l'application"
          description="Toujours actif : toutes tes notifications s'affichent dans ton espace."
          checked
          disabled
          onChange={() => {}}
        />
        <SettingsRow
          label="Email"
          description={
            hasEmail
              ? "Les catégories ci-dessous peuvent aussi t'être envoyées à cette adresse."
              : "Aucune adresse email n'est renseignée sur ton profil : tes notifications restent dans l'application."
          }
          value={preferences.emailAddress ?? "Aucune adresse"}
        />
      </section>

      <section aria-labelledby="categories" className="flex flex-col gap-2">
        <h2 id="categories" className={HEADING}>
          Recevoir aussi par email
        </h2>
        {preferences.categories.map((c) => (
          <SettingsRow
            key={c.category}
            label={
              <>
                {c.label}
                <span className="sr-only"> par email</span>
              </>
            }
            description={DESCRIPTIONS[c.category]}
            checked={hasEmail && c.email}
            disabled={!hasEmail || saving}
            onChange={(email) => void toggle(c.category, email)}
          />
        ))}
      </section>

      <p
        aria-live="polite"
        className={status?.error ? "m-0 text-sm font-bold text-error-700" : "m-0 text-sm font-bold text-success-700"}
      >
        {status?.text}
      </p>
    </div>
  );
}
