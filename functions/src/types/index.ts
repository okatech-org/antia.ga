/**
 * ============================================
 * Types - Agrégateur de Presse Gabonaise
 * ============================================
 * Définitions TypeScript pour toutes les entités du système
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================
// ENUMS
// ============================================

/**
 * Types de sources de données
 */
export enum SourceType {
    WEBSITE = "website",
    RSS = "rss",
    TWITTER = "twitter",
    FACEBOOK = "facebook",
    OFFICIAL = "official",
}

/**
 * Catégories d'articles
 */
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

/**
 * Types de notifications
 */
export enum NotificationType {
    BREAKING = "breaking",
    DAILY = "daily",
    CATEGORY = "category",
}

// ============================================
// INTERFACES - Sources
// ============================================

/**
 * Configuration de scraping pour une source
 */
export interface ScrapingConfig {
    /** Sélecteur CSS pour la liste d'articles */
    articleListSelector: string;
    /** Sélecteur CSS pour le titre */
    titleSelector: string;
    /** Sélecteur CSS pour le contenu */
    contentSelector: string;
    /** Sélecteur CSS pour l'image */
    imageSelector?: string;
    /** Sélecteur CSS pour la date */
    dateSelector?: string;
    /** Sélecteur CSS pour l'auteur */
    authorSelector?: string;
    /** URL de la page à scraper */
    baseUrl: string;
    /** Délai entre requêtes (ms) */
    delayMs?: number;
}

/**
 * Source de données (site web, RSS, etc.)
 */
export interface Source {
    id?: string;
    /** Nom de la source */
    name: string;
    /** Type de source */
    type: SourceType;
    /** URL principale */
    url: string;
    /** Configuration de scraping */
    scrapingConfig: ScrapingConfig;
    /** Date du dernier scraping */
    lastScraped?: Timestamp;
    /** Source active ? */
    active: boolean;
    /** Priorité (1 = haute) */
    priority: number;
    /** Logo de la source */
    logoUrl?: string;
}

// ============================================
// INTERFACES - Articles
// ============================================

/**
 * Article brut collecté (non traité)
 */
export interface RawArticle {
    id?: string;
    /** ID de la source */
    sourceId: string;
    /** Nom de la source (dénormalisé) */
    sourceName: string;
    /** Titre original */
    title: string;
    /** Contenu original */
    content: string;
    /** URL de l'article */
    url: string;
    /** Date de publication */
    publishedAt: Timestamp;
    /** Date de collecte */
    scrapedAt: Timestamp;
    /** URL de l'image */
    imageUrl?: string;
    /** Auteur */
    author?: string;
    /** Article traité ? */
    processed: boolean;
    /** Hash du contenu pour détection doublons */
    contentHash: string;
}

/**
 * Entités extraites d'un article
 */
export interface ExtractedEntities {
    /** Personnes mentionnées */
    people: string[];
    /** Lieux mentionnés */
    places: string[];
    /** Organisations mentionnées */
    organizations: string[];
    /** Mots-clés */
    keywords: string[];
}

/**
 * Article traité et publié
 */
export interface Article {
    id?: string;
    /** Titre réécrit (accrocheur) */
    title: string;
    /** Résumé court (50 mots) */
    shortSummary: string;
    /** Résumé moyen (200 mots) */
    mediumSummary: string;
    /** Contenu long (500 mots) */
    longContent: string;
    /** Catégories */
    categories: ArticleCategory[];
    /** Entités extraites */
    entities: ExtractedEntities;
    /** Références aux articles bruts sources */
    sourceArticleIds: string[];
    /** Métadonnées des sources */
    sources: Array<{
        name: string;
        url: string;
        reliability?: "high" | "medium" | "low";
    }>;
    /** Date de publication (la plus ancienne des sources) */
    publishedAt: Timestamp;
    /** Date de traitement */
    processedAt: Timestamp;
    /** Article tendance ? */
    trending: boolean;
    /** Nombre de vues */
    viewCount: number;
    /** URL de l'image principale */
    imageUrl?: string;
    /** Score de similarité si fusion */
    similarityScore?: number;
    /** Tags suggérés */
    tags?: string[];
    /** Breaking news ? */
    isBreakingNews?: boolean;
    /** Niveau d'urgence */
    breakingNewsLevel?: "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
    /** Article de synthèse multi-sources ? */
    isSynthesis?: boolean;
    /** Métadonnées de synthèse */
    synthesisMetadata?: {
        clusterId: string;
        articleCount: number;
        factualConsensus: number;
        contradictions: Array<{
            topic: string;
            sources: { name: string; value: string }[];
            resolution: string;
        }>;
        confidence: number;
    };
}

// ============================================
// INTERFACES - Utilisateurs
// ============================================

/**
 * Préférences de notification utilisateur
 */
export interface NotificationSettings {
    /** Recevoir les breaking news */
    breakingNews: boolean;
    /** Recevoir le digest quotidien */
    dailyDigest: boolean;
    /** Heure du digest (format HH:MM) */
    digestTime: string;
    /** Catégories à suivre */
    followedCategories: ArticleCategory[];
}

/**
 * Utilisateur
 */
export interface User {
    id?: string;
    /** Email */
    email: string;
    /** Nom d'affichage */
    displayName?: string;
    /** Photo de profil */
    photoUrl?: string;
    /** Catégories favorites */
    favoriteCategories: ArticleCategory[];
    /** IDs des articles en favoris */
    bookmarks: string[];
    /** Historique de lecture (derniers 100) */
    readHistory: string[];
    /** Paramètres de notification */
    notificationSettings: NotificationSettings;
    /** Token FCM pour push */
    fcmToken?: string;
    /** Date de création */
    createdAt: Timestamp;
    /** Dernière connexion */
    lastLoginAt: Timestamp;
}

// ============================================
// INTERFACES - Notifications
// ============================================

/**
 * Notification envoyée
 */
export interface Notification {
    id?: string;
    /** ID de l'article associé */
    articleId: string;
    /** Titre de la notification */
    title: string;
    /** Corps de la notification */
    body: string;
    /** Date d'envoi */
    sentAt: Timestamp;
    /** Type de notification */
    type: NotificationType;
    /** Nombre de destinataires */
    recipientCount: number;
}

// ============================================
// INTERFACES - Traitement Gemini
// ============================================

/**
 * Résultat du traitement Gemini
 */
export interface GeminiProcessingResult {
    /** Titre réécrit */
    title: string;
    /** Résumé court (50 mots) */
    shortSummary: string;
    /** Résumé moyen (200 mots) */
    mediumSummary: string;
    /** Contenu long (500 mots) */
    longContent: string;
    /** Catégories détectées */
    categories: ArticleCategory[];
    /** Entités extraites */
    entities: ExtractedEntities;
    /** Confiance de la catégorisation (0-1) */
    confidence: number;
}

/**
 * Configuration du processeur Gemini
 */
export interface GeminiConfig {
    /** Modèle à utiliser */
    model: "gemini-1.5-flash" | "gemini-1.5-pro";
    /** Température (0-1, plus bas = plus factuel) */
    temperature: number;
    /** Tokens max en sortie */
    maxOutputTokens: number;
}
