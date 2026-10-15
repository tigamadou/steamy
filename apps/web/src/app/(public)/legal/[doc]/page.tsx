import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Tabs } from "@/components/ds";
import { legalComponents } from "@/components/public/mdx";
import { getLegalDocument, LEGAL_DOCUMENTS } from "@/content/legal";
import { formatDate } from "@/lib/dates";
import { LEGAL_DOCS, routes } from "@/lib/routes";

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const document = getLegalDocument((await params).doc);
  return document
    ? { title: document.title, alternates: { canonical: routes.legal(document.doc) } }
    : { title: "Page introuvable" };
}

const TABS = LEGAL_DOCUMENTS.map((document) => ({ href: routes.legal(document.doc), label: document.tab }));

/** WL09 · Informations légales : un onglet adressable par document, section `#consentement-parental` des CGU. */
export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const document = getLegalDocument((await params).doc);
  if (!document) {
    notFound();
  }
  const { Content } = document;
  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="text-[30px] font-black text-ink-900 sm:text-4xl">Informations légales</h1>
      <Tabs items={TABS} activeHref={routes.legal(document.doc)} label="Documents légaux" className="my-5" />
      <article className="rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-5 sm:p-7">
        <h2 className="text-[22px] font-black text-ink-900">{document.title}</h2>
        <div className="[&>h2:first-child]:mt-4">
          <Content components={legalComponents} />
        </div>
        <p className="mt-6 text-xs font-bold text-ink-600">
          Dernière mise à jour : <time dateTime={document.updatedAt}>{formatDate(document.updatedAt)}</time>
        </p>
      </article>
    </div>
  );
}
