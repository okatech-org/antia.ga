"use client";

/**
 * ============================================
 * Page d'accueil - Fil d'actualités
 * ============================================
 */

import { NewsFeed } from "@/components/NewsFeed";

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero section */}
      <section className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
          Actualités du <span className="text-green-600">Gabon</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
          Toutes les sources réunies, réécrites par IA pour une lecture claire,
          objective et accessible.
        </p>
      </section>

      {/* Fil d'actualités */}
      <NewsFeed maxArticles={20} />
    </div>
  );
}
