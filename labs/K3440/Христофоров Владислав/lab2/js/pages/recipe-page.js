/**
 * Контроллер детальной страницы рецепта
 */
import { API } from "../core/api.js";
import { Auth } from "../core/auth.js";
import { initCommentsSection } from "../components/comments.js";
import { LABELS, escapeHtml, getServingWord, normalizeVideoUrl, buildUsersMap, showToast, DEFAULT_AVATAR } from "../core/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    Auth.syncHeaderUI();

    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = parseInt(urlParams.get("id"), 10);

    if (!recipeId) {
        window.location.replace("../index.html");
        return;
    }

    let currentRecipe = null;
    let currentServings = 2;
    let activeSubscription = null;
    let recipeLikes = [];
    const currentUser = Auth.getCurrentUser();

    const servingsDisplay = document.getElementById("servingsCount");
    const decreaseBtn = document.getElementById("decreaseServingsBtn");
    const increaseBtn = document.getElementById("increaseServingsBtn");
    const ingredientsList = document.getElementById("ingredientsList");
    const stepsList = document.getElementById("stepsList");

    const likeBtn = document.getElementById("likeRecipeBtn");
    const likeCountSpan = document.getElementById("likeCount");
    const saveBtn = document.getElementById("saveRecipeBtn");
    const authorSubBtn = document.getElementById("recipeAuthorSubBtn");
    const authorControlBar = document.getElementById("authorControlBar");
    const confirmDeleteBtn = document.getElementById("confirmDeleteRecipeBtn");

    let usersMap = new Map();

    async function initPage() {
        try {
            const [recipe, users, likes] = await Promise.all([
                API.get(`/recipes/${recipeId}`),
                API.get("/users"),
                API.get(`/likes?targetType=recipe&targetId=${recipeId}`)
            ]);
            currentRecipe = recipe;
            usersMap = buildUsersMap(users);
            recipeLikes = Array.isArray(likes) ? likes : [];
            currentServings = currentRecipe.servings_base || 2;

            await renderRecipe();
            renderIngredients();
            renderSteps();

            initCommentsSection({
                targetField: "recipe_id",
                targetId: recipeId,
                listId: "commentsList",
                formId: "addCommentForm",
                inputId: "commentInput",
                headerId: "commentsCountHeader",
                headerTitlePrefix: "Отзывы кулинаров",
                usersMap
            });
        } catch {
            document.querySelector("main").innerHTML = `
                <div class="container py-5 text-center">
                <h3 class="fw-bold mb-2">Рецепт не найден</h3>
                <p class="text-secondary small mb-4">Возможно, он был удалён автором или ссылка неверна.</p>
                <a href="../index.html" class="gl-btn gl-btn-primary">Вернуться в каталог</a>
                </div>
            `;
        }
    }

    async function renderRecipe() {
        const author = usersMap.get(Number(currentRecipe.userId));
        const categoryLabel = LABELS.category[currentRecipe.category] || currentRecipe.category;

        document.title = `${currentRecipe.title} — GustoLab`;
        const breadcrumbCat = document.getElementById("recipeBreadcrumbCategory");
        if (breadcrumbCat) {
            breadcrumbCat.textContent = categoryLabel;
            breadcrumbCat.href = `../index.html?category=${encodeURIComponent(currentRecipe.category)}`;
        }
        document.getElementById("recipeBreadcrumbTitle").textContent = currentRecipe.title;
        document.getElementById("recipeTitle").textContent = currentRecipe.title;
        document.getElementById("recipeDescription").textContent = currentRecipe.description || "";

        const recipeImgEl = document.getElementById("recipeImage");
        if (recipeImgEl && currentRecipe.image_url) {
            recipeImgEl.src = currentRecipe.image_url;
            recipeImgEl.classList.remove("d-none");
        }

        document.getElementById("recipeTime").textContent = `${currentRecipe.cooking_time_minutes} минут`;
        document.getElementById("recipeDifficultyBadge").textContent = `Сложность: ${LABELS.difficulty[currentRecipe.difficulty] || currentRecipe.difficulty}`;
        document.getElementById("recipeCategoryBadge").textContent = categoryLabel;

        const authorLink = document.getElementById("recipeAuthorLink");
        if (authorLink) authorLink.href = `author.html?id=${currentRecipe.userId}`;
        document.getElementById("recipeAuthorName").textContent = author ? `${author.name} (@${author.username})` : "Автор GustoLab";
        const authorAvatarEl = document.getElementById("recipeAuthorAvatar");
        if (authorAvatarEl) {
            authorAvatarEl.src = author ? author.avatar_url : DEFAULT_AVATAR;
            authorAvatarEl.classList.remove("d-none");
        }

        syncLikesUI();

        if (currentUser) {
            const isSaved = (currentUser.bookmarked_recipe_ids || []).map(Number).includes(Number(currentRecipe.id));
            saveBtn?.classList.toggle("active-save", isSaved);
            saveBtn?.setAttribute("aria-pressed", String(isSaved));
            const saveText = saveBtn?.querySelector(".save-text");
            if (saveText) saveText.textContent = isSaved ? "В закладках" : "В закладки";
        }

        if (authorSubBtn) {
            if (currentUser && Number(currentUser.id) === Number(currentRecipe.userId)) {
                authorSubBtn.classList.add("d-none");
            } else if (currentUser) {
                const subs = await API.get(`/subscriptions?userId=${currentUser.id}&following_id=${currentRecipe.userId}`);
                activeSubscription = subs[0] || null;
                syncSubBtnUI();
            }
        }

        if (authorControlBar) {
            const isAuthor = currentUser && Number(currentUser.id) === Number(currentRecipe.userId);
            authorControlBar.classList.toggle("d-none", !isAuthor);
            const editLink = document.getElementById("editRecipeLink");
            if (editLink) editLink.href = `edit-recipe.html?id=${currentRecipe.id}`;
        }

        const videoCol = document.getElementById("recipeVideoCol");
        const videoIframe = document.getElementById("recipeVideoIframe");
        if (currentRecipe.video_url && videoIframe && videoCol) {
            videoIframe.src = normalizeVideoUrl(currentRecipe.video_url);
            videoCol.classList.remove("d-none");
        } else if (videoCol) {
            videoCol.classList.add("d-none");
        }
    }

    function syncLikesUI() {
        if (likeCountSpan) likeCountSpan.textContent = recipeLikes.length;
        if (likeBtn && currentUser) {
            const isLiked = recipeLikes.some((item) => Number(item.userId) === Number(currentUser.id));
            likeBtn.classList.toggle("active-like", isLiked);
            likeBtn.setAttribute("aria-pressed", String(isLiked));
        }
    }

    function syncSubBtnUI() {
        if (!authorSubBtn) return;
        const isSub = Boolean(activeSubscription);
        authorSubBtn.classList.toggle("active-sub", isSub);
        authorSubBtn.setAttribute("aria-pressed", String(isSub));
        const span = authorSubBtn.querySelector("span");
        if (span) span.textContent = isSub ? "Вы подписаны" : "Подписаться";
    }

    function renderIngredients() {
        if (!ingredientsList || !currentRecipe) return;
        if (servingsDisplay) {
            servingsDisplay.textContent = `${currentServings} ${getServingWord(currentServings)}`;
        }

        const multiplier = currentServings / (currentRecipe.servings_base || 2);
        ingredientsList.innerHTML = (currentRecipe.ingredients || []).map((ing, idx) => {
            const scaled = Math.round(ing.amount * multiplier * 10) / 10;
            const inputId = `ingCheck_${idx}`;
            return `
                <li class="gl-ingredient-item">
                <div class="form-check d-flex align-items-center w-100 mb-0">
                    <input class="form-check-input me-2 flex-shrink-0" type="checkbox" id="${inputId}">
                    <label class="form-check-label d-flex justify-content-between align-items-center w-100 mb-0" for="${inputId}">
                    <span class="text-truncate">${escapeHtml(ing.name)}</span>
                    <span class="badge bg-secondary rounded-pill ingredient-amount ms-2">${scaled} ${escapeHtml(ing.unit)}</span>
                    </label>
                </div>
                </li>
            `;
        }).join("");
    }

    function renderSteps() {
        if (!stepsList || !currentRecipe) return;
        stepsList.innerHTML = (currentRecipe.steps || []).map((s) => `
            <div class="d-flex mb-4">
                <div class="gl-step-num me-3">${s.step}</div>
                <div class="w-100">
                <h3 class="h6 fw-bold mb-1">${escapeHtml(s.title || `Шаг ${s.step}`)}</h6>
                <p class="text-secondary small mb-2">${escapeHtml(s.description)}</p>
                ${s.image_url ? `
                    <img src="${s.image_url}" class="rounded-3 border img-fluid mt-1" style="max-height: 160px; object-fit: cover;" alt="Шаг ${s.step}">
                ` : ""}
                </div>
            </div>
            `).join("");
    }

    decreaseBtn?.addEventListener("click", () => {
        if (currentServings > 1) {
            currentServings--;
            renderIngredients();
        }
    });

    increaseBtn?.addEventListener("click", () => {
        if (currentServings < 16) {
            currentServings++;
            renderIngredients();
        }
    });

    ingredientsList?.addEventListener("change", (e) => {
        const checkbox = e.target.closest(".form-check-input");
        if (!checkbox) return;
        const item = checkbox.closest(".gl-ingredient-item");
        if (item) {
            item.classList.toggle("checked", checkbox.checked);
        }
    });

    authorSubBtn?.addEventListener("click", async () => {
        if (!Auth.requireAuth()) return;
        try {
            if (activeSubscription) {
                await API.delete(`/subscriptions/${activeSubscription.id}`);
                activeSubscription = null;
                showToast("Вы отписались от автора");
            } else {
                activeSubscription = await API.post("/subscriptions", {
                    userId: Number(currentUser.id),
                    following_id: Number(currentRecipe.userId)
                });
                showToast("Подписка оформлена", "success");
            }
            syncSubBtnUI();
        } catch (err) {
            showToast(err.message || "Не удалось обновить подписку", "danger");
        }
    });

    likeBtn?.addEventListener("click", async () => {
        if (!Auth.requireAuth()) return;
        const existingLike = recipeLikes.find((item) => Number(item.userId) === Number(currentUser.id));

        try {
            if (existingLike) {
                await API.delete(`/likes/${existingLike.id}`);
                recipeLikes = recipeLikes.filter((item) => Number(item.id) !== Number(existingLike.id));
            } else {
                const createdLike = await API.post("/likes", {
                    userId: Number(currentUser.id),
                    targetType: "recipe",
                    targetId: Number(currentRecipe.id)
                });
                recipeLikes.push(createdLike);
            }
            syncLikesUI();
        } catch (err) {
            showToast(err.message || "Не удалось обновить отметку", "danger");
        }
    });

    saveBtn?.addEventListener("click", async () => {
        if (!Auth.requireAuth()) return;
        const savedIds = (currentUser.bookmarked_recipe_ids || []).map(Number);
        const isSaved = savedIds.includes(Number(currentRecipe.id));
        const updatedIds = isSaved
            ? savedIds.filter((id) => id !== Number(currentRecipe.id))
            : [...savedIds, Number(currentRecipe.id)];

        try {
            await API.patch(`/users/${currentUser.id}`, { bookmarked_recipe_ids: updatedIds });
            Auth.updateStoredUser({ bookmarked_recipe_ids: updatedIds });
            currentUser.bookmarked_recipe_ids = updatedIds;

            saveBtn.classList.toggle("active-save", !isSaved);
            saveBtn.setAttribute("aria-pressed", String(!isSaved));
            const textSpan = saveBtn.querySelector(".save-text");
            if (textSpan) textSpan.textContent = !isSaved ? "В закладках" : "В закладки";
            showToast(!isSaved ? "Рецепт сохранён в закладки" : "Рецепт удалён из закладок");
        } catch (err) {
            showToast(err.message || "Не удалось обновить закладки", "danger");
        }
    });

    confirmDeleteBtn?.addEventListener("click", async () => {
        try {
            await API.delete(`/recipes/${currentRecipe.id}`);
            window.bootstrap.Modal.getInstance(document.getElementById("deleteRecipeModal"))?.hide();
            window.location.replace("../index.html");
        } catch (err) {
            showToast(err.message || "Не удалось удалить рецепт", "danger");
        }
    });

    await initPage();
});