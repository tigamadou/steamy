import { getServerApi } from "@/lib/api";

/**
 * Enfants rattachés au parent (WP10) : demandes de consentement acceptées. La liste des enfants elle-même
 * (`accounts/children/`) arrive avec l'espace parent (API-L4) ; l'inscription de l'enfant est alors en cours.
 */
export async function LinkedChildren() {
  const api = await getServerApi();
  const { data } = await api.GET("/api/accounts/consent-requests/", { params: { query: { status: "accepted" } } });
  const children = data?.results ?? [];
  if (children.length === 0) {
    return <p className="rounded-lg bg-ink-50 p-4 font-bold text-ink-700">Aucun enfant rattaché pour le moment.</p>;
  }
  return (
    <ul className="flex w-full flex-col gap-2 text-left">
      {children.map((child) => (
        <li key={child.id} className="rounded-lg border-2 border-success-200 bg-surface p-4 font-extrabold text-ink-900">
          {child.firstName}
          {child.age ? `, ${child.age} ans` : ""}
          <span className="font-semibold text-ink-600"> · inscription en cours</span>
        </li>
      ))}
    </ul>
  );
}
