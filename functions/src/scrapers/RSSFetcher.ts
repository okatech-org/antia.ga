/**
 * ============================================
 * RSSFetcher - Collecteur de flux RSS
 * ============================================
 * Récupère les articles depuis les flux RSS (AllAfrica Gabon, etc.)
 */

import Parser from "rss-parser";
import * as crypto from "crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { RawArticle, Source, SourceType } from "../types/index.js";

/**
 * Configuration par défaut pour AllAfrica Gabon
 */
export const ALLAFRICA_GABON_SOURCE: Source = {
    name: "AllAfrica Gabon",
    type: SourceType.RSS,
    url: "https://fr.allafrica.com/gabon/",
    active: true,
    priority: 2,
    scrapingConfig: {
        baseUrl: "https://fr.allafrica.com/tools/headlines/rdf/gabon/headlines.rdf",
        articleListSelector: "", // Non utilisé pour RSS
        titleSelector: "",
        contentSelector: "",
    },
};

/**
 * Item RSS parsé
 */
interface RSSItem {
    title?: string;
    link?: string;
    content?: string;
    contentSnippet?: string;
    pubDate?: string;
    creator?: string;
    "media:content"?: { $: { url: string } };
    enclosure?: { url: string };
}

/**
 * Classe pour récupérer les articles depuis les flux RSS
 */
export class RSSFetcher {
    private source: Source;
    private parser: Parser<unknown, RSSItem>;
    private db = getFirestore();

    constructor(source?: Source) {
        this.source = source || ALLAFRICA_GABON_SOURCE;

        // Configurer le parser RSS
        this.parser = new Parser({
            customFields: {
                item: [
                    ["media:content", "media:content"],
                    ["dc:creator", "creator"],
                ],
            },
            timeout: 30000,
        });
    }

    /**
     * Génère un hash MD5 du contenu
     */
    private generateContentHash(content: string): string {
        return crypto.createHash("md5").update(content.toLowerCase().trim()).digest("hex");
    }

    /**
     * Vérifie si un article existe déjà
     */
    private async articleExists(url: string, contentHash: string): Promise<boolean> {
        const snapshot = await this.db
            .collection("raw-articles")
            .where("url", "==", url)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return true;
        }

        const hashSnapshot = await this.db
            .collection("raw-articles")
            .where("contentHash", "==", contentHash)
            .limit(1)
            .get();

        return !hashSnapshot.empty;
    }

    /**
     * Sauvegarde un article RSS dans Firestore
     */
    private async saveRawArticle(item: RSSItem): Promise<string | null> {
        if (!item.title || !item.link) {
            return null;
        }

        const content = item.contentSnippet || item.content || item.title;
        const contentHash = this.generateContentHash(content);

        // Vérifier les doublons
        if (await this.articleExists(item.link, contentHash)) {
            console.log(`[${this.source.name}] Article déjà existant: ${item.title.substring(0, 50)}...`);
            return null;
        }

        // Extraire l'image
        let imageUrl: string | undefined;
        if (item["media:content"]?.$?.url) {
            imageUrl = item["media:content"].$.url;
        } else if (item.enclosure?.url) {
            imageUrl = item.enclosure.url;
        }

        // Parser la date
        let publishedAt = Timestamp.now();
        if (item.pubDate) {
            const parsed = new Date(item.pubDate);
            if (!isNaN(parsed.getTime())) {
                publishedAt = Timestamp.fromDate(parsed);
            }
        }

        const rawArticle: Omit<RawArticle, "id"> = {
            sourceId: this.source.id || "allafrica-gabon",
            sourceName: this.source.name,
            title: item.title,
            content,
            url: item.link,
            publishedAt,
            scrapedAt: Timestamp.now(),
            imageUrl,
            author: item.creator,
            processed: false,
            contentHash,
        };

        const docRef = await this.db.collection("raw-articles").add(rawArticle);
        console.log(`[${this.source.name}] ✅ Article sauvegardé: ${item.title.substring(0, 50)}...`);

        return docRef.id;
    }

    /**
     * Met à jour la date de dernier scraping
     */
    private async updateLastScraped(): Promise<void> {
        if (this.source.id) {
            await this.db.collection("sources").doc(this.source.id).update({
                lastScraped: Timestamp.now(),
            });
        }
    }

    /**
     * Récupère et sauvegarde les articles du flux RSS
     * @returns Nombre d'articles collectés
     */
    public async fetch(): Promise<number> {
        console.log(`[${this.source.name}] Récupération du flux RSS...`);

        try {
            const feed = await this.parser.parseURL(this.source.scrapingConfig.baseUrl);
            console.log(`[${this.source.name}] ${feed.items.length} articles dans le flux`);

            let savedCount = 0;

            for (const item of feed.items) {
                try {
                    const id = await this.saveRawArticle(item);
                    if (id) savedCount++;
                } catch (error) {
                    console.error(`[${this.source.name}] Erreur sauvegarde: ${error}`);
                }
            }

            await this.updateLastScraped();

            console.log(`[${this.source.name}] ✅ RSS terminé: ${savedCount} nouveaux articles`);
            return savedCount;

        } catch (error) {
            console.error(`[${this.source.name}] ❌ Échec RSS: ${error}`);
            throw error;
        }
    }
}
