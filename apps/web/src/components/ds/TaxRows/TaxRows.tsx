import type { Schemas } from "@steamy/api-client";

import { formatPrice, TAX_LABELS } from "@/lib/format";

import { WKSummaryRow } from "../WKSummaryRow";

export type TaxRowsProps = {
  /** Taxes ajoutées au HT, telles que l'API les renvoie (C25) : rien n'est recalculé côté écran. */
  taxes: Schemas["TaxLine"][];
};

/** Une ligne par taxe (« TVA (18 %) », « AIB (5 %) »), à placer entre le sous-total HT et le total, dans un `<dl>`. */
export function TaxRows({ taxes }: TaxRowsProps) {
  return (
    <>
      {taxes.map((tax) => (
        <WKSummaryRow key={tax.code} label={`${TAX_LABELS[tax.code]} (${tax.rate} %)`} value={formatPrice(tax.amount)} />
      ))}
    </>
  );
}
