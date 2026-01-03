/**
 * ============================================
 * Types partagés pour le frontend
 * ============================================
 */

// Catégories d'articles (enum pour compatibilité avec CategoryFilter)
export enum ArticleCategory {
    POLITIQUE = "politique",
    ECONOMIE = "economie",
    SOCIETE = "societe",
    SPORT = "sport",
    CULTURE = "culture",
    INTERNATIONAL = "international",
    TECHNOLOGIE = "technologie",
    ENVIRONNEMENT = "environnement",
}

// Labels des catégories en français
export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
    [ArticleCategory.POLITIQUE]: "Politique",
    [ArticleCategory.ECONOMIE]: "Économie",
    [ArticleCategory.SOCIETE]: "Société",
    [ArticleCategory.SPORT]: "Sport",
    [ArticleCategory.CULTURE]: "Culture",
    [ArticleCategory.INTERNATIONAL]: "International",
    [ArticleCategory.TECHNOLOGIE]: "Technologie",
    [ArticleCategory.ENVIRONNEMENT]: "Environnement",
};

// Couleurs des catégories (classes Tailwind)
export const CATEGORY_COLORS: Record<ArticleCategory, string> = {
    [ArticleCategory.POLITIQUE]: "bg-red-500",
    [ArticleCategory.ECONOMIE]: "bg-emerald-500",
    [ArticleCategory.SOCIETE]: "bg-violet-500",
    [ArticleCategory.SPORT]: "bg-orange-500",
    [ArticleCategory.CULTURE]: "bg-pink-500",
    [ArticleCategory.INTERNATIONAL]: "bg-sky-500",
    [ArticleCategory.TECHNOLOGIE]: "bg-teal-500",
    [ArticleCategory.ENVIRONNEMENT]: "bg-green-500",
};

// Entités extraites
export interface ExtractedEntities {
    people: string[];
    places: string[];
    organizations: string[];
    keywords: string[];
}

// Source d'un article
export interface ArticleSource {
    name: string;
    url: string;
    reliability?: "high" | "medium" | "low";
}

// Article complet
export interface Article {
    id: string;
    title: string;
    shortSummary: string;
    mediumSummary: string;
    longContent: string;
    categories: ArticleCategory[];
    entities: ExtractedEntities;
    sources: ArticleSource[];
    publishedAt: Date;
    processedAt: Date;
    trending: boolean;
    viewCount: number;
    imageUrl?: string;
    tags?: string[];
    isBreakingNews?: boolean;
    breakingNewsLevel?: "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
    isSynthesis?: boolean;
}

// Préférences utilisateur
export interface UserPreferences {
    favoriteCategories: ArticleCategory[];
    darkMode: boolean;
    notifications: {
        breakingNews: boolean;
        dailyDigest: boolean;
    };
    liteMode: boolean;
}

