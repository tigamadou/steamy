import { expect, request, type APIRequestContext } from "@playwright/test";

/**
 * Lecture des emails et des SMS du faux fournisseur dans Mailpit (déjà dans `compose.yml`) : un SMS y arrive
 * comme un email adressé à `<e164>@sms.test` (API-L2.0b). Envois asynchrones (Celery) : on attend le message avec
 * un délai borné (`expect.poll`), jamais de pause fixe.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

export type MailpitMessage = { ID: string; Subject: string; Created: string; To: { Address: string }[] };
export type MailpitBody = { ID: string; Subject: string; Text: string; HTML: string };

let context: Promise<APIRequestContext> | undefined;

function mailpit(): Promise<APIRequestContext> {
  context ??= request.newContext({ baseURL: MAILPIT_URL });
  return context;
}

async function search(query: string): Promise<MailpitMessage[]> {
  const api = await mailpit();
  const response = await api.get("/api/v1/search", { params: { query, limit: 50 } });
  expect(response.ok(), `Mailpit injoignable (${MAILPIT_URL})`).toBe(true);
  const { messages } = (await response.json()) as { messages: MailpitMessage[] };
  return messages;
}

/**
 * Attend le premier message adressé à `to` (et contenant `contains` s'il est donné) reçu après `since`,
 * puis renvoie son contenu.
 */
export async function waitForMessage(
  to: string,
  { since = new Date(0), contains, timeout = 20_000 }: { since?: Date; contains?: string; timeout?: number } = {},
): Promise<MailpitBody> {
  let found: MailpitMessage | undefined;
  await expect
    .poll(
      async () => {
        const messages = await search(`to:"${to}"${contains ? ` "${contains}"` : ""}`);
        found = messages.find((message) => new Date(message.Created) >= since);
        return found !== undefined;
      },
      { message: `aucun message pour ${to}`, timeout },
    )
    .toBe(true);
  const api = await mailpit();
  return (await (await api.get(`/api/v1/message/${found!.ID}`)).json()) as MailpitBody;
}

/** Adresse sous laquelle le faux fournisseur dépose un SMS envoyé au numéro E.164 donné. */
export function smsAddress(e164: string): string {
  return `${e164}@sms.test`;
}

/** Attend le SMS envoyé au numéro E.164 donné. */
export function waitForSms(e164: string, options?: Parameters<typeof waitForMessage>[1]): Promise<MailpitBody> {
  return waitForMessage(smsAddress(e164), options);
}

/** Code à 6 chiffres (OTP, D24) contenu dans un SMS ou un email. */
export function extractCode(body: Pick<MailpitBody, "Text">): string {
  const code = body.Text.match(/\b\d{6}\b/)?.[0];
  expect(code, "aucun code à 6 chiffres dans le message").toBeTruthy();
  return code!;
}

/** Premier lien du message dont le chemin commence par `pathPrefix` (`/consentement/`, `/activation/`). */
export function extractLink(body: Pick<MailpitBody, "Text">, pathPrefix: string): URL {
  const link = body.Text.match(/https?:\/\/\S+/g)
    ?.map((raw) => new URL(raw.replace(/[).,;]+$/, "")))
    .find((url) => url.pathname.startsWith(pathPrefix));
  expect(link, `aucun lien ${pathPrefix} dans le message`).toBeTruthy();
  return link!;
}
