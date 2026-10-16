/** Graphique sans valeur : le dire plutôt que dessiner un axe vide. */
export function EmptyChart({ label }: { label: string }) {
  return (
    <p className="m-0 text-xs font-semibold text-ink-600">
      <span className="sr-only">{label} : </span>Aucune donnée
    </p>
  );
}
