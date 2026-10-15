"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ds/Button";
import { UserTypeCardGroup, type UserTypeOption } from "@/components/ds/UserTypeCard";

// W03 : apprenant ou parent seulement ; l'enseignant est invité, jamais inscrit librement (S5)
const OPTIONS: UserTypeOption[] = [
  {
    value: "apprenant",
    emoji: "🚀",
    title: "Un·e apprenant·e",
    description: "J'ai entre 10 et 17 ans et je veux apprendre la robotique, le code, l'IA…",
    color: "primary-500",
  },
  {
    value: "parent",
    emoji: "👨‍👩‍👧",
    title: "Un parent",
    description: "Je veux inscrire mon enfant ou suivre ses progrès et ses achats.",
    color: "cat-ia",
    tone: "light",
  },
];

const NEXT_STEP: Record<string, string> = {
  apprenant: "/inscription/apprenant/identite",
  parent: "/inscription/parent",
};

export function UserTypeForm() {
  const router = useRouter();
  const [choice, setChoice] = useState<string>();
  const [error, setError] = useState<string>();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Lu dans le formulaire : un choix fait avant l'hydratation (réseau lent) compte aussi
    const value = String(new FormData(event.currentTarget).get("profil") ?? "");
    if (!value) {
      setError("Choisis ton profil pour continuer.");
      return;
    }
    router.push(NEXT_STEP[value]);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      <UserTypeCardGroup
        legend="Tu es…"
        legendHidden
        name="profil"
        options={OPTIONS}
        value={choice}
        onChange={(value) => {
          setChoice(value);
          setError(undefined);
        }}
        required
        error={error}
      />
      <Button type="submit" block size="lg" iconRight="arrow-right">
        Continuer
      </Button>
    </form>
  );
}
