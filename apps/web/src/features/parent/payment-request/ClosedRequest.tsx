import { Button, Mascot, type MascotPose } from "@/components/ds";
import type { PaymentRequest, RequestStatus } from "@/features/unlock/types";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

type Closed = Exclude<RequestStatus, "pending">;

/** Demande close, en lecture seule (maquette de 4.0) : aucun paiement possible. */
export function ClosedRequest({ request, firstName }: { request: PaymentRequest; firstName: string }) {
  const status = request.status as Closed;
  const decided = request.decidedAt ? formatInstant(request.decidedAt) : null;
  const content: Record<Closed, { pose: MascotPose; title: string; body: string }> = {
    paid: {
      pose: "cheer",
      title: "Cette demande est réglée",
      body: decided ? `Payée le ${decided}.` : "Le paiement a été confirmé.",
    },
    declined: {
      pose: "idle",
      title: "Vous avez refusé cette demande",
      body: [
        decided ? `Refusée le ${decided}.` : "",
        request.declineReason ? `Motif transmis à ${firstName} : « ${request.declineReason} »` : "",
      ]
        .filter(Boolean)
        .join(" "),
    },
    expired: {
      pose: "sleep",
      title: "Cette demande a expiré",
      body: `Elle n'a pas été réglée avant le ${formatInstant(request.expiresAt)} (7 jours). ${firstName} peut vous envoyer une nouvelle demande depuis son espace.`,
    },
    cancelled: {
      pose: "idle",
      title: `${firstName} a annulé sa demande`,
      body: `${decided ? `Annulée le ${decided}. ` : ""}Il n'y a plus rien à régler.`,
    },
  };
  const { pose, title, body } = content[status];
  return (
    <section
      aria-labelledby="demande-close"
      className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-ink-100 bg-ink-50 px-6 py-8 text-center"
    >
      <Mascot pose={pose} size={110} />
      <h2 id="demande-close" className="m-0 text-xl font-black text-ink-900">
        {title}
      </h2>
      {body && <p className="m-0 text-sm leading-normal font-semibold text-ink-600">{body}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        {status === "paid" && request.orderReference && (
          <Button variant="outline" href={routes.parent.order(request.orderReference)}>
            Voir la commande
          </Button>
        )}
        <Button href={routes.parent.home}>Retour à l&apos;accueil</Button>
      </div>
    </section>
  );
}
