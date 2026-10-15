"use client";

import { createContext, useContext } from "react";

export type AdminMenu = { open: boolean; toggle: () => void; menuId: string };

/** Menu latéral repliable sous 1024 px : ouvert depuis l'en-tête de page, porté par le shell. */
export const AdminMenuContext = createContext<AdminMenu | null>(null);

export function useAdminMenu(): AdminMenu | null {
  return useContext(AdminMenuContext);
}
