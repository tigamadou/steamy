import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Breadcrumb, Button, SkeletonBlock } from "@/components/ds";
import { getChild } from "@/features/parent/children/api";
import { fullName } from "@/features/parent/children/ChildRow";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { CancelDeletionButton } from "./CancelDeletionButton";
import { ChildDeletionRequest } from "./ChildDeletionRequest";
import { DeleteChildForm } from "./DeleteChildForm";

type Query = Record<string, string | string[] | undefined>;

/** Demande de l'enfant lue dans l'URL (`?demande=<id>`), ignorée si illisible. */
export function parseRequestId(value: string | string[] | undefined): string | null {
  const id = Array.isArray(value) ? value[0] : value;
  return id && /^\d+$/.test(id) ? id : null;
}

function Notice({ title, children, childId }: { title: string; children: ReactNode; childId: number }) {
  return (
    <section
      aria-labelledby="suppression-etat"
      className="flex flex-col gap-3 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-7"
    >
      <h2 id="suppression-etat" className="m-0 text-xl font-black text-ink-900">
        {title}
      </h2>
      {children}
      <div className="self-start">
        <Button variant="outline" href={routes.parent.child(childId)}>
          Retour au profil
        </Button>
      </div>
    </section>
  );
}

/**
 * WPD09 · Supprimer le compte d'un enfant (D54) : à l'initiative du parent (`DeleteChildForm`), ou validation de la
 * demande de l'enfant (`?demande=<id>`, `ChildDeletionRequest`). Suppression déjà programmée : rappel et « Annuler la
 * suppression ». L'enfant ou la demande d'un autre parent → « introuvable ».
 */
export async function DeleteChild({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const child = await getChild(id);
  if (!child) return null;
  const name = fullName(child);
  const { deletion } = child;
  const requestId = parseRequestId(query.demande) ?? (deletion?.status === "pending_parent" ? String(deletion.id) : null);

  let content;
  if (deletion?.status === "scheduled") {
    content = (
      <Notice title="Suppression programmée" childId={child.id}>
        <p className="m-0 text-sm leading-normal font-semibold text-ink-700">
          Le compte de {child.firstName} est désactivé
          {deletion.scheduledFor ? (
            <>
              {" "}
              et sera anonymisé le <time dateTime={deletion.scheduledFor}>{formatInstant(deletion.scheduledFor)}</time>
            </>
          ) : null}
          . Vous pouvez encore annuler la suppression.
        </p>
        <div className="self-start">
          <CancelDeletionButton childId={child.id} firstName={child.firstName} />
        </div>
      </Notice>
    );
  } else if (requestId) {
    const api = await getServerApi();
    const result = await api.GET("/api/accounts/deletion-requests/{id}/", { params: { path: { id: requestId } } });
    if (result.response.status === 404) notFound();
    const request = readOrNull(result);
    if (!request) return null;
    if (request.accountId !== child.id) notFound();
    content =
      request.status === "pending_parent" ? (
        <ChildDeletionRequest request={request} />
      ) : (
        <Notice title="Cette demande a déjà été traitée" childId={child.id}>
          <p className="m-0 text-sm font-semibold text-ink-700">
            La demande de suppression de {child.firstName} n&apos;attend plus votre réponse.
          </p>
        </Notice>
      );
  } else {
    content = <DeleteChildForm child={{ id: child.id, firstName: child.firstName }} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-4">
      <Breadcrumb
        items={[
          { label: "Mes enfants", href: routes.parent.children },
          { label: name, href: routes.parent.child(child.id) },
          { label: "Supprimer le compte" },
        ]}
      />
      {content}
    </div>
  );
}

/** Squelette de WPD09. */
export function DeleteChildSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de la suppression du compte…" className="mx-auto flex w-full max-w-160 flex-col gap-4">
      <SkeletonBlock className="h-4 w-56 rounded-sm" />
      <SkeletonBlock className="h-96 rounded-[22px]" />
    </div>
  );
}
