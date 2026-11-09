/**
 * GustoLab — Модуль кулинарного блога
 * Управляет поиском публикаций, лайками и комментариями статей.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Поиск статей блога
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

    // Лайк статьи
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

    // Подписка на автора из статьи
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

    // Комментирование статьи
    let targetBlogCommentToDelete = null;
    const deleteCommentModalEl = document.getElementById("deleteCommentModal");
    let deleteCommentModalInstance = null;
    if (deleteCommentModalEl) {
        deleteCommentModalInstance = new bootstrap.Modal(deleteCommentModalEl);
    }

    const confirmDeleteCommentBtn = document.getElementById("confirmDeleteCommentBtn");
    if (confirmDeleteCommentBtn) {
        confirmDeleteCommentBtn.addEventListener("click", () => {
            if (targetBlogCommentToDelete) {
                targetBlogCommentToDelete.remove();
                targetBlogCommentToDelete = null;
            }
            if (deleteCommentModalInstance) {
                deleteCommentModalInstance.hide();
            }
        });
    }

    const blogCommentsList = document.getElementById("blogCommentsList");
    if (blogCommentsList) {
        blogCommentsList.addEventListener("click", (e) => {
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
                targetBlogCommentToDelete = delBtn.closest(".comment-item");
                if (deleteCommentModalInstance) {
                    deleteCommentModalInstance.show();
                } else if (targetBlogCommentToDelete) {
                    targetBlogCommentToDelete.remove();
                }
            }
        });
    }

    const addBlogCommentForm = document.getElementById("addBlogCommentForm");
    if (addBlogCommentForm && blogCommentsList) {
        addBlogCommentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("blogCommentInput");
            const text = input.value.trim();
            if (!text) return;

            const newCard = document.createElement("div");
            newCard.className = "card border-0 bg-light rounded-3 p-3 mb-2 comment-item";
            newCard.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="fw-bold small">Алексей Смирнов</span>
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted smaller">Только что</span>
            <button type="button" class="btn btn-sm p-0 text-secondary edit-comment-btn" title="Редактировать"><i class="bi bi-pencil"></i></button>
            <button type="button" class="btn btn-sm p-0 text-danger delete-comment-btn" title="Удалить"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        <p class="small text-secondary mb-0 comment-text">${text}</p>
      `;
            blogCommentsList.prepend(newCard);
            input.value = "";
        });
    }
});
