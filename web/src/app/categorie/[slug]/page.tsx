"use client";

/**
 * ============================================
 * Page catégorie
 * ============================================
 */

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { NewsFeed } from "@/components/NewsFeed";
import { CATEGORY_LABELS, ArticleCategory } from "@/types";

export default function CategoryPage() {
    const params = useParams();
    const category = params.slug as ArticleCategory;

    const categoryLabel = CATEGORY_LABELS[category];

    if (!categoryLabel) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Catégorie introuvable
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Cette catégorie n&apos;existe pas.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Retour à l&apos;accueil
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Navigation */}
            <nav className="mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Toutes les actualités
                </Link>
            </nav>

            {/* Header */}
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                    {categoryLabel}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                    Toutes les actualités dans la catégorie {categoryLabel.toLowerCase()}.
                </p>
            </header>

            {/* Fil d'actualités filtré */}
            <NewsFeed category={category} maxArticles={30} />
        </div>
    );
}
