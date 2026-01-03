import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ANTIA.GA - Actualités Gabonaises",
  description:
    "Toutes les actualités du Gabon réunies et réécrites par IA pour une lecture claire et objective. Politique, économie, société, sport, culture.",
  keywords: [
    "Gabon",
    "actualités",
    "news",
    "presse",
    "Libreville",
    "Afrique",
    "politique",
    "économie",
    "ANTIA",
  ],
  authors: [{ name: "ANTIA.GA" }],
  openGraph: {
    title: "ANTIA.GA - Actualités Gabonaises",
    description: "Toutes les actualités du Gabon réunies et réécrites par IA",
    type: "website",
    locale: "fr_FR",
    siteName: "ANTIA.GA",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen antialiased`}
      >
        <Header />
        <main className="pt-16">{children}</main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🇬🇦</span>
                <span className="font-bold text-lg">
                  ANTIA<span className="text-green-600">.GA</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Agrégateur d&apos;actualités gabonaises propulsé par l&apos;IA.
                <br />
                Les articles sont réécrits à partir de sources publiques.
              </p>
              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                <a href="/mentions-legales" className="hover:text-green-600">
                  Mentions légales
                </a>
                <a href="/contact" className="hover:text-green-600">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
