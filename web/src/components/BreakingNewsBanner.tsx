"use client";

/**
 * ============================================
 * BreakingNewsBanner - Bannière Breaking News
 * ============================================
 * Affiche une bannière rouge animée pour les actualités urgentes
 * avec mise à jour en temps réel depuis Firestore
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
} from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { Article } from "@/types";
import { BellAlertIcon, XMarkIcon } from "@heroicons/react/24/solid";

export function BreakingNewsBanner() {
    const [breakingNews, setBreakingNews] = useState<Article | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (!isConfigured || !db) return;

        // Chercher les articles breaking news des dernières 2 heures
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

        const q = query(
            collection(db, "articles"),
            where("isBreakingNews", "==", true),
            where("publishedAt", ">=", twoHoursAgo),
            orderBy("publishedAt", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setBreakingNews({
                    id: doc.id,
                    ...doc.data(),
                } as Article);
                setIsVisible(true);
            } else {
                setBreakingNews(null);
            }
        });

        return () => unsubscribe();
    }, []);

    if (!breakingNews || !isVisible) return null;

    return (
        <div className="relative bg-red-600 text-white py-3 px-4 mb-6 rounded-xl breaking-news-pulse overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 via-red-600 to-red-700 opacity-50" />

            {/* Content */}
            <div className="relative flex items-center gap-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                    <BellAlertIcon className="w-5 h-5 animate-pulse" />
                </div>

                {/* Label */}
                <span className="flex-shrink-0 font-bold text-xs uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                    Breaking
                </span>

                {/* Title */}
                <Link
                    href={`/article/${breakingNews.id}`}
                    className="flex-1 font-medium hover:underline truncate"
                >
                    {breakingNews.title}
                </Link>

                {/* Read button */}
                <Link
                    href={`/article/${breakingNews.id}`}
                    className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
                >
                    Lire
                    <span aria-hidden="true">→</span>
                </Link>

                {/* Close button */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Fermer"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
