import type { Metadata } from "next";
import { Suspense } from "react";

import { KeepToken } from "./KeepToken";

export const metadata: Metadata = { title: "Demande de consentement" };

async function TokenFromPath({ params }: Pick<PageProps<"/consentement/[token]">, "params">) {
  const { token } = await params;
  return <KeepToken token={token} />;
}

// Lien SMS `/consentement/<jeton>` : `Referrer-Policy: no-referrer` posé par next.config.ts
export default function ConsentLinkPage({ params }: PageProps<"/consentement/[token]">) {
  return (
    <Suspense fallback={null}>
      <TokenFromPath params={params} />
    </Suspense>
  );
}
