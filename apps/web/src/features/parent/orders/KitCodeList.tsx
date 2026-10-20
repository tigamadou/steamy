"use client";

import type { Schemas } from "@steamy/api-client";
import { useState } from "react";

import { Badge, Button } from "@/components/ds";

/**
 * Kit Codes d'une commande de kits payée (C10, D35 : `STEAMY-XXXX-XXXX`), visibles du payeur seul : chacun se copie
 * pour être transmis à l'enfant, qui débloque le parcours compatible (WA01) ; un code saisi est marqué « Utilisé ».
 */
export function KitCodeList({ codes, kitNames }: { codes: Schemas["KitCode"][]; kitNames: Record<string, string> }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      // Presse-papiers refusé : le code reste lisible et sélectionnable
      setCopied(null);
    }
  }

  return (
    <section aria-labelledby="kit-codes" className="flex flex-col gap-2.5">
      <h2 id="kit-codes" className="m-0 text-lg font-black text-ink-900">
        Kit Codes
      </h2>
      <p className="m-0 text-[13px] font-semibold text-ink-600">
        Transmettez un code à votre enfant : il le saisit dans le parcours compatible pour le débloquer. Il est aussi
        imprimé sur la notice du kit.
      </p>
      <ul aria-label="Kit Codes de la commande" className="m-0 flex list-none flex-col gap-2 p-0">
        {codes.map((item) => (
          <li
            key={item.code}
            className="flex flex-wrap items-center gap-3 rounded-[14px] border-[1.5px] border-ink-100 bg-surface px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="m-0 font-mono text-base font-black tracking-wider text-ink-900">{item.code}</p>
              <p className="m-0 text-xs font-bold text-ink-600">{kitNames[item.kitSlug] ?? item.kitSlug}</p>
            </div>
            {item.redeemed ? (
              <Badge tone="neutral">Utilisé</Badge>
            ) : (
              <Button variant="outline" size="sm" icon="copy" onClick={() => void copy(item.code)}>
                {copied === item.code ? "Copié" : "Copier"}
                <span className="sr-only"> le code {item.code}</span>
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="sr-only">
        {copied ? `Code ${copied} copié.` : ""}
      </p>
    </section>
  );
}
