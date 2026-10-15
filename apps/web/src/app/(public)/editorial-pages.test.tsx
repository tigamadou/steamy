import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ARTICLES } from "@/content/blog";
import { axe } from "@/test/axe";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound, usePathname: () => "/" }));

const legal = await import("./legal/[doc]/page");
const about = await import("./a-propos/page");
const blog = await import("./blog/page");
const article = await import("./blog/[slug]/page");
const guides = await import("./guides/page");
const { default: PublicNotFound } = await import("./not-found");

const params = <T,>(value: T) => ({ params: Promise.resolve(value) }) as never;

describe("WL09 · /legal/[doc]", () => {
  it("prérend les trois documents", () => {
    expect(legal.generateStaticParams()).toEqual([
      { doc: "cgu" },
      { doc: "mentions-legales" },
      { doc: "confidentialite" },
    ]);
  });

  it("affiche le document dans son onglet, avec sa date de mise à jour", async () => {
    render(await legal.default(params({ doc: "cgu" })));
    expect(screen.getByRole("heading", { level: 1, name: "Informations légales" })).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Documents légaux" });
    expect(within(tabs).getByRole("link", { name: "CGU" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Confidentialité" })).toHaveAttribute(
      "href",
      "/legal/confidentialite",
    );
    expect(screen.getByRole("heading", { level: 2, name: "3. Consentement parental" })).toHaveAttribute(
      "id",
      "consentement-parental",
    );
    expect(screen.getByText(/Dernière mise à jour/)).toHaveTextContent("15 octobre 2026");
  });

  it("titre et URL canonique par document ; 404 pour un document inconnu", async () => {
    expect(await legal.generateMetadata(params({ doc: "confidentialite" }))).toEqual({
      title: "Politique de confidentialité",
      alternates: { canonical: "/legal/confidentialite" },
    });
    expect(await legal.generateMetadata(params({ doc: "inconnu" }))).toEqual({
      title: "Page introuvable",
    });
    await expect(legal.default(params({ doc: "inconnu" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("WL10 · /a-propos", () => {
  it("mission, chiffres, valeurs et équipe adulte", async () => {
    const { container } = render(<main>{about.default()}</main>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Former les inventeurs de demain");
    expect(screen.getByText("Apprenants")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Apprendre en faisant",
      "Accessible à tous",
      "Ensemble",
    ]);
    expect(screen.getByText("Koffi Adékambi")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
    expect(about.metadata.title).toBe("À propos");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("WL17 · /blog", () => {
  it("met le plus récent à la une et liste les autres", () => {
    render(blog.default());
    expect(screen.getByRole("heading", { level: 1, name: "Le blog Steamy" })).toBeInTheDocument();
    expect(screen.getByText(`À la une · ${ARTICLES[0].category}`)).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(ARTICLES.length);
  });
});

describe("WL18 · /blog/[slug]", () => {
  it("prérend chaque article", () => {
    expect(article.generateStaticParams()).toEqual(ARTICLES.map((a) => ({ slug: a.slug })));
  });

  it("fil d'Ariane, auteur, corps, partage et données structurées Article", async () => {
    const { container } = render(await article.default(params({ slug: "debuter-en-robotique" })));
    const crumbs = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(within(crumbs).getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Débuter en robotique");
    expect(screen.getByRole("heading", { level: 2, name: "Pas besoin d'un labo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Partager sur X (nouvel onglet)" })).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("https://steamy.example/blog/debuter-en-robotique")),
    );
    const jsonLd = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.innerHTML);
    expect(jsonLd).toMatchObject({
      "@type": "Article",
      datePublished: "2026-05-28",
      author: { name: "Koffi Adékambi" },
    });
  });

  it("métadonnées de l'article ; 404 pour un slug inconnu", async () => {
    expect(await article.generateMetadata(params({ slug: "debuter-en-robotique" }))).toMatchObject({
      title: "Débuter en robotique à 12 ans : par où commencer ?",
      openGraph: { type: "article", publishedTime: "2026-05-28" },
    });
    expect(await article.generateMetadata(params({ slug: "inconnu" }))).toEqual({
      title: "Page introuvable",
    });
    await expect(article.default(params({ slug: "inconnu" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("WL20 · /guides", () => {
  it("liste les guides en téléchargement libre", () => {
    render(guides.default());
    expect(screen.getByRole("heading", { level: 1, name: "Guides gratuits" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Télécharger/ })).toHaveLength(3);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("404 d'un contenu public", () => {
  it("affiche l'état 404 sans second shell", () => {
    render(<PublicNotFound />);
    expect(screen.getByRole("heading", { name: "Cette page est introuvable" })).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });
});
