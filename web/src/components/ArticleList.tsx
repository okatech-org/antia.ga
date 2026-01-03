"use client";

/**
 * ============================================
 * ArticleList - Liste d'articles avec skeleton
 * ============================================
 */

import { Article } from "@/types";
import { ArticleCard } from "./ArticleCard";

interface ArticleListProps {
    articles: Article[];
    loading?: boolean;
    showFeatured?: boolean;
}

// Skeleton de chargement
function ArticleSkeleton() {
    return (
        <div className="animate-pulse rounded-xl bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
            <div className="h-48 bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
        </div>
    );
}

export function ArticleList({
    articles,
    loading = false,
    showFeatured = true,
}: ArticleListProps) {
    if (loading) {
        return (
            <div className="space-y-8">
                {/* Skeleton featured */}
                {showFeatured && (
                    <div className="animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 h-80" />
                )}

                {/* Skeleton grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <ArticleSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="text-6xl mb-4">📰</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Aucun article
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Les articles apparaîtront bientôt. Revenez plus tard !
                </p>
            </div>
        );
    }

    const [featured, ...rest] = articles;

    return (
        <div className="space-y-8">
            {/* Article à la une */}
            {showFeatured && featured && (
                <ArticleCard article={featured} variant="featured" />
            )}

            {/* Grille d'articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(showFeatured ? rest : articles).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                ))}
            </div>
        </div>
    );
}
