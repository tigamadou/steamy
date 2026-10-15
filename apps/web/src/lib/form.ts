import { startTransition, type FormEvent } from "react";

/**
 * Soumet un formulaire à une action de `useActionState` sans la réinitialisation automatique de React 19 : avec
 * `<form action={…}>`, les champs non contrôlés seraient vidés après chaque envoi, y compris en cas d'erreur.
 * Usage : `<form onSubmit={submitWith(action)}>`.
 */
export function submitWith(dispatch: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
}
