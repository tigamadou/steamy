import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "../Icon";

// Bouton « candy » (design/ds-atoms.jsx) : ombre marquée vers le bas, pression visible.
// Écarts assumés pour l'AA : texte foncé sur le vert et l'ambre, survol foncé (et non clair) du primaire,
// rouge 600 pour `danger` (le blanc n'atteint pas 4,5:1 sur les teintes 500).
const VARIANTS = {
  primary:
    "bg-primary-500 text-white shadow-[0_4px_0_var(--primary-700)] hover:bg-primary-600 active:shadow-[0_2px_0_var(--primary-700)]",
  secondary:
    "bg-success-500 text-ink-900 shadow-[0_4px_0_var(--success-700)] hover:bg-success-400 active:shadow-[0_2px_0_var(--success-700)]",
  amber:
    "bg-amber-500 text-ink-900 shadow-[0_4px_0_var(--amber-700)] hover:bg-amber-400 active:shadow-[0_2px_0_var(--amber-700)]",
  outline:
    "border-2 border-ink-200 bg-surface text-ink-900 shadow-[0_4px_0_var(--ink-200)] hover:bg-ink-50 active:shadow-[0_2px_0_var(--ink-200)]",
  "outline-inverse":
    "border-2 border-white bg-transparent text-white shadow-[0_4px_0_var(--overlay-shadow)] hover:bg-white/10 active:shadow-[0_2px_0_var(--overlay-shadow)]",
  ghost: "bg-transparent font-bold text-primary-600 hover:bg-primary-50 active:translate-y-0",
  danger:
    "bg-error-600 text-white shadow-[0_4px_0_var(--error-700)] hover:bg-error-700 active:shadow-[0_2px_0_var(--error-700)]",
  // Back-office monochrome (SPEC-TECHNIQUE §2.4) : encre, focus en encre, aucune couleur primaire
  ink: "bg-ink-900 text-white shadow-[0_4px_0_var(--ink-700)] hover:bg-ink-800 active:shadow-[0_2px_0_var(--ink-700)]",
  "ink-outline":
    "border-2 border-ink-200 bg-surface text-ink-900 shadow-[0_4px_0_var(--ink-200)] hover:bg-ink-50 active:shadow-[0_2px_0_var(--ink-200)]",
} as const;

const INK_VARIANTS: ReadonlySet<string> = new Set(["ink", "ink-outline"]);

const SIZES = {
  sm: "gap-1.5 rounded-md px-4 py-2.5 text-sm",
  md: "gap-2 rounded-lg px-5.5 py-3.5 text-base",
  lg: "gap-2 rounded-[18px] px-7 py-4.5 text-md",
} as const;

const ICON_SIZES = { sm: 16, md: 20, lg: 22 } as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Pleine largeur. */
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  children: ReactNode;
};

type AsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
    /** Envoi en cours : désactive le bouton (anti double envoi) et l'annonce occupé. */
    loading?: boolean;
  };

type AsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    /** Rendu en lien (`<a>`) : navigation, jamais action. */
    href: string;
  };

export type ButtonProps = AsButton | AsLink;

export function buttonClasses({
  variant = "primary",
  size = "md",
  block,
  className,
}: Pick<CommonProps, "variant" | "size" | "block"> & { className?: string }) {
  return cx(
    "inline-flex cursor-pointer items-center justify-center whitespace-nowrap font-extrabold leading-none tracking-[0.01em] select-none",
    "transition-[transform,background-color,box-shadow] duration-100 ease-(--ease-out) active:translate-y-0.5",
    "focus-visible:outline-3 focus-visible:outline-offset-2",
    INK_VARIANTS.has(variant) ? "focus-visible:outline-ink-900" : "focus-visible:outline-primary-500",
    "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-ink-100 disabled:text-ink-500 disabled:shadow-[0_4px_0_var(--ink-200)] disabled:active:translate-y-0",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}

export function Button({ variant, size = "md", block, icon, iconRight, children, className, ...props }: ButtonProps) {
  const classes = buttonClasses({ variant, size, block, className });
  const iconSize = ICON_SIZES[size];
  const trailing = iconRight && <Icon name={iconRight} size={iconSize} strokeWidth={2.5} />;

  if (props.href !== undefined) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {icon && <Icon name={icon} size={iconSize} strokeWidth={2.5} />}
        {children}
        {trailing}
      </Link>
    );
  }

  const { loading, disabled, type = "button", ...rest } = props;
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...rest}>
      {loading ? (
        <span
          aria-hidden
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      ) : (
        icon && <Icon name={icon} size={iconSize} strokeWidth={2.5} />
      )}
      {children}
      {trailing}
    </button>
  );
}
