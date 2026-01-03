/**
 * ============================================
 * ArticleSynthesizer - Synthèse multi-sources
 * ============================================
 * Combine plusieurs articles sur le même événement
 * en un article de synthèse unique et complet
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RawArticle, Article, ArticleCategory } from "../types/index.js";
import { SYNTHESIS_PROMPT } from "./prompts.js";

/**
 * Résultat de synthèse
 */
export interface SynthesisResult {
    title: string;
    shortVersion: string;
    mediumVersion: string;
    longVersion: string;
    sourcesAnalysis: {
        source: string;
        reliability: "high" | "medium" | "low";
        uniqueContribution: string;
    }[];
    factualConsensus: number;
    contradictions: {
        topic: string;
        sources: { name: string; value: string }[];
        resolution: string;
    }[];
    keyFacts: string[];
    confidence: number;
}

/**
 * Cluster d'articles sur le même événement
 */
export interface ArticleCluster {
    id: string;
    articles: RawArticle[];
    primaryCategory: ArticleCategory;
    synthesizedArticleId?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Fiabilité des sources (configuration)
 */
const SOURCE_RELIABILITY: Record<string, "high" | "medium" | "low"> = {
    "AGP - Agence Gabonaise de Presse": "high",
    "Gabon Review": "high",
    "L'Union": "high",
    "Info241": "medium",
    "Gabonactu": "medium",
    "Gabon Media Time": "medium",
    "AllAfrica Gabon": "medium",
    "La Libreville": "medium",
    "Direct Infos Gabon": "medium",
    "Gabon Matin": "medium",
    "Mays-Mouissi": "medium",
};

/**
 * Synthétiseur d'articles multi-sources
 */
export class ArticleSynthesizer {
    private db = getFirestore();
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    /**
     * Récupère la fiabilité d'une source
     */
    private getSourceReliability(sourceName: string): "high" | "medium" | "low" {
        return SOURCE_RELIABILITY[sourceName] || "low";
    }

    /**
     * Crée ou met à jour un cluster d'articles
     */
    public async addToCluster(
        newArticle: RawArticle,
        existingArticleIds: string[],
        category: ArticleCategory
    ): Promise<string> {
        // Chercher si un cluster existe déjà avec ces articles
        const existingCluster = await this.findExistingCluster(existingArticleIds);

        if (existingCluster) {
            // Ajouter au cluster existant
            const articleIds = new Set([
                ...existingCluster.articles.map((a) => a.id || ""),
                newArticle.id || "",
            ]);

            await this.db.collection("article-clusters").doc(existingCluster.id).update({
                articleIds: [...articleIds],
                updatedAt: Timestamp.now(),
            });

            console.log(`[ArticleSynthesizer] Article ajouté au cluster ${existingCluster.id}`);
            return existingCluster.id;
        }

        // Créer un nouveau cluster
        const clusterRef = await this.db.collection("article-clusters").add({
            articleIds: [newArticle.id, ...existingArticleIds],
            primaryCategory: category,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        console.log(`[ArticleSynthesizer] Nouveau cluster créé: ${clusterRef.id}`);
        return clusterRef.id;
    }

    /**
     * Trouve un cluster existant contenant ces articles
     */
    private async findExistingCluster(articleIds: string[]): Promise<ArticleCluster | null> {
        if (articleIds.length === 0) return null;

        // Chercher les clusters contenant au moins un des articles
        const snapshot = await this.db
            .collection("article-clusters")
            .where("articleIds", "array-contains-any", articleIds.slice(0, 10))
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
        } as ArticleCluster;
    }

    /**
     * Récupère les articles d'un cluster
     */
    public async getClusterArticles(clusterId: string): Promise<RawArticle[]> {
        const clusterDoc = await this.db.collection("article-clusters").doc(clusterId).get();

        if (!clusterDoc.exists) {
            console.error(`[ArticleSynthesizer] Cluster non trouvé: ${clusterId}`);
            return [];
        }

        const clusterData = clusterDoc.data();
        const articleIds = clusterData?.articleIds || [];

        const articles: RawArticle[] = [];
        for (const articleId of articleIds) {
            const articleDoc = await this.db.collection("raw-articles").doc(articleId).get();
            if (articleDoc.exists) {
                articles.push({ id: articleDoc.id, ...articleDoc.data() } as RawArticle);
            }
        }

        return articles;
    }

    /**
     * Synthétise les articles d'un cluster
     */
    public async synthesizeCluster(clusterId: string): Promise<SynthesisResult | null> {
        if (!this.genAI) {
            console.error("[ArticleSynthesizer] Gemini non configuré");
            return null;
        }

        const articles = await this.getClusterArticles(clusterId);

        if (articles.length < 2) {
            console.log(`[ArticleSynthesizer] Cluster ${clusterId} a moins de 2 articles, pas de synthèse`);
            return null;
        }

        console.log(`[ArticleSynthesizer] Synthèse de ${articles.length} articles...`);

        // Trier par fiabilité de source
        const sortedArticles = articles.sort((a, b) => {
            const reliabilityOrder = { high: 0, medium: 1, low: 2 };
            return (
                reliabilityOrder[this.getSourceReliability(a.sourceName)] -
                reliabilityOrder[this.getSourceReliability(b.sourceName)]
            );
        });

        // Préparer les sources pour le prompt
        const sourcesJson = sortedArticles.map((a) => ({
            source: a.sourceName,
            reliability: this.getSourceReliability(a.sourceName),
            title: a.title,
            content: a.content.slice(0, 1000), // Limiter pour économiser les tokens
            publishedAt: a.publishedAt instanceof Timestamp
                ? a.publishedAt.toDate().toISOString()
                : new Date().toISOString(),
        }));

        const prompt = SYNTHESIS_PROMPT.replace(
            "{sources}",
            JSON.stringify(sourcesJson, null, 2)
        );

        try {
            // Utiliser Gemini Pro pour la synthèse (meilleure qualité)
            const model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 4096,
                },
            });

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Parser le JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Pas de JSON valide dans la réponse Gemini");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            const synthesisResult: SynthesisResult = {
                title: parsed.synthesizedTitle || articles[0].title,
                shortVersion: parsed.synthesizedShort || "",
                mediumVersion: parsed.synthesizedMedium || "",
                longVersion: parsed.synthesizedLong || "",
                sourcesAnalysis: parsed.sourcesAnalysis || [],
                factualConsensus: parsed.factualConsensus || 0.8,
                contradictions: parsed.contradictions || [],
                keyFacts: parsed.keyFacts || [],
                confidence: parsed.confidence || 0.7,
            };

            return synthesisResult;
        } catch (error) {
            console.error(`[ArticleSynthesizer] Erreur synthèse: ${error}`);
            return null;
        }
    }

    /**
     * Crée un article traité à partir d'une synthèse
     */
    public async saveSynthesizedArticle(
        clusterId: string,
        synthesis: SynthesisResult,
        category: ArticleCategory
    ): Promise<string | null> {
        const articles = await this.getClusterArticles(clusterId);

        if (articles.length === 0) return null;

        // Créer l'article de synthèse
        const synthesizedArticle: Omit<Article, "id"> = {
            title: synthesis.title,
            shortSummary: synthesis.shortVersion,
            mediumSummary: synthesis.mediumVersion,
            longContent: synthesis.longVersion,
            categories: [category],
            entities: {
                people: [],
                places: [],
                organizations: [],
                keywords: synthesis.keyFacts.slice(0, 10),
            },
            sourceArticleIds: articles.map((a) => a.id || ""),
            sources: articles.map((a) => ({
                name: a.sourceName,
                url: a.url,
                reliability: this.getSourceReliability(a.sourceName),
            })),
            publishedAt: articles.reduce(
                (earliest, a) => {
                    const date = a.publishedAt instanceof Timestamp ? a.publishedAt : Timestamp.now();
                    return date.seconds < earliest.seconds ? date : earliest;
                },
                Timestamp.now()
            ),
            processedAt: Timestamp.now(),
            trending: false,
            viewCount: 0,
            imageUrl: articles.find((a) => a.imageUrl)?.imageUrl,
            isSynthesis: true,
            synthesisMetadata: {
                clusterId,
                articleCount: articles.length,
                factualConsensus: synthesis.factualConsensus,
                contradictions: synthesis.contradictions,
                confidence: synthesis.confidence,
            },
        };

        // Sauvegarder
        const docRef = await this.db.collection("articles").add(synthesizedArticle);

        // Mettre à jour le cluster
        await this.db.collection("article-clusters").doc(clusterId).update({
            synthesizedArticleId: docRef.id,
            updatedAt: Timestamp.now(),
        });

        console.log(`[ArticleSynthesizer] ✅ Article synthétisé: ${docRef.id}`);
        return docRef.id;
    }
}
