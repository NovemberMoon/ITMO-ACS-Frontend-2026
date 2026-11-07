/**
 * GustoLab — Модуль детальной страницы рецепта
 * Управляет калькулятором порций, чек-листом ингредиентов, реакциями и отзывами.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Калькулятор порций
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

    // Чек-лист подготовки ингредиентов
    const ingrList = document.getElementById("ingredientsList");
    if (ingrList) {
        ingrList.addEventListener("click", (e) => {
            const item = e.target.closest(".gl-ingredient-item");
            if (item) item.classList.toggle("checked");
        });
    }

    // Реакции (Лайк, Закладка, Подписка)
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

    document.querySelectorAll(".author-sub-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const isActive = btn.classList.contains("active-sub");
            btn.classList.toggle("active-sub", !isActive);
            const span = btn.querySelector("span");
            if (span) {
                span.textContent = !isActive ? "Вы подписаны" : "Подписаться";
            }
        });
    });

    // Управление отзывами
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

    const recipeCommentsList = document.getElementById("commentsList");
    if (recipeCommentsList) {
        recipeCommentsList.addEventListener("click", (e) => {
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
                    if (val) textEl.textContent = val;
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

    const addCommentForm = document.getElementById("addCommentForm");
    if (addCommentForm && recipeCommentsList) {
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
});
