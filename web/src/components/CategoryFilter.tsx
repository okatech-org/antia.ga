"use client";

/**
 * ============================================
 * CategoryFilter - Filtres par catégorie
 * ============================================
 * Barre de filtres horizontaux scrollables
 * avec indicateur visuel de la catégorie sélectionnée
 */

import { ArticleCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "@/types";

interface CategoryFilterProps {
    selected: ArticleCategory | "all";
    onChange: (category: ArticleCategory | "all") => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
    const categories = Object.values(ArticleCategory);

    return (
        <div className="mb-8">
            {/* Scroll container */}
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {/* All button */}
                <button
                    onClick={() => onChange("all")}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selected === "all"
                            ? "bg-gabon-green text-white shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                >
                    Toutes
                </button>

                {/* Category buttons */}
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => onChange(category)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selected === category
                                ? `${CATEGORY_COLORS[category]} text-white shadow-md`
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                    >
                        {CATEGORY_LABELS[category]}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Version compacte pour sidebar
 */
export function CategoryFilterCompact({
    selected,
    onChange,
}: CategoryFilterProps) {
    const categories = Object.values(ArticleCategory);

    return (
        <div className="space-y-1">
            {/* All */}
            <button
                onClick={() => onChange("all")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selected === "all"
                        ? "bg-gabon-green text-white"
                        : "hover:bg-muted text-foreground"
                    }`}
            >
                📰 Toutes les actualités
            </button>

            {/* Categories */}
            {categories.map((category) => (
                <button
                    key={category}
                    onClick={() => onChange(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selected === category
                            ? `${CATEGORY_COLORS[category]} text-white`
                            : "hover:bg-muted text-foreground"
                        }`}
                >
                    {getCategoryEmoji(category)} {CATEGORY_LABELS[category]}
                </button>
            ))}
        </div>
    );
}

/**
 * Retourne l'emoji correspondant à une catégorie
 */
function getCategoryEmoji(category: ArticleCategory): string {
    const emojis: Record<ArticleCategory, string> = {
        [ArticleCategory.POLITIQUE]: "🏛️",
        [ArticleCategory.ECONOMIE]: "💰",
        [ArticleCategory.SOCIETE]: "👥",
        [ArticleCategory.SPORT]: "⚽",
        [ArticleCategory.CULTURE]: "🎭",
        [ArticleCategory.INTERNATIONAL]: "🌍",
        [ArticleCategory.TECHNOLOGIE]: "💻",
        [ArticleCategory.ENVIRONNEMENT]: "🌿",
    };
    return emojis[category] || "📰";
}
