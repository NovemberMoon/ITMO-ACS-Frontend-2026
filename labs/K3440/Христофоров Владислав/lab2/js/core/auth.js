/**
 * Модуль управления JWT-сессией и навигационной панелью
 */
import { escapeHtml, DEFAULT_AVATAR } from "./utils.js";

export const Auth = {
    TOKEN_KEY: "gustolab_auth_token",
    USER_KEY: "gustolab_current_user",

    getTokenPayload() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        if (!token) return null;
        try {
            const parts = token.split(".");
            if (parts.length !== 3) return null;
            return JSON.parse(atob(parts[1]));
        } catch {
            return null;
        }
    },

    isAuthenticated() {
        const payload = this.getTokenPayload();
        if (!payload) return false;
        if (payload.exp && payload.exp * 1000 <= Date.now()) {
            localStorage.removeItem(this.TOKEN_KEY);
            localStorage.removeItem(this.USER_KEY);
            return false;
        }
        return true;
    },

    getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        const raw = localStorage.getItem(this.USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    },

    setSession(token, user) {
        const { password, ...safeUser } = user;
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(safeUser));
        this.syncHeaderUI();
    },

    updateStoredUser(partialFields) {
        const current = this.getCurrentUser();
        if (!current) return null;
        const { password, ...safeFields } = partialFields;
        const updated = { ...current, ...safeFields };
        localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
        this.syncHeaderUI();
        return updated;
    },

    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        const isInPages = window.location.pathname.includes("/pages/");
        window.location.href = isInPages ? "../index.html" : "index.html";
    },

    requireAuth() {
        if (!this.isAuthenticated() || !this.getCurrentUser()) {
            const isInPages = window.location.pathname.includes("/pages/");
            window.location.href = isInPages ? "login.html" : "pages/login.html";
            return false;
        }
        return true;
    },

    syncHeaderUI() {
        const container = document.getElementById("headerAuthContainer");
        if (!container) return;

        const isInPages = window.location.pathname.includes("/pages/");
        const pagesPrefix = isInPages ? "" : "pages/";
        const user = this.getCurrentUser();

        if (user && this.isAuthenticated()) {
            container.innerHTML = `
                <div class="dropdown">
                <button class="gl-btn gl-btn-primary gl-btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-plus-lg" aria-hidden="true"></i>Создать
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                    <li><a class="dropdown-item py-2" href="${pagesPrefix}create-recipe.html"><i class="bi bi-journal-plus me-2 text-danger" aria-hidden="true"></i>Новый рецепт</a></li>
                    <li><a class="dropdown-item py-2" href="${pagesPrefix}create-blog-post.html"><i class="bi bi-pencil-square me-2 text-success" aria-hidden="true"></i>Новая статья</a></li>
                </ul>
                </div>
                <div class="d-flex align-items-center ps-3 border-start border-secondary">
                <a href="${pagesPrefix}profile.html" class="d-flex align-items-center text-decoration-none text-light me-3">
                    <img src="${user.avatar_url || DEFAULT_AVATAR}" 
                        class="rounded-circle me-2" style="width: 34px; height: 34px; object-fit: cover;" alt="">
                    <span class="small fw-semibold text-truncate" style="max-width: 125px;">${escapeHtml(user.name)}</span>
                </a>
                <button type="button" class="btn btn-outline-danger btn-sm py-1 px-2" id="btnLogoutHeader" aria-label="Выйти из аккаунта" title="Выйти из аккаунта">
                    <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                </button>
                </div>
            `;
            document.getElementById("btnLogoutHeader")?.addEventListener("click", () => this.logout());
        } else {
            container.innerHTML = `
                <a href="${pagesPrefix}login.html" class="gl-btn gl-btn-outline gl-btn-sm">Вход</a>
                <a href="${pagesPrefix}register.html" class="gl-btn gl-btn-primary gl-btn-sm">Регистрация</a>
            `;
        }
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => Auth.syncHeaderUI());
} else {
    Auth.syncHeaderUI();
}