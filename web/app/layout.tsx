import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cropland Showdown — Winner vs TabPFN-3.5",
  description: "Zindi cropland mapping winner vs TabPFN-3.5, honest duel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="light">
      <body>
        <main className="mx-auto max-w-4xl px-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
