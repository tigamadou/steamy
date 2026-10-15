import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

import { cx } from "@/lib/cx";

type CommonProps = {
  active?: boolean;
  /** Couleur de la pastille : valeur CSS fournie par la catégorie (API) ou un token. */
  color?: string;
  className?: string;
  children: ReactNode;
};

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
    href?: undefined;
  };

type AsLink = CommonProps & {
  /** Lien filtrant (ex. `/parcours?categorie=robotique`) : le filtre est adressable par URL. */
  href: string;
};

export type TagProps = AsButton | AsLink;

// Filtre de catégorie (design/ds-atoms.jsx). Toujours un vrai bouton (`aria-pressed`) ou un vrai lien.
export function Tag({ active, color, className, children, ...props }: TagProps) {
  const classes = cx(
    "inline-flex cursor-pointer items-center gap-1.5 rounded-pill border-2 px-3.5 py-2 text-[13px] font-extrabold leading-none transition-colors",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
    active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-surface text-ink-700 hover:border-ink-300",
    className,
  );
  const dot = color && (
    <span
      aria-hidden
      className="size-2 rounded-pill bg-(--tag-color)"
      style={{ "--tag-color": color } as CSSProperties}
    />
  );

  if (props.href !== undefined) {
    return (
      <Link href={props.href} aria-current={active ? "true" : undefined} className={classes}>
        {dot}
        {children}
      </Link>
    );
  }

  const { type = "button", ...rest } = props;
  return (
    <button type={type} aria-pressed={!!active} className={classes} {...rest}>
      {dot}
      {children}
    </button>
  );
}
