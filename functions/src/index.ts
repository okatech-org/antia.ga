/**
 * ============================================
 * Index - Export des Cloud Functions
 * ============================================
 * Point d'entrée principal des Cloud Functions Firebase
 * Orchestre le scraping de 15 sources gabonaises
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// Scrapers
import { GenericWebsiteScraper } from "./scrapers/GenericWebsiteScraper.js";
import { RSSFetcher } from "./scrapers/RSSFetcher.js";

// Config
import {
    SOURCES_CONFIG,
    getSourcesByPriority,
    getSourcesByType,
} from "./config/sources.js";

// Processors
import { GeminiProcessor } from "./processors/GeminiProcessor.js";

// Utils
import { NotificationService } from "./utils/NotificationService.js";

// Types
import { Source, Article, SourceType } from "./types/index.js";

// Initialiser Firebase Admin
initializeApp();
const db = getFirestore();

// Secret pour la clé API Gemini
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// ============================================
// FONCTIONS DE SCRAPING
// ============================================

/**
 * Scraper haute priorité - Toutes les 15 minutes
 * Sources prioritaires : Gabon Review, Info241, L'Union, AGP
 */
export const scrapeHighPriority = onSchedule(
    {
        schedule: "*/15 * * * *", // Toutes les 15 minutes
        region: "europe-west1",
        timeoutSeconds: 540,
        memory: "512MiB",
    },
    async () => {
        console.log("🕷️ Scraping haute priorité (Priority 1)...");

        const highPrioritySources = getSourcesByPriority(1);
        const results = await scrapeMultipleSources(highPrioritySources);

        console.log("✅ Scraping haute priorité terminé:", JSON.stringify(results));
    }
);

/**
 * Scraper priorité standard - Toutes les 30 minutes
 * Sources : Gabonactu, Gabon Media Time, La Libreville, etc.
 */
export const scrapeStandardPriority = onSchedule(
    {
        schedule: "*/30 * * * *", // Toutes les 30 minutes
        region: "europe-west1",
        timeoutSeconds: 540,
        memory: "512MiB",
    },
    async () => {
        console.log("🕷️ Scraping priorité standard (Priority 2)...");

        const standardSources = getSourcesByPriority(2);
        const results = await scrapeMultipleSources(standardSources);

        console.log("✅ Scraping standard terminé:", JSON.stringify(results));
    }
);

/**
 * Scraper basse priorité - Toutes les heures
 * Sources : blogs, sources spécialisées
 */
export const scrapeLowPriority = onSchedule(
    {
        schedule: "0 * * * *", // Chaque heure
        region: "europe-west1",
        timeoutSeconds: 300,
        memory: "256MiB",
    },
    async () => {
        console.log("🕷️ Scraping basse priorité (Priority 3)...");

        const lowPrioritySources = getSourcesByPriority(3);
        const results = await scrapeMultipleSources(lowPrioritySources);

        console.log("✅ Scraping basse priorité terminé:", JSON.stringify(results));
    }
);

/**
 * Collecte RSS AllAfrica - Toutes les 10 minutes
 */
export const scrapeRSS = onSchedule(
    {
        schedule: "*/10 * * * *", // Toutes les 10 minutes
        region: "europe-west1",
        timeoutSeconds: 120,
        memory: "256MiB",
    },
    async () => {
        console.log("📡 Collecte RSS AllAfrica...");

        const rssSources = getSourcesByType(SourceType.RSS);

        for (const source of rssSources) {
            try {
                const storedSource = await getOrCreateSource(source);
                const fetcher = new RSSFetcher(storedSource);
                const count = await fetcher.fetch();
                console.log(`[${source.name}] ${count} articles collectés`);
            } catch (error) {
                console.error(`[${source.name}] Erreur: ${error}`);
            }
        }
    }
);

/**
 * Fonction utilitaire pour scraper plusieurs sources
 */
async function scrapeMultipleSources(
    sources: Source[]
): Promise<{ source: string; count: number; error?: string }[]> {
    const results: { source: string; count: number; error?: string }[] = [];

    for (const sourceConfig of sources) {
        if (sourceConfig.type !== SourceType.WEBSITE) continue;

        try {
            const source = await getOrCreateSource(sourceConfig);
            const scraper = new GenericWebsiteScraper(source);
            const count = await scraper.scrape();
            results.push({ source: source.name, count });

            // Pause entre les sources pour éviter la surcharge
            await delay(1000);
        } catch (error) {
            console.error(`[${sourceConfig.name}] ❌ Erreur: ${error}`);
            results.push({ source: sourceConfig.name, count: 0, error: String(error) });
        }
    }

    return results;
}

// ============================================
// TRAITEMENT IA GEMINI
// ============================================

/**
 * Traitement déclenché lors de la création d'un article brut
 */
export const onRawArticleCreated = onDocumentCreated(
    {
        document: "raw-articles/{articleId}",
        region: "europe-west1",
        secrets: [geminiApiKey],
        memory: "512MiB",
        timeoutSeconds: 120,
    },
    async (event) => {
        const articleId = event.params.articleId;
        console.log(`📝 Nouvel article brut: ${articleId}`);

        try {
            const processor = new GeminiProcessor();
            await processor.processAndSave(articleId);
        } catch (error) {
            console.error(`❌ Erreur traitement: ${error}`);
        }
    }
);

/**
 * Traitement planifié des articles en attente (backup)
 */
export const scheduledProcessing = onSchedule(
    {
        schedule: "*/30 * * * *",
        region: "europe-west1",
        secrets: [geminiApiKey],
        timeoutSeconds: 540,
        memory: "1GiB",
    },
    async () => {
        console.log("🤖 Traitement planifié des articles...");

        try {
            const processor = new GeminiProcessor();
            const count = await processor.processUnprocessedArticles(20);
            console.log(`✅ ${count} articles traités`);
        } catch (error) {
            console.error(`❌ Erreur: ${error}`);
        }
    }
);

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Détection de breaking news
 */
export const onArticleCreated = onDocumentCreated(
    {
        document: "articles/{articleId}",
        region: "europe-west1",
    },
    async (event) => {
        const article = event.data?.data();
        if (!article) return;

        const articleWithId = { id: event.params.articleId, ...article } as Article;

        // Breaking news si publié il y a moins de 30 minutes
        const now = Timestamp.now();
        const publishedAt = article.publishedAt as Timestamp;
        const ageMinutes = (now.seconds - publishedAt.seconds) / 60;

        if (ageMinutes < 30) {
            const breakingKeywords = [
                "urgent", "breaking", "alerte", "décès", "mort",
                "président", "ministre", "gouvernement", "élection", "démission",
                "exclusif", "flash", "dernière heure",
            ];

            const titleLower = (article.title as string).toLowerCase();
            const isBreaking = breakingKeywords.some((kw) => titleLower.includes(kw));

            if (isBreaking) {
                console.log(`🔴 Breaking news: ${article.title}`);
                const notificationService = new NotificationService();
                await notificationService.sendBreakingNews(articleWithId);
            }
        }
    }
);

/**
 * Digest quotidien - 8h heure locale Gabon
 */
export const dailyDigest = onSchedule(
    {
        schedule: "0 8 * * *",
        region: "europe-west1",
        timeZone: "Africa/Libreville",
    },
    async () => {
        console.log("📬 Envoi du digest quotidien...");

        try {
            const notificationService = new NotificationService();
            const count = await notificationService.sendDailyDigest();
            console.log(`✅ Digest envoyé à ${count} utilisateurs`);
        } catch (error) {
            console.error(`❌ Erreur digest: ${error}`);
        }
    }
);

// ============================================
// API HTTP
// ============================================

/**
 * Endpoint de santé
 */
export const health = onRequest(
    { region: "europe-west1" },
    async (req, res) => {
        const sourcesCount = SOURCES_CONFIG.filter((s) => s.active).length;

        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
            activeSources: sourcesCount,
        });
    }
);

/**
 * Déclencher manuellement le scraping d'une source
 */
export const triggerScraping = onRequest(
    {
        region: "europe-west1",
        timeoutSeconds: 300,
        memory: "512MiB",
    },
    async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Méthode non autorisée. Utilisez POST." });
            return;
        }

        const sourceName = req.body?.source;
        console.log(`🕷️ Scraping manuel: ${sourceName || "toutes les sources"}`);

        try {
            let sources: Source[];

            if (sourceName) {
                const found = SOURCES_CONFIG.find((s) => s.name === sourceName);
                if (!found) {
                    res.status(404).json({
                        error: `Source "${sourceName}" non trouvée`,
                        availableSources: SOURCES_CONFIG.map((s) => s.name),
                    });
                    return;
                }
                sources = [found];
            } else {
                // Toutes les sources haute priorité
                sources = getSourcesByPriority(1);
            }

            const results = await scrapeMultipleSources(sources);

            res.json({
                success: true,
                results,
                totalArticles: results.reduce((sum, r) => sum + r.count, 0),
            });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }
);

/**
 * Lister toutes les sources configurées
 */
export const listSources = onRequest(
    { region: "europe-west1" },
    async (req, res) => {
        const sources = SOURCES_CONFIG.map((s) => ({
            name: s.name,
            type: s.type,
            url: s.url,
            active: s.active,
            priority: s.priority,
        }));

        res.json({
            count: sources.length,
            sources,
        });
    }
);

// ============================================
// UTILITAIRES
// ============================================

/**
 * Récupère ou crée une source dans Firestore
 */
async function getOrCreateSource(sourceConfig: Source): Promise<Source> {
    const snapshot = await db
        .collection("sources")
        .where("name", "==", sourceConfig.name)
        .limit(1)
        .get();

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Source;
    }

    const docRef = await db.collection("sources").add(sourceConfig);
    return { id: docRef.id, ...sourceConfig };
}

/**
 * Pause asynchrone
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
