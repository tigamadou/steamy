import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { articleComponents, legalComponents } from "./mdx";

function Sample({ components }: { components: typeof articleComponents }) {
  const {
    a: A,
    H2,
    h3: H3,
    p: P,
    ul: Ul,
    ol: Ol,
    li: Li,
    strong: Strong,
  } = components as Record<string, React.ComponentType<Record<string, unknown>>>;
  return (
    <>
      <H2 id="ancre">Titre</H2>
      <H3>Sous-titre</H3>
      <P>
        <Strong>Gras</Strong> <A href="/aide#contact">interne</A> <A href="https://exemple.org">externe</A>
      </P>
      <Ul>
        <Li>puce</Li>
      </Ul>
      <Ol>
        <Li>numéro</Li>
      </Ol>
    </>
  );
}

describe.each([
  ["article", articleComponents],
  ["légal", legalComponents],
])("typographie MDX (%s)", (_, components) => {
  it("stylise titres, paragraphes, listes et liens", () => {
    render(<Sample components={components} />);
    expect(screen.getByRole("heading", { level: 2, name: "Titre" })).toHaveAttribute("id", "ancre");
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("scroll-mt-24");
    expect(screen.getByRole("heading", { level: 3, name: "Sous-titre" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "interne" })).toHaveAttribute("href", "/aide#contact");
    expect(screen.getByRole("link", { name: "externe" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByRole("list")).toHaveLength(2);
  });

  it("traite un lien sans cible comme externe", () => {
    const A = components.a as React.ComponentType<{ children: string }>;
    render(<A>vide</A>);
    expect(screen.getByText("vide")).toHaveAttribute("target", "_blank");
  });
});
