import Form from "next/form";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type HeaderSearchProps = {
  /** Page de résultats (le terme part dans `?q=`). */
  action: string;
  placeholder: string;
  /** Libellé accessible du champ. */
  label: string;
  className?: string;
};

// Recherche du header (design/screens-dashboard-web.jsx, `.app-header__search`) : formulaire GET, navigation client.
export function HeaderSearch({ action, placeholder, label, className }: HeaderSearchProps) {
  return (
    <Form
      action={action}
      role="search"
      className={cx(
        "flex h-10 items-center gap-2 rounded-pill border-[1.5px] border-transparent bg-ink-50 px-4 text-ink-600 transition-colors",
        "focus-within:border-primary-300 focus-within:bg-surface",
        className,
      )}
    >
      <Icon name="search" size={16} />
      <input
        type="search"
        name="q"
        aria-label={label}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-ink-900 outline-none placeholder:text-ink-500"
      />
    </Form>
  );
}
