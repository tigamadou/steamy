import { Section, SettingsRow, SkeletonBlock } from "@/components/ds";
import { PreferencesForm } from "@/features/notifications/PreferencesForm";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { getCurrentUser } from "@/lib/auth/session";
import { getCountries } from "@/lib/referentials";
import { routes, type LegalDoc } from "@/lib/routes";

import { ConnectionCard } from "./ConnectionCard";
import { DangerZone } from "./DangerZone";
import { ProfileCard } from "./ProfileCard";

/** Libellés des liens « Légal » de WPD08 vers WL09. */
const LEGAL_LINKS: Array<[LegalDoc, string]> = [
  ["cgu", "Conditions générales d'utilisation"],
  ["mentions-legales", "Mentions légales"],
  ["confidentialite", "Politique de confidentialité"],
];

/**
 * WPD08 · paramètres du parent : profil, connexion, notifications (D7), légal et zone sensible (D54). Données lues
 * côté serveur à chaque requête.
 */
export async function ParentSettings() {
  const api = await getServerApi();
  const [me, profile, preferences, children, countries] = await Promise.all([
    getCurrentUser(),
    api.GET("/api/accounts/me/parent-profile/"),
    api.GET("/api/notifications/preferences/"),
    api.GET("/api/accounts/children/", { params: { query: { pageSize: 1 } } }),
    getCountries(),
  ]);
  const parent = readOrNull(profile);
  const prefs = readOrNull(preferences);
  const kids = readOrNull(children);
  if (!me || !parent || !prefs || !kids) return null;

  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-7">
      <Section title="Profil">
        <ProfileCard
          identity={{
            firstName: me.firstName,
            lastName: me.lastName,
            phone: me.phone,
            email: parent.email,
            profession: parent.profession,
          }}
        />
        <ConnectionCard phone={me.phone} countries={countries} />
      </Section>

      <section id="notifications" aria-labelledby="notifications-titre" className="flex scroll-mt-20 flex-col gap-2">
        <h2
          id="notifications-titre"
          className="m-0 mb-1 text-[13px] font-black tracking-[0.06em] text-ink-700 uppercase"
        >
          Notifications
        </h2>
        {/* Une adresse ajoutée ou retirée dans le profil change les interrupteurs disponibles : formulaire remonté */}
        <PreferencesForm key={prefs.emailAddress ?? ""} initial={prefs} space="parent" />
      </section>

      <Section title="Légal">
        {LEGAL_LINKS.map(([doc, label]) => (
          <SettingsRow key={doc} label={label} href={routes.legal(doc)} />
        ))}
      </Section>

      <Section title="Zone sensible" tone="danger">
        <DangerZone childrenCount={kids.count ?? 0} />
      </Section>
    </div>
  );
}

/** Squelette de WPD08 : sections de cartes. */
export function ParentSettingsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de vos paramètres…"
      className="mx-auto flex w-full max-w-190 flex-col gap-4"
    >
      <SkeletonBlock className="h-4 w-24 rounded-sm" />
      <SkeletonBlock className="h-36 rounded-lg" />
      <SkeletonBlock className="h-24 rounded-lg" />
      <SkeletonBlock className="h-4 w-32 rounded-sm" />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBlock key={i} className="h-18 rounded-lg" />
      ))}
    </div>
  );
}
