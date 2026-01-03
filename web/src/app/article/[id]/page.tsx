"use client";

/**
 * ============================================
 * Page détail d'article
 * ============================================
 */

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeftIcon, ShareIcon, BookmarkIcon } from "@heroicons/react/24/outline";
import { useArticle } from "@/hooks/useFirestore";
import { CATEGORY_LABELS, CATEGORY_COLORS, ArticleCategory } from "@/types";

export default function ArticlePage() {
    const params = useParams();
    const articleId = params.id as string;
    const { article, loading, error } = useArticle(articleId);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="text-6xl mb-4">📰</div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Article non trouvé
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Cet article n&apos;existe pas ou a été supprimé.
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

    const timeAgo = formatDistanceToNow(article.publishedAt, {
        addSuffix: true,
        locale: fr,
    });

    const formattedDate = format(article.publishedAt, "d MMMM yyyy 'à' HH:mm", {
        locale: fr,
    });

    return (
        <article className="max-w-4xl mx-auto px-4 py-8">
            {/* Navigation */}
            <nav className="mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Retour aux actualités
                </Link>
            </nav>

            {/* Catégories */}
            <div className="flex flex-wrap gap-2 mb-4">
                {article.categories.map((cat) => (
                    <Link
                        key={cat}
                        href={`/categorie/${cat}`}
                        className={`px-3 py-1 text-sm font-medium text-white rounded-full ${CATEGORY_COLORS[cat as ArticleCategory]}`}
                    >
                        {CATEGORY_LABELS[cat as ArticleCategory]}
                    </Link>
                ))}
            </div>

            {/* Titre */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
                {article.title}
            </h1>

            {/* Métadonnées */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <time dateTime={article.publishedAt.toISOString()}>
                    {formattedDate}
                </time>
                <span>•</span>
                <span>{timeAgo}</span>
                <span>•</span>
                <span>{article.viewCount} vues</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-8">
                <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <ShareIcon className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <BookmarkIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Image */}
            {article.imageUrl && (
                <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
                    <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            )}

            {/* Résumé court */}
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg mb-8">
                <h2 className="font-bold text-green-800 dark:text-green-300 mb-2">
                    En bref
                </h2>
                <p className="text-green-700 dark:text-green-200">
                    {article.shortSummary}
                </p>
            </div>

            {/* Contenu long */}
            <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                {article.longContent.split("\n\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                ))}
            </div>

            {/* Entités */}
            {article.entities && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                        📌 Entités mentionnées
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {article.entities.people.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                    Personnes
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {article.entities.people.map((person, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                                        >
                                            {person}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {article.entities.places.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                    Lieux
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {article.entities.places.map((place, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded"
                                        >
                                            {place}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {article.entities.organizations.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                    Organisations
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {article.entities.organizations.map((org, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded"
                                        >
                                            {org}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sources */}
            <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                    📰 Sources originales
                </h3>
                <div className="flex flex-wrap gap-3">
                    {article.sources.map((source, i) => (
                        <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {source.name}
                            <span className="text-xs">↗</span>
                        </a>
                    ))}
                </div>
            </div>
        </article>
    );
}
