/**
 * ============================================
 * BaseScraper - Classe abstraite de scraping
 * ============================================
 * Fournit les fonctionnalités communes à tous les scrapers :
 * - Gestion d'erreurs avec retry logic
 * - Rate limiting
 * - Extraction HTML avec Cheerio
 * - Sauvegarde dans Firestore
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import * as cheerio from "cheerio";
import * as crypto from "crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { RawArticle, Source, ScrapingConfig } from "../types/index.js";

// Configuration par défaut
const DEFAULT_DELAY_MS = 2000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_USER_AGENT = "GabonNewsBot/1.0 (+https://gabon-news-hub.web.app)";

/**
 * Interface pour les résultats de scraping
 */
export interface ScrapedItem {
    title: string;
    content: string;
    url: string;
    imageUrl?: string;
    author?: string;
    publishedAt?: Date;
}

/**
 * Classe abstraite de base pour tous les scrapers
 */
export abstract class BaseScraper {
    protected source: Source;
    protected config: ScrapingConfig;
    protected axiosInstance: AxiosInstance;
    protected db = getFirestore();

    constructor(source: Source) {
        this.source = source;
        this.config = source.scrapingConfig;

        // Configurer Axios avec retry interceptor
        this.axiosInstance = axios.create({
            timeout: 30000,
            headers: {
                "User-Agent": process.env.SCRAPING_USER_AGENT || DEFAULT_USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            },
        });
    }

    /**
     * Méthode abstraite à implémenter par chaque scraper
     * Extrait les articles d'une page HTML
     */
    protected abstract parseArticles($: cheerio.CheerioAPI): ScrapedItem[];

    /**
     * Génère un hash MD5 du contenu pour détecter les doublons
     */
    protected generateContentHash(content: string): string {
        return crypto.createHash("md5").update(content.toLowerCase().trim()).digest("hex");
    }

    /**
     * Attend un délai (rate limiting)
     */
    protected async delay(ms?: number): Promise<void> {
        const delayTime = ms || this.config.delayMs || DEFAULT_DELAY_MS;
        return new Promise((resolve) => setTimeout(resolve, delayTime));
    }

    /**
     * Effectue une requête HTTP avec retry logic
     */
    protected async fetchWithRetry(url: string, retries = DEFAULT_MAX_RETRIES): Promise<string> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`[${this.source.name}] Récupération: ${url} (tentative ${attempt}/${retries})`);
                const response = await this.axiosInstance.get(url);
                return response.data;
            } catch (error) {
                const axiosError = error as AxiosError;
                const status = axiosError.response?.status;

                console.error(`[${this.source.name}] Erreur ${status || "inconnue"}: ${axiosError.message}`);

                // Ne pas réessayer pour certaines erreurs
                if (status === 404 || status === 403) {
                    throw new Error(`Erreur ${status}: Page inaccessible`);
                }

                // Dernière tentative : lever l'erreur
                if (attempt === retries) {
                    throw error;
                }

                // Backoff exponentiel : 1s, 2s, 4s...
                const backoffMs = Math.pow(2, attempt - 1) * 1000;
                console.log(`[${this.source.name}] Attente ${backoffMs}ms avant nouvelle tentative...`);
                await this.delay(backoffMs);
            }
        }

        throw new Error("Impossible de récupérer la page après plusieurs tentatives");
    }

    /**
     * Vérifie si un article existe déjà (par URL ou hash de contenu)
     */
    protected async articleExists(url: string, contentHash: string): Promise<boolean> {
        const snapshot = await this.db
            .collection("raw-articles")
            .where("url", "==", url)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return true;
        }

        // Vérifier aussi par hash de contenu
        const hashSnapshot = await this.db
            .collection("raw-articles")
            .where("contentHash", "==", contentHash)
            .limit(1)
            .get();

        return !hashSnapshot.empty;
    }

    /**
     * Sauvegarde un article brut dans Firestore
     */
    protected async saveRawArticle(item: ScrapedItem): Promise<string | null> {
        const contentHash = this.generateContentHash(item.content);

        // Vérifier les doublons
        if (await this.articleExists(item.url, contentHash)) {
            console.log(`[${this.source.name}] Article déjà existant: ${item.title.substring(0, 50)}...`);
            return null;
        }

        const rawArticle: Omit<RawArticle, "id"> = {
            sourceId: this.source.id!,
            sourceName: this.source.name,
            title: item.title,
            content: item.content,
            url: item.url,
            publishedAt: item.publishedAt
                ? Timestamp.fromDate(item.publishedAt)
                : Timestamp.now(),
            scrapedAt: Timestamp.now(),
            imageUrl: item.imageUrl,
            author: item.author,
            processed: false,
            contentHash,
        };

        const docRef = await this.db.collection("raw-articles").add(rawArticle);
        console.log(`[${this.source.name}] ✅ Article sauvegardé: ${item.title.substring(0, 50)}...`);

        return docRef.id;
    }

    /**
     * Met à jour la date de dernier scraping de la source
     */
    protected async updateLastScraped(): Promise<void> {
        if (this.source.id) {
            await this.db.collection("sources").doc(this.source.id).update({
                lastScraped: Timestamp.now(),
            });
        }
    }

    /**
     * Exécute le scraping complet
     * @returns Nombre d'articles collectés
     */
    public async scrape(): Promise<number> {
        console.log(`[${this.source.name}] Démarrage du scraping...`);

        try {
            // Récupérer la page HTML
            const html = await this.fetchWithRetry(this.config.baseUrl);
            const $ = cheerio.load(html);

            // Extraire les articles
            const items = this.parseArticles($);
            console.log(`[${this.source.name}] ${items.length} articles trouvés`);

            let savedCount = 0;

            // Sauvegarder chaque article avec rate limiting
            for (const item of items) {
                try {
                    const id = await this.saveRawArticle(item);
                    if (id) savedCount++;
                    await this.delay();
                } catch (error) {
                    console.error(`[${this.source.name}] Erreur sauvegarde: ${error}`);
                }
            }

            // Mettre à jour la source
            await this.updateLastScraped();

            console.log(`[${this.source.name}] ✅ Scraping terminé: ${savedCount} nouveaux articles`);
            return savedCount;

        } catch (error) {
            console.error(`[${this.source.name}] ❌ Échec du scraping: ${error}`);
            throw error;
        }
    }
}
