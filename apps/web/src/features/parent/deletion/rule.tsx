/** Règle D54 (et D40) au vouvoiement, sans « définitivement » ni « irréversible ». */
export function DeletionRule({ firstName }: { firstName: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-error-100 text-[28px]">
        ⚠️
      </span>
      <div className="flex flex-col gap-2 text-sm leading-normal font-semibold text-ink-700">
        <p className="m-0">
          Le compte de {firstName} est <strong>désactivé immédiatement</strong> : {firstName} ne peut plus se connecter.
          Il est anonymisé 30 jours plus tard ; d&apos;ici là, vous pouvez annuler la suppression depuis « Mes enfants ».
        </p>
        <p className="m-0">Les factures de vos commandes sont conservées.</p>
      </div>
    </div>
  );
}
