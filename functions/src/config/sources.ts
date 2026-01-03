/**
 * ============================================
 * Configuration des Sources - Agrégateur Gabon
 * ============================================
 * Configuration centralisée de toutes les sources de données
 */

import { Source, SourceType } from "../types/index.js";

/**
 * Configuration complète des 15 sources gabonaises
 */
export const SOURCES_CONFIG: Source[] = [
    // ============================================
    // SOURCES PRIORITAIRES (Priority 1)
    // ============================================
    {
        name: "Gabon Review",
        type: SourceType.WEBSITE,
        url: "https://www.gabonreview.com",
        active: true,
        priority: 1,
        logoUrl: "https://www.gabonreview.com/wp-content/uploads/logo.png",
        scrapingConfig: {
            baseUrl: "https://www.gabonreview.com",
            articleListSelector: "article.post, .post-item, .entry",
            titleSelector: "h2.entry-title a, h3.entry-title a, .post-title a",
            contentSelector: ".entry-content p, .post-content p",
            imageSelector: ".post-thumbnail img, .entry-thumbnail img, figure img",
            dateSelector: "time.entry-date, .post-date, .date",
            authorSelector: ".author-name, .entry-author a",
            delayMs: 2000,
        },
    },
    {
        name: "Info241",
        type: SourceType.WEBSITE,
        url: "https://info241.com",
        active: true,
        priority: 1,
        logoUrl: "https://info241.com/local/cache-gd2/logo.png",
        scrapingConfig: {
            baseUrl: "https://info241.com",
            articleListSelector: ".article, .une-article, .liste-articles article",
            titleSelector: "h1 a, h2 a, h3 a, .titre a",
            contentSelector: ".chapo, .introduction, .resume, .texte p",
            imageSelector: "img.spip_logo, .vignette img, figure img",
            dateSelector: ".date, time, .published",
            authorSelector: ".auteur, .author",
            delayMs: 2500,
        },
    },
    {
        name: "L'Union",
        type: SourceType.WEBSITE,
        url: "https://www.union.sonapresse.com",
        active: true,
        priority: 1,
        scrapingConfig: {
            baseUrl: "https://www.union.sonapresse.com",
            articleListSelector: "article, .news-item, .post",
            titleSelector: "h2 a, h3 a, .title a",
            contentSelector: ".content p, .article-body p, .entry-content p",
            imageSelector: "img.featured, .article-image img, figure img",
            dateSelector: ".date, time, .post-date",
            authorSelector: ".author, .by-author",
            delayMs: 2000,
        },
    },

    // ============================================
    // SOURCES STANDARD (Priority 2)
    // ============================================
    {
        name: "Gabonactu",
        type: SourceType.WEBSITE,
        url: "https://gabonactu.com",
        active: true,
        priority: 2,
        scrapingConfig: {
            baseUrl: "https://gabonactu.com",
            articleListSelector: "article, .post, .news-item",
            titleSelector: "h2 a, h3 a, .entry-title a",
            contentSelector: ".entry-content p, .post-content p",
            imageSelector: ".post-thumbnail img, figure img",
            dateSelector: "time, .date, .post-meta time",
            authorSelector: ".author, .byline",
            delayMs: 2000,
        },
    },
    {
        name: "Gabon Media Time",
        type: SourceType.WEBSITE,
        url: "https://gabonmediatime.com",
        active: true,
        priority: 2,
        scrapingConfig: {
            baseUrl: "https://gabonmediatime.com",
            articleListSelector: "article, .post-item, .news-card",
            titleSelector: "h2 a, h3 a, .post-title a",
            contentSelector: ".post-content p, .entry-content p",
            imageSelector: ".featured-image img, .post-thumbnail img",
            dateSelector: "time, .date, .post-date",
            authorSelector: ".author-name, .byline",
            delayMs: 2000,
        },
    },
    {
        name: "La Libreville",
        type: SourceType.WEBSITE,
        url: "https://lalibreville.com",
        active: true,
        priority: 2,
        scrapingConfig: {
            baseUrl: "https://lalibreville.com",
            articleListSelector: "article, .post, .entry",
            titleSelector: "h2 a, h3 a, .entry-title a",
            contentSelector: ".entry-content p, .post-content p",
            imageSelector: ".post-thumbnail img, .featured-image img",
            dateSelector: "time.entry-date, .post-date",
            authorSelector: ".author, .entry-author",
            delayMs: 2000,
        },
    },
    {
        name: "Gabon Matin",
        type: SourceType.WEBSITE,
        url: "https://gabonmatin.com",
        active: true,
        priority: 2,
        scrapingConfig: {
            baseUrl: "https://gabonmatin.com",
            articleListSelector: "article, .post, .news-item",
            titleSelector: "h2 a, h3 a, .title a",
            contentSelector: ".content p, .article-body p",
            imageSelector: ".thumbnail img, .featured img",
            dateSelector: "time, .date",
            authorSelector: ".author",
            delayMs: 2000,
        },
    },
    {
        name: "Direct Infos Gabon",
        type: SourceType.WEBSITE,
        url: "https://directinfosgabon.com",
        active: true,
        priority: 2,
        scrapingConfig: {
            baseUrl: "https://directinfosgabon.com",
            articleListSelector: "article, .post, .item",
            titleSelector: "h2 a, h3 a, .post-title a",
            contentSelector: ".post-content p, .entry-content p",
            imageSelector: ".post-image img, .thumbnail img",
            dateSelector: "time, .date, .meta-date",
            authorSelector: ".author, .meta-author",
            delayMs: 2000,
        },
    },

    // ============================================
    // SOURCES SPECIALISEES (Priority 3)
    // ============================================
    {
        name: "Mays-Mouissi",
        type: SourceType.WEBSITE,
        url: "https://mays-mouissi.com",
        active: true,
        priority: 3,
        scrapingConfig: {
            baseUrl: "https://mays-mouissi.com",
            articleListSelector: "article, .post, .blog-post",
            titleSelector: "h2 a, h1 a, .entry-title a",
            contentSelector: ".entry-content p, .post-content p",
            imageSelector: ".post-thumbnail img, .featured-image img",
            dateSelector: "time, .date, .post-date",
            authorSelector: ".author, .by-author",
            delayMs: 3000, // Blog, moins fréquent
        },
    },
    {
        name: "AGP - Agence Gabonaise de Presse",
        type: SourceType.WEBSITE,
        url: "https://www.agpgabon.ga",
        active: true,
        priority: 1, // Source officielle = haute priorité
        scrapingConfig: {
            baseUrl: "https://www.agpgabon.ga",
            articleListSelector: "article, .news-item, .post",
            titleSelector: "h2 a, h3 a, .title a",
            contentSelector: ".content p, .article-body p",
            imageSelector: ".article-image img, .thumbnail img",
            dateSelector: "time, .date, .published",
            authorSelector: ".author, .source",
            delayMs: 2000,
        },
    },

    // ============================================
    // FLUX RSS
    // ============================================
    {
        name: "AllAfrica Gabon",
        type: SourceType.RSS,
        url: "https://fr.allafrica.com/gabon/",
        active: true,
        priority: 2,
        scrapingConfig: {
            baseUrl: "https://fr.allafrica.com/tools/headlines/rdf/gabon/headlines.rdf",
            articleListSelector: "",
            titleSelector: "",
            contentSelector: "",
        },
    },
];

/**
 * Récupère les sources par priorité
 */
export function getSourcesByPriority(priority: number): Source[] {
    return SOURCES_CONFIG.filter((s) => s.priority === priority && s.active);
}

/**
 * Récupère les sources par type
 */
export function getSourcesByType(type: SourceType): Source[] {
    return SOURCES_CONFIG.filter((s) => s.type === type && s.active);
}

/**
 * Récupère toutes les sources actives
 */
export function getActiveSources(): Source[] {
    return SOURCES_CONFIG.filter((s) => s.active);
}

/**
 * Récupère une source par nom
 */
export function getSourceByName(name: string): Source | undefined {
    return SOURCES_CONFIG.find((s) => s.name === name);
}

/**
 * Comptes Twitter prioritaires à surveiller
 */
export const TWITTER_ACCOUNTS = [
    "GabonReview",
    "Info241",
    "PresidenceGabon",
    "AGPGabon",
    "GouvGabon",
    "MaysMouissi",
];

/**
 * User Agents pour rotation
 */
export const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "GabonNewsBot/1.0 (+https://gabon-news-hub.web.app)",
];

/**
 * Retourne un User-Agent aléatoire
 */
export function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
