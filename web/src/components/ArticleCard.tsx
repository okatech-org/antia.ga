"use client";

/**
 * ============================================
 * ArticleCard - Composant carte d'article
 * ============================================
 */

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Article, CATEGORY_LABELS, CATEGORY_COLORS } from "@/types";

interface ArticleCardProps {
    article: Article;
    variant?: "default" | "featured" | "compact";
}

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
    const timeAgo = formatDistanceToNow(article.publishedAt, {
        addSuffix: true,
        locale: fr,
    });

    const primaryCategory = article.categories[0];

    if (variant === "featured") {
        return (
            <Link href={`/article/${article.id}`} className="group block">
                <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
                    {/* Image de fond */}
                    <div className="relative h-80 overflow-hidden">
                        {article.imageUrl ? (
                            <Image
                                src={article.imageUrl}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-yellow-500" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    </div>

                    {/* Contenu */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        {/* Badge catégorie */}
                        {primaryCategory && (
                            <span
                                className={`inline-block px-3 py-1 text-xs font-bold text-white rounded-full mb-3 ${CATEGORY_COLORS[primaryCategory]}`}
                            >
                                {CATEGORY_LABELS[primaryCategory]}
                            </span>
                        )}

                        {/* Titre */}
                        <h2 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-green-400 transition-colors">
                            {article.title}
                        </h2>

                        {/* Résumé */}
                        <p className="text-gray-300 text-sm line-clamp-2 mb-3">
                            {article.shortSummary}
                        </p>

                        {/* Métadonnées */}
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{article.sources[0]?.name || "Source inconnue"}</span>
                            <span>{timeAgo}</span>
                        </div>
                    </div>

                    {/* Badge Trending */}
                    {article.trending && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                            🔥 Tendance
                        </div>
                    )}
                </article>
            </Link>
        );
    }

    if (variant === "compact") {
        return (
            <Link href={`/article/${article.id}`} className="group block">
                <article className="flex gap-4 p-3 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {/* Image miniature */}
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                        {article.imageUrl ? (
                            <Image
                                src={article.imageUrl}
                                alt={article.title}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-500 to-yellow-400" />
                        )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 group-hover:text-green-600 transition-colors">
                            {article.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {timeAgo}
                        </p>
                    </div>
                </article>
            </Link>
        );
    }

    // Variant default
    return (
        <Link href={`/article/${article.id}`} className="group block">
            <article className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                    {article.imageUrl ? (
                        <Image
                            src={article.imageUrl}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-yellow-400" />
                    )}

                    {/* Badge catégorie */}
                    {primaryCategory && (
                        <span
                            className={`absolute top-3 left-3 px-2 py-1 text-xs font-semibold text-white rounded-md ${CATEGORY_COLORS[primaryCategory]}`}
                        >
                            {CATEGORY_LABELS[primaryCategory]}
                        </span>
                    )}
                </div>

                {/* Contenu */}
                <div className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                        {article.title}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                        {article.shortSummary}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{article.sources[0]?.name || "Source"}</span>
                        <span>{timeAgo}</span>
                    </div>
                </div>
            </article>
        </Link>
    );
}
