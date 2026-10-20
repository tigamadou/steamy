"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Modal } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";
import { routes } from "@/lib/routes";

/** Texte de la suppression du compte parent (D54, D40) : ni « définitivement » ni « irréversible ». */
export const ACCOUNT_DELETION_TEXT =
  "Votre compte est désactivé immédiatement puis anonymisé dans 30 jours. Pendant ce délai, notre équipe peut l'annuler à votre demande. Les factures sont conservées.";

/**
 * Zone sensible de WPD08 : « Supprimer mon compte » (D54), désactivé tant qu'un enfant est rattaché
 * (`CHILDREN_STILL_LINKED`) : il faut d'abord supprimer chaque enfant, ou le transférer à un autre parent par le
 * support (D22). La suppression ferme la session aussitôt.
 */
export function DangerZone({ childrenCount }: { childrenCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const blocked = childrenCount > 0;

  async function confirm() {
    setPending(true);
    setError(undefined);
    const result = await apiCall((api) => api.POST("/api/accounts/me/deletion-request/", { body: { note: "" } }));
    setPending(false);
    if (!result.ok) {
      setError(
        result.code === "CHILDREN_STILL_LINKED"
          ? "Des enfants sont encore rattachés à votre compte : supprimez ou transférez chacun d'eux d'abord."
          : errorMessage(result, "vous"),
      );
      return;
    }
    router.replace(routes.home);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border-[1.5px] border-error-300 bg-surface p-4.5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <h3 className="m-0 text-sm font-black text-error-700">Supprimer mon compte</h3>
        <p id="suppression-compte" className="m-0 mt-1 text-[13px] font-semibold text-ink-600">
          {blocked ? (
            <>
              Supprimez d&apos;abord le compte de chacun de vos enfants, ou demandez son transfert à un autre parent en{" "}
              <a href={routes.contact("changement-parent")} className="font-extrabold text-primary-600 underline">
                contactant le support
              </a>
              .
            </>
          ) : (
            ACCOUNT_DELETION_TEXT
          )}
        </p>
      </div>
      <Button
        variant="danger"
        size="sm"
        disabled={blocked}
        aria-describedby="suppression-compte"
        onClick={() => setOpen(true)}
        className="self-start sm:self-auto"
      >
        Supprimer
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        variant="danger"
        icon="⚠️"
        title="Supprimer votre compte ?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" loading={pending} onClick={() => void confirm()}>
              Supprimer mon compte
            </Button>
          </>
        }
      >
        <p className="m-0">{ACCOUNT_DELETION_TEXT}</p>
        {error && (
          <p role="alert" className="m-0 mt-3 font-bold text-error-700">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
