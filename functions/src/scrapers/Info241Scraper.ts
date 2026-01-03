/**
 * ============================================
 * Info241Scraper - Scraper pour info241.com
 * ============================================
 * Scraper pour le site d'actualités Info241
 */

import * as cheerio from "cheerio";
import { BaseScraper, ScrapedItem } from "./BaseScraper.js";
import { Source, SourceType } from "../types/index.js";

/**
 * Configuration par défaut pour Info241
 */
export const INFO241_SOURCE: Source = {
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
        contentSelector: ".chapo, .introduction, .resume",
        imageSelector: "img.spip_logo, .vignette img, figure img",
        dateSelector: ".date, time, .published",
        authorSelector: ".auteur, .author",
        delayMs: 2500,
    },
};

/**
 * Scraper spécifique pour Info241
 */
export class Info241Scraper extends BaseScraper {
    constructor(source?: Source) {
        super(source || INFO241_SOURCE);
    }

    /**
     * Parse les articles depuis le HTML d'Info241
     */
    protected parseArticles($: cheerio.CheerioAPI): ScrapedItem[] {
        const articles: ScrapedItem[] = [];
        const config = this.config;

        // Info241 utilise SPIP, structure différente
        // Essayer plusieurs sélecteurs
        const selectors = [
            config.articleListSelector,
            ".liste-articles li",
            ".rubrique-articles article",
            "#contenu article",
        ];

        let $articles: ReturnType<typeof $> | null = null;
        for (const selector of selectors) {
            const found = $(selector);
            if (found.length > 0) {
                $articles = found;
                break;
            }
        }

        if (!$articles) {
            console.log("[Info241] Aucun article trouvé avec les sélecteurs standards");
            return articles;
        }

        $articles.each((_, element) => {
            try {
                const $article = $(element);

                // Extraire le titre et l'URL
                const $titleLink = $article.find("a[href*='article'], a[href*='spip.php'], h2 a, h3 a").first();
                const title = $titleLink.text().trim() || $article.find("h2, h3, .titre").first().text().trim();
                const url = $titleLink.attr("href");

                if (!title || !url) {
                    return;
                }

                // Extraire l'image
                let imageUrl: string | undefined;
                const $img = $article.find("img").first();
                if ($img.length) {
                    imageUrl = $img.attr("src") || $img.attr("data-src");
                }

                // Extraire l'extrait
                let content = $article.find(".chapo, .introduction, .resume, p").first().text().trim();

                // Extraire la date (format SPIP)
                let publishedAt: Date | undefined;
                const $date = $article.find(".date, time, abbr[title]");
                if ($date.length) {
                    const dateStr = $date.attr("datetime") || $date.attr("title") || $date.text().trim();
                    publishedAt = this.parseDate(dateStr);
                }

                // Extraire l'auteur
                const author = $article.find(".auteur, .author").first().text().trim();

                articles.push({
                    title,
                    content: content || title,
                    url: this.normalizeUrl(url),
                    imageUrl: imageUrl ? this.normalizeUrl(imageUrl) : undefined,
                    author: author || undefined,
                    publishedAt,
                });

            } catch (error) {
                console.error(`[Info241] Erreur parsing article: ${error}`);
            }
        });

        return articles;
    }

    /**
     * Parse une date au format français ou ISO
     */
    private parseDate(dateStr: string): Date | undefined {
        if (!dateStr) return undefined;

        // Format ISO
        let date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date;
        }

        // Format français : "3 janvier 2026"
        const moisFr: { [key: string]: number } = {
            janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
            juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
        };

        const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
        if (match) {
            const [, jour, mois, annee] = match;
            const moisIndex = moisFr[mois.toLowerCase()];
            if (moisIndex !== undefined) {
                return new Date(parseInt(annee), moisIndex, parseInt(jour));
            }
        }

        return undefined;
    }

    /**
     * Normalise une URL
     */
    private normalizeUrl(url: string): string {
        if (url.startsWith("http")) {
            return url;
        }
        if (url.startsWith("//")) {
            return `https:${url}`;
        }
        if (url.startsWith("/")) {
            return `${this.source.url}${url}`;
        }
        return `${this.source.url}/${url}`;
    }
}
