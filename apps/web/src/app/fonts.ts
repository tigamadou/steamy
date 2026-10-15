import localFont from "next/font/local";

// Police unique du produit (Nunito, SPEC-TECHNIQUE §1.4), versionnée dans src/fonts (variables, sous-ensemble latin, licence OFL) :
// le build ne dépend pas de Google Fonts, injoignable depuis certains environnements de CI.
export const nunito = localFont({
  src: "../fonts/nunito-latin-wght-normal.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});
