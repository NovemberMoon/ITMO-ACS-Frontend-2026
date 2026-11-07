/**
 * GustoLab — Модуль каталога рецептов
 * Управляет фильтрацией (поиск, категория, сложность, теги) и модальным окном.
 */
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const difficultyFilter = document.getElementById("difficultyFilter");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");
    const recipeItems = document.querySelectorAll(".recipe-item");
    const recipesEmptyState = document.getElementById("recipesEmptyState");

    // Теги ингредиентов
    const ingredientInput = document.getElementById("ingredientInput");
    const addIngredientTagBtn = document.getElementById("addIngredientTagBtn");
    const selectedIngredientsContainer = document.getElementById("selectedIngredientsContainer");
    const quickIngredientBadges = document.querySelectorAll(".gl-quick-tag");

    const selectedIngredients = new Set();

    function renderSelectedTags() {
        if (!selectedIngredientsContainer) return;
        selectedIngredientsContainer.innerHTML = "";
        selectedIngredients.forEach((ing) => {
            const tag = document.createElement("span");
            tag.className = "gl-filter-tag";
            tag.innerHTML = `
        ${ing}
        <button type="button" class="gl-filter-tag-remove" data-ingredient="${ing}">&times;</button>
      `;
            selectedIngredientsContainer.appendChild(tag);
        });
    }

    function addIngredient(val) {
        const clean = val.trim().toLowerCase();
        if (!clean || selectedIngredients.has(clean)) return;
        selectedIngredients.add(clean);
        renderSelectedTags();
        filterRecipes();
    }

    if (addIngredientTagBtn && ingredientInput) {
        addIngredientTagBtn.addEventListener("click", () => {
            addIngredient(ingredientInput.value);
            ingredientInput.value = "";
        });

        ingredientInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addIngredient(ingredientInput.value);
                ingredientInput.value = "";
            }
        });
    }

    quickIngredientBadges.forEach((badge) => {
        badge.addEventListener("click", () => {
            addIngredient(badge.getAttribute("data-ingredient"));
        });
    });

    if (selectedIngredientsContainer) {
        selectedIngredientsContainer.addEventListener("click", (e) => {
            const removeBtn = e.target.closest(".gl-filter-tag-remove");
            if (removeBtn) {
                const ing = removeBtn.getAttribute("data-ingredient");
                selectedIngredients.delete(ing);
                renderSelectedTags();
                filterRecipes();
            }
        });
    }

    function filterRecipes() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const category = categoryFilter ? categoryFilter.value : "all";
        const difficulty = difficultyFilter ? difficultyFilter.value : "all";

        let visibleCount = 0;

        recipeItems.forEach((card) => {
            const cardTitle = card.getAttribute("data-title").toLowerCase();
            const cardCat = card.getAttribute("data-category");
            const cardDiff = card.getAttribute("data-difficulty");
            const cardIngrs = (card.getAttribute("data-ingredients") || "").toLowerCase();

            const matchSearch = cardTitle.includes(query);
            const matchCat = category === "all" || cardCat === category;
            const matchDiff = difficulty === "all" || cardDiff === difficulty;

            let matchIngredients = true;
            if (selectedIngredients.size > 0) {
                for (const ing of selectedIngredients) {
                    if (!cardIngrs.includes(ing)) {
                        matchIngredients = false;
                        break;
                    }
                }
            }

            const isVisible = matchSearch && matchCat && matchDiff && matchIngredients;
            card.style.display = isVisible ? "block" : "none";
            if (isVisible) visibleCount++;
        });

        if (recipesEmptyState) {
            recipesEmptyState.classList.toggle("d-none", visibleCount > 0);
        }
    }

    if (searchInput) searchInput.addEventListener("input", filterRecipes);
    if (categoryFilter) categoryFilter.addEventListener("change", filterRecipes);
    if (difficultyFilter) difficultyFilter.addEventListener("change", filterRecipes);

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (categoryFilter) categoryFilter.value = "all";
            if (difficultyFilter) difficultyFilter.value = "all";
            if (ingredientInput) ingredientInput.value = "";
            selectedIngredients.clear();
            renderSelectedTags();
            filterRecipes();
        });
    }

    // Модальное окно быстрого просмотра
    const quickModalEl = document.getElementById("quickViewModal");
    if (quickModalEl) {
        const quickModal = new bootstrap.Modal(quickModalEl);
        const mTitle = document.getElementById("modalRecipeTitle");
        const mTime = document.getElementById("modalRecipeTime");
        const mDiff = document.getElementById("modalRecipeDifficulty");
        const mDesc = document.getElementById("modalRecipeDesc");
        const mIngr = document.getElementById("modalRecipeIngredients");

        document.querySelectorAll(".quick-view-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                mTitle.textContent = btn.getAttribute("data-title");
                mTime.textContent = btn.getAttribute("data-time");
                mDiff.textContent = btn.getAttribute("data-difficulty");
                mDesc.textContent = btn.getAttribute("data-desc");
                mIngr.textContent = btn.getAttribute("data-ingredients") || "Список продуктов доступен на странице рецепта.";
                quickModal.show();
            });
        });
    }
});
