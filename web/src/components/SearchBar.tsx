"use client";

/**
 * ============================================
 * SearchBar - Barre de recherche
 * ============================================
 * Recherche avec suggestions et historique
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon } from "@heroicons/react/24/outline";

interface SearchBarProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    onSearch?: (query: string) => void;
}

// Clé localStorage pour l'historique
const SEARCH_HISTORY_KEY = "gabon-news-search-history";

export function SearchBar({
    value: externalValue,
    onChange: externalOnChange,
    placeholder = "Rechercher une actualité...",
    autoFocus = false,
    onSearch,
}: SearchBarProps) {
    const [internalValue, setInternalValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Valeur contrôlée ou non
    const value = externalValue !== undefined ? externalValue : internalValue;
    const setValue = externalOnChange || setInternalValue;

    // Charger l'historique au mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        }
    }, []);

    // Sauvegarder une recherche dans l'historique
    const saveToHistory = (query: string) => {
        if (!query.trim()) return;

        const newHistory = [
            query,
            ...history.filter((h) => h !== query),
        ].slice(0, 5);

        setHistory(newHistory);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    };

    // Soumettre la recherche
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim()) return;

        saveToHistory(value);

        if (onSearch) {
            onSearch(value);
        } else {
            router.push(`/recherche?q=${encodeURIComponent(value)}`);
        }

        setIsFocused(false);
    };

    // Effacer le champ
    const handleClear = () => {
        setValue("");
        inputRef.current?.focus();
    };

    // Sélectionner une suggestion
    const handleHistorySelect = (query: string) => {
        setValue(query);
        if (onSearch) {
            onSearch(query);
        } else {
            router.push(`/recherche?q=${encodeURIComponent(query)}`);
        }
        setIsFocused(false);
    };

    return (
        <div className="relative">
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    {/* Icon */}
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                    {/* Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        placeholder={placeholder}
                        autoFocus={autoFocus}
                        className="w-full pl-12 pr-12 py-3 bg-muted rounded-xl border-2 border-transparent focus:border-gabon-green focus:bg-background outline-none transition-all text-foreground placeholder:text-muted-foreground"
                    />

                    {/* Clear button */}
                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted-foreground/20 rounded-full transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </form>

            {/* Dropdown historique */}
            {isFocused && history.length > 0 && !value && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-2 text-xs text-muted-foreground uppercase tracking-wider">
                        Recherches récentes
                    </div>
                    {history.map((query, index) => (
                        <button
                            key={index}
                            onClick={() => handleHistorySelect(query)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted text-left transition-colors"
                        >
                            <ClockIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{query}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
