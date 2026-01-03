/**
 * ============================================
 * Configuration Firebase pour le frontend
 * ============================================
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getMessaging, isSupported, Messaging } from "firebase/messaging";

// Configuration Firebase (à remplacer par vos valeurs)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Vérifier si Firebase est configuré
const isFirebaseConfigured = Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId
);

// Initialiser Firebase (singleton) uniquement si configuré
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
} else {
    console.warn(
        "⚠️ Firebase non configuré. Copiez .env.example vers .env.local et configurez vos clés."
    );
}

// Export des services (peuvent être null si non configuré)
export { db, auth, app };

// Messaging (uniquement côté client)
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
    if (!app) return null;
    if (typeof window !== "undefined" && (await isSupported())) {
        return getMessaging(app);
    }
    return null;
};

// Export de l'état de configuration
export const isConfigured = isFirebaseConfigured;

export default app;
