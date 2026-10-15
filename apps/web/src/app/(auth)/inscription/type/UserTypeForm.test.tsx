import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { UserTypeForm } = await import("./UserTypeForm");

const submit = () => userEvent.click(screen.getByRole("button", { name: "Continuer" }));

describe("UserTypeForm (W03)", () => {
  beforeEach(() => router.push.mockReset());

  it("exige un profil avant de continuer, puis efface l'erreur au choix", async () => {
    render(<UserTypeForm />);
    await submit();
    expect(screen.getByText("Choisis ton profil pour continuer.")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("radio", { name: /Un·e apprenant·e/ }));
    expect(screen.queryByText("Choisis ton profil pour continuer.")).toBeNull();
  });

  it("mène l'apprenant à W04", async () => {
    render(<UserTypeForm />);
    await userEvent.click(screen.getByRole("radio", { name: /Un·e apprenant·e/ }));
    await submit();
    expect(router.push).toHaveBeenCalledWith("/inscription/apprenant/identite");
  });

  it("mène le parent à son inscription", async () => {
    render(<UserTypeForm />);
    await userEvent.click(screen.getByRole("radio", { name: /Un parent/ }));
    await submit();
    expect(router.push).toHaveBeenCalledWith("/inscription/parent");
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<UserTypeForm />);
    await submit();
    expect(await axe(container)).toHaveNoViolations();
  });
});
