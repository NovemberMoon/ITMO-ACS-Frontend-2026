/**
 * Контроллер форм создания и редактирования рецептов и статей
 */
import { API } from "../core/api.js";
import { Auth } from "../core/auth.js";
import { escapeHtml, normalizeVideoUrl, readImageFile, showToast } from "../core/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    Auth.syncHeaderUI();

    if (!Auth.requireAuth()) return;
    const currentUser = Auth.getCurrentUser();
    const urlParams = new URLSearchParams(window.location.search);
    const editId = parseInt(urlParams.get("id"), 10);

    let stagedCoverDataUrl = "";
    let coverExplicitlyRemoved = false;

    const coverFileInput = document.getElementById("coverFileInput");
    const coverPreviewBox = document.getElementById("coverPreviewContainer");
    const coverPreviewImg = document.getElementById("coverPreviewImg");
    const removeCoverBtn = document.getElementById("removeCoverBtn");
    const dropZone = document.getElementById("recipeDropZone") || document.getElementById("blogDropZone");

    coverFileInput?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            stagedCoverDataUrl = await readImageFile(file, 800, 0.8);
            coverExplicitlyRemoved = false;
            if (coverPreviewImg && coverPreviewBox) {
                coverPreviewImg.src = stagedCoverDataUrl;
                coverPreviewBox.classList.remove("d-none");
            }
            if (dropZone) dropZone.classList.add("d-none");
        } catch (err) {
            showToast(err.message, "danger");
            coverFileInput.value = "";
        }
    });

    removeCoverBtn?.addEventListener("click", () => {
        stagedCoverDataUrl = "";
        coverExplicitlyRemoved = true;
        if (coverFileInput) coverFileInput.value = "";
        if (coverPreviewImg) coverPreviewImg.src = "";
        coverPreviewBox?.classList.add("d-none");
        if (dropZone) dropZone.classList.remove("d-none");
    });

    const ingrContainer = document.getElementById("ingredientsContainer");
    const stepsContainer = document.getElementById("stepsContainer");

    function appendIngredientRow(item = { name: "", amount: "", unit: "г" }) {
        if (!ingrContainer) return;
        const row = document.createElement("div");
        row.className = "row g-2 ingredient-row mb-2";
        const rowUid = `ing_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        row.innerHTML = `
            <div class="col-6">
                <label for="${rowUid}_name" class="visually-hidden">Название продукта</label>
                <input type="text" id="${rowUid}_name" class="form-control form-control-sm ing-name" placeholder="Название продукта" value="${escapeHtml(item.name)}" required>
            </div>
            <div class="col-3">
                <label for="${rowUid}_amount" class="visually-hidden">Количество</label>
                <input type="number" id="${rowUid}_amount" step="0.1" min="0.1" class="form-control form-control-sm ing-amount" placeholder="Количество" value="${item.amount}" required>
            </div>
            <div class="col-2">
                <label for="${rowUid}_unit" class="visually-hidden">Единица измерения</label>
                <select id="${rowUid}_unit" class="form-select form-select-sm ing-unit" required>
                <option value="г" ${item.unit === "г" ? "selected" : ""}>г</option>
                <option value="мл" ${item.unit === "мл" ? "selected" : ""}>мл</option>
                <option value="шт" ${item.unit === "шт" ? "selected" : ""}>шт</option>
                <option value="ст. л." ${item.unit === "ст. л." ? "selected" : ""}>ст. л.</option>
                <option value="ч. л." ${item.unit === "ч. л." ? "selected" : ""}>ч. л.</option>
                </select>
            </div>
            <div class="col-1 text-center"><button type="button" class="btn btn-sm text-danger remove-row-btn" aria-label="Удалить ингредиент" title="Удалить"><i class="bi bi-trash" aria-hidden="true"></i></button></div>
            `;
        ingrContainer.appendChild(row);
    }

    function appendStepRow(stepData = { description: "", image_url: "" }) {
        if (!stepsContainer) return;
        const idx = stepsContainer.querySelectorAll(".step-row").length + 1;
        const card = document.createElement("div");
        card.className = "step-row card p-3 mb-3 bg-light border-0 rounded-3";
        card.dataset.existingStepImage = stepData.image_url || "";
        const stepUid = `step_${Date.now()}_${idx}`;
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold small step-index">Шаг ${idx}</span>
                <button type="button" class="btn btn-sm text-danger remove-step-btn" aria-label="Удалить шаг" title="Удалить шаг"><i class="bi bi-trash" aria-hidden="true"></i></button>
            </div>
            <label for="${stepUid}_desc" class="visually-hidden">Описание шага приготовления</label>
            <textarea id="${stepUid}_desc" class="form-control form-control-sm mb-2 step-desc" rows="2" placeholder="Опишите процесс приготовления..." required>${escapeHtml(stepData.description)}</textarea>
            <div class="d-flex align-items-center gap-2">
                <label for="${stepUid}_file" class="visually-hidden">Фотография этапа</label>
                <input type="file" id="${stepUid}_file" class="form-control form-control-sm step-file-input" accept="image/*">
                <span class="text-muted smaller text-nowrap">${stepData.image_url ? "Фото прикреплено (можно заменить)" : "Фото этапа (по желанию)"}</span>
            </div>
            `;
        stepsContainer.appendChild(card);
    }

    document.getElementById("addIngredientRowBtn")?.addEventListener("click", () => appendIngredientRow());
    document.getElementById("addStepRowBtn")?.addEventListener("click", () => appendStepRow());

    ingrContainer?.addEventListener("click", (e) => {
        if (e.target.closest(".remove-row-btn")) {
            e.target.closest(".ingredient-row").remove();
        }
    });

    stepsContainer?.addEventListener("click", (e) => {
        if (e.target.closest(".remove-step-btn")) {
            e.target.closest(".step-row").remove();
            stepsContainer.querySelectorAll(".step-row").forEach((c, i) => {
                c.querySelector(".step-index").textContent = `Шаг ${i + 1}`;
            });
        }
    });

    async function collectIngredientsAndSteps() {
        const ingredients = [];
        document.querySelectorAll(".ingredient-row").forEach((row) => {
            const name = row.querySelector(".ing-name")?.value.trim();
            const amount = parseFloat(row.querySelector(".ing-amount")?.value);
            const unit = row.querySelector(".ing-unit")?.value;
            if (name && !Number.isNaN(amount) && amount > 0) {
                ingredients.push({ name, amount, unit });
            }
        });

        const stepCards = Array.from(document.querySelectorAll(".step-row"));
        const steps = [];
        for (let idx = 0; idx < stepCards.length; idx++) {
            const card = stepCards[idx];
            const description = card.querySelector(".step-desc")?.value.trim();
            if (!description) continue;

            const fileInput = card.querySelector(".step-file-input");
            let stepImg = card.dataset.existingStepImage || "";
            if (fileInput && fileInput.files && fileInput.files[0]) {
                stepImg = await readImageFile(fileInput.files[0], 600, 0.75);
            }

            steps.push({ step: steps.length + 1, title: `Шаг ${steps.length + 1}`, description, image_url: stepImg });
        }

        return { ingredients, steps };
    }

    // Создание нового рецепта
    const createRecipeForm = document.getElementById("createRecipeForm");
    if (createRecipeForm) {
        createRecipeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = createRecipeForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;

            if (!stagedCoverDataUrl) {
                showToast("Пожалуйста, загрузите фотографию блюда", "danger");
                submitBtn.disabled = false;
                return;
            }

            try {
                const { ingredients, steps } = await collectIngredientsAndSteps();
                if (ingredients.length === 0 || steps.length === 0) {
                    showToast("Добавьте хотя бы один ингредиент и шаг приготовления", "danger");
                    submitBtn.disabled = false;
                    return;
                }

                const payload = {
                    title: createRecipeForm.elements["title"].value.trim(),
                    description: createRecipeForm.elements["description"].value.trim(),
                    category: createRecipeForm.elements["category"].value,
                    difficulty: createRecipeForm.elements["difficulty"].value,
                    cooking_time_minutes: parseInt(createRecipeForm.elements["cooking_time_minutes"].value, 10),
                    servings_base: parseInt(createRecipeForm.elements["servings_base"].value, 10) || 2,
                    userId: Number(currentUser.id),
                    image_url: stagedCoverDataUrl,
                    video_url: normalizeVideoUrl(createRecipeForm.elements["video_url"].value),
                    ingredients,
                    steps
                };

                const created = await API.post("/recipes", payload);
                window.location.href = `recipe.html?id=${created.id}`;
            } catch (err) {
                showToast(err.message || "Не удалось опубликовать рецепт", "danger");
                submitBtn.disabled = false;
            }
        });
    }

    // Редактирование рецепта
    const editRecipeForm = document.getElementById("editRecipeForm");
    if (editRecipeForm) {
        if (!editId) {
            window.location.replace("../index.html");
            return;
        }

        let existingRecipe = null;
        try {
            existingRecipe = await API.get(`/recipes/${editId}`);
            if (Number(existingRecipe.userId) !== Number(currentUser.id)) {
                window.location.replace("../index.html");
                return;
            }

            editRecipeForm.elements["title"].value = existingRecipe.title;
            editRecipeForm.elements["description"].value = existingRecipe.description;
            editRecipeForm.elements["category"].value = existingRecipe.category;
            editRecipeForm.elements["difficulty"].value = existingRecipe.difficulty;
            editRecipeForm.elements["cooking_time_minutes"].value = existingRecipe.cooking_time_minutes;
            editRecipeForm.elements["servings_base"].value = existingRecipe.servings_base || 2;
            editRecipeForm.elements["video_url"].value = existingRecipe.video_url || "";
            if (coverPreviewImg && coverPreviewBox && existingRecipe.image_url) {
                coverPreviewImg.src = existingRecipe.image_url;
                coverPreviewBox.classList.remove("d-none");
            }

            const backLink = document.getElementById("backToRecipeLink");
            if (backLink) backLink.href = `recipe.html?id=${editId}`;
            const cancelLink = document.getElementById("cancelEditRecipeLink");
            if (cancelLink) cancelLink.href = `recipe.html?id=${editId}`;

            if (ingrContainer) {
                ingrContainer.innerHTML = "";
                (existingRecipe.ingredients || []).forEach((ing) => appendIngredientRow(ing));
            }
            if (stepsContainer) {
                stepsContainer.innerHTML = "";
                (existingRecipe.steps || []).forEach((st) => appendStepRow(st));
            }
        } catch {
            showToast("Не удалось загрузить данные рецепта", "danger");
        }

        editRecipeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = editRecipeForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;

            try {
                const { ingredients, steps } = await collectIngredientsAndSteps();
                if (ingredients.length === 0 || steps.length === 0) {
                    showToast("Сохраните хотя бы один ингредиент и шаг", "danger");
                    submitBtn.disabled = false;
                    return;
                }

                const finalImage = stagedCoverDataUrl || existingRecipe.image_url;

                const payload = {
                    title: editRecipeForm.elements["title"].value.trim(),
                    description: editRecipeForm.elements["description"].value.trim(),
                    category: editRecipeForm.elements["category"].value,
                    difficulty: editRecipeForm.elements["difficulty"].value,
                    cooking_time_minutes: parseInt(editRecipeForm.elements["cooking_time_minutes"].value, 10),
                    servings_base: parseInt(editRecipeForm.elements["servings_base"].value, 10) || 2,
                    image_url: finalImage,
                    video_url: normalizeVideoUrl(editRecipeForm.elements["video_url"].value),
                    ingredients,
                    steps
                };

                await API.patch(`/recipes/${editId}`, payload);
                window.location.href = `recipe.html?id=${editId}`;
            } catch (err) {
                showToast(err.message || "Ошибка при сохранении изменений", "danger");
                submitBtn.disabled = false;
            }
        });

        document.getElementById("confirmDeleteRecipeBtn")?.addEventListener("click", async () => {
            try {
                await API.delete(`/recipes/${editId}`);
                window.bootstrap.Modal.getInstance(document.getElementById("deleteRecipeModal"))?.hide();
                window.location.replace("../index.html");
            } catch (err) {
                showToast(err.message || "Не удалось удалить рецепт", "danger");
            }
        });
    }

    // Создание новой статьи блога
    const createBlogForm = document.getElementById("createBlogForm");
    if (createBlogForm) {
        createBlogForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = createBlogForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;

            const title = createBlogForm.elements["title"].value.trim();
            const contentText = createBlogForm.elements["content"].value.trim();
            const paragraphs = contentText.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean);
            const summary = contentText.slice(0, 145) + (contentText.length > 145 ? "..." : "");

            try {
                const created = await API.post("/blogs", {
                    title,
                    summary,
                    created_at: new Date().toISOString().split("T")[0],
                    read_time: `${Math.max(2, Math.ceil(contentText.length / 400))} мин`,
                    userId: Number(currentUser.id),
                    image_url: stagedCoverDataUrl || "",
                    content: paragraphs
                });
                window.location.href = `blog-post.html?id=${created.id}`;
            } catch (err) {
                showToast(err.message || "Не удалось опубликовать статью", "danger");
                submitBtn.disabled = false;
            }
        });
    }

    // Редактирование статьи блога
    const editBlogForm = document.getElementById("editBlogForm");
    if (editBlogForm) {
        if (!editId) {
            window.location.replace("blog.html");
            return;
        }

        let existingBlog = null;
        try {
            existingBlog = await API.get(`/blogs/${editId}`);
            if (Number(existingBlog.userId) !== Number(currentUser.id)) {
                window.location.replace("blog.html");
                return;
            }

            editBlogForm.elements["title"].value = existingBlog.title;
            editBlogForm.elements["content"].value = (existingBlog.content || [existingBlog.summary]).join("\n\n");
            if (coverPreviewImg && coverPreviewBox && existingBlog.image_url) {
                coverPreviewImg.src = existingBlog.image_url;
                coverPreviewBox.classList.remove("d-none");
            }

            const backBlogLink = document.getElementById("backToBlogPostLink");
            if (backBlogLink) backBlogLink.href = `blog-post.html?id=${editId}`;
            const cancelBlogLink = document.getElementById("cancelEditBlogLink");
            if (cancelBlogLink) cancelBlogLink.href = `blog-post.html?id=${editId}`;
        } catch {
            showToast("Не удалось загрузить публикацию", "danger");
        }

        editBlogForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = editBlogForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;

            const title = editBlogForm.elements["title"].value.trim();
            const contentText = editBlogForm.elements["content"].value.trim();
            const paragraphs = contentText.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean);
            const summary = contentText.slice(0, 145) + (contentText.length > 145 ? "..." : "");
            const finalImage = coverExplicitlyRemoved ? "" : (stagedCoverDataUrl || existingBlog.image_url || "");

            try {
                await API.patch(`/blogs/${editId}`, {
                    title,
                    summary,
                    image_url: finalImage,
                    content: paragraphs
                });
                window.location.href = `blog-post.html?id=${editId}`;
            } catch (err) {
                showToast(err.message || "Ошибка при сохранении статьи", "danger");
                submitBtn.disabled = false;
            }
        });
    }
});
