"use client";

/**
 * ============================================
 * Header - En-tête de navigation
 * ============================================
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bars3Icon,
    XMarkIcon,
    MoonIcon,
    SunIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { CATEGORY_LABELS, ArticleCategory } from "@/types";

const categories = Object.entries(CATEGORY_LABELS) as [
    ArticleCategory,
    string
][];

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();

    // Détecter le scroll
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Gérer le mode sombre
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                    ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-lg"
                    : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-yellow-400 flex items-center justify-center text-white font-bold text-xl">
                            🇬🇦
                        </div>
                        <div className="hidden sm:block">
                            <span className="font-bold text-xl text-gray-900 dark:text-white">
                                Gabon
                            </span>
                            <span className="font-bold text-xl text-green-600">News</span>
                        </div>
                    </Link>

                    {/* Navigation desktop */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {categories.slice(0, 6).map(([key, label]) => (
                            <Link
                                key={key}
                                href={`/categorie/${key}`}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === `/categorie/${key}`
                                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Recherche */}
                        <Link
                            href="/recherche"
                            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        </Link>

                        {/* Toggle dark mode */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            {isDarkMode ? (
                                <SunIcon className="w-5 h-5" />
                            ) : (
                                <MoonIcon className="w-5 h-5" />
                            )}
                        </button>

                        {/* Menu mobile */}
                        <button
                            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? (
                                <XMarkIcon className="w-6 h-6" />
                            ) : (
                                <Bars3Icon className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Menu mobile */}
            {isMenuOpen && (
                <div className="lg:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-lg">
                    <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
                        {categories.map(([key, label]) => (
                            <Link
                                key={key}
                                href={`/categorie/${key}`}
                                className={`block px-4 py-3 rounded-lg font-medium transition-colors ${pathname === `/categorie/${key}`
                                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}
