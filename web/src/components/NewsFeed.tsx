"use client";

/**
 * ============================================
 * NewsFeed - Fil d'actualité principal
 * ============================================
 */

import { useLatestArticles, useTrendingArticles } from "@/hooks/useFirestore";
import { ArticleList } from "./ArticleList";
import { ArticleCard } from "./ArticleCard";
import { ArticleCategory, CATEGORY_LABELS } from "@/types";

interface NewsFeedProps {
    category?: ArticleCategory;
    maxArticles?: number;
}

export function NewsFeed({ category, maxArticles = 20 }: NewsFeedProps) {
    const { articles, loading, error } = useLatestArticles(maxArticles, category);
    const { articles: trending, loading: trendingLoading } = useTrendingArticles(4);

    if (error) {
        return (
            <div className="text-center py-16">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                    Erreur de chargement
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Impossible de charger les articles. Veuillez réessayer.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Colonne principale */}
            <div className="lg:col-span-3">
                {category && (
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        {CATEGORY_LABELS[category]}
                    </h2>
                )}
                <ArticleList articles={articles} loading={loading} />
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
                {/* Tendances */}
                <div className="sticky top-20">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        🔥 Tendances
                    </h3>

                    {trendingLoading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className="animate-pulse flex gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800"
                                >
                                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : trending.length > 0 ? (
                        <div className="space-y-3">
                            {trending.map((article) => (
                                <ArticleCard key={article.id} article={article} variant="compact" />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Aucune tendance pour le moment.
                        </p>
                    )}

                    {/* Catégories rapides */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            📂 Catégories
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <a
                                    key={key}
                                    href={`/categorie/${key}`}
                                    className="px-3 py-1.5 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* À propos */}
                    <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-900/20 dark:to-yellow-900/20">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                            📰 GabonNews
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Votre agrégateur d&apos;actualités gabonaises. Toutes les sources réunies,
                            réécrites par IA pour une lecture claire et objective.
                        </p>
                    </div>
                </div>
            </aside>
        </div>
    );
}
