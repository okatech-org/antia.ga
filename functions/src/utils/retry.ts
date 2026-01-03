/**
 * ============================================
 * Retry - Utilitaire de retry avec backoff
 * ============================================
 * Gestion robuste des erreurs avec retry exponentiel
 */

export interface RetryOptions {
    /** Nombre maximum de tentatives */
    maxRetries: number;
    /** Délai initial en ms */
    initialDelayMs: number;
    /** Facteur de multiplication pour backoff */
    backoffFactor: number;
    /** Délai maximum en ms */
    maxDelayMs: number;
    /** Codes d'erreur pour lesquels on ne retry pas */
    noRetryStatusCodes?: number[];
}

const DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 30000,
    noRetryStatusCodes: [400, 401, 403, 404, 405],
};

/**
 * Exécute une fonction avec retry et backoff exponentiel
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;
    let delay = opts.initialDelayMs;

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Vérifier si on doit retry
            const statusCode = (error as { response?: { status?: number } }).response?.status;
            if (statusCode && opts.noRetryStatusCodes?.includes(statusCode)) {
                console.error(`[Retry] Code ${statusCode} - pas de retry`);
                throw error;
            }

            // Dernière tentative : lever l'erreur
            if (attempt === opts.maxRetries) {
                console.error(`[Retry] Échec après ${attempt} tentatives`);
                throw error;
            }

            // Calculer le délai avec jitter
            const jitter = Math.random() * 0.3 * delay;
            const actualDelay = Math.min(delay + jitter, opts.maxDelayMs);

            console.warn(
                `[Retry] Tentative ${attempt}/${opts.maxRetries} échouée. ` +
                `Nouvelle tentative dans ${Math.round(actualDelay)}ms...`
            );

            await sleep(actualDelay);
            delay *= opts.backoffFactor;
        }
    }

    throw lastError || new Error("Retry failed");
}

/**
 * Pause asynchrone
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrapper pour les fonctions de scraping
 */
export async function retryableScrape<T>(
    sourceName: string,
    scrapeFn: () => Promise<T>
): Promise<T> {
    return withRetry(scrapeFn, {
        maxRetries: 3,
        initialDelayMs: 2000,
        backoffFactor: 2,
    });
}

/**
 * Circuit breaker simple pour les sources en échec
 */
export class CircuitBreaker {
    private failures: Map<string, { count: number; lastFailure: Date }> = new Map();
    private readonly threshold: number;
    private readonly resetMs: number;

    constructor(threshold = 5, resetMinutes = 30) {
        this.threshold = threshold;
        this.resetMs = resetMinutes * 60 * 1000;
    }

    /**
     * Vérifie si une source est disponible
     */
    isOpen(sourceId: string): boolean {
        const record = this.failures.get(sourceId);
        if (!record) return false;

        // Reset si assez de temps s'est écoulé
        if (Date.now() - record.lastFailure.getTime() > this.resetMs) {
            this.failures.delete(sourceId);
            return false;
        }

        return record.count >= this.threshold;
    }

    /**
     * Enregistre un échec
     */
    recordFailure(sourceId: string): void {
        const record = this.failures.get(sourceId);
        if (record) {
            record.count++;
            record.lastFailure = new Date();
        } else {
            this.failures.set(sourceId, { count: 1, lastFailure: new Date() });
        }
    }

    /**
     * Enregistre un succès (reset le compteur)
     */
    recordSuccess(sourceId: string): void {
        this.failures.delete(sourceId);
    }
}

/**
 * Instance globale du circuit breaker
 */
export const circuitBreaker = new CircuitBreaker();
