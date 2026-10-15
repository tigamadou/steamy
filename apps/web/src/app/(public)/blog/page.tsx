import type { Metadata } from "next";

import { ArticleCard, FeaturedArticleCard } from "@/components/public/editorial";
import { ARTICLES, BLOG_PAGE_SIZE } from "@/content/blog";

const DESCRIPTION = "Conseils, retours d'expérience et actus du STEM en Afrique francophone.";

export const metadata: Metadata = {
  title: "Blog",
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
};

/**
 * WL17 · Blog : l'article le plus récent à la une, puis les suivants. Une page tient `BLOG_PAGE_SIZE` articles ;
 * au-delà, ajouter les pages statiques `/blog/page/<n>`.
 */
export default function BlogPage() {
  const [featured, ...others] = ARTICLES.slice(0, BLOG_PAGE_SIZE);
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="text-[30px] font-black text-ink-900 sm:text-4xl">Le blog Steamy</h1>
      <p className="mt-2.5 max-w-[560px] text-base leading-normal font-semibold text-ink-600">{DESCRIPTION}</p>
      <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-[1.3fr_1fr]">
        <FeaturedArticleCard article={featured} />
        <div className="flex flex-col gap-3">
          {others.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}
