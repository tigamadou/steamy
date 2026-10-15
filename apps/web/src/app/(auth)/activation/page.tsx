import type { Metadata } from "next";

import { InvalidInvitation } from "./InvalidInvitation";

export const metadata: Metadata = { title: "Activation du compte" };

// `/activation` sans jeton : lien incomplet, ou page rechargée après le retrait du jeton de l'historique.
export default function ActivationWithoutToken() {
  return <InvalidInvitation />;
}
