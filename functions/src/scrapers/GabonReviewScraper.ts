/**
 * ============================================
 * GabonReviewScraper - Scraper pour gabonreview.com
 * ============================================
 * Premier scraper de référence pour le site Gabon Review
 */

import * as cheerio from "cheerio";
import { BaseScraper, ScrapedItem } from "./BaseScraper.js";
import { Source, SourceType } from "../types/index.js";

/**
 * Configuration par défaut pour Gabon Review
 */
export const GABON_REVIEW_SOURCE: Source = {
    name: "Gabon Review",
    type: SourceType.WEBSITE,
    url: "https://www.gabonreview.com",
    active: true,
    priority: 1,
    logoUrl: "https://www.gabonreview.com/wp-content/uploads/logo.png",
    scrapingConfig: {
        baseUrl: "https://www.gabonreview.com",
        articleListSelector: "article.post",
        titleSelector: "h2.entry-title a, h3.entry-title a",
        contentSelector: ".entry-content p",
        imageSelector: ".post-thumbnail img, .entry-thumbnail img",
        dateSelector: "time.entry-date, .post-date",
        authorSelector: ".author-name, .entry-author a",
        delayMs: 2000,
    },
};

/**
 * Scraper spécifique pour Gabon Review
 */
export class GabonReviewScraper extends BaseScraper {
    constructor(source?: Source) {
        super(source || GABON_REVIEW_SOURCE);
    }

    /**
     * Parse les articles depuis le HTML de Gabon Review
     */
    protected parseArticles($: cheerio.CheerioAPI): ScrapedItem[] {
        const articles: ScrapedItem[] = [];
        const config = this.config;

        // Parcourir tous les articles de la page
        $(config.articleListSelector).each((_, element) => {
            try {
                const $article = $(element);

                // Extraire le titre et l'URL
                const $titleLink = $article.find(config.titleSelector);
                const title = $titleLink.text().trim();
                const url = $titleLink.attr("href");

                // Ignorer si pas de titre ou URL
                if (!title || !url) {
                    return;
                }

                // Extraire l'image
                let imageUrl: string | undefined;
                const $img = $article.find(config.imageSelector || "img");
                if ($img.length) {
                    imageUrl = $img.attr("src") || $img.attr("data-src");
                }

                // Extraire l'extrait de contenu
                let content = "";
                const $content = $article.find(config.contentSelector || ".entry-summary");
                if ($content.length) {
                    content = $content.text().trim();
                } else {
                    // Fallback : prendre tout le texte de l'article
                    content = $article.find(".entry-summary, .excerpt, p").first().text().trim();
                }

                // Extraire la date
                let publishedAt: Date | undefined;
                if (config.dateSelector) {
                    const $date = $article.find(config.dateSelector);
                    const dateStr = $date.attr("datetime") || $date.text().trim();
                    if (dateStr) {
                        const parsed = new Date(dateStr);
                        if (!isNaN(parsed.getTime())) {
                            publishedAt = parsed;
                        }
                    }
                }

                // Extraire l'auteur
                let author: string | undefined;
                if (config.authorSelector) {
                    author = $article.find(config.authorSelector).first().text().trim();
                }

                articles.push({
                    title,
                    content: content || title, // Fallback sur le titre si pas de contenu
                    url: this.normalizeUrl(url),
                    imageUrl: imageUrl ? this.normalizeUrl(imageUrl) : undefined,
                    author,
                    publishedAt,
                });

            } catch (error) {
                console.error(`[GabonReview] Erreur parsing article: ${error}`);
            }
        });

        return articles;
    }

    /**
     * Normalise une URL (relative → absolue)
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

    /**
     * Récupère le contenu complet d'un article
     * @param articleUrl URL de l'article
     * @returns Contenu complet
     */
    public async fetchFullContent(articleUrl: string): Promise<string> {
        try {
            const html = await this.fetchWithRetry(articleUrl);
            const $ = cheerio.load(html);

            // Sélecteurs pour le contenu complet
            const contentSelectors = [
                "article .entry-content",
                ".post-content",
                ".article-body",
                ".main-content",
            ];

            for (const selector of contentSelectors) {
                const $content = $(selector);
                if ($content.length) {
                    // Nettoyer le contenu
                    $content.find("script, style, .social-share, .related-posts, .ad").remove();

                    // Extraire les paragraphes
                    const paragraphs: string[] = [];
                    $content.find("p").each((_, p) => {
                        const text = $(p).text().trim();
                        if (text.length > 20) { // Ignorer les paragraphes trop courts
                            paragraphs.push(text);
                        }
                    });

                    return paragraphs.join("\n\n");
                }
            }

            return "";
        } catch (error) {
            console.error(`[GabonReview] Erreur récupération contenu: ${error}`);
            return "";
        }
    }
}
