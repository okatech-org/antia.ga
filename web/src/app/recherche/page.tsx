"use client";

/**
 * ============================================
 * Page Recherche - /recherche
 * ============================================
 * Recherche d'articles avec filtres par catégorie et date
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { ArticleList } from "@/components/ArticleList";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Article, ArticleCategory } from "@/types";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
} from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

function SearchContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [results, setResults] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | "all">("all");

    // Rechercher quand la query change
    useEffect(() => {
        if (initialQuery) {
            handleSearch(initialQuery);
        }
    }, [initialQuery]);

    const handleSearch = async (searchTerm: string) => {
        if (!searchTerm.trim() || !isConfigured || !db) {
            setResults([]);
            return;
        }

        setLoading(true);
        setHasSearched(true);

        try {
            // Recherche simple par titre (Firestore ne supporte pas la recherche full-text native)
            // Pour une vraie recherche, utiliser Algolia ou Typesense
            const articlesRef = collection(db, "articles");

            let firestoreQuery = query(
                articlesRef,
                orderBy("publishedAt", "desc"),
                limit(50)
            );

            if (selectedCategory !== "all") {
                firestoreQuery = query(
                    articlesRef,
                    where("categories", "array-contains", selectedCategory),
                    orderBy("publishedAt", "desc"),
                    limit(50)
                );
            }

            const snapshot = await getDocs(firestoreQuery);

            // Filtrer côté client par correspondance de titre
            const searchTermLower = searchTerm.toLowerCase();
            const filtered = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() } as Article))
                .filter(
                    (article) =>
                        article.title.toLowerCase().includes(searchTermLower) ||
                        article.shortSummary?.toLowerCase().includes(searchTermLower)
                );

            setResults(filtered);
        } catch (error) {
            console.error("Erreur recherche:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <header className="mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    ← Retour à l'accueil
                </Link>
                <h1 className="text-3xl font-bold mb-6">Rechercher</h1>

                {/* Search bar */}
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                    placeholder="Rechercher une actualité, une personne, un lieu..."
                    autoFocus
                />
            </header>

            {/* Filters */}
            <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

            {/* Results */}
            <section>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gabon-green border-t-transparent" />
                    </div>
                ) : results.length > 0 ? (
                    <>
                        <p className="text-muted-foreground mb-4">
                            {results.length} résultat{results.length > 1 ? "s" : ""} pour "{searchQuery}"
                        </p>
                        <ArticleList articles={results} loading={false} />
                    </>
                ) : hasSearched ? (
                    <EmptySearchState query={searchQuery} />
                ) : (
                    <InitialSearchState />
                )}
            </section>
        </div>
    );
}

function EmptySearchState({ query }: { query: string }) {
    return (
        <div className="text-center py-16">
            <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aucun résultat</h2>
            <p className="text-muted-foreground mb-6">
                Aucun article ne correspond à "{query}"
            </p>
            <div className="text-sm text-muted-foreground">
                <p className="mb-2">Suggestions :</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Vérifiez l'orthographe des mots-clés</li>
                    <li>Essayez des termes plus généraux</li>
                    <li>Essayez d'autres catégories</li>
                </ul>
            </div>
        </div>
    );
}

function InitialSearchState() {
    const popularSearches = [
        "CTRI",
        "Oligui Nguema",
        "Transition",
        "CAN 2025",
        "Économie",
        "Libreville",
    ];

    return (
        <div className="text-center py-16">
            <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Rechercher une actualité</h2>
            <p className="text-muted-foreground mb-6">
                Entrez un mot-clé pour trouver des articles
            </p>

            {/* Popular searches */}
            <div className="max-w-md mx-auto">
                <p className="text-sm text-muted-foreground mb-3">Recherches populaires :</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {popularSearches.map((term) => (
                        <Link
                            key={term}
                            href={`/recherche?q=${encodeURIComponent(term)}`}
                            className="px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80 transition-colors"
                        >
                            {term}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense
            fallback={
                <div className="container mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-muted rounded-xl w-full" />
                        <div className="h-12 bg-muted rounded-lg w-3/4" />
                    </div>
                </div>
            }
        >
            <SearchContent />
        </Suspense>
    );
}
