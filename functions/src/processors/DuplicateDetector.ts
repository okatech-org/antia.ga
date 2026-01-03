/**
 * ============================================
 * DuplicateDetector - Détection de doublons
 * ============================================
 * Détecte les articles similaires en utilisant :
 * 1. Hash rapide (gratuit, premier filtre)
 * 2. Vérification IA Gemini (plus précis)
 */

import { createHash } from "crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RawArticle } from "../types/index.js";
import { DUPLICATE_DETECTION_PROMPT } from "./prompts.js";

/**
 * Résultat de la détection de doublons
 */
export interface DuplicateResult {
    isDuplicate: boolean;
    similarityScore: number;
    matchingArticleIds: string[];
    matchingSummary?: string;
    recommendation: "MERGE" | "UPDATE" | "SEPARATE" | "SKIP";
    confidence: number;
}

/**
 * Détecteur de doublons d'articles
 */
export class DuplicateDetector {
    private db = getFirestore();
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    /**
     * Génère un hash pour détection rapide de doublons
     */
    public generateContentHash(title: string, content: string): string {
        // Normaliser le texte
        const normalized = this.normalizeText(title + " " + content.slice(0, 200));
        return createHash("md5").update(normalized).digest("hex");
    }

    /**
     * Normalise le texte pour comparaison
     */
    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Supprimer accents
            .replace(/[^a-z0-9\s]/g, "")     // Garder alphanumériques
            .replace(/\s+/g, " ")             // Normaliser espaces
            .trim();
    }

    /**
     * Vérifie rapidement les doublons par hash (gratuit)
     */
    public async quickHashCheck(
        newArticle: RawArticle,
        timeframeHours: number = 48
    ): Promise<{ isDuplicate: boolean; matchingIds: string[] }> {
        const hash = this.generateContentHash(newArticle.title, newArticle.content);

        // Calculer la date limite
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - timeframeHours);

        // Chercher les articles avec le même hash
        const snapshot = await this.db
            .collection("raw-articles")
            .where("contentHash", "==", hash)
            .where("scrapedAt", ">=", Timestamp.fromDate(cutoffDate))
            .limit(5)
            .get();

        const matchingIds = snapshot.docs
            .filter((doc) => doc.id !== newArticle.id)
            .map((doc) => doc.id);

        return {
            isDuplicate: matchingIds.length > 0,
            matchingIds,
        };
    }

    /**
     * Vérifie les doublons par similarité de titre (Levenshtein simplifié)
     */
    public async titleSimilarityCheck(
        newArticle: RawArticle,
        timeframeHours: number = 48
    ): Promise<{ candidates: RawArticle[]; scores: number[] }> {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - timeframeHours);

        // Récupérer les articles récents
        const snapshot = await this.db
            .collection("raw-articles")
            .where("scrapedAt", ">=", Timestamp.fromDate(cutoffDate))
            .orderBy("scrapedAt", "desc")
            .limit(100)
            .get();

        const candidates: RawArticle[] = [];
        const scores: number[] = [];

        const newTitleNormalized = this.normalizeText(newArticle.title);

        for (const doc of snapshot.docs) {
            if (doc.id === newArticle.id) continue;

            const article = { id: doc.id, ...doc.data() } as RawArticle;
            const existingTitleNormalized = this.normalizeText(article.title);

            // Calcul de similarité simple (mots communs)
            const score = this.calculateWordSimilarity(newTitleNormalized, existingTitleNormalized);

            if (score > 0.5) {
                candidates.push(article);
                scores.push(score);
            }
        }

        return { candidates, scores };
    }

    /**
     * Calcule la similarité basée sur les mots communs
     */
    private calculateWordSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.split(" ").filter((w) => w.length > 3));
        const words2 = new Set(text2.split(" ").filter((w) => w.length > 3));

        if (words1.size === 0 || words2.size === 0) return 0;

        const intersection = [...words1].filter((w) => words2.has(w)).length;
        const union = new Set([...words1, ...words2]).size;

        return intersection / union; // Jaccard similarity
    }

    /**
     * Vérification approfondie avec Gemini IA
     */
    public async aiDuplicateCheck(
        newArticle: RawArticle,
        candidates: RawArticle[]
    ): Promise<DuplicateResult> {
        if (!this.genAI) {
            console.warn("[DuplicateDetector] Gemini non configuré, skip AI check");
            return {
                isDuplicate: false,
                similarityScore: 0,
                matchingArticleIds: [],
                recommendation: "SEPARATE",
                confidence: 0.5,
            };
        }

        if (candidates.length === 0) {
            return {
                isDuplicate: false,
                similarityScore: 0,
                matchingArticleIds: [],
                recommendation: "SEPARATE",
                confidence: 0.95,
            };
        }

        // Préparer les articles existants pour le prompt
        const existingArticlesJson = candidates.slice(0, 5).map((a) => ({
            id: a.id,
            title: a.title,
            summary: a.content.slice(0, 200),
            source: a.sourceName,
            date: a.publishedAt instanceof Timestamp
                ? a.publishedAt.toDate().toISOString()
                : new Date().toISOString(),
        }));

        const prompt = DUPLICATE_DETECTION_PROMPT
            .replace("{newTitle}", newArticle.title)
            .replace("{newSummary}", newArticle.content.slice(0, 300))
            .replace("{newSource}", newArticle.sourceName)
            .replace("{newDate}", new Date().toISOString())
            .replace("{existingArticles}", JSON.stringify(existingArticlesJson, null, 2));

        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    temperature: 0.1, // Très factuel pour la détection
                    maxOutputTokens: 512,
                },
            });

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Parser le JSON de la réponse
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Pas de JSON valide dans la réponse Gemini");
            }

            const parsed = JSON.parse(jsonMatch[0]) as DuplicateResult;

            // Valider les champs obligatoires
            return {
                isDuplicate: Boolean(parsed.isDuplicate),
                similarityScore: Math.min(1, Math.max(0, parsed.similarityScore || 0)),
                matchingArticleIds: parsed.matchingArticleIds || [],
                matchingSummary: parsed.matchingSummary,
                recommendation: parsed.recommendation || "SEPARATE",
                confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
            };
        } catch (error) {
            console.error(`[DuplicateDetector] Erreur Gemini: ${error}`);

            // Fallback: utiliser la similarité de titre
            const maxScore = candidates.length > 0
                ? Math.max(...candidates.map((c) =>
                    this.calculateWordSimilarity(
                        this.normalizeText(newArticle.title),
                        this.normalizeText(c.title)
                    )
                ))
                : 0;

            return {
                isDuplicate: maxScore > 0.7,
                similarityScore: maxScore,
                matchingArticleIds: maxScore > 0.7 ? [candidates[0].id || ""] : [],
                recommendation: maxScore > 0.7 ? "MERGE" : "SEPARATE",
                confidence: 0.6,
            };
        }
    }

    /**
     * Pipeline complet de détection de doublons
     */
    public async detectDuplicates(newArticle: RawArticle): Promise<DuplicateResult> {
        console.log(`[DuplicateDetector] Vérification: ${newArticle.title.slice(0, 50)}...`);

        // Étape 1: Vérification rapide par hash
        const hashResult = await this.quickHashCheck(newArticle);
        if (hashResult.isDuplicate) {
            console.log(`[DuplicateDetector] ✓ Doublon exact trouvé par hash`);
            return {
                isDuplicate: true,
                similarityScore: 1.0,
                matchingArticleIds: hashResult.matchingIds,
                matchingSummary: "Doublon exact détecté par hash de contenu",
                recommendation: "SKIP",
                confidence: 0.99,
            };
        }

        // Étape 2: Vérification par similarité de titre
        const { candidates } = await this.titleSimilarityCheck(newArticle);

        if (candidates.length === 0) {
            console.log(`[DuplicateDetector] ✓ Aucun candidat similaire`);
            return {
                isDuplicate: false,
                similarityScore: 0,
                matchingArticleIds: [],
                recommendation: "SEPARATE",
                confidence: 0.95,
            };
        }

        // Étape 3: Si candidats trouvés, vérification IA
        console.log(`[DuplicateDetector] ${candidates.length} candidats similaires, vérification IA...`);
        const aiResult = await this.aiDuplicateCheck(newArticle, candidates);

        console.log(`[DuplicateDetector] Résultat: ${aiResult.isDuplicate ? "DOUBLON" : "NOUVEAU"} (score: ${aiResult.similarityScore})`);
        return aiResult;
    }
}
