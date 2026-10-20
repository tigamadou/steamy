import { Button } from "@/components/ds/Button";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { getPendingRequests } from "./server";
import { requestAmount, requestTitle } from "./types";

/**
 * WD23 · Bandeau « En attente de ton parent » : demandes de paiement non réglées, chacune → WA02 / WK08. Rien quand il
 * n'y en a pas, ni quand elles sont illisibles (le reste de la page s'affiche).
 */
export async function PendingRequestsBanner() {
  const requests = await getPendingRequests().catch(() => []);
  if (requests.length === 0) return null;
  const count = requests.length;
  return (
    <section
      aria-labelledby="demandes-en-attente"
      className="flex gap-4 rounded-[18px] border-2 border-amber-300 bg-amber-50 px-4.5 py-3.5"
    >
      <span
        aria-hidden
        className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[22px] sm:flex"
      >
        ⏳
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="demandes-en-attente" className="m-0 text-[15px] font-black text-ink-900">
          En attente de ton parent · {count} {count > 1 ? "demandes" : "demande"}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-wrap items-center justify-between gap-2.5">
              <p className="m-0 min-w-0 flex-1 text-[13px] font-bold text-ink-600">
                <strong className="text-ink-900">{requestTitle(request)}</strong> · {requestAmount(request)} · demandé
                le {formatInstant(request.createdAt)} · ton parent a jusqu&apos;au {formatInstant(request.expiresAt)}{" "}
                pour la régler
              </p>
              <Button
                variant="outline"
                size="sm"
                href={routes.learner.request(request.id)}
                aria-label={`Voir la demande : ${requestTitle(request)}`}
              >
                Voir la demande
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
