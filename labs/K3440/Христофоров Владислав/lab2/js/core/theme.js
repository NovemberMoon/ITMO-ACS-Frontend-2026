/**
 * Модуль управления цветовой темой
 */
export const Theme = {
    STORAGE_KEY: "gustolab_theme",

    getSystemTheme() {
        const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        return systemDark ? "dark" : "light";
    },

    getCurrentTheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
            return saved;
        }
        return this.getSystemTheme();
    },

    applyTheme(theme, persist = false) {
        const lightLink = document.getElementById("themeLightLink");
        const darkLink = document.getElementById("themeDarkLink");

        if (persist && (theme === "light" || theme === "dark")) {
            localStorage.setItem(this.STORAGE_KEY, theme);
        }

        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (lightLink && darkLink) {
            if (saved === "light" || saved === "dark") {
                lightLink.media = saved === "light" ? "all" : "not all";
                darkLink.media = saved === "dark" ? "all" : "not all";
            } else {
                lightLink.media = "(prefers-color-scheme: light)";
                darkLink.media = "(prefers-color-scheme: dark)";
            }
        }

        const activeTheme = saved === "light" || saved === "dark" ? saved : this.getSystemTheme();
        this.syncToggleUI(activeTheme);
    },

    toggleTheme() {
        const current = this.getCurrentTheme();
        const next = current === "dark" ? "light" : "dark";
        this.applyTheme(next, true);
    },

    syncToggleUI(theme) {
        const btn = document.getElementById("themeToggleBtn");
        const icon = document.getElementById("themeToggleIcon");
        const label = document.getElementById("themeToggleLabel");
        if (!btn) return;

        const isDark = theme === "dark";
        btn.setAttribute("aria-pressed", String(isDark));
        btn.setAttribute("aria-label", isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему");
        btn.setAttribute("title", isDark ? "Светлая тема" : "Тёмная тема");

        if (icon) {
            icon.className = isDark ? "bi bi-sun-fill text-warning" : "bi bi-moon-stars-fill";
        }
        if (label) {
            label.textContent = isDark ? "Светлая тема" : "Тёмная тема";
        }
    },

    init() {
        this.applyTheme(this.getCurrentTheme(), false);

        const btn = document.getElementById("themeToggleBtn");
        if (btn && !btn.dataset.themeBound) {
            btn.dataset.themeBound = "true";
            btn.addEventListener("click", () => this.toggleTheme());
        }

        if (window.matchMedia) {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            mediaQuery.addEventListener("change", () => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.applyTheme(this.getSystemTheme(), false);
                }
            });
        }
    }
};