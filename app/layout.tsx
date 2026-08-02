import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PianoBadgeProvider } from "@/components/PianoBadgeContext";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrdinaAI — Piano Ordini",
  description: "Genera proposte d'ordine per fornitore a partire dai dati di magazzino, con l'aiuto dell'AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} h-full antialiased`} data-theme="dark">
      <body>
        <PianoBadgeProvider>
          <div style={{ display: "flex", height: "100vh", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)" }}>
            <Sidebar />
            <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-8) 40px" }}>{children}</div>
          </div>
        </PianoBadgeProvider>
      </body>
    </html>
  );
}
