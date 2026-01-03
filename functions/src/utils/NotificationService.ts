/**
 * ============================================
 * NotificationService - Envoi de notifications push
 * ============================================
 * Gère l'envoi de notifications via Firebase Cloud Messaging
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging, MulticastMessage } from "firebase-admin/messaging";
import { Article, Notification, NotificationType, ArticleCategory } from "../types/index.js";

/**
 * Service de notifications push
 */
export class NotificationService {
    private db = getFirestore();
    private messaging = getMessaging();

    /**
     * Envoie une notification breaking news à tous les utilisateurs
     */
    public async sendBreakingNews(article: Article): Promise<number> {
        console.log(`[NotificationService] Breaking news: ${article.title}`);

        // Récupérer tous les tokens FCM
        const usersSnapshot = await this.db
            .collection("users")
            .where("notificationSettings.breakingNews", "==", true)
            .where("fcmToken", "!=", null)
            .get();

        if (usersSnapshot.empty) {
            console.log("[NotificationService] Aucun utilisateur à notifier");
            return 0;
        }

        const tokens = usersSnapshot.docs
            .map((doc) => doc.data().fcmToken as string)
            .filter((token) => token);

        if (tokens.length === 0) {
            return 0;
        }

        // Construire le message multicast
        const message: MulticastMessage = {
            tokens,
            notification: {
                title: "🔴 Breaking News",
                body: article.title,
            },
            data: {
                articleId: article.id || "",
                type: NotificationType.BREAKING,
                click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "breaking_news",
                    priority: "max",
                    defaultSound: true,
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        };

        try {
            const response = await this.messaging.sendEachForMulticast(message);
            console.log(`[NotificationService] Envoyé: ${response.successCount}/${tokens.length}`);

            // Enregistrer la notification
            await this.saveNotification({
                articleId: article.id || "",
                title: "🔴 Breaking News",
                body: article.title,
                sentAt: Timestamp.now(),
                type: NotificationType.BREAKING,
                recipientCount: response.successCount,
            });

            return response.successCount;
        } catch (error) {
            console.error(`[NotificationService] Erreur envoi: ${error}`);
            return 0;
        }
    }

    /**
     * Envoie une notification de catégorie aux abonnés
     */
    public async sendCategoryNotification(
        article: Article,
        category: ArticleCategory
    ): Promise<number> {
        // Récupérer les utilisateurs abonnés à cette catégorie
        const usersSnapshot = await this.db
            .collection("users")
            .where("notificationSettings.followedCategories", "array-contains", category)
            .where("fcmToken", "!=", null)
            .get();

        if (usersSnapshot.empty) {
            return 0;
        }

        const tokens = usersSnapshot.docs
            .map((doc) => doc.data().fcmToken as string)
            .filter((token) => token);

        if (tokens.length === 0) {
            return 0;
        }

        const categoryLabel = this.getCategoryLabel(category);
        const message: MulticastMessage = {
            tokens,
            notification: {
                title: `📰 ${categoryLabel}`,
                body: article.title,
            },
            data: {
                articleId: article.id || "",
                type: NotificationType.CATEGORY,
                category,
            },
        };

        try {
            const response = await this.messaging.sendEachForMulticast(message);

            await this.saveNotification({
                articleId: article.id || "",
                title: `📰 ${categoryLabel}`,
                body: article.title,
                sentAt: Timestamp.now(),
                type: NotificationType.CATEGORY,
                recipientCount: response.successCount,
            });

            return response.successCount;
        } catch (error) {
            console.error(`[NotificationService] Erreur: ${error}`);
            return 0;
        }
    }

    /**
     * Envoie le digest quotidien
     */
    public async sendDailyDigest(): Promise<number> {
        // Récupérer les articles des dernières 24h
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const articlesSnapshot = await this.db
            .collection("articles")
            .where("publishedAt", ">=", Timestamp.fromDate(yesterday))
            .orderBy("publishedAt", "desc")
            .limit(5)
            .get();

        if (articlesSnapshot.empty) {
            console.log("[NotificationService] Pas d'articles pour le digest");
            return 0;
        }

        const articles = articlesSnapshot.docs.map((doc) => doc.data() as Article);
        const titles = articles.map((a) => `• ${a.title}`).join("\n");

        // Récupérer les utilisateurs avec digest activé
        const usersSnapshot = await this.db
            .collection("users")
            .where("notificationSettings.dailyDigest", "==", true)
            .where("fcmToken", "!=", null)
            .get();

        if (usersSnapshot.empty) {
            return 0;
        }

        const tokens = usersSnapshot.docs
            .map((doc) => doc.data().fcmToken as string)
            .filter((token) => token);

        const message: MulticastMessage = {
            tokens,
            notification: {
                title: "📰 Votre digest du jour",
                body: `${articles.length} nouvelles à découvrir`,
            },
            data: {
                type: NotificationType.DAILY,
                articleCount: String(articles.length),
            },
        };

        try {
            const response = await this.messaging.sendEachForMulticast(message);

            await this.saveNotification({
                articleId: "",
                title: "📰 Votre digest du jour",
                body: titles,
                sentAt: Timestamp.now(),
                type: NotificationType.DAILY,
                recipientCount: response.successCount,
            });

            return response.successCount;
        } catch (error) {
            console.error(`[NotificationService] Erreur digest: ${error}`);
            return 0;
        }
    }

    /**
     * Sauvegarde une notification dans l'historique
     */
    private async saveNotification(notification: Omit<Notification, "id">): Promise<void> {
        await this.db.collection("notifications").add(notification);
    }

    /**
     * Retourne le label français d'une catégorie
     */
    private getCategoryLabel(category: ArticleCategory): string {
        const labels: Record<ArticleCategory, string> = {
            [ArticleCategory.POLITIQUE]: "Politique",
            [ArticleCategory.ECONOMIE]: "Économie",
            [ArticleCategory.SOCIETE]: "Société",
            [ArticleCategory.SPORT]: "Sport",
            [ArticleCategory.CULTURE]: "Culture",
            [ArticleCategory.INTERNATIONAL]: "International",
            [ArticleCategory.TECHNOLOGIE]: "Technologie",
            [ArticleCategory.ENVIRONNEMENT]: "Environnement",
        };
        return labels[category] || category;
    }
}
