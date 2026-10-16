"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button, Field, KitCodeInput } from "@/components/ds";
import { formatCountdown } from "@/components/ds/RetryCountdown";
import { errorMessage, type ApiFailure } from "@/lib/api-call";
import { routes } from "@/lib/routes";

import { redeemKitCode } from "./api";
import { UNLOCKED_PARAM } from "./types";

type Failure = { title: string; message: string };

/** WA06 : titre et message selon le `code` renvoyé par l'API (D4, D35). */
export function kitCodeFailure(failure: ApiFailure): Failure {
  switch (failure.code) {
    case "KIT_CODE_INVALID":
      return {
        title: "Code Kit invalide",
        message: "Ce code n'existe pas. Vérifie les caractères imprimés sur la notice de ton kit.",
      };
    case "KIT_CODE_ALREADY_USED":
      return {
        title: "Code déjà utilisé",
        message: "Ce code a déjà servi à débloquer un parcours : un Kit Code ne s'utilise qu'une seule fois.",
      };
    case "KIT_CODE_NOT_COMPATIBLE":
      return {
        title: "Ce code ne débloque pas ce parcours",
        message: "Il vient d'un autre kit. Vérifie que tu es bien sur la fiche du parcours de ton kit.",
      };
    case "THROTTLED":
      return { title: "Trop de tentatives", message: errorMessage(failure, "tu") };
    default:
      return {
        title: "Le code n'a pas pu être vérifié",
        message: Object.values(failure.fields)[0] || errorMessage(failure, "tu"),
      };
  }
}

/** Secondes restantes avant `until` (horodatage), arrondies au-dessus ; 0 une fois passé. */
function secondsLeft(until: number): number {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

/**
 * WA01 / WA06 · Saisie du Kit Code d'un parcours avec kit. Le serveur juge le code (aucune validation métier ici,
 * D35) ; succès → WC06a avec le toast « Parcours débloqué ». Après `THROTTLED`, l'envoi reste bloqué le temps annoncé
 * par l'API (`Retry-After`) quand elle le communique.
 */
export function KitCodeForm({ courseSlug }: { courseSlug: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [empty, setEmpty] = useState(false);
  const [pending, setPending] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [, setTick] = useState(0);
  const wait = secondsLeft(blockedUntil);

  useEffect(() => {
    if (!blockedUntil) return;
    const timer = window.setInterval(() => {
      setTick((n) => n + 1);
      if (secondsLeft(blockedUntil) === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [blockedUntil]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setEmpty(!code);
    if (!code) return;
    setPending(true);
    const result = await redeemKitCode(code, courseSlug);
    if (result.ok) {
      const target = routes.learner.course(courseSlug);
      router.push(result.data.created ? `${target}?${UNLOCKED_PARAM}=1` : target);
      return;
    }
    setPending(false);
    setFailure(kitCodeFailure(result));
    if (result.code === "THROTTLED" && result.retryAfter) setBlockedUntil(Date.now() + result.retryAfter * 1000);
  };

  const fieldError = empty ? "Saisis le code imprimé sur la notice de ton kit." : failure?.message;

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4.5 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-7"
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={`flex size-14 shrink-0 items-center justify-center rounded-2xl text-[28px] ${
            failure ? "bg-error-100" : "bg-primary-100"
          }`}
        >
          {failure ? "⚠️" : "📦"}
        </span>
        <div>
          <h2 className="m-0 text-xl font-black text-ink-900">{failure?.title ?? "Ce parcours se débloque avec ton kit"}</h2>
          <p className="m-0 mt-1 text-sm leading-snug font-semibold text-ink-600">
            Saisis le code livré avec ton kit pour débloquer le parcours, sans rien payer.
          </p>
        </div>
      </div>

      <Field label="Code Kit" required hint="Imprimé sur la notice du kit" error={fieldError}>
        <KitCodeInput value={code} onValueChange={setCode} />
      </Field>

      <details className="text-[13px] font-semibold text-ink-700">
        <summary className="cursor-pointer font-extrabold text-primary-600">Où trouver le code ?</summary>
        <p className="m-0 mt-2 leading-normal">
          Le Kit Code est imprimé sur la notice glissée dans la boîte de ton kit Steamy. Il commence par « STEAMY ». Tu
          peux le saisir en minuscules, avec ou sans tirets.
        </p>
      </details>

      <Button type="submit" block size="lg" loading={pending} disabled={wait > 0}>
        {wait > 0 ? (
          <>
            Réessayer dans <span className="tabular-nums">{formatCountdown(wait)}</span>
          </>
        ) : failure ? (
          "Réessayer"
        ) : (
          "Valider le code"
        )}
      </Button>

      <p className="m-0 text-center text-[13px] font-bold text-ink-600">
        {failure ? (
          <>
            Le code ne marche pas ?{" "}
            <Link href={routes.contact("question")} className="font-black text-primary-600 hover:underline">
              Contacter le support
            </Link>
          </>
        ) : (
          <>
            Pas encore de kit ?{" "}
            <Link href={routes.shop} className="font-black text-primary-600 hover:underline">
              Commander dans la boutique
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
