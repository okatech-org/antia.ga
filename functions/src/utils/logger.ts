/**
 * ============================================
 * Logger - Wrapper de logging structuré
 * ============================================
 * Utilise Cloud Logging pour des logs structurés
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * Logger structuré pour Cloud Functions
 */
export class Logger {
    private source: string;

    constructor(source: string = "GabonNews") {
        this.source = source;
    }

    private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
        const formatted = `[${level}] [${this.source}] ${message}`;

        switch (level) {
            case "DEBUG":
                console.debug(formatted, metadata ? JSON.stringify(metadata) : "");
                break;
            case "INFO":
                console.log(formatted, metadata ? JSON.stringify(metadata) : "");
                break;
            case "WARN":
                console.warn(formatted, metadata ? JSON.stringify(metadata) : "");
                break;
            case "ERROR":
                console.error(formatted, metadata ? JSON.stringify(metadata) : "");
                break;
        }
    }

    debug(message: string, metadata?: Record<string, unknown>): void {
        this.log("DEBUG", message, metadata);
    }

    info(message: string, metadata?: Record<string, unknown>): void {
        this.log("INFO", message, metadata);
    }

    warn(message: string, metadata?: Record<string, unknown>): void {
        this.log("WARN", message, metadata);
    }

    error(message: string, metadata?: Record<string, unknown>): void {
        this.log("ERROR", message, metadata);
    }

    /**
     * Log de début de scraping
     */
    startScraping(sourceName: string): void {
        this.info(`🕷️ Démarrage scraping`, { source: sourceName });
    }

    /**
     * Log de fin de scraping
     */
    endScraping(sourceName: string, articlesCount: number, durationMs: number): void {
        this.info(`✅ Scraping terminé`, {
            source: sourceName,
            articles: articlesCount,
            durationMs,
        });
    }

    /**
     * Log d'erreur de scraping
     */
    scrapingError(sourceName: string, error: Error | string): void {
        this.error(`❌ Erreur scraping`, {
            source: sourceName,
            error: error instanceof Error ? error.message : error,
        });
    }
}

/**
 * Instance par défaut du logger
 */
export const logger = new Logger();
