import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Polices versionnées dans src/fonts (variables, sous-ensemble latin, licence OFL) :
// le build ne dépend pas de Google Fonts, injoignable depuis certains environnements de CI.
const nunito = localFont({
  src: "../fonts/nunito-latin-wght-normal.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Steamy",
  description: "Nous formons les inventeurs de demain",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${nunito.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
