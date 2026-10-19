import { InfoCard } from "@/components/ds/InfoCard";
import { Section } from "@/components/ds/Section";
import { SettingsRow } from "@/components/ds/SettingsRow";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { features } from "@/lib/features";
import { routes } from "@/lib/routes";

import { getLearnerProfile } from "./api";
import { localityLabel } from "./locality";

const l = routes.learner;

/**
 * WD13 · Paramètres de l'apprenant : hub de sections. L'identifiant est en lecture seule (C12) ; ni téléphone ni
 * moyen de paiement (D30) ; les préférences de notification vivent dans WD06 seulement. Les lignes dont l'écran
 * n'est pas livré sont absentes (drapeau `orders` de `features.ts`), jamais « Bientôt ».
 */
export async function ProfileHub() {
  const [me, profile] = await Promise.all([getCurrentUser(), getLearnerProfile()]);
  // Sans session, la garde de rôle du layout redirige.
  if (!me) return null;

  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-6">
      <Section title="Mon profil">
        <InfoCard
          title="Mes informations"
          action={{ label: "Modifier", href: l.editProfile }}
          rows={[
            { label: "Nom", value: `${me.firstName} ${me.lastName}`.trim() },
            { label: "Date de naissance", value: profile.birthDate && formatDate(profile.birthDate) },
            { label: "Classe", value: profile.schoolGrade?.label },
            { label: "Localité", value: profile.locality && localityLabel(profile.locality) },
          ]}
        />
      </Section>

      <Section title="Connexion">
        <SettingsRow
          label="Identifiant"
          description="Il te sert à te connecter et ne peut pas être modifié."
          value={me.username ?? "—"}
        />
        <SettingsRow label="Mot de passe" description="Change ton mot de passe de connexion." href={l.password} />
      </Section>

      <Section title="Livraison">
        <SettingsRow
          label="Adresse de livraison"
          description="Proposée quand ton parent te commande un kit."
          href={l.delivery}
        />
      </Section>

      <Section title="Notifications">
        <SettingsRow
          label="Préférences de notification"
          description="Choisis ce que Steamy t'envoie, dans l'application et par email."
          href={l.notificationPreferences}
        />
      </Section>

      <Section title="Mon compte">
        {features.orders && <SettingsRow label="Mes commandes" href={l.orders} />}
        <SettingsRow label="Ma progression" href={l.progress} />
        <SettingsRow label="Mon parent" href={l.parent} />
        <SettingsRow label="CGU et politiques" href={routes.legal("cgu")} />
        <SettingsRow label="Aide" href={l.help} />
      </Section>

      <Section title="Zone sensible" tone="danger">
        <SettingsRow
          label="Supprimer mon compte"
          description="La demande est envoyée à ton parent pour accord."
          href={l.deletion}
          className="border-error-300"
        />
      </Section>
    </div>
  );
}

/** Squelette fidèle à WD13 pendant la lecture du profil. */
export function ProfileHubSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de ton profil…" className="mx-auto flex w-full max-w-190 flex-col gap-6">
      {["h-38", "h-36", "h-16", "h-72"].map((height, index) => (
        <div key={index} className="flex flex-col gap-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className={`${height} rounded-lg`} />
        </div>
      ))}
    </div>
  );
}
