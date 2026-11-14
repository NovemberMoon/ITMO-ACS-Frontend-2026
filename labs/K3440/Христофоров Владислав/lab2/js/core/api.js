/**
 * Единый HTTP-клиент к Mock REST API
 */
const BASE_URL = "http://localhost:3000";
const TOKEN_STORAGE_KEY = "gustolab_auth_token";
const USER_STORAGE_KEY = "gustolab_current_user";

function redirectExpiredSession() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    const isInPages = window.location.pathname.includes("/pages/");
    window.location.href = isInPages ? "login.html" : "pages/login.html";
}

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            if (response.status === 401 && token) {
                redirectExpiredSession();
                throw new Error("Срок действия сессии истёк. Выполните вход повторно.");
            }

            if (response.status === 403) {
                throw new Error("Недостаточно прав для выполнения этого действия");
            }

            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}`;
            try {
                const parsed = JSON.parse(errorText);
                errorMessage = typeof parsed === "string" ? parsed : (parsed.message || errorMessage);
            } catch {
                if (errorText) errorMessage = errorText.replace(/^"|"$/g, "");
            }
            throw new Error(errorMessage);
        }

        if (options.method === "DELETE") {
            return { success: true };
        }

        const totalCountHeader = response.headers.get("X-Total-Count");
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (totalCountHeader !== null) {
            return { data, totalCount: parseInt(totalCountHeader, 10) };
        }
        return data;
    } catch (error) {
        console.error(`[Ошибка API] ${options.method || "GET"} ${endpoint}:`, error.message);
        throw error;
    }
}

export const API = {
    get: (endpoint) => request(endpoint, { method: "GET" }),
    post: (endpoint, body) => request(endpoint, { method: "POST", body: JSON.stringify(body) }),
    patch: (endpoint, body) => request(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
    put: (endpoint, body) => request(endpoint, { method: "PUT", body: JSON.stringify(body) }),
    delete: (endpoint) => request(endpoint, { method: "DELETE" })
};