import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ARTICLES } from "@/content/blog";
import { GUIDES } from "@/content/guides";
import { axe } from "@/test/axe";

import { ArticleByline, ArticleCard, FeaturedArticleCard, GuideCard } from "./editorial";

const article = ARTICLES.find((a) => a.slug === "debuter-en-robotique")!;

describe("cartes éditoriales", () => {
  it("article à la une : catégorie, titre-lien, chapô, auteur, date et durée", () => {
    render(<FeaturedArticleCard article={article} />);
    expect(screen.getByText("À la une · Robotique")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: article.title })).toHaveAttribute("href", "/blog/debuter-en-robotique");
    expect(screen.getByText(article.excerpt)).toBeInTheDocument();
    expect(screen.getByText(/^Par Koffi Adékambi/)).toHaveTextContent(
      "Par Koffi Adékambi · 28 mai 2026 · 6 min de lecture",
    );
  });

  it("article secondaire : catégorie, titre-lien, date", () => {
    render(<ArticleCard article={article} />);
    expect(screen.getByRole("heading", { level: 3, name: article.title })).toBeInTheDocument();
    expect(screen.getByText("28 mai 2026")).toHaveAttribute("datetime", "2026-05-28");
  });

  it("ligne d'auteur avec avatar décoratif", () => {
    const { container } = render(<ArticleByline article={article} avatar />);
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  it("guide : téléchargement libre du PDF, nombre de pages annoncé", () => {
    const guide = GUIDES[0];
    render(<GuideCard guide={guide} />);
    const link = screen.getByRole("link", { name: `Télécharger « ${guide.title} » (PDF, ${guide.pages} pages)` });
    expect(link).toHaveAttribute("href", guide.file);
    expect(link).toHaveAttribute("download");
    expect(screen.getByText(`PDF · ${guide.pages} pages`)).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <main>
        <FeaturedArticleCard article={article} />
        <ArticleCard article={ARTICLES[1]} />
        <GuideCard guide={GUIDES[1]} />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
