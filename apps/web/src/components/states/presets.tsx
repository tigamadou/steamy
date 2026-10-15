import { Button } from "@/components/ds";
import { routes } from "@/lib/routes";

import { STATE_ACTIONS, STATE_MESSAGES, type Register } from "./messages";
import { WXLoading, WXState } from "./WXState";

// Les quatre enveloppes (WX01-WX03 et 404), une fois pour toutes : les fichiers `error`, `loading`,
// `not-found` et `OfflineGate` les affichent, chaque espace ne choisit que son registre.

export type OfflineStateProps = {
  register?: Register;
  onRetry: () => void;
  /** Annonce après un essai infructueux. */
  notice?: string;
  titleId?: string;
};

/** WX01 · Hors ligne. Pas de bouton « Mode hors ligne » (D16). */
export function OfflineState({ register = "tu", onRetry, notice, titleId }: OfflineStateProps) {
  const text = STATE_MESSAGES.offline[register];
  return (
    <WXState
      pose="sleep"
      emoji="📡"
      title={text.title}
      titleId={titleId}
      body={
        <>
          <p className="m-0">{text.body}</p>
          <p aria-live="polite" className="m-0 mt-2 font-bold text-ink-700 empty:hidden">
            {notice}
          </p>
        </>
      }
      actions={<Button onClick={onRetry}>{STATE_ACTIONS.retry}</Button>}
    />
  );
}

export type ErrorStateProps = {
  register?: Register;
  onRetry: () => void;
  /** Absent : pas de bouton « Retour » (erreur locale à une section). */
  onBack?: () => void;
  /** Message de l'API (D4), quand il aide le visiteur. */
  detail?: string;
  headingLevel?: 1 | 2;
  compact?: boolean;
};

/** WX02 · Erreur. */
export function ErrorState({ register = "tu", onRetry, onBack, detail, headingLevel, compact }: ErrorStateProps) {
  const text = STATE_MESSAGES.error[register];
  return (
    <WXState
      pose="sad"
      emoji="⚠️"
      title={text.title}
      headingLevel={headingLevel}
      compact={compact}
      body={
        <>
          <p className="m-0">{text.body}</p>
          {detail && <p className="m-0 mt-2 font-bold text-ink-700">{detail}</p>}
        </>
      }
      actions={
        <>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              {STATE_ACTIONS.back}
            </Button>
          )}
          <Button onClick={onRetry}>{STATE_ACTIONS.retry}</Button>
        </>
      }
    />
  );
}

/** WX03 · Chargement long (les grilles utilisent plutôt des skeletons). */
export function LoadingState({ register = "tu" }: { register?: Register }) {
  const text = STATE_MESSAGES.loading[register];
  return <WXLoading title={text.title} body={text.body} />;
}

/** 404 : URL inconnue ou contenu non publié ; textes et action propres à l'écran possibles (WL22, WL23). */
export function NotFoundState({
  register = "tu",
  title,
  body,
  action = { label: STATE_ACTIONS.home, href: routes.home },
}: {
  register?: Register;
  title?: string;
  body?: string;
  action?: { label: string; href: string };
}) {
  const text = STATE_MESSAGES.notFound[register];
  return (
    <WXState
      pose="sad"
      kicker="Erreur 404"
      title={title ?? text.title}
      body={<p className="m-0">{body ?? text.body}</p>}
      actions={
        <Button href={action.href} size="lg">
          {action.label}
        </Button>
      }
    />
  );
}
