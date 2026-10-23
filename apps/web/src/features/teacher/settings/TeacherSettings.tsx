import { Section, SettingsRow, SkeletonBlock } from "@/components/ds";
import { PreferencesForm } from "@/features/notifications/PreferencesForm";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { getCurrentUser } from "@/lib/auth/session";
import { routes, type LegalDoc } from "@/lib/routes";

import { CloseAccount } from "./CloseAccount";
import { TeacherConnectionCard } from "./TeacherConnectionCard";
import { TeacherProfileCard } from "./TeacherProfileCard";

/** Libellés des liens « Légal » de WT08 vers WL09. */
const LEGAL_LINKS: Array<[LegalDoc, string]> = [
  ["cgu", "Conditions générales d'utilisation"],
  ["mentions-legales", "Mentions légales"],
  ["confidentialite", "Politique de confidentialité"],
];

/**
 * WT08 · paramètres de l'enseignant : profil, connexion (email et mot de passe, S4), notifications (in-app et email,
 * C12), légal et fermeture du compte. Données lues côté serveur à chaque requête.
 */
export async function TeacherSettings() {
  const api = await getServerApi();
  const [me, profile, preferences] = await Promise.all([
    getCurrentUser(),
    api.GET("/api/accounts/me/teacher-profile/"),
    api.GET("/api/notifications/preferences/"),
  ]);
  const teacher = readOrNull(profile);
  const prefs = readOrNull(preferences);
  if (!me || !teacher || !prefs) return null;
  const name = `${me.firstName} ${me.lastName}`.trim();

  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-7">
      <Section title="Profil">
        <TeacherProfileCard
          identity={{
            firstName: me.firstName,
            lastName: me.lastName,
            specialty: teacher.specialty,
            school: teacher.school?.name ?? null,
          }}
        />
      </Section>

      <Section title="Connexion">
        <TeacherConnectionCard email={me.email} />
      </Section>

      <Section id="notifications" title="Notifications">
        {/* Une adresse modifiée change les interrupteurs disponibles : formulaire remonté */}
        <PreferencesForm key={prefs.emailAddress ?? ""} initial={prefs} space="teacher" />
      </Section>

      <Section title="Légal">
        {LEGAL_LINKS.map(([doc, label]) => (
          <SettingsRow key={doc} label={label} href={routes.legal(doc)} />
        ))}
      </Section>

      <Section title="Zone sensible" tone="danger">
        <CloseAccount name={name} email={me.email ?? ""} />
      </Section>
    </div>
  );
}

/** Squelette de WT08 : sections de cartes. */
export function TeacherSettingsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de vos paramètres…"
      className="mx-auto flex w-full max-w-190 flex-col gap-4"
    >
      <SkeletonBlock className="h-4 w-24 rounded-sm" />
      <SkeletonBlock className="h-28 rounded-lg" />
      <SkeletonBlock className="h-4 w-32 rounded-sm" />
      <SkeletonBlock className="h-28 rounded-lg" />
      <SkeletonBlock className="h-4 w-32 rounded-sm" />
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} className="h-18 rounded-lg" />
      ))}
    </div>
  );
}
