import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const getCountries = vi.fn(async () => [
  { id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" },
]);
vi.mock("@/lib/referentials", () => ({ getCountries }));
vi.mock("./QuoteForm", () => ({
  QuoteForm: ({ countries }: { countries: unknown[] }) => <p>formulaire avec {countries.length} pays</p>,
}));

const { FormSkeleton, QuoteSection } = await import("./form-sections");
const { Honeypot, SentConfirmation } = await import("./forms");

describe("sections de formulaire", () => {
  it("passe les pays du référentiel au formulaire de devis", async () => {
    render(await QuoteSection());
    expect(screen.getByText("formulaire avec 1 pays")).toBeInTheDocument();
  });

  it("skeleton verbalisé", () => {
    render(<FormSkeleton label="Chargement…" />);
    expect(screen.getByRole("status", { name: "Chargement…" })).toBeInTheDocument();
  });

  it("champ piège hors du parcours clavier, confirmation qui prend le focus", () => {
    const { container } = render(
      <>
        <Honeypot />
        <SentConfirmation title="Envoyé" action={<button>Encore</button>}>
          Merci.
        </SentConfirmation>
      </>,
    );
    expect(container.querySelector("input[name='website']")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("status")).toHaveFocus();
  });
});
