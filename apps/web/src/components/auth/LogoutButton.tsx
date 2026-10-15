"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, type ButtonProps } from "@/components/ds/Button";
import { logout } from "@/lib/auth/logout";

type LogoutButtonProps = Pick<ButtonProps, "variant" | "size" | "block" | "className"> & {
  /** Message en cas d'échec, au registre de l'espace. */
  errorMessage?: string;
};

/** « Se déconnecter » : ferme la session puis renvoie vers la connexion (retour arrière impossible). */
export function LogoutButton({
  errorMessage = "La déconnexion a échoué. Réessaie.",
  variant = "outline",
  ...rest
}: LogoutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const onClick = () => {
    setFailed(false);
    startTransition(async () => {
      try {
        await logout();
      } catch {
        setFailed(true);
        return;
      }
      router.replace("/connexion");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button {...rest} variant={variant} icon="logout" loading={pending} onClick={onClick}>
        Se déconnecter
      </Button>
      <p role="alert" className="text-sm font-bold text-error-600">
        {failed ? errorMessage : null}
      </p>
    </div>
  );
}
