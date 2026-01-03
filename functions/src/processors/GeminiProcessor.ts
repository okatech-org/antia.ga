/**
 * ============================================
 * GeminiProcessor - Traitement IA Avancé
 * ============================================
 * Pipeline complet de traitement des articles :
 * 1. Détection de doublons
 * 2. Catégorisation automatique
 * 3. Extraction d'entités
 * 4. Réécriture en 3 formats
 * 5. Détection de breaking news
 * 6. Synthèse multi-sources
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
    RawArticle,
    Article,
    ArticleCategory,
    ExtractedEntities,
} from "../types/index.js";
import {
    CATEGORIZATION_PROMPT,
    ENTITY_EXTRACTION_PROMPT,
    REWRITE_PROMPT,
    BREAKING_NEWS_PROMPT,
} from "./prompts.js";
import { DuplicateDetector, DuplicateResult } from "./DuplicateDetector.js";
import { ArticleSynthesizer } from "./ArticleSynthesizer.js";

/**
 * Configuration optimisée pour les coûts
 */
const COST_CONFIG = {
    maxArticleLength: 5000,      // Tronquer les articles trop longs
    maxTokensOutput: 2048,       // Limiter la sortie
    useCaching: true,            // Cache des prompts système
    batchSize: 10,               // Traiter par lots
};

/**
 * Résultat du traitement complet
 */
export interface ProcessingResult {
    success: boolean;
    articleId?: string;
    isDuplicate: boolean;
    duplicateAction?: "MERGED" | "SKIPPED" | "UPDATED";
    categories: ArticleCategory[];
    isBreakingNews: boolean;
    processingTimeMs: number;
    tokensUsed?: number;
    error?: string;
}

/**
 * Résultat de la catégorisation
 */
interface CategorizationResult {
    mainCategory: ArticleCategory;
    secondaryCategories: ArticleCategory[];
    confidence: number;
    reasoning: string;
}

/**
 * Résultat de la réécriture
 */
interface RewriteResult {
    optimizedTitle: string;
    shortVersion: string;
    mediumVersion: string;
    longVersion: string;
    keyQuotes: { text: string; author: string; role: string }[];
    suggestedTags: string[];
}

/**
 * Résultat de la détection breaking news
 */
interface BreakingNewsResult {
    isBreakingNews: boolean;
    urgencyLevel: "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
    notificationTitle?: string;
    notificationBody?: string;
    targetAudience: string;
    confidence: number;
}

/**
 * Processeur d'articles avec Gemini
 */
export class GeminiProcessor {
    private genAI: GoogleGenerativeAI;
    private modelFlash: GenerativeModel;
    private modelPro: GenerativeModel;
    private db = getFirestore();
    private duplicateDetector: DuplicateDetector;
    private synthesizer: ArticleSynthesizer;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY non configurée");
        }

        this.genAI = new GoogleGenerativeAI(apiKey);

        // Modèle Flash pour les tâches rapides (catégorisation, entités)
        this.modelFlash = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: COST_CONFIG.maxTokensOutput,
            },
        });

        // Modèle Pro pour les tâches complexes (synthèse, réécriture longue)
        this.modelPro = this.genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
            generationConfig: {
                temperature: 0.4,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            },
        });

        this.duplicateDetector = new DuplicateDetector();
        this.synthesizer = new ArticleSynthesizer();
    }

    /**
     * Pipeline complet de traitement d'un article
     */
    public async processArticle(rawArticleId: string): Promise<ProcessingResult> {
        const startTime = Date.now();
        console.log(`[GeminiProcessor] 🚀 Traitement: ${rawArticleId}`);

        try {
            // 1. Récupérer l'article brut
            const rawArticle = await this.getRawArticle(rawArticleId);
            if (!rawArticle) {
                return {
                    success: false,
                    isDuplicate: false,
                    isBreakingNews: false,
                    categories: [],
                    processingTimeMs: Date.now() - startTime,
                    error: "Article brut non trouvé",
                };
            }

            // Vérifier si déjà traité
            if (rawArticle.processed) {
                console.log(`[GeminiProcessor] Article déjà traité`);
                return {
                    success: true,
                    isDuplicate: false,
                    isBreakingNews: false,
                    categories: [],
                    processingTimeMs: Date.now() - startTime,
                };
            }

            // 2. Détecter les doublons
            const duplicateResult = await this.duplicateDetector.detectDuplicates(rawArticle);

            if (duplicateResult.isDuplicate) {
                return await this.handleDuplicate(rawArticle, duplicateResult, startTime);
            }

            // 3. Catégoriser l'article
            const categories = await this.categorizeArticle(rawArticle);
            console.log(`[GeminiProcessor] Catégories: ${categories.mainCategory}`);

            // 4. Extraire les entités
            const entities = await this.extractEntities(rawArticle);
            console.log(`[GeminiProcessor] Entités: ${entities.people.length} personnes, ${entities.places.length} lieux`);

            // 5. Réécrire en 3 formats
            const rewritten = await this.rewriteArticle(rawArticle, categories.mainCategory);
            console.log(`[GeminiProcessor] Réécriture terminée`);

            // 6. Détecter si breaking news
            const breakingNews = await this.detectBreakingNews(rawArticle, categories.mainCategory);

            // 7. Créer l'article final
            const articleId = await this.saveProcessedArticle(
                rawArticle,
                categories,
                entities,
                rewritten,
                breakingNews
            );

            // 8. Marquer comme traité
            await this.markAsProcessed(rawArticleId);

            const processingTimeMs = Date.now() - startTime;
            console.log(`[GeminiProcessor] ✅ Traitement terminé en ${processingTimeMs}ms`);

            return {
                success: true,
                articleId,
                isDuplicate: false,
                categories: [categories.mainCategory, ...categories.secondaryCategories],
                isBreakingNews: breakingNews.isBreakingNews,
                processingTimeMs,
            };
        } catch (error) {
            console.error(`[GeminiProcessor] ❌ Erreur: ${error}`);
            return {
                success: false,
                isDuplicate: false,
                isBreakingNews: false,
                categories: [],
                processingTimeMs: Date.now() - startTime,
                error: String(error),
            };
        }
    }

    /**
     * Gère un article en doublon
     */
    private async handleDuplicate(
        rawArticle: RawArticle,
        duplicateResult: DuplicateResult,
        startTime: number
    ): Promise<ProcessingResult> {
        console.log(`[GeminiProcessor] Doublon détecté: ${duplicateResult.recommendation}`);

        switch (duplicateResult.recommendation) {
            case "SKIP":
                // Doublon exact, ignorer
                await this.markAsProcessed(rawArticle.id || "", true);
                return {
                    success: true,
                    isDuplicate: true,
                    duplicateAction: "SKIPPED",
                    categories: [],
                    isBreakingNews: false,
                    processingTimeMs: Date.now() - startTime,
                };

            case "MERGE":
            case "UPDATE":
                // Ajouter au cluster et resynthétiser
                const categories = await this.categorizeArticle(rawArticle);
                const clusterId = await this.synthesizer.addToCluster(
                    rawArticle,
                    duplicateResult.matchingArticleIds,
                    categories.mainCategory
                );

                // Synthétiser si cluster a 3+ articles
                const clusterArticles = await this.synthesizer.getClusterArticles(clusterId);
                if (clusterArticles.length >= 3) {
                    const synthesis = await this.synthesizer.synthesizeCluster(clusterId);
                    if (synthesis) {
                        await this.synthesizer.saveSynthesizedArticle(
                            clusterId,
                            synthesis,
                            categories.mainCategory
                        );
                    }
                }

                await this.markAsProcessed(rawArticle.id || "");
                return {
                    success: true,
                    isDuplicate: true,
                    duplicateAction: "MERGED",
                    categories: [categories.mainCategory],
                    isBreakingNews: false,
                    processingTimeMs: Date.now() - startTime,
                };

            default:
                // Traiter comme nouveau (SEPARATE)
                return {
                    success: false,
                    isDuplicate: true,
                    categories: [],
                    isBreakingNews: false,
                    processingTimeMs: Date.now() - startTime,
                    error: "Action de doublon non gérée",
                };
        }
    }

    /**
     * Récupère un article brut depuis Firestore
     */
    private async getRawArticle(articleId: string): Promise<RawArticle | null> {
        const doc = await this.db.collection("raw-articles").doc(articleId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as RawArticle;
    }

    /**
     * Catégorise un article avec Gemini
     */
    private async categorizeArticle(article: RawArticle): Promise<CategorizationResult> {
        const prompt = CATEGORIZATION_PROMPT
            .replace("{title}", article.title)
            .replace("{content}", article.content.slice(0, COST_CONFIG.maxArticleLength))
            .replace("{source}", article.sourceName);

        try {
            const result = await this.modelFlash.generateContent(prompt);
            const parsed = this.parseJsonResponse<CategorizationResult>(result.response.text());

            return {
                mainCategory: this.normalizeCategory(parsed.mainCategory),
                secondaryCategories: (parsed.secondaryCategories || [])
                    .map((c: string) => this.normalizeCategory(c))
                    .filter((c: ArticleCategory | null): c is ArticleCategory => c !== null),
                confidence: parsed.confidence || 0.8,
                reasoning: parsed.reasoning || "",
            };
        } catch (error) {
            console.error(`[GeminiProcessor] Erreur catégorisation: ${error}`);
            return {
                mainCategory: ArticleCategory.SOCIETE,
                secondaryCategories: [],
                confidence: 0.5,
                reasoning: "Catégorisation par défaut (erreur)",
            };
        }
    }

    /**
     * Extrait les entités d'un article
     */
    private async extractEntities(article: RawArticle): Promise<ExtractedEntities> {
        const prompt = ENTITY_EXTRACTION_PROMPT.replace(
            "{content}",
            article.content.slice(0, COST_CONFIG.maxArticleLength)
        );

        try {
            const result = await this.modelFlash.generateContent(prompt);
            const parsed = this.parseJsonResponse<{
                people: { name: string; title?: string }[];
                organizations: { name: string; type?: string }[];
                locations: { name: string; type?: string }[];
                keywords: string[];
            }>(result.response.text());

            return {
                people: (parsed.people || []).map((p) => p.name),
                organizations: (parsed.organizations || []).map((o) => o.name),
                places: (parsed.locations || []).map((l) => l.name),
                keywords: parsed.keywords || [],
            };
        } catch (error) {
            console.error(`[GeminiProcessor] Erreur extraction entités: ${error}`);
            return { people: [], organizations: [], places: [], keywords: [] };
        }
    }

    /**
     * Réécrit un article en 3 formats
     */
    private async rewriteArticle(
        article: RawArticle,
        category: ArticleCategory
    ): Promise<RewriteResult> {
        const prompt = REWRITE_PROMPT
            .replace("{originalTitle}", article.title)
            .replace("{originalContent}", article.content.slice(0, COST_CONFIG.maxArticleLength))
            .replace("{source}", article.sourceName)
            .replace("{category}", category);

        try {
            // Utiliser Pro pour la réécriture (meilleure qualité)
            const result = await this.modelPro.generateContent(prompt);
            const parsed = this.parseJsonResponse<RewriteResult>(result.response.text());

            return {
                optimizedTitle: parsed.optimizedTitle || article.title,
                shortVersion: parsed.shortVersion || article.content.slice(0, 200),
                mediumVersion: parsed.mediumVersion || article.content.slice(0, 800),
                longVersion: parsed.longVersion || article.content,
                keyQuotes: parsed.keyQuotes || [],
                suggestedTags: parsed.suggestedTags || [],
            };
        } catch (error) {
            console.error(`[GeminiProcessor] Erreur réécriture: ${error}`);
            return {
                optimizedTitle: article.title,
                shortVersion: article.content.slice(0, 200),
                mediumVersion: article.content.slice(0, 800),
                longVersion: article.content,
                keyQuotes: [],
                suggestedTags: [],
            };
        }
    }

    /**
     * Détecte si c'est un breaking news
     */
    private async detectBreakingNews(
        article: RawArticle,
        category: ArticleCategory
    ): Promise<BreakingNewsResult> {
        // Vérification rapide par mots-clés avant d'appeler Gemini
        const urgentKeywords = ["urgent", "breaking", "alerte", "décès", "mort", "démission", "exclusif"];
        const titleLower = article.title.toLowerCase();
        const hasUrgentKeyword = urgentKeywords.some((kw) => titleLower.includes(kw));

        if (!hasUrgentKeyword) {
            return {
                isBreakingNews: false,
                urgencyLevel: "NORMAL",
                targetAudience: "all",
                confidence: 0.95,
            };
        }

        // Vérification IA pour les candidats
        const prompt = BREAKING_NEWS_PROMPT
            .replace("{title}", article.title)
            .replace("{content}", article.content.slice(0, 1000))
            .replace("{category}", category)
            .replace("{publishedAt}", new Date().toISOString());

        try {
            const result = await this.modelFlash.generateContent(prompt);
            const parsed = this.parseJsonResponse<BreakingNewsResult>(result.response.text());

            return {
                isBreakingNews: parsed.isBreakingNews || false,
                urgencyLevel: parsed.urgencyLevel || "NORMAL",
                notificationTitle: parsed.notificationTitle,
                notificationBody: parsed.notificationBody,
                targetAudience: parsed.targetAudience || "all",
                confidence: parsed.confidence || 0.8,
            };
        } catch (error) {
            console.error(`[GeminiProcessor] Erreur détection breaking: ${error}`);
            return {
                isBreakingNews: false,
                urgencyLevel: "NORMAL",
                targetAudience: "all",
                confidence: 0.5,
            };
        }
    }

    /**
     * Sauvegarde l'article traité
     */
    private async saveProcessedArticle(
        rawArticle: RawArticle,
        categories: CategorizationResult,
        entities: ExtractedEntities,
        rewritten: RewriteResult,
        breakingNews: BreakingNewsResult
    ): Promise<string> {
        const article: Omit<Article, "id"> = {
            title: rewritten.optimizedTitle,
            shortSummary: rewritten.shortVersion,
            mediumSummary: rewritten.mediumVersion,
            longContent: rewritten.longVersion,
            categories: [categories.mainCategory, ...categories.secondaryCategories],
            entities,
            sourceArticleIds: [rawArticle.id || ""],
            sources: [{
                name: rawArticle.sourceName,
                url: rawArticle.url,
            }],
            publishedAt: rawArticle.publishedAt || Timestamp.now(),
            processedAt: Timestamp.now(),
            trending: breakingNews.isBreakingNews,
            viewCount: 0,
            imageUrl: rawArticle.imageUrl,
            tags: rewritten.suggestedTags,
            isBreakingNews: breakingNews.isBreakingNews,
            breakingNewsLevel: breakingNews.urgencyLevel,
        };

        const docRef = await this.db.collection("articles").add(article);
        return docRef.id;
    }

    /**
     * Marque un article brut comme traité
     */
    private async markAsProcessed(articleId: string, skipped = false): Promise<void> {
        await this.db.collection("raw-articles").doc(articleId).update({
            processed: true,
            skipped,
            processedAt: Timestamp.now(),
        });
    }

    /**
     * Parse une réponse JSON de Gemini de manière robuste
     */
    private parseJsonResponse<T>(text: string): T {
        // Nettoyer le texte
        let cleaned = text.trim();

        // Supprimer les blocs markdown si présents
        cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");

        // Extraire le JSON
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Pas de JSON valide dans la réponse");
        }

        return JSON.parse(jsonMatch[0]) as T;
    }

    /**
     * Normalise une catégorie
     */
    private normalizeCategory(category: string): ArticleCategory {
        const normalized = category.toLowerCase().trim() as ArticleCategory;
        const validCategories = Object.values(ArticleCategory);

        if (validCategories.includes(normalized)) {
            return normalized;
        }

        // Mapping pour variantes
        const mapping: Record<string, ArticleCategory> = {
            "politique": ArticleCategory.POLITIQUE,
            "economie": ArticleCategory.ECONOMIE,
            "économie": ArticleCategory.ECONOMIE,
            "societe": ArticleCategory.SOCIETE,
            "société": ArticleCategory.SOCIETE,
            "sport": ArticleCategory.SPORT,
            "sports": ArticleCategory.SPORT,
            "culture": ArticleCategory.CULTURE,
            "international": ArticleCategory.INTERNATIONAL,
            "technologie": ArticleCategory.TECHNOLOGIE,
            "tech": ArticleCategory.TECHNOLOGIE,
            "environnement": ArticleCategory.ENVIRONNEMENT,
        };

        return mapping[normalized] || ArticleCategory.SOCIETE;
    }

    /**
     * Traite les articles bruts non traités (backup schedulé)
     */
    public async processUnprocessedArticles(limit = 10): Promise<number> {
        const snapshot = await this.db
            .collection("raw-articles")
            .where("processed", "==", false)
            .orderBy("scrapedAt", "asc")
            .limit(limit)
            .get();

        console.log(`[GeminiProcessor] ${snapshot.size} articles à traiter`);

        let processedCount = 0;
        for (const doc of snapshot.docs) {
            try {
                const result = await this.processArticle(doc.id);
                if (result.success) processedCount++;

                // Rate limiting (1 seconde entre chaque pour éviter quota Gemini)
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`[GeminiProcessor] Erreur: ${error}`);
            }
        }

        return processedCount;
    }

    /**
     * Alias pour compatibilité avec l'ancien code
     */
    public async processAndSave(rawArticleId: string): Promise<string | null> {
        const result = await this.processArticle(rawArticleId);
        return result.success ? (result.articleId || null) : null;
    }
}
