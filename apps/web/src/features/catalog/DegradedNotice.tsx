import { Icon } from "@/components/ds";

/** Avertissement quand les souhaits ou les inscriptions n'ont pas pu être lus : l'écran reste utilisable. */
export function DegradedNotice() {
  return (
    <p
      role="status"
      className="mb-4 flex items-start gap-2.5 rounded-[14px] border-2 border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-bold text-ink-700"
    >
      <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-amber-700" />
      Tes souhaits et ta progression n&apos;ont pas pu être chargés. Recharge la page dans un instant pour les
      retrouver.
    </p>
  );
}
