import type { MDXContent } from "mdx/types";

import { LEGAL_DOCS, type LegalDoc } from "@/lib/routes";

import * as cgu from "./cgu.mdx";
import * as confidentialite from "./confidentialite.mdx";
import * as mentionsLegales from "./mentions-legales.mdx";

// Documents légaux de WL09 (D10). Textes de départ, à faire valider juridiquement (D6).

export type LegalMeta = {
  title: string;
  /** Date de dernière mise à jour, ISO `AAAA-MM-JJ`. */
  updatedAt: string;
};

export type LegalDocument = LegalMeta & { doc: LegalDoc; tab: string; Content: MDXContent };

const MODULES: Record<LegalDoc, { tab: string; module: { default: MDXContent; metadata: unknown } }> = {
  cgu: { tab: "CGU", module: cgu },
  "mentions-legales": { tab: "Mentions légales", module: mentionsLegales },
  confidentialite: { tab: "Confidentialité", module: confidentialite },
};

export const LEGAL_DOCUMENTS: LegalDocument[] = LEGAL_DOCS.map((doc) => ({
  doc,
  tab: MODULES[doc].tab,
  ...(MODULES[doc].module.metadata as LegalMeta),
  Content: MODULES[doc].module.default,
}));

export function getLegalDocument(doc: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.doc === doc);
}
