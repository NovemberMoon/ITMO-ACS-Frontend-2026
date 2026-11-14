/**
 * Контроллер главной страницы каталога рецептов
 */
import { API } from "../core/api.js";
import { Auth } from "../core/auth.js";
import { ExternalAPI } from "../services/external-api.js";
import { renderPagination } from "../components/pagination.js";
import { LABELS, escapeHtml, buildUsersMap, showToast, DEFAULT_AVATAR } from "../core/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    Auth.syncHeaderUI();

    const recipesGrid = document.getElementById("recipesGrid");
    const paginationContainer = document.getElementById("catalogPagination");
    const featuredContainer = document.getElementById("featuredRecipeContainer");
    const emptyState = document.getElementById("recipesEmptyState");

    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const difficultyFilter = document.getElementById("difficultyFilter");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");
    const emptyStateResetBtn = document.getElementById("emptyStateResetBtn");

    const ingredientInput = document.getElementById("ingredientInput");
    const addIngredientTagBtn = document.getElementById("addIngredientTagBtn");
    const selectedIngredientsContainer = document.getElementById("selectedIngredientsContainer");
    const quickIngredientBadges = document.querySelectorAll(".gl-quick-tag[data-ingredient]");

    const tabChefsBtn = document.getElementById("tabChefsBtn");
    const tabSubscriptionsBtn = document.getElementById("tabSubscriptionsBtn");
    const tabWorldBtn = document.getElementById("tabWorldBtn");

    const subscriptionsFeedBar = document.getElementById("subscriptionsFeedBar");
    const followedChefsStrip = document.getElementById("followedChefsStrip");
    const chefSearchInput = document.getElementById("chefSearchInput");
    const toggleAllChefsBtn = document.getElementById("toggleAllChefsBtn");
    const chefSearchResults = document.getElementById("chefSearchResults");

    const worldCategoriesBar = document.getElementById("worldCategoriesBar");
    const localFiltersCard = document.getElementById("localFiltersCard");
    const statusHint = document.getElementById("catalogStatusHint");

    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get("category");
    if (initialCategory && categoryFilter && LABELS.category[initialCategory]) {
        categoryFilter.value = initialCategory;
    }

    let currentWorldCategory = "Seafood";
    let currentPage = 1;
    let subFeedPage = 1;
    let showAllChefsDirectory = false;
    const PAGE_LIMIT = 3;
    const selectedIngredients = new Set();
    let debounceTimer = null;
    let allUsersList = [];
    let usersMap = new Map();
    let recipeLikesCountMap = new Map();

    function buildRecipeLikesMap(likesList) {
        const map = new Map();
        (likesList || []).forEach((item) => {
            if (item.targetType === "recipe") {
                const id = Number(item.targetId);
                map.set(id, (map.get(id) || 0) + 1);
            }
        });
        return map;
    }

    try {
        const [users, likes] = await Promise.all([
            API.get("/users"),
            API.get("/likes?targetType=recipe")
        ]);
        allUsersList = users || [];
        usersMap = buildUsersMap(allUsersList);
        recipeLikesCountMap = buildRecipeLikesMap(likes);
    } catch {
        allUsersList = [];
        usersMap = new Map();
        recipeLikesCountMap = new Map();
    }

    async function loadFeaturedRecipe() {
        if (!featuredContainer) return;
        try {
            const [recipesRes, likesRes] = await Promise.all([
                API.get("/recipes"),
                API.get("/likes?targetType=recipe")
            ]);
            const recipes = Array.isArray(recipesRes) ? recipesRes : (recipesRes.data || []);
            recipeLikesCountMap = buildRecipeLikesMap(likesRes);

            if (recipes.length === 0) {
                featuredContainer.classList.add("d-none");
                return;
            }

            const recipe = [...recipes].sort(
                (a, b) => (recipeLikesCountMap.get(Number(b.id)) || 0) - (recipeLikesCountMap.get(Number(a.id)) || 0)
            )[0];

            const author = usersMap.get(Number(recipe.userId));
            const likesCount = recipeLikesCountMap.get(Number(recipe.id)) || 0;

            featuredContainer.innerHTML = `
        <div class="row align-items-center g-4">
          <div class="col-lg-7">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
              <span class="badge bg-danger px-3 py-2"><i class="bi bi-fire me-1"></i>Популярный рецепт</span>
              <span class="gl-badge">${LABELS.category[recipe.category] || recipe.category}</span>
            </div>
            <h1 class="display-6 fw-bold mb-3">${escapeHtml(recipe.title)}</h1>
            <p class="text-secondary mb-4">${escapeHtml(recipe.description)}</p>
            <div class="d-flex flex-wrap align-items-center gap-4 small text-secondary mb-4">
              <span><i class="bi bi-clock me-1 text-danger"></i>${recipe.cooking_time_minutes} минут</span>
              <span><i class="bi bi-speedometer2 me-1 text-danger"></i>Сложность: ${LABELS.difficulty[recipe.difficulty] || recipe.difficulty}</span>
              <span><i class="bi bi-heart-fill me-1 text-danger"></i>${likesCount} отметок</span>
              ${author ? `
                <a href="pages/author.html?id=${author.id}" class="d-inline-flex align-items-center text-decoration-none text-dark fw-semibold">
                  <img src="${author.avatar_url || DEFAULT_AVATAR}" class="rounded-circle me-1" style="width: 24px; height: 24px; object-fit: cover;" alt="${escapeHtml(author.name)}">
                  ${escapeHtml(author.name)}
                </a>
              ` : ""}
            </div>
            <div class="d-flex flex-wrap gap-2">
              <a href="pages/recipe.html?id=${recipe.id}" class="gl-btn gl-btn-primary px-4">Смотреть рецепт</a>
              <button type="button" class="gl-btn gl-btn-outline btn-quick-view px-3" data-recipe-id="${recipe.id}">
                <i class="bi bi-card-text"></i>Быстрый просмотр
              </button>
            </div>
          </div>
          <div class="col-lg-5">
            <img src="${recipe.image_url}" class="img-fluid rounded-4 shadow-sm w-100" alt="${escapeHtml(recipe.title)}" style="height: 290px; object-fit: cover;">
          </div>
        </div>
      `;
        } catch {
            featuredContainer.classList.add("d-none");
        }
    }

    async function loadChefsRecipes() {
        if (!recipesGrid) return;
        recipesGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-danger" role="status"></div>
        <p class="text-secondary small mt-2">Загрузка рецептов из кулинарной базы...</p>
      </div>
    `;

        const query = searchInput ? searchInput.value.trim() : "";
        const category = categoryFilter ? categoryFilter.value : "all";
        const difficulty = difficultyFilter ? difficultyFilter.value : "all";
        const hasTagFilters = selectedIngredients.size > 0;

        const params = new URLSearchParams();
        if (!hasTagFilters) {
            params.append("_page", currentPage);
            params.append("_limit", PAGE_LIMIT);
        }
        if (query) params.append("q", query);
        if (category !== "all") params.append("category", category);
        if (difficulty !== "all") params.append("difficulty", difficulty);

        try {
            const response = await API.get(`/recipes?${params.toString()}`);
            let recipes = Array.isArray(response) ? response : (response.data || []);
            let totalCount = response.totalCount ?? recipes.length;

            if (hasTagFilters) {
                recipes = recipes.filter((recipe) => {
                    const ingNames = (recipe.ingredients || []).map((i) => i.name.toLowerCase());
                    return Array.from(selectedIngredients).every((tag) =>
                        ingNames.some((name) => name.includes(tag.toLowerCase()))
                    );
                });
                totalCount = recipes.length;
                const startIdx = (currentPage - 1) * PAGE_LIMIT;
                recipes = recipes.slice(startIdx, startIdx + PAGE_LIMIT);
            }

            renderChefsGrid(recipes);
            renderPagination({
                container: paginationContainer,
                currentPage,
                totalCount,
                pageLimit: PAGE_LIMIT,
                onPageChange: (nextPage) => {
                    currentPage = nextPage;
                    loadChefsRecipes();
                    window.scrollTo({ top: 420, behavior: "smooth" });
                }
            });
        } catch {
            recipesGrid.innerHTML = `
        <div class="col-12">
          <div class="alert alert-light border text-center py-4">
            <p class="mb-2 text-danger fw-semibold">Не удалось загрузить каталог рецептов.</p>
            <p class="small text-secondary mb-3">Проверьте соединение с сервером и повторите попытку.</p>
            <button type="button" class="gl-btn gl-btn-outline gl-btn-sm" id="btnRetryCatalog">Повторить попытку</button>
          </div>
        </div>
      `;
            document.getElementById("btnRetryCatalog")?.addEventListener("click", loadChefsRecipes);
        }
    }

    function renderChefsGrid(recipes, customEmptyMessage = null) {
        if (!recipesGrid) return;
        if (recipes.length === 0) {
            recipesGrid.innerHTML = customEmptyMessage
                ? `<div class="col-12 text-center py-5 text-secondary small">${escapeHtml(customEmptyMessage)}</div>`
                : "";
            emptyState?.classList.toggle("d-none", Boolean(customEmptyMessage));
            return;
        }

        emptyState?.classList.add("d-none");
        recipesGrid.innerHTML = recipes.map((recipe) => {
            const author = usersMap.get(Number(recipe.userId));
            const likesCount = recipeLikesCountMap.get(Number(recipe.id)) || 0;
            return `
        <div class="col">
          <article class="card h-100 gl-card">
            <img src="${recipe.image_url}" class="gl-card-img" alt="${escapeHtml(recipe.title)}">
            <div class="card-body d-flex flex-column p-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="gl-badge">${LABELS.category[recipe.category] || recipe.category}</span>
                <span class="small text-secondary"><i class="bi bi-clock me-1"></i>${recipe.cooking_time_minutes} мин</span>
              </div>
              <h5 class="card-title fw-bold fs-6 mb-2">${escapeHtml(recipe.title)}</h5>
              <p class="card-text text-secondary small flex-grow-1 mb-3">${escapeHtml(recipe.description)}</p>
              ${author ? `
                <div class="mb-2">
                  <a href="pages/author.html?id=${author.id}" class="d-inline-flex align-items-center text-decoration-none text-secondary smaller">
                    <img src="${author.avatar_url || DEFAULT_AVATAR}" class="rounded-circle me-1" style="width: 20px; height: 20px; object-fit: cover;" alt="${escapeHtml(author.name)}">
                    <span>${escapeHtml(author.name)}</span>
                  </a>
                </div>
              ` : ""}
              <div class="d-flex justify-content-between align-items-center small text-secondary pt-2 border-top">
                <span>Сложность: <strong>${LABELS.difficulty[recipe.difficulty] || recipe.difficulty}</strong></span>
                <span><i class="bi bi-heart-fill text-danger me-1"></i>${likesCount}</span>
              </div>
            </div>
            <div class="card-footer bg-white border-0 pt-0 pb-3 d-flex gap-2">
              <a href="pages/recipe.html?id=${recipe.id}" class="gl-btn gl-btn-secondary gl-btn-sm w-100">Открыть</a>
              <button type="button" class="gl-btn gl-btn-outline gl-btn-sm btn-quick-view px-3" data-recipe-id="${recipe.id}" title="Быстрый просмотр">
                <i class="bi bi-card-text"></i>
              </button>
            </div>
          </article>
        </div>
      `;
        }).join("");
    }

    function renderChefDirectoryCards(chefsList, subsByFollowingId, currentUser) {
        if (!chefSearchResults) return;
        if (chefsList.length === 0) {
            chefSearchResults.innerHTML = `<div class="col-12"><p class="small text-secondary mb-0">Шефы по вашему запросу не найдены.</p></div>`;
            return;
        }

        chefSearchResults.innerHTML = chefsList.map((chef) => {
            const subRecord = subsByFollowingId.get(Number(chef.id));
            const isSub = Boolean(subRecord);
            return `
        <div class="col">
          <div class="card h-100 border rounded-3 p-3 bg-light">
            <div class="d-flex align-items-center gap-3 mb-2">
              <img src="${chef.avatar_url || DEFAULT_AVATAR}" class="rounded-circle flex-shrink-0" style="width: 46px; height: 46px; object-fit: cover;" alt="${escapeHtml(chef.name)}">
              <div class="overflow-hidden">
                <h6 class="fw-bold mb-0 text-truncate">
                  <a href="pages/author.html?id=${chef.id}" class="text-dark">${escapeHtml(chef.name)}</a>
                </h6>
                <span class="text-muted smaller d-block">@${escapeHtml(chef.username)}</span>
              </div>
            </div>
            <p class="smaller text-secondary mb-3 flex-grow-1">${escapeHtml(chef.specialty || "Кулинар сообщества GustoLab")}</p>
            <div class="d-flex gap-2">
              <a href="pages/author.html?id=${chef.id}" class="gl-btn gl-btn-outline gl-btn-sm flex-grow-1">Профиль</a>
              ${currentUser ? `
                <button type="button" class="gl-toggle-btn ${isSub ? "active-sub" : ""} btn-toggle-chef-sub"
                        data-chef-id="${chef.id}" data-sub-id="${subRecord ? subRecord.id : ""}">
                  <span>${isSub ? "Вы подписаны" : "Подписаться"}</span>
                </button>
              ` : `
                <a href="pages/login.html" class="gl-btn gl-btn-primary gl-btn-sm">Подписаться</a>
              `}
            </div>
          </div>
        </div>
      `;
        }).join("");
    }

    async function loadSubscriptionsFeed() {
        if (!recipesGrid) return;
        emptyState?.classList.add("d-none");

        const currentUser = Auth.getCurrentUser();
        const isAuth = Boolean(currentUser && Auth.isAuthenticated());
        const searchQ = chefSearchInput ? chefSearchInput.value.trim().toLowerCase() : "";

        try {
            allUsersList = await API.get("/users");
            usersMap = buildUsersMap(allUsersList);
        } catch {
            // Используется ранее загруженный список авторов
        }

        if (!isAuth) {
            if (followedChefsStrip) {
                followedChefsStrip.innerHTML = `
          <div class="d-flex flex-wrap justify-content-between align-items-center w-100 gap-2">
            <span class="small text-secondary"><i class="bi bi-info-circle me-1 text-danger"></i>Войдите в аккаунт, чтобы подписаться на шефов и следить за их новыми рецептами.</span>
            <a href="pages/login.html" class="gl-btn gl-btn-primary gl-btn-sm">Войти в аккаунт</a>
          </div>
        `;
            }
            const filteredChefs = allUsersList.filter((u) =>
                !searchQ ||
                u.name.toLowerCase().includes(searchQ) ||
                u.username.toLowerCase().includes(searchQ) ||
                (u.specialty || "").toLowerCase().includes(searchQ)
            );
            renderChefDirectoryCards(filteredChefs, new Map(), null);
            recipesGrid.innerHTML = "";
            if (paginationContainer) paginationContainer.innerHTML = "";
            return;
        }

        try {
            const subs = await API.get(`/subscriptions?userId=${currentUser.id}`);
            const subsByFollowingId = new Map(subs.map((s) => [Number(s.following_id), s]));

            if (followedChefsStrip) {
                if (subs.length === 0) {
                    followedChefsStrip.innerHTML = `
            <span class="small text-secondary">Вы пока не подписаны ни на одного шефа. Найдите интересных авторов ниже:</span>
          `;
                } else {
                    const chipsHtml = subs.map((s) => {
                        const chef = usersMap.get(Number(s.following_id));
                        if (!chef) return "";
                        return `
              <a href="pages/author.html?id=${chef.id}" class="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill border bg-light text-decoration-none text-dark small">
                <img src="${chef.avatar_url || DEFAULT_AVATAR}" class="rounded-circle" style="width: 24px; height: 24px; object-fit: cover;" alt="${escapeHtml(chef.name)}">
                <span class="fw-semibold">${escapeHtml(chef.name)}</span>
              </a>
            `;
                    }).join("");
                    followedChefsStrip.innerHTML = `<span class="small text-secondary me-1">Ваши шефы:</span>${chipsHtml}`;
                }
            }

            const otherChefs = allUsersList.filter((u) => Number(u.id) !== Number(currentUser.id));
            if (subs.length === 0 || showAllChefsDirectory || searchQ.length > 0) {
                const matchedChefs = otherChefs.filter((u) =>
                    !searchQ ||
                    u.name.toLowerCase().includes(searchQ) ||
                    u.username.toLowerCase().includes(searchQ) ||
                    (u.specialty || "").toLowerCase().includes(searchQ)
                );
                renderChefDirectoryCards(matchedChefs, subsByFollowingId, currentUser);
            } else if (chefSearchResults) {
                chefSearchResults.innerHTML = "";
            }

            if (subs.length === 0) {
                recipesGrid.innerHTML = "";
                if (paginationContainer) paginationContainer.innerHTML = "";
                return;
            }

            recipesGrid.innerHTML = `
        <div class="col-12 text-center py-4">
          <div class="spinner-border text-danger" role="status"></div>
        </div>
      `;

            const allRecipes = await API.get("/recipes");
            const feedRecipes = (Array.isArray(allRecipes) ? allRecipes : []).filter((r) =>
                subsByFollowingId.has(Number(r.userId))
            );

            const startIdx = (subFeedPage - 1) * PAGE_LIMIT;
            const pagedRecipes = feedRecipes.slice(startIdx, startIdx + PAGE_LIMIT);

            renderChefsGrid(pagedRecipes, "У выбранных шефов пока нет опубликованных рецептов.");
            renderPagination({
                container: paginationContainer,
                currentPage: subFeedPage,
                totalCount: feedRecipes.length,
                pageLimit: PAGE_LIMIT,
                onPageChange: (nextPage) => {
                    subFeedPage = nextPage;
                    loadSubscriptionsFeed();
                    window.scrollTo({ top: 420, behavior: "smooth" });
                }
            });
        } catch {
            recipesGrid.innerHTML = `<div class="col-12 text-center text-danger py-4">Не удалось загрузить ленту подписок.</div>`;
        }
    }

    subscriptionsFeedBar?.addEventListener("click", async (e) => {
        const subBtn = e.target.closest(".btn-toggle-chef-sub");
        if (!subBtn) return;
        if (!Auth.requireAuth()) return;

        const currentUser = Auth.getCurrentUser();
        const chefId = parseInt(subBtn.dataset.chefId, 10);
        const existingSubId = subBtn.dataset.subId;
        subBtn.disabled = true;

        try {
            if (existingSubId) {
                await API.delete(`/subscriptions/${existingSubId}`);
                showToast("Подписка отменена");
            } else {
                await API.post("/subscriptions", {
                    userId: Number(currentUser.id),
                    following_id: chefId
                });
                showToast("Подписка оформлена", "success");
            }
            subFeedPage = 1;
            await loadSubscriptionsFeed();
        } catch (err) {
            showToast(err.message || "Не удалось обновить подписку", "danger");
            subBtn.disabled = false;
        }
    });

    chefSearchInput?.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            loadSubscriptionsFeed();
        }, 250);
    });

    toggleAllChefsBtn?.addEventListener("click", () => {
        showAllChefsDirectory = !showAllChefsDirectory;
        const span = toggleAllChefsBtn.querySelector("span");
        if (span) {
            span.textContent = showAllChefsDirectory ? "Скрыть список шефов" : "Все шефы сообщества";
        }
        loadSubscriptionsFeed();
    });

    async function loadWorldRecipes() {
        if (!recipesGrid) return;
        recipesGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-danger" role="status"></div>
        <p class="text-secondary small mt-2">Загрузка блюд мировой кухни...</p>
      </div>
    `;
        if (paginationContainer) paginationContainer.innerHTML = "";

        const meals = await ExternalAPI.getMealsByCategory(currentWorldCategory);
        if (!meals || meals.length === 0) {
            recipesGrid.innerHTML = `<div class="col-12 text-center py-5 text-secondary">Блюда выбранной категории не найдены.</div>`;
            return;
        }

        emptyState?.classList.add("d-none");
        const catRu = ExternalAPI.getCategoryRuLabel(currentWorldCategory);

        recipesGrid.innerHTML = meals.map((meal) => `
      <div class="col">
        <article class="card h-100 gl-card">
          <img src="${meal.strMealThumb}" class="gl-card-img" alt="${escapeHtml(meal.strMeal)}">
          <div class="card-body d-flex flex-column p-3">
            <span class="gl-badge align-self-start mb-2">${escapeHtml(catRu)}</span>
            <h5 class="card-title fw-bold fs-6 mb-3 flex-grow-1">${escapeHtml(meal.strMeal)}</h5>
            <button type="button" class="gl-btn gl-btn-outline gl-btn-sm w-100 btn-world-view" data-meal-id="${meal.idMeal}">
              <i class="bi bi-journal-text me-1"></i>Смотреть рецепт
            </button>
          </div>
        </article>
      </div>
    `).join("");
    }

    document.addEventListener("click", async (e) => {
        const quickBtn = e.target.closest(".btn-quick-view");
        if (quickBtn) {
            const id = quickBtn.dataset.recipeId;
            try {
                const recipe = await API.get(`/recipes/${id}`);
                document.getElementById("modalRecipeTitle").textContent = recipe.title;
                document.getElementById("modalRecipeTime").textContent = `${recipe.cooking_time_minutes} мин`;
                document.getElementById("modalRecipeDifficulty").textContent = LABELS.difficulty[recipe.difficulty] || recipe.difficulty;
                document.getElementById("modalRecipeDesc").textContent = recipe.description;
                document.getElementById("modalRecipeIngredients").textContent =
                    (recipe.ingredients || []).map((i) => `${i.name} (${i.amount} ${i.unit})`).join(", ");
                document.getElementById("modalRecipeLink").href = `pages/recipe.html?id=${recipe.id}`;

                window.bootstrap.Modal.getOrCreateInstance(document.getElementById("quickViewModal")).show();
            } catch (err) {
                console.error("Ошибка быстрого просмотра:", err);
            }
        }

        const worldBtn = e.target.closest(".btn-world-view");
        if (worldBtn) {
            const mealId = worldBtn.dataset.mealId;
            const modalEl = document.getElementById("externalMealModal");
            const modalBody = document.getElementById("externalMealBody");
            const modalTitle = document.getElementById("externalMealTitle");
            const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalEl);

            modalTitle.textContent = "Загрузка рецепта...";
            modalBody.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-danger" role="status"></div></div>`;
            modalInstance.show();

            const meal = await ExternalAPI.getMealDetailsById(mealId);
            if (!meal) {
                modalBody.innerHTML = `<p class="text-danger text-center">Не удалось загрузить данные блюда.</p>`;
                return;
            }

            modalTitle.textContent = meal.title;
            modalBody.innerHTML = `
        <div class="row g-4">
          <div class="col-md-5">
            <img src="${meal.image_url}" class="img-fluid rounded-3 mb-3 shadow-sm w-100" alt="${escapeHtml(meal.title)}">
            <div class="d-flex gap-2 flex-wrap mb-3">
              <span class="badge bg-secondary">${escapeHtml(meal.area)}</span>
              <span class="badge bg-light text-dark border">${escapeHtml(meal.category)}</span>
            </div>
            ${meal.video_url ? `
              <a href="${meal.video_url}" target="_blank" rel="noopener noreferrer" class="gl-btn gl-btn-outline gl-btn-sm w-100">
                <i class="bi bi-play-circle text-danger"></i>Смотреть видеорецепт
              </a>
            ` : ""}
          </div>
          <div class="col-md-7">
            <h6 class="fw-bold mb-2 small text-uppercase text-secondary">Состав продуктов:</h6>
            <ul class="list-group list-group-flush small mb-3">
              ${meal.ingredients.map((ing) => `
                <li class="list-group-item d-flex justify-content-between px-0 py-1">
                  <span>${escapeHtml(ing.name)}</span>
                  <span class="text-secondary">${escapeHtml(ing.amount)}</span>
                </li>
              `).join("")}
            </ul>
            <h6 class="fw-bold mb-2 small text-uppercase text-secondary">Инструкция приготовления:</h6>
            <ol class="small text-secondary ps-3 mb-0">
              ${meal.steps.map((step) => `<li class="mb-2">${escapeHtml(step)}</li>`).join("")}
            </ol>
          </div>
        </div>
      `;
        }
    });

    function switchCatalogTab(tabName) {
        tabChefsBtn?.classList.toggle("active", tabName === "chefs");
        tabSubscriptionsBtn?.classList.toggle("active", tabName === "subscriptions");
        tabWorldBtn?.classList.toggle("active", tabName === "world");

        localFiltersCard?.classList.toggle("d-none", tabName !== "chefs");
        subscriptionsFeedBar?.classList.toggle("d-none", tabName !== "subscriptions");
        worldCategoriesBar?.classList.toggle("d-none", tabName !== "world");
        emptyState?.classList.add("d-none");

        if (tabName === "chefs") {
            statusHint.textContent = "Коллекция авторских блюд GustoLab";
            currentPage = 1;
            loadChefsRecipes();
        } else if (tabName === "subscriptions") {
            statusHint.textContent = "Новые рецепты от ваших любимых шефов";
            subFeedPage = 1;
            loadSubscriptionsFeed();
        } else {
            statusHint.textContent = "Международная кулинарная коллекция";
            loadWorldRecipes();
        }
    }

    tabChefsBtn?.addEventListener("click", () => switchCatalogTab("chefs"));
    tabSubscriptionsBtn?.addEventListener("click", () => switchCatalogTab("subscriptions"));
    tabWorldBtn?.addEventListener("click", () => switchCatalogTab("world"));

    worldCategoriesBar?.querySelectorAll(".gl-quick-tag[data-meal-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
            worldCategoriesBar.querySelectorAll(".gl-quick-tag").forEach((b) => b.classList.remove("active-sub"));
            btn.classList.add("active-sub");
            currentWorldCategory = btn.dataset.mealCat;
            loadWorldRecipes();
        });
    });

    function renderSelectedTags() {
        if (!selectedIngredientsContainer) return;
        selectedIngredientsContainer.innerHTML = Array.from(selectedIngredients).map((tag) => `
      <span class="gl-filter-tag">
        ${escapeHtml(tag)}
        <button type="button" class="gl-filter-tag-remove" data-ingredient="${escapeHtml(tag)}">&times;</button>
      </span>
    `).join("");
    }

    function addIngredient(val) {
        const clean = val.trim().toLowerCase();
        if (!clean || selectedIngredients.has(clean)) return;
        selectedIngredients.add(clean);
        renderSelectedTags();
        currentPage = 1;
        loadChefsRecipes();
    }

    addIngredientTagBtn?.addEventListener("click", () => {
        if (ingredientInput) {
            addIngredient(ingredientInput.value);
            ingredientInput.value = "";
        }
    });

    ingredientInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addIngredient(ingredientInput.value);
            ingredientInput.value = "";
        }
    });

    quickIngredientBadges.forEach((b) => {
        b.addEventListener("click", () => addIngredient(b.dataset.ingredient));
    });

    selectedIngredientsContainer?.addEventListener("click", (e) => {
        const removeBtn = e.target.closest(".gl-filter-tag-remove");
        if (removeBtn) {
            selectedIngredients.delete(removeBtn.dataset.ingredient);
            renderSelectedTags();
            currentPage = 1;
            loadChefsRecipes();
        }
    });

    searchInput?.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentPage = 1;
            loadChefsRecipes();
        }, 350);
    });

    categoryFilter?.addEventListener("change", () => {
        currentPage = 1;
        loadChefsRecipes();
    });

    difficultyFilter?.addEventListener("change", () => {
        currentPage = 1;
        loadChefsRecipes();
    });

    function resetAllFilters() {
        if (searchInput) searchInput.value = "";
        if (categoryFilter) categoryFilter.value = "all";
        if (difficultyFilter) difficultyFilter.value = "all";
        if (ingredientInput) ingredientInput.value = "";
        selectedIngredients.clear();
        renderSelectedTags();
        if (window.location.search) {
            window.history.replaceState({}, "", window.location.pathname);
        }
        currentPage = 1;
        loadChefsRecipes();
    }

    resetFiltersBtn?.addEventListener("click", resetAllFilters);
    emptyStateResetBtn?.addEventListener("click", resetAllFilters);

    await loadFeaturedRecipe();
    await loadChefsRecipes();
});
