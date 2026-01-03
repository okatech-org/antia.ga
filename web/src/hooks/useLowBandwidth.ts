"use client";

/**
 * ============================================
 * useLowBandwidth - Détection connexion lente
 * ============================================
 * Détecte si l'utilisateur est sur une connexion lente
 * pour adapter l'interface (mode lite)
 */

import { useState, useEffect } from "react";

interface NetworkInformation {
    effectiveType: "slow-2g" | "2g" | "3g" | "4g";
    saveData: boolean;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
}

declare global {
    interface Navigator {
        connection?: NetworkInformation;
        mozConnection?: NetworkInformation;
        webkitConnection?: NetworkInformation;
    }
}

export function useLowBandwidth(): boolean {
    const [isLowBandwidth, setIsLowBandwidth] = useState(false);

    useEffect(() => {
        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

        if (connection) {
            const updateConnectionStatus = () => {
                setIsLowBandwidth(
                    connection.effectiveType === "slow-2g" ||
                    connection.effectiveType === "2g" ||
                    connection.saveData
                );
            };

            updateConnectionStatus();
            connection.addEventListener("change", updateConnectionStatus);

            return () =>
                connection.removeEventListener("change", updateConnectionStatus);
        }
    }, []);

    return isLowBandwidth;
}

/**
 * Hook pour forcer le mode lite (pour tests ou préférences)
 */
export function useLiteMode(): {
    isLiteMode: boolean;
    toggleLiteMode: () => void;
    setLiteMode: (value: boolean) => void;
} {
    const isLowBandwidth = useLowBandwidth();
    const [forceLiteMode, setForceLiteMode] = useState(false);

    // Charger la préférence
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("gabon-news-lite-mode");
            if (saved !== null) {
                setForceLiteMode(saved === "true");
            }
        }
    }, []);

    const setLiteMode = (value: boolean) => {
        setForceLiteMode(value);
        localStorage.setItem("gabon-news-lite-mode", String(value));
    };

    const toggleLiteMode = () => {
        setLiteMode(!forceLiteMode);
    };

    return {
        isLiteMode: forceLiteMode || isLowBandwidth,
        toggleLiteMode,
        setLiteMode,
    };
}
