/**
 * Адаптер открытого сервиса кулинарных рецептов TheMealDB
 */
import { normalizeVideoUrl } from "../core/utils.js";

const EXTERNAL_BASE = "https://www.themealdb.com/api/json/v1/1";

const CATEGORY_RU = {
    Seafood: "Морепродукты",
    Pasta: "Паста",
    Dessert: "Десерты",
    Beef: "Мясо",
    Vegetarian: "Вегетарианское"
};

export const ExternalAPI = {
    getCategoryRuLabel(categoryKey) {
        return CATEGORY_RU[categoryKey] || categoryKey;
    },

    async getMealsByCategory(category = "Seafood") {
        try {
            const response = await fetch(`${EXTERNAL_BASE}/filter.php?c=${encodeURIComponent(category)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return (data.meals || []).slice(0, 6);
        } catch (error) {
            console.error("[Ошибка внешнего API] Не удалось загрузить категорию:", error.message);
            return [];
        }
    },

    async getMealDetailsById(mealId) {
        try {
            const response = await fetch(`${EXTERNAL_BASE}/lookup.php?i=${encodeURIComponent(mealId)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!data.meals || data.meals.length === 0) return null;
            return this.adaptMealData(data.meals[0]);
        } catch (error) {
            console.error("[Ошибка внешнего API] Не удалось загрузить блюдо:", error.message);
            return null;
        }
    },

    adaptMealData(raw) {
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const name = raw[`strIngredient${i}`];
            const measure = raw[`strMeasure${i}`];
            if (name && name.trim()) {
                ingredients.push({
                    name: name.trim(),
                    amount: measure ? measure.trim() : ""
                });
            }
        }

        const steps = (raw.strInstructions || "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter((s) => s.length > 15);

        return {
            id: raw.idMeal,
            title: raw.strMeal,
            category: CATEGORY_RU[raw.strCategory] || raw.strCategory,
            area: raw.strArea,
            image_url: raw.strMealThumb,
            video_url: normalizeVideoUrl(raw.strYoutube || ""),
            ingredients,
            steps
        };
    }
};
