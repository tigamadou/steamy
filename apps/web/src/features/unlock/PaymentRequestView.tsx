"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Breadcrumb, Button, Loader, Mascot, Modal, Toast, type MascotPose } from "@/components/ds";
import { errorMessage, type ApiFailure } from "@/lib/api-call";
import { formatInstant, formatInstantTime } from "@/lib/dates";
import { routes } from "@/lib/routes";
import { useVisiblePolling } from "@/lib/use-visible-polling";

import { cancelPaymentRequest, createPaymentRequest, readPaymentRequest, resendPaymentRequest } from "./api";
import { requestAmount, requestTitle, type PaymentRequest, type RequestStatus } from "./types";

/** Interrogation du statut de la demande, onglet visible seulement (WA02). */
export const REQUEST_POLL_MS = 10_000;

type Outcome = { pose: MascotPose; title: (parent: string) => string; body: (parent: string) => string };

/** Issue d'une demande close, au tutoiement. */
const OUTCOMES: Record<Exclude<RequestStatus, "pending"> | "paidKit", Outcome> = {
  paid: {
    pose: "cheer",
    title: () => "C'est réglé !",
    body: (parent) => `${parent} a réglé ta demande : ton parcours est débloqué.`,
  },
  // Variante kit (WK08) : seule l'issue « réglée » diffère
  paidKit: {
    pose: "cheer",
    title: () => "C'est réglé !",
    body: (parent) => `${parent} a réglé ta commande : ton kit est en préparation.`,
  },
  declined: {
    pose: "sad",
    title: (parent) => `${parent} a refusé ta demande`,
    body: (parent) => `Parles-en avec ${parent}. Tu pourras refaire une demande quand vous serez d'accord.`,
  },
  expired: {
    pose: "sleep",
    title: () => "Ta demande a expiré",
    body: (parent) => `${parent} ne l'a pas réglée à temps. Tu peux refaire une demande.`,
  },
  cancelled: {
    pose: "idle",
    title: () => "Tu as annulé cette demande",
    body: () => "Tu peux refaire une demande à tout moment.",
  },
};

/** Relance : possible maintenant, plus tard (date du serveur), ou plus du tout (envois épuisés, C4). */
function resendState(request: PaymentRequest, now: number): { allowed: boolean; hint: string | null } {
  if (!request.nextResendAt) {
    return { allowed: false, hint: "Tu as déjà relancé ton parent autant de fois que possible." };
  }
  if (Date.parse(request.nextResendAt) > now) {
    return { allowed: false, hint: `Tu pourras relancer ton parent le ${formatInstantTime(request.nextResendAt)}.` };
  }
  return { allowed: true, hint: null };
}

/**
 * WA02 · Demande de paiement d'un parcours au parent (D52, C4) : récapitulatif et montant du serveur, attente avec
 * interrogation du statut toutes les 10 s (onglet visible), relance limitée, annulation, puis issue (réglée → WC06a,
 * refusée, expirée, annulée → nouvelle demande).
 *
 * WK08 · Variante `kind=kit` (demande créée depuis le panier) : montant des articles seul, la livraison étant ajoutée
 * par le parent (C10) ; ni relance, ni « Changer de parent », ni « Renvoyer le lien » ; issue réglée → WD14.
 */
export function PaymentRequestView({ initial }: { initial: PaymentRequest }) {
  const router = useRouter();
  const [request, setRequest] = useState(initial);
  const [busy, setBusy] = useState<"resend" | "cancel" | "renew" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Heure de référence de la relance, rafraîchie à chaque interrogation
  const [now, setNow] = useState(() => Date.now());
  const pending = request.status === "pending";
  const kit = request.kind === "kit";
  const parent = request.parentFirstName;
  const title = requestTitle(request);

  useVisiblePolling(
    async () => {
      const result = await readPaymentRequest(request.id);
      setNow(Date.now());
      if (result.ok) setRequest(result.data);
    },
    REQUEST_POLL_MS,
    pending,
  );

  const fail = (failure: ApiFailure) => setError(Object.values(failure.fields)[0] || errorMessage(failure, "tu"));

  const resend = async () => {
    setBusy("resend");
    setError(null);
    const result = await resendPaymentRequest(request.id);
    setBusy(null);
    if (!result.ok) return fail(result);
    setRequest(result.data);
    setToast(`On a relancé ${parent}.`);
  };

  const cancel = async () => {
    setConfirming(false);
    setBusy("cancel");
    setError(null);
    const result = await cancelPaymentRequest(request.id);
    setBusy(null);
    if (result.ok) return setRequest(result.data);
    fail(result);
    // Demande déjà close entre-temps (réglée, refusée) : son vrai statut est relu
    const fresh = await readPaymentRequest(request.id);
    if (fresh.ok) setRequest(fresh.data);
  };

  const renew = async () => {
    setBusy("renew");
    setError(null);
    const result = await createPaymentRequest({ kind: "course", courseSlug: request.course?.slug });
    if (result.ok) return router.push(routes.learner.request(result.data.id));
    setBusy(null);
    fail(result);
  };

  const resendInfo = resendState(request, now);
  const outcome =
    request.status === "pending" ? null : OUTCOMES[kit && request.status === "paid" ? "paidKit" : request.status];

  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
      <Breadcrumb
        items={
          kit
            ? [
                { label: "Boutique", href: routes.learner.shop },
                { label: "Mon panier", href: routes.learner.cart },
                { label: "Demande à ton parent" },
              ]
            : [
                { label: "Catalogue", href: routes.learner.catalog },
                ...(request.course
                  ? [{ label: request.course.title, href: routes.learner.catalogCourse(request.course.slug) }]
                  : []),
                { label: "Demande à ton parent" },
              ]
        }
      />
      <section
        aria-labelledby="demande-titre"
        className="flex flex-col items-center gap-4.5 rounded-[22px] border-2 border-ink-100 bg-surface px-5 py-8 text-center sm:px-7"
      >
        <Mascot pose={outcome?.pose ?? "idle"} size={130} />
        <div aria-live="polite" className="flex flex-col gap-2.5">
          <h2 id="demande-titre" className="m-0 text-[22px] font-black text-ink-900">
            {outcome ? outcome.title(parent) : `On a envoyé ta demande à ${parent}`}
          </h2>
          <p className="m-0 max-w-105 text-[15px] leading-normal font-semibold text-ink-600">
            {outcome
              ? outcome.body(parent)
              : kit
                ? `${parent} ajoutera l'adresse et les frais de livraison, puis réglera la commande. Tu recevras une notification dès que ce sera fait.`
                : `C'est ${parent} qui règle tes achats. Tu recevras une notification dès que ce sera fait.`}
          </p>
        </div>

        <Recap
          title={title}
          amount={requestAmount(request)}
          detail={kit ? "Montant des articles · livraison ajoutée par ton parent" : undefined}
        />

        {pending && (
          <>
            <div className="rounded-pill border-2 border-ink-100 bg-bg px-4.5 py-3">
              <Loader label={`Demande envoyée à ${parent} · en attente du paiement…`} />
            </div>
            <p className="m-0 text-[13px] font-bold text-ink-600">
              {parent} a jusqu&apos;au {formatInstant(request.expiresAt)} pour la régler.
            </p>
            <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                onClick={() => setConfirming(true)}
                loading={busy === "cancel"}
                disabled={busy !== null}
              >
                Annuler la demande
              </Button>
              {!kit && (
                <Button
                  icon="bell"
                  onClick={resend}
                  loading={busy === "resend"}
                  disabled={busy !== null || !resendInfo.allowed}
                >
                  Relancer mon parent
                </Button>
              )}
            </div>
            {!kit && resendInfo.hint && <p className="m-0 text-[13px] font-bold text-ink-600">{resendInfo.hint}</p>}
          </>
        )}

        {request.status === "paid" && kit && (
          <Button size="lg" variant="secondary" iconRight="arrow-right" href={routes.learner.orders}>
            Voir mes commandes
          </Button>
        )}
        {request.status === "paid" && request.course && (
          <Button size="lg" variant="secondary" iconRight="arrow-right" href={routes.learner.course(request.course.slug)}>
            Accéder au parcours
          </Button>
        )}
        {(request.status === "declined" || request.status === "expired" || request.status === "cancelled") && (
          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button variant="outline" href={kit ? routes.learner.shop : routes.learner.catalog}>
              {kit ? "Retour à la boutique" : "Retour au catalogue"}
            </Button>
            {kit && (
              <Button icon="cart" href={routes.learner.cart}>
                Retour au panier
              </Button>
            )}
            {request.course && (
              <Button icon="user" onClick={renew} loading={busy === "renew"}>
                Refaire la demande
              </Button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="m-0 text-sm font-bold text-error-700">
            {error}
          </p>
        )}
      </section>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Annuler la demande ?"
        icon="🤔"
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Garder la demande
            </Button>
            <Button variant="danger" onClick={cancel}>
              Annuler la demande
            </Button>
          </>
        }
      >
        {parent} ne pourra plus la régler. Tu pourras en refaire une plus tard.
      </Modal>
      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

/** Récapitulatif : ce qui est demandé et le montant calculé par le serveur. */
export function Recap({ title, amount, detail }: { title: string; amount: string; detail?: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-[18px] border-2 border-primary-100 bg-primary-50 p-4 text-left">
      <div className="min-w-0">
        <p className="m-0 text-sm font-black text-ink-900">{title}</p>
        <p className="m-0 text-xs font-bold text-ink-600">{detail ?? "Parcours complet · accès à vie"}</p>
      </div>
      <p className="m-0 shrink-0 text-lg font-black text-primary-700">{amount}</p>
    </div>
  );
}
