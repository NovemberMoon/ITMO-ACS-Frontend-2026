/**
 * Переиспользуемые утилиты и словари локализации
 */
export const LABELS = {
    category: {
        soup: "Супы",
        main: "Горячие блюда",
        cold: "Закуски",
        bakery: "Выпечка",
        dessert: "Десерты"
    },
    difficulty: {
        easy: "Легко",
        medium: "Средне",
        hard: "Сложно"
    }
};

export const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300";

export function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function getServingWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) return "порция";
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return "порции";
    return "порций";
}

export function normalizeVideoUrl(url) {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.includes("watch?v=")) {
        const videoId = trimmed.split("watch?v=")[1].split("&")[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    if (trimmed.includes("youtu.be/")) {
        const videoId = trimmed.split("youtu.be/")[1].split("?")[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    return trimmed;
}

export function formatDateRu(isoString) {
    if (!isoString) return "";
    try {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return isoString;
        return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    } catch {
        return isoString;
    }
}

/**
 * Чтение и сжатие изображения через Canvas до компактного JPEG Data URL
 */
export function readImageFile(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve("");
            return;
        }
        if (!file.type.startsWith("image/")) {
            reject(new Error("Пожалуйста, выберите файл изображения (JPG, PNG, WEBP)."));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            reject(new Error("Размер исходного файла превышает 10 МБ."));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = () => reject(new Error("Не удалось обработать изображение."));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Ошибка при чтении файла изображения."));
        reader.readAsDataURL(file);
    });
}

export function showToast(message, type = "primary") {
    let container = document.getElementById("glToastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "glToastContainer";
        container.className = "toast-container position-fixed bottom-0 end-0 p-3";
        container.style.zIndex = "1080";
        document.body.appendChild(container);
    }

    const bgClass = type === "danger" ? "text-bg-danger" : type === "success" ? "text-bg-success" : "text-bg-dark";
    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center ${bgClass} border-0 shadow`;
    toastEl.setAttribute("role", "alert");
    toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body small fw-medium">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Закрыть"></button>
    </div>
  `;
    container.appendChild(toastEl);

    const bsToast = new window.bootstrap.Toast(toastEl, { delay: 3200 });
    bsToast.show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

export function buildUsersMap(usersList) {
    const map = new Map();
    (usersList || []).forEach((u) => map.set(Number(u.id), u));
    return map;
}
