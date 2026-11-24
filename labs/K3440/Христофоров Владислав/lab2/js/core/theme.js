/**
 * Модуль управления цветовой темой (Светлая / Тёмная) через CSS-переменные
 */
export const Theme = {
    STORAGE_KEY: "gustolab_theme",

    getPreferredTheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
            return saved;
        }
        const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        return systemDark ? "dark" : "light";
    },

    applyTheme(theme) {
        const normalized = theme === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", normalized);
        this.syncToggleUI(normalized);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute("data-theme") || this.getPreferredTheme();
        const next = current === "dark" ? "light" : "dark";
        localStorage.setItem(this.STORAGE_KEY, next);
        this.applyTheme(next);
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
        this.applyTheme(this.getPreferredTheme());

        const btn = document.getElementById("themeToggleBtn");
        if (btn && !btn.dataset.themeBound) {
            btn.dataset.themeBound = "true";
            btn.addEventListener("click", () => this.toggleTheme());
        }

        if (window.matchMedia) {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            mediaQuery.addEventListener("change", (e) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.applyTheme(e.matches ? "dark" : "light");
                }
            });
        }
    }
};
