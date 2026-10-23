import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { classroom, member, school } from "@/test/teacher-fixtures";

const POST = vi.fn();
const GET = vi.fn();
const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/referentials", () => ({ getCountries: async () => COUNTRIES }));
vi.mock("next/navigation", () => ({ useRouter: () => router, notFound: () => undefined }));
vi.mock("@/lib/use-referential", () => ({
  useReferential: () => ({
    items: [
      { code: "mere", label: "Mère" },
      { code: "pere", label: "Père" },
    ],
    status: "ready",
    retry: vi.fn(),
  }),
}));

const COUNTRIES = [
  { code: "BJ", label: "Bénin", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
];

const { IndividualForm } = await import("./IndividualForm");
const { BatchImport } = await import("./BatchImport");
const { ImportReport, correctedLines, isEdited, reportSummary } = await import("./ImportReport");
const { AddLearners, AddLearnersSkeleton, NoClassroomForLearners, defaultClassroomOf } = await import("./AddLearners");

const CLASSROOMS = [
  { id: 3, name: "4ᵉ B · Robotique" },
  { id: 4, name: "3ᵉ A · Code" },
];
const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const failure = (status: number, code: string, message = "", fields?: Record<string, string>) => ({
  error: {
    code,
    message,
    fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
  },
  response: new Response(null, { status }),
});
const rowError = (line: number, code: string, data: object = {}) => ({
  line,
  code,
  message: `Message ${code}`,
  data,
});

beforeEach(() => {
  POST.mockReset();
  GET.mockReset();
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("WT06 · onglet Individuel", () => {
  async function fillAll(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^Prénom/), "Yao");
    await user.type(screen.getByLabelText(/^Nom/), "Kpadé");
    await user.type(screen.getByRole("textbox", { name: /Téléphone du parent/ }), "0197000001");
    await user.selectOptions(screen.getByRole("combobox", { name: /Lien de parenté/ }), "mere");
  }

  it("champs de §5.12, classe présélectionnée, encart SMS, aucun téléphone d'élève", async () => {
    const { container } = render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="4" />);
    expect(screen.getByRole("combobox", { name: /Classe/ })).toHaveValue("4");
    expect(screen.getByText(/Le parent reçoit une demande de consentement par SMS/)).toBeInTheDocument();
    expect(screen.queryByText(/16 ans|téléphone de l'élève|Téléphone de l'apprenant/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("champs vides : erreurs de forme, aucun appel", async () => {
    const user = userEvent.setup();
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} />);
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect((await screen.findAllByText("Indiquez le prénom de l'élève.")).length).toBeGreaterThan(0);
    for (const text of [
      "Indiquez le nom de l'élève.",
      "Saisissez un numéro valide pour ce pays.",
      "Choisissez le lien de parenté.",
      "Choisissez une classe.",
    ]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(POST).not.toHaveBeenCalled();
  });

  it("envoie la demande puis revient à WT04 avec la confirmation", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: member(), response: new Response(null, { status: 201 }) });
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="3" />);
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/classrooms/{id}/invitations/", {
        params: { path: { id: "3" } },
        body: { firstName: "Yao", lastName: "Kpadé", parentPhone: "+2290197000001", relationship: "mere" },
      }),
    );
    expect(router.push).toHaveBeenCalledWith("/enseignant/classes/3?confirmation=invitation");
  });

  it("numéro refusé par le serveur : message au champ", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(400, "PHONE_INVALID"));
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="3" />);
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect((await screen.findAllByText("Ce numéro n'est pas valide : vérifiez-le.")).length).toBeGreaterThan(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("erreurs de champ de l'API", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(400, "VALIDATION_ERROR", "", { firstName: "Prénom trop long.", relationship: "Lien inconnu." }));
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="3" />);
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect((await screen.findAllByText("Prénom trop long.")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lien inconnu.").length).toBeGreaterThan(0);
  });

  it.each([
    ["ALREADY_IN_CLASSROOM", "Cet élève est déjà dans la classe."],
    ["LEARNER_QUOTA_EXCEEDED", "Le quota d'élèves de l'offre est atteint."],
    ["CONSENT_COOLDOWN", "Ce parent a refusé une demande récemment."],
  ])("%s : le message du serveur reste affiché", async (code, message) => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(400, code, message));
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="3" />);
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
  });

  it("une seconde soumission avant la réponse ne repart pas", async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="3" />);
    await fillAll(user);
    const form = screen.getByRole("form", { name: "Ajouter un élève" });
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(POST).toHaveBeenCalledTimes(1);
    await act(async () => finish({ data: member(), response: new Response(null, { status: 201 }) }));
  });
});

describe("WT06 · onglet Import par lot", () => {
  const LIST = [
    "Prénom;Nom;Téléphone du parent;Lien de parenté",
    "Yao;Kpadé;0197000001;mère",
    "Sèna;Kpadé;0197000002;père",
    "Yao;Kpadé;0197000001;mère",
    "Ola;Gbaguidi;12;mère",
    "Tobi;Zinsou;0197000005",
    "Kémi;Ahouandjinou;0197000006;mère",
    "Awa;Dossou;0197000007;mère",
  ].join("\n");

  async function paste(user: ReturnType<typeof userEvent.setup>, text = LIST) {
    // `user.type` interprète « { » et « [ » : la liste est collée d'un coup
    await user.click(screen.getByRole("textbox", { name: /Ou collez une liste/ }));
    await user.paste(text);
  }
  const renderBatch = (defaultClassroom = "3") =>
    render(<BatchImport classrooms={CLASSROOMS} defaultClassroom={defaultClassroom} />);

  it("modèle CSV téléchargeable, colonnes attendues, classe présélectionnée", async () => {
    const { container } = renderBatch();
    const link = screen.getByRole("link", { name: "Télécharger le modèle CSV" });
    expect(link).toHaveAttribute("download", "modele-import-eleves.csv");
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain("Prénom;Nom;Téléphone du parent;Lien de parenté");
    expect(screen.getByRole("combobox", { name: /Classe/ })).toHaveValue("3");
    expect(screen.queryByText(/Aperçu/)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("aperçu des 5 premières lignes et lignes mal formées annoncées", async () => {
    const user = userEvent.setup();
    renderBatch();
    await paste(user);
    expect(screen.getByText("Aperçu : 5 premières lignes sur 7")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6);
    expect(screen.getByText(/1 ligne mal formée \(quatre colonnes renseignées attendues\) : elle sera signalée/)).toBeInTheDocument();
  });

  it("une seule ligne : singulier ; plusieurs lignes mal formées : pluriel", async () => {
    const user = userEvent.setup();
    renderBatch();
    await paste(user, "A;B;0197000001;mère");
    expect(screen.getByText("Aperçu : 1 première ligne sur 1")).toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: /Ou collez une liste/ }));
    await paste(user, "A;B;0197000001\nC;D");
    expect(screen.getByText(/2 lignes mal formées .* elles seront signalées/)).toBeInTheDocument();
  });

  it("ni classe ni contenu : erreurs, aucun appel", async () => {
    const user = userEvent.setup();
    renderBatch("");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    expect((await screen.findAllByText("Choisissez une classe.")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Choisissez un fichier ou collez une liste d'élèves.").length).toBeGreaterThan(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it("liste sans aucune ligne d'élève (en-tête seul)", async () => {
    const user = userEvent.setup();
    renderBatch();
    await paste(user, "Prénom;Nom;Téléphone du parent;Lien de parenté");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    expect((await screen.findAllByText("La liste ne contient aucune ligne d'élève.")).length).toBeGreaterThan(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it("rapport : lignes en erreur par code, envoyées, filtre « Erreurs seulement », correction et renvoi", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce({
      data: {
        created: [member({ id: 70, firstName: "Yao", lastName: "Kpadé" }), member({ id: 71, firstName: "Sèna", lastName: "Kpadé" })],
        errors: [
          rowError(4, "DUPLICATE_ROW", { firstName: "Yao", lastName: "Kpadé", parentPhone: "0197000001", relationship: "mère" }),
          rowError(5, "PHONE_INVALID", { firstName: "Ola", lastName: "Gbaguidi", parentPhone: "12", relationship: "mère" }),
          rowError(7, "ALREADY_IN_CLASSROOM", { firstName: "Kémi", lastName: "Ahouandjinou", parentPhone: "0197000006", relationship: "mère" }),
          rowError(8, "LEARNER_QUOTA_EXCEEDED", { firstName: "Awa" }),
        ],
      },
      response: new Response(null, { status: 200 }),
    });
    const { container } = renderBatch();
    await paste(user);
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));

    // Corps envoyé : les lignes de forme correcte, avec leur numéro d'origine (la ligne 6 est mal formée)
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    expect(POST.mock.calls[0][1].params).toEqual({ path: { id: "3" } });
    expect(POST.mock.calls[0][1].body.rows.map((row: { line: number }) => row.line)).toEqual([2, 3, 4, 5, 7, 8]);
    expect(router.refresh).toHaveBeenCalled();

    expect(await screen.findByRole("heading", { level: 2, name: "Résultat d'import" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 demandes envoyées · 5 lignes à vérifier");
    const lines = screen.getByRole("list", { name: "Lignes de l'import" });
    expect(within(lines).getByRole("listitem", { name: "Ligne 4" })).toHaveTextContent("Doublon dans la liste");
    expect(within(lines).getByRole("listitem", { name: "Ligne 5" })).toHaveTextContent("Numéro invalide");
    expect(within(lines).getByRole("listitem", { name: "Ligne 6" })).toHaveTextContent("Ligne mal formée");
    expect(within(lines).getByRole("listitem", { name: "Ligne 7" })).toHaveTextContent("Déjà dans la classe");
    expect(within(lines).getByRole("listitem", { name: "Ligne 8" })).toHaveTextContent("Quota dépassé");
    expect(within(lines).getAllByText("Envoyée")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();

    // Filtre
    await user.click(screen.getByRole("checkbox", { name: "Erreurs seulement" }));
    expect(within(lines).queryByText("Envoyée")).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Erreurs seulement" }));

    // Les erreurs qui ne se corrigent pas en place sont en lecture seule
    expect(within(lines).getByRole("listitem", { name: "Ligne 7" }).querySelector("input")).toHaveAttribute("readonly");
    expect(within(lines).getByRole("listitem", { name: "Ligne 5" }).querySelector("input")).not.toHaveAttribute("readonly");

    // Rien n'a été corrigé : renvoi impossible
    const resend = screen.getByRole("button", { name: "Renvoyer les lignes corrigées" });
    expect(resend).toBeDisabled();

    // Correction du numéro (ligne 5) puis renvoi des seules lignes corrigées
    POST.mockResolvedValueOnce({
      data: { created: [member({ id: 72, firstName: "Ola", lastName: "Gbaguidi" })], errors: [] },
      response: new Response(null, { status: 200 }),
    });
    const phone = screen.getByLabelText(/Téléphone du parent de la ligne 5/);
    await user.clear(phone);
    await user.type(phone, "0197000005");
    expect(resend).toBeEnabled();
    await user.click(resend);
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(2));
    expect(POST.mock.calls[1][1].body.rows).toEqual([
      { line: 5, firstName: "Ola", lastName: "Gbaguidi", parentPhone: "0197000005", relationship: "mère" },
    ]);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("3 demandes envoyées · 4 lignes à vérifier"));
    expect(within(lines).queryByRole("listitem", { name: "Ligne 5" })).toBeNull();
    expect(within(lines).getByText("Ola Gbaguidi")).toBeInTheDocument();
  });

  it("renvoi : une ligne qui reste en erreur est remplacée par la lecture du serveur ; un échec est conservé pour réessayer", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce({
      data: { created: [], errors: [rowError(1, "PHONE_INVALID", { firstName: "A", lastName: "B", parentPhone: "1", relationship: "mère" })] },
      response: new Response(null, { status: 200 }),
    });
    renderBatch();
    await paste(user, "A;B;1;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    const phone = await screen.findByLabelText(/Téléphone du parent de la ligne 1/);
    await user.clear(phone);
    await user.type(phone, "2");
    POST.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    await user.click(screen.getByRole("button", { name: "Renvoyer les lignes corrigées" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Réessayez dans quelques instants/);
    POST.mockResolvedValueOnce({
      data: { created: [], errors: [rowError(1, "PHONE_INVALID", { firstName: "A", lastName: "B", parentPhone: "2", relationship: "mère" })] },
      response: new Response(null, { status: 200 }),
    });
    await user.click(screen.getByRole("button", { name: "Renvoyer les lignes corrigées" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByLabelText(/Téléphone du parent de la ligne 1/)).toHaveValue("2");
    // Relu comme point de départ : plus rien de corrigé à renvoyer
    expect(screen.getByRole("button", { name: "Renvoyer les lignes corrigées" })).toBeDisabled();
  });

  it("toutes les lignes mal formées : rien n'est envoyé, le rapport les montre aussitôt", async () => {
    const user = userEvent.setup();
    renderBatch();
    await paste(user, "A;B;0197000001\nC;D");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    expect(await screen.findByRole("listitem", { name: "Ligne 1" })).toHaveTextContent("Ligne mal formée");
    expect(POST).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("0 demande envoyée · 2 lignes à vérifier");
  });

  it("aucune ligne en erreur : tout est parti, « Nouvel import » remet le formulaire à zéro", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({
      data: { created: [member({ id: 70, firstName: "Yao", lastName: "Kpadé" })], errors: [] },
      response: new Response(null, { status: 200 }),
    });
    renderBatch();
    await paste(user, "Yao;Kpadé;0197000001;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    expect(await screen.findByText(/Toutes les demandes sont parties/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Renvoyer les lignes corrigées" })).toBeNull();
    expect(screen.getByRole("link", { name: "Voir la classe" })).toHaveAttribute("href", "/enseignant/classes/3");
    await user.click(screen.getByRole("button", { name: "Nouvel import" }));
    expect(screen.getByRole("textbox", { name: /Ou collez une liste/ })).toHaveValue("");
  });

  it("fichier CSV : aperçu, envoi en multipart, la liste collée est ignorée", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: { created: [], errors: [] }, response: new Response(null, { status: 200 }) });
    renderBatch();
    const file = new File(["Prénom;Nom;Téléphone du parent;Lien de parenté\nYao;Kpadé;0197000001;mère\n"], "eleves.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText(/Fichier CSV ou Excel/), file);
    expect(await screen.findByText("Aperçu : 1 première ligne sur 1")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Ou collez une liste/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    const init = POST.mock.calls[0][1];
    expect(init.params).toEqual({ path: { id: "3" } });
    const form = init.bodySerializer() as FormData;
    expect((form.get("file") as File).name).toBe("eleves.csv");
  });

  it("fichier Excel : pas d'aperçu, envoyé tel quel", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: { created: [], errors: [] }, response: new Response(null, { status: 200 }) });
    renderBatch();
    await user.upload(screen.getByLabelText(/Fichier CSV ou Excel/), new File(["x"], "eleves.xlsx"));
    expect(await screen.findByText(/Aperçu indisponible pour un fichier Excel/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
  });

  it("retirer le fichier rend la liste collée", async () => {
    const user = userEvent.setup();
    renderBatch();
    const input = screen.getByLabelText(/Fichier CSV ou Excel/);
    await user.upload(input, new File(["x"], "eleves.xlsx"));
    await user.upload(input, []);
    expect(screen.getByRole("textbox", { name: /Ou collez une liste/ })).toBeEnabled();
  });

  it.each([
    ["IMPORT_TOO_LARGE", "Le fichier dépasse 200 lignes."],
    ["IMPORT_INVALID_FILE", "Le fichier n'a pas pu être lu."],
  ])("%s : le message du serveur est affiché", async (code, message) => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(400, code, message));
    renderBatch();
    await paste(user, "A;B;0197000001;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Résultat d'import" })).toBeNull();
  });

  it("une seconde soumission avant la réponse ne repart pas", async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    renderBatch();
    await paste(user, "A;B;0197000001;mère");
    const form = screen.getByRole("form", { name: "Importer des élèves" });
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(POST).toHaveBeenCalledTimes(1);
    await act(async () => finish({ data: { created: [], errors: [] }, response: new Response(null, { status: 200 }) }));
  });

  it("valeurs absentes d'une ligne du serveur : cases vides", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({
      data: { created: [], errors: [rowError(1, "MALFORMED_ROW", {})] },
      response: new Response(null, { status: 200 }),
    });
    renderBatch();
    await paste(user, "A;B;0197000001;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    expect(await screen.findByLabelText(/Prénom de la ligne 1/)).toHaveValue("");
  });
});

describe("WT06 · import : focus, annonce, bornes, attente du serveur", () => {
  const renderBatch = (props: object = {}) =>
    render(<BatchImport classrooms={CLASSROOMS} defaultClassroom="3" {...props} />);
  async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
    await user.click(screen.getByRole("textbox", { name: /Ou collez une liste/ }));
    await user.paste(text);
  }
  const ok = (created: unknown[] = [], errors: unknown[] = []) => ({
    data: { created, errors },
    response: new Response(null, { status: 200 }),
  });

  it("le résultat est annoncé dans une région montée avant lui, et le focus passe au titre du rapport", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(ok([member({ id: 70, firstName: "Yao", lastName: "Kpadé" })]));
    renderBatch();
    expect(screen.getByRole("status")).toHaveTextContent("");
    await paste(user, "Yao;Kpadé;0197000001;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    const heading = await screen.findByRole("heading", { level: 2, name: "Résultat d'import" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole("status")).toHaveTextContent("1 demande envoyée · 0 ligne à vérifier");
  });

  it("après « Renvoyer les lignes corrigées », le focus revient au titre et le résultat est réannoncé", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce(ok([], [rowError(1, "PHONE_INVALID", { firstName: "A", lastName: "B", parentPhone: "1", relationship: "mère" })]));
    renderBatch();
    await paste(user, "A;B;1;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    const phone = await screen.findByLabelText(/Téléphone du parent de la ligne 1/);
    await user.clear(phone);
    await user.type(phone, "0197000001");
    POST.mockResolvedValueOnce(ok([member({ id: 71, firstName: "A", lastName: "B" })]));
    await user.click(screen.getByRole("button", { name: "Renvoyer les lignes corrigées" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 demande envoyée · 0 ligne à vérifier"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Résultat d'import" })).toHaveFocus());
  });

  it("fichier de plus de 1 Mo : refusé avant d'être lu, au vouvoiement", async () => {
    const user = userEvent.setup();
    renderBatch();
    const big = new File([new Uint8Array(1024 * 1024 + 1)], "gros.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText(/Fichier CSV ou Excel/), big);
    expect((await screen.findAllByText("Ce fichier dépasse 1 Mo : découpez-le en plusieurs imports.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: /Ou collez une liste/ })).toBeEnabled();
    expect(screen.queryByText(/Aperçu/)).toBeNull();
  });

  it("plus de 200 lignes : simple avertissement, l'envoi reste possible (le serveur juge)", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(ok());
    renderBatch();
    const rows = Array.from({ length: 201 }, (_, index) => `E${index};Test;0197000001;mère`).join("\n");
    await paste(user, rows);
    expect(screen.getByText(/Cette liste compte 201 lignes : un import en accepte 200 au plus/)).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6);
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
  });

  it("THROTTLED : l'envoi est bloqué pendant le délai du serveur avec un compte à rebours", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({
      error: { code: "THROTTLED", message: "Trop de demandes." },
      response: new Response(null, { status: 429, headers: { "Retry-After": "30" } }),
    });
    renderBatch();
    await paste(user, "A;B;0197000001;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    expect(await screen.findByRole("button", { name: /Réessayer dans 0:30/ })).toBeDisabled();
    expect((await screen.findAllByText(/Trop de tentatives/)).length).toBeGreaterThan(0);
  });

  it("THROTTLED au renvoi : le renvoi est bloqué pendant le délai", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce(ok([], [rowError(1, "PHONE_INVALID", { firstName: "A", lastName: "B", parentPhone: "1", relationship: "mère" })]));
    renderBatch();
    await paste(user, "A;B;1;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    const phone = await screen.findByLabelText(/Téléphone du parent de la ligne 1/);
    await user.clear(phone);
    await user.type(phone, "2");
    POST.mockResolvedValueOnce({
      error: { code: "THROTTLED", message: "" },
      response: new Response(null, { status: 429, headers: { "Retry-After": "12" } }),
    });
    await user.click(screen.getByRole("button", { name: "Renvoyer les lignes corrigées" }));
    expect(await screen.findByRole("button", { name: /Réessayer dans 0:12/ })).toBeDisabled();
  });

  it.each([
    ["IMPORT_TOO_LARGE", "Le fichier dépasse 200 lignes."],
    ["SCHOOL_OFFER_EXPIRED", "L'offre de l'établissement est échue."],
  ])("%s sur l'onglet lot : le message du serveur reste affiché", async (code, message) => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(400, code, message));
    renderBatch();
    await paste(user, "A;B;0197000001;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
  });

  it("offre échue : message en tête et envoi désactivé", () => {
    renderBatch({ offerExpired: true });
    expect(screen.getByText(/L'offre de votre établissement est échue : l'ajout d'élèves est bloqué/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importer et envoyer les demandes" })).toBeDisabled();
  });

  it("la classe choisie est gardée après « Nouvel import »", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(ok());
    renderBatch();
    await user.selectOptions(screen.getByRole("combobox", { name: /Classe/ }), "4");
    await paste(user, "A;B;0197000001;mère");
    await user.click(screen.getByRole("button", { name: "Importer et envoyer les demandes" }));
    await screen.findByRole("button", { name: "Nouvel import" });
    await user.click(screen.getByRole("button", { name: "Nouvel import" }));
    expect(screen.getByRole("combobox", { name: /Classe/ })).toHaveValue("4");
  });
});

describe("WT06 · individuel : offre échue et attente du serveur", () => {
  async function fillAll(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^Prénom/), "Yao");
    await user.type(screen.getByLabelText(/^Nom/), "Kpadé");
    await user.type(screen.getByRole("textbox", { name: /Téléphone du parent/ }), "0197000001");
    await user.selectOptions(screen.getByRole("combobox", { name: /Lien de parenté/ }), "mere");
  }

  it("offre échue : message en tête et envoi désactivé", () => {
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="3" offerExpired />);
    expect(screen.getByText(/L'offre de votre établissement est échue/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer la demande" })).toBeDisabled();
  });

  it("SCHOOL_OFFER_EXPIRED et THROTTLED : message du serveur, puis envoi bloqué pendant le délai", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce(failure(403, "SCHOOL_OFFER_EXPIRED", "L'offre est échue."));
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="3" />);
    await fillAll(user);
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect((await screen.findAllByText("L'offre est échue.")).length).toBeGreaterThan(0);
    POST.mockResolvedValueOnce({
      error: { code: "THROTTLED", message: "" },
      response: new Response(null, { status: 429, headers: { "Retry-After": "20" } }),
    });
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(await screen.findByRole("button", { name: /Réessayer dans 0:20/ })).toBeDisabled();
  });

  it("après un succès, le verrou reste posé jusqu'à la navigation : pas de seconde demande", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: member(), response: new Response(null, { status: 201 }) });
    render(<IndividualForm classrooms={CLASSROOMS} countries={COUNTRIES} defaultClassroom="3" />);
    await fillAll(user);
    const form = screen.getByRole("form", { name: "Ajouter un élève" });
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(POST).toHaveBeenCalledTimes(1);
  });
});

describe("ImportReport", () => {
  const line = { line: 2, code: "PHONE_INVALID" as const, message: "m", original: { firstName: "A", lastName: "B", parentPhone: "1", relationship: "r" }, data: { firstName: "A", lastName: "B", parentPhone: "1", relationship: "r" } };

  it("une ligne est corrigée quand une valeur change, et seulement si son erreur se corrige", () => {
    expect(isEdited(line)).toBe(false);
    const edited = { ...line, data: { ...line.data, parentPhone: "2" } };
    expect(isEdited(edited)).toBe(true);
    expect(correctedLines([line, edited, { ...edited, line: 3, code: "ALREADY_IN_CLASSROOM" as const }])).toEqual([edited]);
  });

  it("rapport sans envoi : singulier, sans ligne", () => {
    render(
      <ImportReport sent={[{ id: 1, name: "A B" }]} errors={[line]} errorsOnly={false} onErrorsOnly={vi.fn()} onEdit={vi.fn()} onResend={vi.fn()} resending={false} />,
    );
    expect(screen.getByText("1 demande envoyée · 1 ligne à vérifier")).toBeInTheDocument();
    expect(reportSummary(0, 0)).toBe("0 demande envoyée · 0 ligne à vérifier");
    expect(reportSummary(2, 5)).toBe("2 demandes envoyées · 5 lignes à vérifier");
  });

  it("une erreur qui ne se corrige pas n'affiche pas le numéro du parent ; avec attente imposée, le renvoi est bloqué", () => {
    const fixed = { ...line, code: "ALREADY_IN_CLASSROOM" as const };
    const edited = { ...line, data: { ...line.data, parentPhone: "2" } };
    render(
      <ImportReport sent={[]} errors={[fixed, { ...edited, line: 3 }]} errorsOnly onErrorsOnly={vi.fn()} onEdit={vi.fn()} onResend={vi.fn()} resending={false} wait={42} />,
    );
    expect(screen.queryByLabelText(/Téléphone du parent de la ligne 2/)).toBeNull();
    expect(screen.getByLabelText(/Téléphone du parent de la ligne 3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réessayer dans 0:42/ })).toBeDisabled();
  });
});

describe("WT06 · page", () => {
  function mockApi(classrooms = [classroom(), classroom({ id: 4, name: "3ᵉ A" })]) {
    GET.mockImplementation(async (path: string) =>
      path.includes("school") ? respond(200, school()) : respond(200, { results: classrooms }),
    );
  }

  it("classe présélectionnée seulement si c'est une classe de l'enseignant", () => {
    expect(defaultClassroomOf(CLASSROOMS, "3")).toBe("3");
    expect(defaultClassroomOf(CLASSROOMS, ["4", "3"])).toBe("4");
    expect(defaultClassroomOf(CLASSROOMS, "99")).toBeUndefined();
    expect(defaultClassroomOf(CLASSROOMS, undefined)).toBeUndefined();
  });

  it("onglet Individuel par défaut, fil d'Ariane avec la classe, quota", async () => {
    mockApi();
    const { container } = render(await AddLearners({ searchParams: Promise.resolve({ classe: "3" }) }));
    expect(screen.getByRole("link", { name: "Individuel" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Import par lot" })).toHaveAttribute("href", "/enseignant/eleves/ajouter?classe=3&onglet=lot");
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Mes classes›4ᵉ B · Robotique›Ajouter des élèves");
    expect(screen.getByRole("form", { name: "Ajouter un élève" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Quota de l'offre" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("onglet Import par lot dans l'URL, sans classe présélectionnée", async () => {
    mockApi();
    render(await AddLearners({ searchParams: Promise.resolve({ onglet: ["lot"] }) }));
    expect(screen.getByRole("link", { name: "Import par lot" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("form", { name: "Importer des élèves" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Mes classes›Ajouter des élèves");
  });

  it("sans classe : « Créer une classe » d'abord", async () => {
    mockApi([]);
    render(await AddLearners({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Créer une classe" })).toHaveAttribute("href", "/enseignant/classes/nouvelle");
    expect(screen.queryByRole("form")).toBeNull();
    render(<NoClassroomForLearners />);
  });

  it("sans session, ne rend rien ; squelette accessible", async () => {
    GET.mockResolvedValue(respond(401));
    expect(await AddLearners({ searchParams: Promise.resolve({}) })).toBeNull();
    const { container } = render(<AddLearnersSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du formulaire…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
