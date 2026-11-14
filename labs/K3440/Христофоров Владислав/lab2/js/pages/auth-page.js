/**
 * Контроллер страниц входа и регистрации через json-server-auth
 */
import { API } from "../core/api.js";
import { Auth } from "../core/auth.js";
import { showToast, DEFAULT_AVATAR } from "../core/utils.js";

function mapAuthErrorMessage(rawMessage) {
    const msg = (rawMessage || "").toLowerCase();
    if (msg.includes("email already exists")) {
        return "Пользователь с таким адресом почты уже зарегистрирован";
    }
    if (msg.includes("cannot find user") || msg.includes("incorrect password")) {
        return "Неверный адрес электронной почты или пароль";
    }
    if (msg.includes("password is too short")) {
        return "Пароль слишком короткий (минимум 6 символов)";
    }
    return "Не удалось выполнить запрос. Проверьте подключение к серверу.";
}

document.addEventListener("DOMContentLoaded", () => {
    Auth.syncHeaderUI();

    // Вход в систему
    const loginForm = document.getElementById("loginForm");
    loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();
        const btn = document.getElementById("btnLoginSubmit");
        btn.disabled = true;

        try {
            const response = await API.post("/login", { email, password });

            if (response && response.accessToken && response.user) {
                Auth.setSession(response.accessToken, response.user);
                window.location.href = "../index.html";
            } else {
                showToast("Неверный адрес электронной почты или пароль", "danger");
                btn.disabled = false;
            }
        } catch (err) {
            showToast(mapAuthErrorMessage(err.message), "danger");
            btn.disabled = false;
        }
    });

    // Регистрация нового шефа
    const registerForm = document.getElementById("registerForm");
    registerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regName").value.trim();
        const username = document.getElementById("regUsername").value.trim().toLowerCase();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value.trim();
        const btn = document.getElementById("btnRegisterSubmit");
        btn.disabled = true;

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            showToast("Логин должен содержать от 3 до 20 символов (латиница, цифры, _)", "danger");
            btn.disabled = false;
            return;
        }

        try {
            const existingUsername = await API.get(`/users?username=${encodeURIComponent(username)}`);
            const usernameList = Array.isArray(existingUsername) ? existingUsername : (existingUsername.data || []);

            if (usernameList.length > 0) {
                showToast("Этот логин уже занят, выберите другой", "danger");
                btn.disabled = false;
                return;
            }

            const response = await API.post("/register", {
                name,
                username,
                email,
                password,
                specialty: "Шеф-повар",
                bio: "Кулинарный энтузиаст сообщества GustoLab.",
                location: "Санкт-Петербург",
                avatar_url: DEFAULT_AVATAR,
                bookmarked_recipe_ids: []
            });

            if (response && response.accessToken && response.user) {
                Auth.setSession(response.accessToken, response.user);
                window.location.href = "profile.html";
            } else {
                showToast("Ошибка при создании учётной записи", "danger");
                btn.disabled = false;
            }
        } catch (err) {
            showToast(mapAuthErrorMessage(err.message), "danger");
            btn.disabled = false;
        }
    });
});
