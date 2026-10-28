import { notFound } from "next/navigation";

import { SkeletonBlock } from "@/components/ds";
import { getDeliveryAddress } from "@/features/account/api";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { getCurrentUser } from "@/lib/auth/session";
import { getCountries } from "@/lib/referentials";

import { ClosedRequest } from "./ClosedRequest";
import { PaymentRequestFlow } from "./PaymentRequestFlow";
import { PaymentRequestSummary } from "./PaymentRequestSummary";

/** Identifiant de demande lisible dans l'URL, sinon introuvable. */
export function parseRequestId(id: string): number | null {
  return /^\d{1,12}$/.test(id) ? Number(id) : null;
}

/**
 * WPD15 · demande de paiement, côté serveur : demande du parent (une demande d'une autre famille répond 404 →
 * « Demande introuvable »), enfant bénéficiaire, kit requis du parcours, commande en attente à reprendre, adresse et
 * Mobile Money préférés (WPD08).
 */
export async function PaymentRequestScreen({ params }: { params: Promise<{ id: string }> }) {
  const id = parseRequestId((await params).id);
  if (id === null) notFound();
  const api = await getServerApi();
  const response = await api.GET("/api/payments/payment-requests/{id}/", { params: { path: { id } } });
  if (response.response.status === 404) notFound();
  const request = readOrNull(response);
  if (!request) return null;

  const [childResponse, me, course] = await Promise.all([
    api.GET("/api/accounts/children/{id}/", { params: { path: { id: String(request.learner.id) } } }),
    getCurrentUser(),
    request.course
      ? api.GET("/api/catalog/courses/{slug}/", { params: { path: { slug: request.course.slug } } })
      : Promise.resolve(null),
  ]);
  const child = readOrNull(childResponse);
  if (!child || !me) return null;
  const requiredKit = course?.data?.requiredKit ?? null;

  if (request.status !== "pending") {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <PaymentRequestSummary
          request={request}
          child={child}
          state={request.status}
          requiredKit={requiredKit}
        />
        <ClosedRequest request={request} firstName={child.firstName} />
      </div>
    );
  }

  const [profile, address, countries, order] = await Promise.all([
    api.GET("/api/accounts/me/parent-profile/"),
    request.kind === "kit" ? getDeliveryAddress() : Promise.resolve(null),
    getCountries(),
    request.pendingOrderReference
      ? api.GET("/api/payments/orders/{reference}/", { params: { path: { reference: request.pendingOrderReference } } })
      : Promise.resolve(null),
  ]);
  const parent = readOrNull(profile);
  if (!parent) return null;
  // Date et lieu d'un événement : la demande ne les porte pas, on les lit sur la fiche de l'événement de la commande
  const eventSlug = order?.data?.items.find((item) => item.eventSlug)?.eventSlug;
  const event = eventSlug
    ? ((await api.GET("/api/events/{slug}/", { params: { path: { slug: eventSlug } } })).data ?? null)
    : null;

  return (
    <PaymentRequestFlow
      request={request}
      child={child}
      requiredKit={requiredKit}
      order={order?.data ?? null}
      event={event}
      address={address}
      defaultCountry={parent.locality?.country ?? ""}
      parentName={`${me.firstName} ${me.lastName}`.trim()}
      countries={countries}
      preferred={parent.mobileMoney}
    />
  );
}

/** Squelette de WPD15 : récapitulatif et formulaire de paiement. */
export function PaymentRequestSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de la demande…"
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]"
    >
      <SkeletonBlock className="h-110 rounded-[22px]" />
      <SkeletonBlock className="h-96 rounded-[22px]" />
    </div>
  );
}
