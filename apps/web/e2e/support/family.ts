import { apiSession, createParent, uniqueSuffix, type ApiSession } from "./api";
import { DEMO_PASSWORD } from "./demo";
import { birthDateFor } from "./signup";

/** Famille neuve : un parent au profil complet et un enfant qu'il a créé (WPD04 par l'API), chacun sa session. */
export type Family = {
  parentPhone: string;
  child: { id: number; firstName: string; username: string; password: string };
  /** Session API de l'enfant, connectée. */
  childSession: ApiSession;
  /** Session API du parent, connectée. */
  parentSession: ApiSession;
};

/**
 * Crée une famille propre au test (lot 4) : les parcours qui traitent une demande ne consomment jamais celles de
 * Marie, lues par d'autres specs. Fermer les sessions avec `closeFamily`.
 */
export async function createFamily({ childFirstName = "Yao" }: { childFirstName?: string } = {}): Promise<Family> {
  const { phone, session } = await createParent({ firstName: "Afiwa", keep: true });
  const parentSession = session as ApiSession;
  const [relationship] = (await parentSession.get("/api/referentials/relationships/")) as { code: string }[];
  const username = `yao.${uniqueSuffix()}`;
  const child = (await parentSession.post("/api/accounts/children/", {
    firstName: childFirstName,
    lastName: "Test",
    birthDate: birthDateFor(12),
    relationship: relationship.code,
    username,
    password: DEMO_PASSWORD,
  })) as { id: number };
  const childSession = await apiSession();
  await childSession.post("/api/auth/login/", { identifier: username, password: DEMO_PASSWORD });
  return {
    parentPhone: phone,
    child: { id: child.id, firstName: childFirstName, username, password: DEMO_PASSWORD },
    childSession,
    parentSession,
  };
}

export async function closeFamily(family: Family): Promise<void> {
  await family.childSession.api.dispose();
  await family.parentSession.api.dispose();
}
