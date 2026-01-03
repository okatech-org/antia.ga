/**
 * ============================================
 * GenericWebsiteScraper - Scraper générique
 * ============================================
 * Scraper capable de s'adapter à différents sites web
 * basé sur la configuration des sélecteurs CSS
 */

import * as cheerio from "cheerio";
import { BaseScraper, ScrapedItem } from "./BaseScraper.js";
import { Source } from "../types/index.js";

/**
 * Mapping des mois français vers index
 */
const MOIS_FR: { [key: string]: number } = {
    janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
    jan: 0, fév: 1, mar: 2, avr: 3, jui: 5, juil: 6, aoû: 7, sep: 8, oct: 9, nov: 10, déc: 11,
};

/**
 * Scraper générique pour sites web
 * S'adapte à la configuration de chaque source
 */
export class GenericWebsiteScraper extends BaseScraper {
    constructor(source: Source) {
        super(source);
    }

    /**
     * Parse les articles en utilisant les sélecteurs configurés
     */
    protected parseArticles($: cheerio.CheerioAPI): ScrapedItem[] {
        const articles: ScrapedItem[] = [];
        const config = this.config;

        // Sélecteurs de fallback si le principal ne marche pas
        const articleSelectors = [
            config.articleListSelector,
            "article",
            ".post",
            ".entry",
            ".news-item",
            ".article-item",
        ].filter(Boolean);

        // Trouver les articles avec les sélecteurs disponibles
        let $articles: ReturnType<typeof $> | null = null;
        for (const selector of articleSelectors) {
            const found = $(selector);
            if (found.length > 0) {
                $articles = found;
                console.log(`[${this.source.name}] Sélecteur trouvé: ${selector} (${found.length} articles)`);
                break;
            }
        }

        if (!$articles || $articles.length === 0) {
            console.warn(`[${this.source.name}] Aucun article trouvé. Tentative avec liens d'articles...`);
            // Fallback: chercher tous les liens vers des articles
            $articles = $("a[href*='/article'], a[href*='/news'], a[href*='/actu']");
        }

        $articles.each((index, element) => {
            // Limiter à 20 articles par scraping
            if (index >= 20) return;

            try {
                const $article = $(element);
                const parsed = this.parseArticleElement($, $article);

                if (parsed) {
                    articles.push(parsed);
                }
            } catch (error) {
                console.error(`[${this.source.name}] Erreur parsing article ${index}: ${error}`);
            }
        });

        return articles;
    }

    /**
     * Parse un élément article individuel
     */
    private parseArticleElement($: cheerio.CheerioAPI, $article: ReturnType<typeof $>): ScrapedItem | null {
        const config = this.config;

        // ============================================
        // Extraction du titre et URL
        // ============================================
        const titleSelectors = [
            config.titleSelector,
            "h2 a", "h3 a", "h1 a",
            ".entry-title a", ".post-title a", ".title a",
            "a.title", "a[href]",
        ].filter(Boolean);

        let title = "";
        let url = "";

        for (const selector of titleSelectors) {
            const $titleLink = $article.find(selector).first();
            if ($titleLink.length) {
                title = $titleLink.text().trim();
                url = $titleLink.attr("href") || "";
                if (title && url) break;
            }
        }

        // Si toujours pas de titre, essayer le texte de l'article lui-même
        if (!title) {
            title = $article.find("h2, h3, .title").first().text().trim();
        }

        // Si l'élément est un lien, utiliser son href
        if (!url && $article.is("a")) {
            url = $article.attr("href") || "";
            if (!title) {
                title = $article.text().trim();
            }
        }

        // Ignorer si pas de titre ou URL
        if (!title || !url) {
            return null;
        }

        // Ignorer si titre trop court (probablement pas un article)
        if (title.length < 10) {
            return null;
        }

        // ============================================
        // Extraction de l'image
        // ============================================
        const imageSelectors = [
            config.imageSelector,
            "img.featured", "img.thumbnail", "img.post-image",
            ".post-thumbnail img", ".featured-image img", "figure img",
            "img",
        ].filter(Boolean);

        let imageUrl: string | undefined;
        for (const selector of imageSelectors) {
            const $img = $article.find(selector).first();
            if ($img.length) {
                imageUrl = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy-src");
                if (imageUrl) break;
            }
        }

        // ============================================
        // Extraction du contenu/extrait
        // ============================================
        const contentSelectors = [
            config.contentSelector,
            ".entry-summary", ".post-excerpt", ".excerpt",
            ".chapo", ".introduction", ".resume",
            "p",
        ].filter(Boolean);

        let content = "";
        for (const selector of contentSelectors) {
            const $content = $article.find(selector);
            if ($content.length) {
                content = $content.first().text().trim();
                if (content.length > 20) break;
            }
        }

        // Fallback: utiliser le titre si pas de contenu
        if (!content || content.length < 20) {
            content = title;
        }

        // ============================================
        // Extraction de la date
        // ============================================
        const dateSelectors = [
            config.dateSelector,
            "time", ".date", ".post-date", ".entry-date",
            ".meta-date", ".published",
        ].filter(Boolean);

        let publishedAt: Date | undefined;
        for (const selector of dateSelectors) {
            const $date = $article.find(selector).first();
            if ($date.length) {
                const dateStr = $date.attr("datetime") || $date.attr("title") || $date.text().trim();
                publishedAt = this.parseFrenchDate(dateStr);
                if (publishedAt) break;
            }
        }

        // ============================================
        // Extraction de l'auteur
        // ============================================
        let author: string | undefined;
        if (config.authorSelector) {
            const authorSelectors = [
                config.authorSelector,
                ".author", ".byline", ".entry-author",
                ".author-name", ".by-author",
            ];

            for (const selector of authorSelectors) {
                const $author = $article.find(selector).first();
                if ($author.length) {
                    author = $author.text().trim().replace(/^par\s*/i, "").replace(/^by\s*/i, "");
                    if (author) break;
                }
            }
        }

        return {
            title: this.cleanText(title),
            content: this.cleanText(content),
            url: this.normalizeUrl(url),
            imageUrl: imageUrl ? this.normalizeUrl(imageUrl) : undefined,
            author: author || undefined,
            publishedAt,
        };
    }

    /**
     * Parse une date au format français ou ISO
     */
    private parseFrenchDate(dateStr: string): Date | undefined {
        if (!dateStr) return undefined;

        // Format ISO (2026-01-03T09:00:00)
        const isoDate = new Date(dateStr);
        if (!isNaN(isoDate.getTime())) {
            return isoDate;
        }

        // Format français complet : "3 janvier 2026"
        const matchComplet = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
        if (matchComplet) {
            const [, jour, mois, annee] = matchComplet;
            const moisIndex = MOIS_FR[mois.toLowerCase()];
            if (moisIndex !== undefined) {
                return new Date(parseInt(annee), moisIndex, parseInt(jour));
            }
        }

        // Format court : "3 jan 2026" ou "03/01/2026"
        const matchSlash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (matchSlash) {
            const [, jour, mois, annee] = matchSlash;
            return new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
        }

        // Format avec tiret : "2026-01-03"
        const matchDash = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (matchDash) {
            const [, annee, mois, jour] = matchDash;
            return new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
        }

        return undefined;
    }

    /**
     * Nettoie le texte extrait
     */
    private cleanText(text: string): string {
        return text
            .replace(/\s+/g, " ")           // Multiple espaces → un seul
            .replace(/\n+/g, " ")           // Retours à la ligne → espaces
            .replace(/\t+/g, " ")           // Tabulations → espaces
            .replace(/\u00A0/g, " ")        // Non-breaking spaces
            .trim();
    }

    /**
     * Normalise une URL (relative → absolue)
     */
    private normalizeUrl(url: string): string {
        if (!url) return "";

        // URL déjà absolue
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }

        // Protocol-relative
        if (url.startsWith("//")) {
            return `https:${url}`;
        }

        // Chemin absolu
        if (url.startsWith("/")) {
            return `${this.source.url}${url}`;
        }

        // Chemin relatif
        return `${this.source.url}/${url}`;
    }

    /**
     * Essaie d'abord le flux RSS WordPress si disponible
     */
    public async scrapeWithRssFallback(): Promise<number> {
        // Essayer les flux RSS WordPress courants
        const rssUrls = [
            `${this.source.url}/feed`,
            `${this.source.url}/feed/rss2`,
            `${this.source.url}/rss`,
            `${this.source.url}/?feed=rss2`,
        ];

        for (const rssUrl of rssUrls) {
            try {
                console.log(`[${this.source.name}] Tentative RSS: ${rssUrl}`);
                const response = await this.fetchWithRetry(rssUrl);

                // Vérifier si c'est bien du XML/RSS
                if (response.includes("<rss") || response.includes("<feed") || response.includes("<channel")) {
                    console.log(`[${this.source.name}] Flux RSS trouvé: ${rssUrl}`);
                    // TODO: Parser le RSS ici
                    // Pour l'instant, on continue avec le scraping HTML
                }
            } catch {
                // RSS non disponible, continuer
            }
        }

        // Fallback: scraping HTML classique
        return this.scrape();
    }
}
