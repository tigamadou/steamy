import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import type { LearnerProfile } from "./api";

const PATCH = vi.fn();
const router = { refresh: vi.fn() };
type Referential = { items?: object[]; status: string; retry: () => void };
const referentials: Record<string, Referential> = {};
const useReferential = vi.fn<(name: string, options?: { country?: string }) => Referential>(
  (name, options) =>
    referentials[options?.country ? `${name}?${options.country}` : name] ?? { status: "idle", retry: () => {} },
);
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential }));

const { ProfileForm } = await import("./ProfileForm");

const ready = (items: object[]): Referential => ({ items, status: "ready", retry: vi.fn() });

const PROFILE: LearnerProfile = {
  birthDate: "2012-03-14",
  locality: { id: 12, country: "BJ", city: "Cotonou", district: "Cocotomey", areaType: "urban" },
  email: "lea@exemple.bj",
  schoolGrade: { id: 4, code: "4e", label: "4ᵉ" },
  gender: "female",
  disability: null,
  goals: [
    { id: 1, code: "robots", label: "Robots", emoji: "🤖" },
    { id: 2, code: "coder", label: "Code", emoji: "💻" },
  ],
  avatar: { id: 6, code: "hibou", label: "Hibou", emoji: "🦉", color: "primary-500" },
  profileStep: null,
};

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>, message = "") =>
  respond(status, {
    error: {
      code,
      message,
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const save = () => userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
const birthDate = () => screen.getByLabelText(/^Date de naissance/);
const locality = () => screen.getByRole("combobox", { name: /^Localité/ });

describe("ProfileForm (WD17)", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.refresh.mockReset();
    useReferential.mockClear();
    for (const key of Object.keys(referentials)) delete referentials[key];
    referentials.countries = ready([
      { id: 1, code: "BJ", label: "Bénin" },
      { id: 2, code: "TG", label: "Togo" },
    ]);
    referentials["localities?BJ"] = ready([
      { id: 12, country: "BJ", city: "Cotonou", district: "Cocotomey", areaType: "urban" },
      { id: 13, country: "BJ", city: "Parakou", areaType: "urban" },
    ]);
    referentials["localities?TG"] = ready([{ id: 30, country: "TG", city: "Lomé", areaType: "urban" }]);
    referentials["school-grades"] = ready([
      { id: 3, code: "5e", label: "5ᵉ" },
      { id: 4, code: "4e", label: "4ᵉ" },
    ]);
    referentials.goals = ready([
      { id: 1, code: "robots", label: "Robots", emoji: "🤖" },
      { id: 2, code: "coder", label: "Code", emoji: "💻" },
      { id: 3, code: "ia", label: "IA" },
    ]);
    referentials.avatars = ready([
      { id: 6, code: "hibou", label: "Hibou", emoji: "🦉", color: "primary-500" },
      { id: 7, code: "renard", label: "Renard", emoji: "🦊", color: "amber-500" },
    ]);
  });

  it("préremplit le formulaire avec le profil de l'API", async () => {
    const { container } = render(<ProfileForm profile={PROFILE} />);
    expect(birthDate()).toHaveValue("2012-03-14");
    expect(screen.getByRole("combobox", { name: /^Pays/ })).toHaveValue("BJ");
    expect(locality()).toHaveValue("12");
    expect(screen.getByRole("option", { name: "Cotonou · Cocotomey" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Parakou" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Email/ })).toHaveValue("lea@exemple.bj");
    expect(screen.getByRole("combobox", { name: /^Classe/ })).toHaveValue("4e");
    expect(screen.getByRole("radio", { name: "Fille" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Robots/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /IA/ })).not.toBeChecked();
    expect(screen.getByText("Hibou", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/Le genre est facultatif/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/apprenant/profil");
    expect(useReferential).toHaveBeenCalledWith("localities", { country: "BJ" });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("enregistre tout le profil en un PATCH, rafraîchit le shell et confirme", async () => {
    PATCH.mockResolvedValue(respond(200, { data: PROFILE }));
    render(<ProfileForm profile={PROFILE} />);
    fireEvent.change(birthDate(), { target: { value: "2012-05-01" } });
    await userEvent.selectOptions(locality(), "13");
    await userEvent.clear(screen.getByRole("textbox", { name: /^Email/ }));
    await userEvent.type(screen.getByRole("textbox", { name: /^Email/ }), "  ");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Classe/ }), "5e");
    await userEvent.click(screen.getByRole("radio", { name: "Ne pas dire" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /IA/ }));
    await userEvent.click(screen.getByRole("button", { name: "Changer" }));
    await userEvent.click(screen.getByRole("radio", { name: "Renard" }));
    await save();
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/learner-profile/", {
      body: {
        birthDate: "2012-05-01",
        locality: 13,
        email: null,
        schoolGrade: "5e",
        gender: null,
        goals: ["robots", "coder", "ia"],
        avatar: "renard",
      },
    });
    const toast = await screen.findByRole("status", { name: "" });
    expect(toast).toHaveTextContent("Ton profil est enregistré.");
    await userEvent.click(within(toast).getByRole("button", { name: "Fermer" }));
    expect(screen.queryByText("Ton profil est enregistré.")).not.toBeInTheDocument();
  });

  it("affiche les erreurs de champ issues de `fields`, sous leur champ et dans le récapitulatif", async () => {
    PATCH.mockResolvedValue(
      failure(400, "VALIDATION_ERROR", {
        birthDate: "La date de naissance ne correspond pas à l'âge indiqué à l'inscription.",
        email: "Saisissez une adresse email valide.",
        goals: "Choisis au moins 2 objectifs.",
        avatar: "Cet avatar n'existe plus.",
        gender: "Choix invalide.",
        schoolGrade: "Classe inconnue.",
        locality: "Localité inconnue.",
      }),
    );
    render(<ProfileForm profile={PROFILE} />);
    await save();
    const summary = await screen.findByRole("alert");
    const links = within(summary).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#avatar",
      "#naissance",
      "#localite",
      "#email",
      "#classe",
      "#genre",
      "#objectifs",
    ]);
    expect(birthDate()).toHaveAccessibleDescription(
      "La date de naissance ne correspond pas à l'âge indiqué à l'inscription.",
    );
    expect(screen.getByRole("textbox", { name: /^Email/ })).toHaveAccessibleDescription(
      "Saisissez une adresse email valide.",
    );
    expect(screen.getByRole("group", { name: "Objectifs" })).toHaveAccessibleDescription("Choisis au moins 2 objectifs.");
    // Une erreur sur l'avatar garde la grille ouverte
    expect(screen.getByRole("group", { name: "Choisis ton avatar" })).toHaveAccessibleDescription(
      "Cet avatar n'existe plus.",
    );
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("une erreur sur un champ absent du formulaire reste lisible en tête", async () => {
    PATCH.mockResolvedValue(failure(400, "VALIDATION_ERROR", { disability: "Handicap inconnu.", email: "Email invalide." }));
    render(<ProfileForm profile={PROFILE} />);
    await save();
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Handicap inconnu.");
    expect(within(summary).getByRole("link", { name: "Email invalide." })).toHaveAttribute("href", "#email");
  });

  it("sans `fields` : message du code (réseau, panne)", async () => {
    PATCH.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<ProfileForm profile={PROFILE} />);
    await save();
    expect(await screen.findByRole("alert")).toHaveTextContent("Le serveur est injoignable.");
  });

  it("exige date, localité et classe sans appeler l'API ; changer de pays vide la localité", async () => {
    render(<ProfileForm profile={{ ...PROFILE, schoolGrade: null }} />);
    fireEvent.change(birthDate(), { target: { value: "" } });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Pays/ }), "TG");
    expect(locality()).toHaveValue("");
    expect(screen.getByRole("option", { name: "Lomé" })).toBeInTheDocument();
    await save();
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Indique ta date de naissance.");
    expect(summary).toHaveTextContent("Choisis ta ville ou ton quartier.");
    expect(summary).toHaveTextContent("Choisis ta classe.");
    expect(PATCH).not.toHaveBeenCalled();
  });

  it("profil sans avatar ni valeurs facultatives : avatar omis, genre et email vides", async () => {
    PATCH.mockResolvedValue(respond(200, { data: PROFILE }));
    render(
      <ProfileForm profile={{ ...PROFILE, avatar: null, email: null, gender: null, birthDate: null, locality: null }} />,
    );
    expect(screen.getByText("Aucun avatar choisi")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ne pas dire" })).toBeChecked();
    expect(useReferential).toHaveBeenCalledWith("localities", { country: "" });
    expect(locality()).toHaveValue("");
  });

  it("enregistre sans avatar quand le profil n'en a pas", async () => {
    PATCH.mockResolvedValue(respond(200, { data: PROFILE }));
    render(<ProfileForm profile={{ ...PROFILE, avatar: null }} />);
    await save();
    await waitFor(() => expect(PATCH).toHaveBeenCalled());
    expect(PATCH.mock.calls[0][1].body).not.toHaveProperty("avatar");
  });

  it("ouvre et ferme la grille des avatars", async () => {
    render(<ProfileForm profile={PROFILE} />);
    const toggle = screen.getByRole("button", { name: "Changer" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "Choisis ton avatar" })).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("radio", { name: "Hibou" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("button", { name: "Changer" })).toHaveAttribute("aria-expanded", "false");
  });

  it("référentiels en chargement puis en erreur, avec « Réessayer »", async () => {
    referentials.avatars = { status: "loading", retry: vi.fn() };
    referentials.goals = { status: "idle", retry: vi.fn() };
    referentials.countries = { status: "idle", retry: vi.fn() };
    const { rerender } = render(<ProfileForm profile={PROFILE} />);
    await userEvent.click(screen.getByRole("button", { name: "Changer" }));
    expect(screen.getByText("Chargement des avatars…")).toBeInTheDocument();
    expect(screen.getByText("Chargement des objectifs…")).toBeInTheDocument();
    expect(screen.getByText("Aucun avatar choisi")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Pays/ })).toBeDisabled();

    referentials.avatars = { status: "error", retry: vi.fn() };
    referentials.goals = { status: "error", retry: vi.fn() };
    rerender(<ProfileForm profile={PROFILE} />);
    expect(screen.getByText("Impossible de charger les avatars.")).toBeInTheDocument();
    expect(screen.getByText("Impossible de charger les objectifs.")).toBeInTheDocument();
    const retries = screen.getAllByRole("button", { name: "Réessayer" });
    await userEvent.click(retries[0]);
    await userEvent.click(retries[1]);
    expect(referentials.avatars.retry).toHaveBeenCalled();
    expect(referentials.goals.retry).toHaveBeenCalled();
  });
});
