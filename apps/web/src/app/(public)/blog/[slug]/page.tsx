import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Badge, Breadcrumb } from "@/components/ds";
import { WLSocial } from "@/components/public";
import { ArticleByline } from "@/components/public/editorial";
import { articleComponents } from "@/components/public/mdx";
import { ARTICLES, getArticle } from "@/content/blog";
import { site, SITE_URL } from "@/content/site";
import { routes } from "@/lib/routes";

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) {
    return { title: "Page introuvable" };
  }
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: routes.article(article.slug) },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
    },
  };
}

/** Liens de partage de l'article (pas de suivi tiers chargé sur la page). */
function shareLinks(url: string, title: string) {
  const u = encodeURIComponent(url);
  return [
    {
      network: "x",
      label: "Partager sur X",
      href: `https://x.com/intent/post?url=${u}&text=${encodeURIComponent(title)}`,
    },
    {
      network: "linkedin",
      label: "Partager sur LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    },
  ] as const;
}

/** WL18 · Article : conteneur de lecture 760 px, fil d'Ariane, ligne d'auteur, corps MDX, partage. */
export default async function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  const article = getArticle((await params).slug);
  if (!article) {
    notFound();
  }
  const { Content } = article;
  const url = new URL(routes.article(article.slug), SITE_URL).toString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    author: { "@type": "Person", name: article.author },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: url,
  };
  return (
    <article className="mx-auto w-full max-w-[760px] px-4 pt-10 pb-14 sm:px-8">
      <script
        type="application/ld+json"
        // JSON-LD : `<` échappé pour qu'aucun contenu ne ferme la balise script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb
        items={[{ label: "Blog", href: routes.blog }, { label: article.category }, { label: article.title }]}
        className="mb-4"
      />
      <Badge tone="primary">{article.category}</Badge>
      <h1 className="mt-3.5 mb-3 text-[30px] leading-[1.15] font-black text-ink-900 sm:text-[38px]">{article.title}</h1>
      <ArticleByline article={article} avatar />
      <div
        aria-hidden
        className="my-6 flex h-52 items-center justify-center rounded-[22px] bg-(--visual) text-8xl sm:h-70"
        style={{ "--visual": article.color } as CSSProperties}
      >
        {article.emoji}
      </div>
      <Content components={articleComponents} />
      <div className="mt-8 flex items-center gap-3 border-t border-ink-100 py-4">
        <p className="text-[13px] font-extrabold text-ink-600">Partager :</p>
        <WLSocial light links={shareLinks(url, article.title)} />
      </div>
    </article>
  );
}
