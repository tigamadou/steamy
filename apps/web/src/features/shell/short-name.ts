/** « Léa A. » : prénom et initiale du nom (shells apprenant et parent). */
export function shortName(firstName: string, lastName: string): string {
  const initial = lastName.trim().charAt(0);
  return initial ? `${firstName} ${initial.toUpperCase()}.` : firstName;
}
