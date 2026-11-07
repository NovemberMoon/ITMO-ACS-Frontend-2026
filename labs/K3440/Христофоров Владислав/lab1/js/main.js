/**
 * GustoLab — Единый клиентский скрипт управления интерфейсом
 */
document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Catalog Multi-Factor Filter (Search, Category, Difficulty, Ingredient Tags) ---
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const difficultyFilter = document.getElementById("difficultyFilter");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");
    const recipeItems = document.querySelectorAll(".recipe-item");
    const recipesEmptyState = document.getElementById("recipesEmptyState");

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
            const ing = badge.getAttribute("data-ingredient");
            addIngredient(ing);
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

    // --- 2. Blog Search ---
    const blogSearchInput = document.getElementById("blogSearchInput");
    const blogCards = document.querySelectorAll(".blog-card");
    const blogEmptyState = document.getElementById("blogEmptyState");

    if (blogSearchInput) {
        blogSearchInput.addEventListener("input", () => {
            const query = blogSearchInput.value.toLowerCase().trim();
            let matchedCount = 0;

            blogCards.forEach((card) => {
                const title = (card.getAttribute("data-title") || "").toLowerCase();
                const matches = title.includes(query);
                card.style.display = matches ? "block" : "none";
                if (matches) matchedCount++;
            });

            if (blogEmptyState) {
                blogEmptyState.classList.toggle("d-none", matchedCount > 0);
            }
        });
    }

    // --- 3. Quick View Modal ---
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

    // --- 4. Recipe Portions Calculator ---
    const baseServings = 2;
    let currentServings = 2;
    const servingsDisplay = document.getElementById("servingsCount");
    const decBtn = document.getElementById("decreaseServingsBtn");
    const incBtn = document.getElementById("increaseServingsBtn");
    const ingrItems = document.querySelectorAll("#ingredientsList .gl-ingredient-item");

    function getServingWord(count) {
        if (count % 10 === 1 && count % 100 !== 11) return "порция";
        if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return "порции";
        return "порций";
    }

    function updateServings(newCount) {
        if (newCount < 1 || newCount > 16) return;
        currentServings = newCount;

        if (servingsDisplay) {
            servingsDisplay.textContent = `${currentServings} ${getServingWord(currentServings)}`;
        }

        ingrItems.forEach((item) => {
            const base = parseFloat(item.getAttribute("data-base-amount"));
            const unit = item.getAttribute("data-unit") || "";
            const badge = item.querySelector(".ingredient-amount");
            if (base && badge) {
                const scaled = Math.round((base / baseServings) * currentServings * 10) / 10;
                badge.textContent = `${scaled} ${unit}`;
            }
        });
    }

    if (decBtn) decBtn.addEventListener("click", () => updateServings(currentServings - 1));
    if (incBtn) incBtn.addEventListener("click", () => updateServings(currentServings + 1));

    // --- 5. Recipe Ingredients Checklist ---
    const ingrList = document.getElementById("ingredientsList");
    if (ingrList) {
        ingrList.addEventListener("click", (e) => {
            const item = e.target.closest(".gl-ingredient-item");
            if (item) item.classList.toggle("checked");
        });
    }

    // --- 6. Social Reactions & Counters ---
    const likeRecipeBtn = document.getElementById("likeRecipeBtn");
    if (likeRecipeBtn) {
        let liked = false;
        likeRecipeBtn.addEventListener("click", () => {
            liked = !liked;
            likeRecipeBtn.classList.toggle("active-like", liked);
            const text = document.getElementById("likeText");
            if (text) {
                let count = parseInt(text.textContent, 10);
                text.textContent = liked ? count + 1 : count - 1;
            }
        });
    }

    const saveRecipeBtn = document.getElementById("saveRecipeBtn");
    if (saveRecipeBtn) {
        let saved = false;
        saveRecipeBtn.addEventListener("click", () => {
            saved = !saved;
            saveRecipeBtn.classList.toggle("active-save", saved);
            const text = document.getElementById("saveText");
            if (text) text.textContent = saved ? "В закладках" : "В закладки";
        });
    }

    const likeBlogBtn = document.getElementById("likeBlogBtn");
    if (likeBlogBtn) {
        let blogLiked = false;
        likeBlogBtn.addEventListener("click", () => {
            blogLiked = !blogLiked;
            likeBlogBtn.classList.toggle("active-like", blogLiked);
            const count = document.getElementById("likeBlogCount");
            if (count) {
                let val = parseInt(count.textContent, 10);
                count.textContent = blogLiked ? val + 1 : val - 1;
            }
        });
    }

    document.querySelectorAll(".author-sub-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const isActive = btn.classList.contains("active-sub");
            btn.classList.toggle("active-sub", !isActive);

            const span = btn.querySelector("span");
            if (span) {
                span.textContent = !isActive ? "Вы подписаны" : "Подписаться";
            }

            const followersCount = document.getElementById("followersCount");
            if (followersCount) {
                let count = parseInt(followersCount.textContent, 10);
                followersCount.textContent = !isActive ? count + 1 : count - 1;
            }
        });
    });

    // --- 7. Comment Management (Inline Edit & Custom Modal Delete) ---
    let targetCommentToDelete = null;
    const deleteCommentModalEl = document.getElementById("deleteCommentModal");
    let deleteCommentModalInstance = null;
    if (deleteCommentModalEl) {
        deleteCommentModalInstance = new bootstrap.Modal(deleteCommentModalEl);
    }

    const confirmDeleteCommentBtn = document.getElementById("confirmDeleteCommentBtn");
    if (confirmDeleteCommentBtn) {
        confirmDeleteCommentBtn.addEventListener("click", () => {
            if (targetCommentToDelete) {
                targetCommentToDelete.remove();
                targetCommentToDelete = null;
            }
            if (deleteCommentModalInstance) {
                deleteCommentModalInstance.hide();
            }
        });
    }

    function bindCommentActions(container) {
        if (!container) return;
        container.addEventListener("click", (e) => {
            const editBtn = e.target.closest(".edit-comment-btn");
            const delBtn = e.target.closest(".delete-comment-btn");

            if (editBtn) {
                const item = editBtn.closest(".comment-item");
                if (item.querySelector(".inline-edit-box")) return;

                const textEl = item.querySelector(".comment-text");
                const currentText = textEl.textContent.trim();
                textEl.classList.add("d-none");

                const editBox = document.createElement("div");
                editBox.className = "inline-edit-box mt-2";
                editBox.innerHTML = `
          <textarea class="form-control form-control-sm mb-2 inline-edit-textarea" rows="2">${currentText}</textarea>
          <div class="d-flex gap-2 justify-content-end">
            <button type="button" class="gl-btn gl-btn-outline gl-btn-sm cancel-inline-edit-btn">Отмена</button>
            <button type="button" class="gl-btn gl-btn-primary gl-btn-sm save-inline-edit-btn">Сохранить</button>
          </div>
        `;

                textEl.after(editBox);

                const textarea = editBox.querySelector(".inline-edit-textarea");
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);

                editBox.querySelector(".cancel-inline-edit-btn").addEventListener("click", () => {
                    editBox.remove();
                    textEl.classList.remove("d-none");
                });

                editBox.querySelector(".save-inline-edit-btn").addEventListener("click", () => {
                    const val = textarea.value.trim();
                    if (val) {
                        textEl.textContent = val;
                    }
                    editBox.remove();
                    textEl.classList.remove("d-none");
                });
            }

            if (delBtn) {
                targetCommentToDelete = delBtn.closest(".comment-item");
                if (deleteCommentModalInstance) {
                    deleteCommentModalInstance.show();
                } else if (targetCommentToDelete) {
                    targetCommentToDelete.remove();
                }
            }
        });
    }

    const recipeCommentsList = document.getElementById("commentsList");
    bindCommentActions(recipeCommentsList);

    const blogCommentsList = document.getElementById("blogCommentsList");
    bindCommentActions(blogCommentsList);

    const addCommentForm = document.getElementById("addCommentForm");
    if (addCommentForm) {
        addCommentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("commentInput");
            const text = input.value.trim();
            if (!text) return;

            const newCard = document.createElement("div");
            newCard.className = "card mb-3 border-0 bg-white shadow-sm rounded-3 comment-item";
            newCard.innerHTML = `
        <div class="card-body py-3 px-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-bold small">Алексей Смирнов</span>
            <div class="d-flex align-items-center gap-2">
              <span class="text-muted smaller">Только что</span>
              <button type="button" class="btn btn-sm p-0 text-secondary edit-comment-btn" title="Редактировать"><i class="bi bi-pencil"></i></button>
              <button type="button" class="btn btn-sm p-0 text-danger delete-comment-btn" title="Удалить"><i class="bi bi-trash"></i></button>
            </div>
          </div>
          <p class="mb-0 small text-secondary comment-text">${text}</p>
        </div>
      `;
            recipeCommentsList.prepend(newCard);
            input.value = "";
        });
    }

    // --- 8. Profile & Media Previews (FileReader) ---
    const editProfileForm = document.getElementById("editProfileForm");
    const editAvatarFileInput = document.getElementById("editAvatarFileInput");
    const editModalAvatarPreview = document.getElementById("editModalAvatarPreview");
    let stagedAvatarUrl = "";

    if (editAvatarFileInput && editModalAvatarPreview) {
        editAvatarFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    stagedAvatarUrl = event.target.result;
                    editModalAvatarPreview.src = stagedAvatarUrl;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (editProfileForm) {
        editProfileForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const newName = document.getElementById("editNameInput") ? document.getElementById("editNameInput").value : "";
            const newSpecialty = document.getElementById("editSpecialtyInput") ? document.getElementById("editSpecialtyInput").value : "";
            const newBio = document.getElementById("editBioInput").value;
            const myUsernameText = document.getElementById("myUsernameText");
            const mySpecialtyText = document.getElementById("mySpecialtyText");
            const myBioText = document.getElementById("myBioText");
            const myAvatarImg = document.getElementById("myAvatarImg");

            if (newName && myUsernameText) myUsernameText.textContent = newName;
            if (newSpecialty && mySpecialtyText) mySpecialtyText.textContent = newSpecialty;
            if (myBioText) myBioText.textContent = newBio;
            if (myAvatarImg && stagedAvatarUrl) myAvatarImg.src = stagedAvatarUrl;

            const modalEl = document.getElementById("editProfileModal");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        });
    }

    const fileInput = document.getElementById("recipeImageFileInput");
    const previewBox = document.getElementById("recipeImagePreviewContainer");
    const previewImg = document.getElementById("recipeImagePreview");
    const removeBtn = document.getElementById("removeRecipeImageBtn");
    const dropZone = document.getElementById("recipeDropZone");

    if (fileInput && previewBox && previewImg) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImg.src = event.target.result;
                    previewBox.classList.remove("d-none");
                    if (dropZone) dropZone.classList.add("d-none");
                };
                reader.readAsDataURL(file);
            }
        });

        if (removeBtn) {
            removeBtn.addEventListener("click", () => {
                fileInput.value = "";
                previewImg.src = "";
                previewBox.classList.add("d-none");
                if (dropZone) dropZone.classList.remove("d-none");
            });
        }
    }

    // --- 9. Dynamic Form Rows (Ingredients & Steps for Create and Edit) ---
    const addIngrBtn = document.getElementById("addIngredientRowBtn");
    const ingrContainer = document.getElementById("ingredientsContainer");
    if (addIngrBtn && ingrContainer) {
        addIngrBtn.addEventListener("click", () => {
            const row = document.createElement("div");
            row.className = "row g-2 ingredient-row mb-2";
            row.innerHTML = `
        <div class="col-6"><input type="text" class="form-control form-control-sm" placeholder="Название продукта" required></div>
        <div class="col-3"><input type="number" step="0.1" min="0.1" class="form-control form-control-sm" placeholder="Количество" required></div>
        <div class="col-2">
          <select class="form-select form-select-sm" required>
            <option value="g">г</option>
            <option value="ml">мл</option>
            <option value="pcs">шт</option>
            <option value="tbsp">ст. л.</option>
            <option value="tsp">ч. л.</option>
          </select>
        </div>
        <div class="col-1 text-center"><button type="button" class="btn btn-sm text-danger remove-row-btn" title="Удалить"><i class="bi bi-trash"></i></button></div>
      `;
            ingrContainer.appendChild(row);
        });

        ingrContainer.addEventListener("click", (e) => {
            if (e.target.closest(".remove-row-btn")) {
                e.target.closest(".ingredient-row").remove();
            }
        });
    }

    const addStepBtn = document.getElementById("addStepRowBtn");
    const stepsContainer = document.getElementById("stepsContainer");
    if (addStepBtn && stepsContainer) {
        addStepBtn.addEventListener("click", () => {
            const idx = stepsContainer.querySelectorAll(".step-row").length + 1;
            const card = document.createElement("div");
            card.className = "step-row card p-3 mb-3 bg-light border-0 rounded-3";
            card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-bold small step-index">Шаг ${idx}</span>
          <button type="button" class="btn btn-sm text-danger remove-step-btn" title="Удалить шаг"><i class="bi bi-trash"></i></button>
        </div>
        <textarea class="form-control form-control-sm mb-2" rows="2" placeholder="Опишите процесс приготовления..." required></textarea>
        <div class="d-flex align-items-center gap-2">
          <input type="file" class="form-control form-control-sm step-file-input" accept="image/*">
          <span class="text-muted smaller">Фото шага (по желанию)</span>
        </div>
      `;
            stepsContainer.appendChild(card);
        });

        stepsContainer.addEventListener("click", (e) => {
            if (e.target.closest(".remove-step-btn")) {
                e.target.closest(".step-row").remove();
                stepsContainer.querySelectorAll(".step-row").forEach((row, i) => {
                    row.querySelector(".step-index").textContent = `Шаг ${i + 1}`;
                });
            }
        });
    }
});
