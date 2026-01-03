/**
 * ============================================
 * Hooks personnalisés pour Firestore
 * ============================================
 */

import { useState, useEffect } from "react";
import {
    collection,
    query,
    orderBy,
    limit,
    where,
    onSnapshot,
    doc,
    getDoc,
    Timestamp,
    QueryConstraint,
} from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { Article, ArticleCategory } from "@/types";

/**
 * Convertit un document Firestore en Article
 */
function docToArticle(id: string, data: Record<string, unknown>): Article {
    return {
        id,
        title: data.title as string,
        shortSummary: data.shortSummary as string,
        mediumSummary: data.mediumSummary as string,
        longContent: data.longContent as string,
        categories: data.categories as ArticleCategory[],
        entities: data.entities as Article["entities"],
        sources: data.sources as Article["sources"],
        publishedAt: (data.publishedAt as Timestamp)?.toDate?.() || new Date(),
        processedAt: (data.processedAt as Timestamp)?.toDate?.() || new Date(),
        trending: data.trending as boolean,
        viewCount: data.viewCount as number,
        imageUrl: data.imageUrl as string | undefined,
    };
}

/**
 * Hook pour récupérer les derniers articles en temps réel
 */
export function useLatestArticles(
    maxArticles: number = 20,
    category?: ArticleCategory
) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // Si Firebase n'est pas configuré, retourner un tableau vide
        if (!isConfigured || !db) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            orderBy("publishedAt", "desc"),
            limit(maxArticles),
        ];

        if (category) {
            constraints.unshift(where("categories", "array-contains", category));
        }

        const q = query(collection(db, "articles"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const newArticles = snapshot.docs.map((doc) =>
                    docToArticle(doc.id, doc.data())
                );
                setArticles(newArticles);
                setLoading(false);
            },
            (err) => {
                console.error("Erreur Firestore:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [maxArticles, category]);

    return { articles, loading, error };
}

/**
 * Hook pour récupérer les articles tendance
 */
export function useTrendingArticles(maxArticles: number = 5) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isConfigured || !db) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "articles"),
            where("trending", "==", true),
            orderBy("publishedAt", "desc"),
            limit(maxArticles)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newArticles = snapshot.docs.map((doc) =>
                docToArticle(doc.id, doc.data())
            );
            setArticles(newArticles);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [maxArticles]);

    return { articles, loading };
}

/**
 * Hook pour récupérer un article par ID
 */
export function useArticle(articleId: string) {
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchArticle() {
            if (!isConfigured || !db) {
                setError(new Error("Firebase non configuré"));
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "articles", articleId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setArticle(docToArticle(docSnap.id, docSnap.data()));
                } else {
                    setError(new Error("Article non trouvé"));
                }
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }

        fetchArticle();
    }, [articleId]);

    return { article, loading, error };
}
