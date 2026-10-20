"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { apiCall, type Register } from "@/lib/api-call";
import { cx } from "@/lib/cx";
import { useVisiblePolling } from "@/lib/use-visible-polling";

import { Button } from "../Button";
import { Loader } from "../Loader";
import { Mascot } from "../Mascot";

export type Payment = Schemas["Payment"];

/** En-tête qui ouvre une commande invitée (C10), transmis à l'API sans jamais être journalisé. */
const GUEST_TOKEN_HEADER = "X-Guest-Token";

export type PaymentStatusPanelProps = {
  /** Paiement renvoyé par `POST payments/orders/{reference}/payments/`, puis relu jusqu'à son issue. */
  payment: Payment;
  /** `vous` pour le parent et l'invité (WA04, WA05, WA07, WK06, WK09), `tu` sinon. */
  register?: Register;
  /** Jeton de la commande invitée (`X-Guest-Token`), quand le payeur n'a pas de compte. */
  guestToken?: string;
  /** Intervalle d'interrogation de `GET payments/payments/{id}/` (onglet visible seulement). */
  pollIntervalMs?: number;
  /** Au-delà, l'attente annonce « toujours en attente » et renvoie vers les commandes (le webhook fait foi, S9). */
  stillPendingAfterMs?: number;
  /** Liste des commandes du payeur, où retrouver l'issue après avoir quitté la page. */
  ordersHref: string;
  /** WA05 : message (« Le parcours … est débloqué pour Léa. ») et action de retour. */
  success: { message: ReactNode; action: { label: string; href: string } };
  /** WA07 : retour au formulaire pour saisir un autre numéro. */
  onChangeNumber: () => void;
  /** WA07 : nouvel essai avec le même numéro. */
  onRetry: () => void;
  /** Nouvel essai en cours d'envoi : « Réessayer le paiement » occupé (anti double envoi). */
  retrying?: boolean;
  /** Issue connue (`succeeded` ou `failed`). */
  onSettled?: (payment: Payment) => void;
};

const TEXTS = {
  vous: {
    pendingTitle: "On confirme votre paiement…",
    pendingBody:
      "Validez la demande sur votre téléphone (notification ou code USSD). Cela peut prendre quelques secondes : ne fermez pas cette page.",
    sentTo: "Demande envoyée au",
    stillPending:
      "Le paiement est toujours en attente de validation. Vous pouvez quitter cette page : son issue apparaîtra dans vos commandes.",
    orders: "Voir mes commandes",
    notDebited: "La transaction n'a pas pu aboutir. Aucun montant n'a été débité.",
    failedNeutral:
      "La transaction n'a pas pu aboutir. Vérifiez l'état de la commande dans vos commandes avant de réessayer.",
  },
  tu: {
    pendingTitle: "On confirme ton paiement…",
    pendingBody:
      "Valide la demande sur ton téléphone (notification ou code USSD). Cela peut prendre quelques secondes : ne ferme pas cette page.",
    sentTo: "Demande envoyée au",
    stillPending:
      "Le paiement est toujours en attente de validation. Tu peux quitter cette page : son issue apparaîtra dans tes commandes.",
    orders: "Voir mes commandes",
    notDebited: "La transaction n'a pas pu aboutir. Aucun montant n'a été débité.",
    failedNeutral: "La transaction n'a pas pu aboutir. Vérifie l'état de la commande dans tes commandes avant de réessayer.",
  },
} as const;

const SETTLED: ReadonlySet<Payment["status"]> = new Set(["succeeded", "failed"]);

/**
 * Codes d'échec de l'API (`Payment.failureCode`, `apps/payments/checkout.py` et `utils.py`) qui établissent qu'aucun
 * débit n'a eu lieu : initiation refusée ou impossible, ou refus notifié par le prestataire. Tout autre code (montant
 * incohérent, code inconnu) reçoit un texte neutre : le front n'affirme pas l'absence de débit (WK09).
 */
const NOT_DEBITED: ReadonlySet<string> = new Set([
  "DECLINED",
  "PROVIDER_REFUSED",
  "PROVIDER_UNAVAILABLE",
  "INITIATION_LOST",
]);

/**
 * WA04 attente, WA05 succès, WA07 échec (composant) : interroge le statut du paiement tant qu'il n'est pas réglé,
 * le serveur seul en décide (webhook du prestataire, S9). Aucun montant ni délai métier n'est calculé ici.
 */
export function PaymentStatusPanel({
  payment: initial,
  register = "vous",
  guestToken,
  pollIntervalMs = 3_000,
  stillPendingAfterMs = 120_000,
  ordersHref,
  success,
  onChangeNumber,
  onRetry,
  retrying = false,
  onSettled,
}: PaymentStatusPanelProps) {
  const texts = TEXTS[register];
  const [payment, setPayment] = useState(initial);
  const [slow, setSlow] = useState(false);
  const settled = SETTLED.has(payment.status);

  useEffect(() => {
    if (settled) return;
    const timer = window.setTimeout(() => setSlow(true), stillPendingAfterMs);
    return () => window.clearTimeout(timer);
  }, [settled, stillPendingAfterMs]);

  useEffect(() => {
    if (settled) onSettled?.(payment);
    // L'issue n'est signalée qu'une fois, à son arrivée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  useVisiblePolling(
    async () => {
      const result = await apiCall((api) =>
        api.GET("/api/payments/payments/{id}/", {
          params: {
            path: { id: payment.id },
            header: guestToken ? { [GUEST_TOKEN_HEADER]: guestToken } : undefined,
          },
        }),
      );
      // Une lecture ratée (réseau) n'interrompt pas l'attente : la suivante réessaie
      if (result.ok) setPayment(result.data);
    },
    pollIntervalMs,
    !settled,
  );

  if (payment.status === "succeeded") {
    return (
      <Panel tone="success">
        <Mascot pose="cheer" size={140} />
        <h2 className="m-0 text-[28px] font-black text-success-700">Paiement réussi !</h2>
        <div className="text-[15px] leading-normal font-semibold text-ink-700">{success.message}</div>
        <Button size="lg" variant="secondary" iconRight="arrow-right" href={success.action.href}>
          {success.action.label}
        </Button>
      </Panel>
    );
  }

  if (payment.status === "failed") {
    return (
      <Panel tone="error">
        <Mascot pose="sad" size={130} />
        <h2 className="m-0 text-[28px] font-black text-error-700">Paiement échoué</h2>
        <p className="m-0 text-[15px] leading-normal font-semibold text-ink-700">
          {NOT_DEBITED.has(payment.failureCode) ? texts.notDebited : texts.failedNeutral}
        </p>
        {payment.failureReason && (
          <p className="m-0 rounded-[14px] border-2 border-error-100 bg-error-50 px-4 py-3 text-[13px] font-extrabold text-error-700">
            Raison : {payment.failureReason}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={onChangeNumber}>
            Changer de numéro
          </Button>
          <Button onClick={onRetry} loading={retrying}>
            Réessayer le paiement
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel tone="pending">
      <Mascot pose="focus" size={120} />
      <Loader label={`${texts.sentTo} ${payment.msisdnMasked}`} />
      <h2 className="m-0 text-[22px] font-black text-ink-900">{texts.pendingTitle}</h2>
      <p className="m-0 max-w-100 text-[15px] leading-normal font-semibold text-ink-600">{texts.pendingBody}</p>
      <div aria-live="polite">
        {slow && (
          <p className="m-0 rounded-[14px] bg-amber-50 px-4 py-3 text-sm font-bold text-ink-700">
            {texts.stillPending}{" "}
            <Link href={ordersHref} className="font-black text-primary-600 underline">
              {texts.orders}
            </Link>
          </p>
        )}
      </div>
    </Panel>
  );
}

const PANEL_TONES = {
  pending: "border-ink-100",
  success: "border-success-500 shadow-[0_8px_0_var(--success-200)]",
  error: "border-error-300 shadow-[0_8px_0_var(--error-100)]",
} as const;

function Panel({ tone, children }: { tone: keyof typeof PANEL_TONES; children: ReactNode }) {
  return (
    <section
      aria-live={tone === "pending" ? undefined : "polite"}
      className={cx(
        "flex flex-col items-center gap-5 rounded-[28px] border-[3px] bg-surface px-6 py-10 text-center sm:px-11",
        PANEL_TONES[tone],
      )}
    >
      {children}
    </section>
  );
}
