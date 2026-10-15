import { getServerApi } from "@/lib/api";

import { InvalidInvitation } from "../InvalidInvitation";
import { ActivationForm } from "./ActivationForm";

/** Lit l'invitation à la requête (jeton du chemin) : formulaire d'activation, ou lien expiré ou déjà utilisé. */
export async function InvitationGate({ params }: Pick<PageProps<"/activation/[token]">, "params">) {
  const { token } = await params;
  const api = await getServerApi();
  const { data, error } = await api.GET("/api/auth/teacher-invitations/{token}/", {
    params: { path: { token } },
  });
  if (data) return <ActivationForm token={token} invitation={data} />;
  if (error.code === "INVITATION_INVALID" || error.code === "NOT_FOUND") return <InvalidInvitation />;
  throw new Error(`Invitation illisible (${error.code})`);
}
