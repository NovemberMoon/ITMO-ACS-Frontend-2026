/**
 * Универсальный компонент комментариев для рецептов и статей блога
 */
import { API } from "../core/api.js";
import { Auth } from "../core/auth.js";
import { escapeHtml, formatDateRu, showToast, DEFAULT_AVATAR } from "../core/utils.js";

export function initCommentsSection({
    targetField,
    targetId,
    listId,
    formId,
    inputId,
    headerId,
    headerTitlePrefix,
    usersMap
}) {
    const listEl = document.getElementById(listId);
    const formEl = document.getElementById(formId);
    const inputEl = document.getElementById(inputId);
    const headerEl = document.getElementById(headerId);
    const currentUser = Auth.getCurrentUser();

    let commentIdPendingDelete = null;
    const deleteModalEl = document.getElementById("deleteCommentModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteCommentBtn");

    if (formEl && inputEl && !Auth.isAuthenticated()) {
        inputEl.disabled = true;
        inputEl.placeholder = "Войдите в аккаунт, чтобы оставить комментарий...";
        const submitBtn = formEl.querySelector("button[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Требуется авторизация";
        }
    }

    async function loadAndRender() {
        if (!listEl) return;
        try {
            const comments = await API.get(`/comments?${targetField}=${targetId}`);
            if (headerEl) {
                headerEl.innerHTML = `<i class="bi bi-chat-left-text me-2"></i>${headerTitlePrefix} (${comments.length})`;
            }

            if (comments.length === 0) {
                listEl.innerHTML = `<p class="small text-muted mb-0">Пока нет комментариев. Станьте первым!</p>`;
                return;
            }

            listEl.innerHTML = comments.map((c) => {
                const author = usersMap?.get(Number(c.userId));
                const authorName = author ? author.name : "Участник сообщества";
                const authorAvatar = author ? author.avatar_url : DEFAULT_AVATAR;
                const isOwner = currentUser && Number(currentUser.id) === Number(c.userId);

                return `
          <div class="card mb-3 border-0 bg-white shadow-sm rounded-3 comment-item" data-comment-id="${c.id}">
            <div class="card-body py-3 px-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <a href="author.html?id=${c.userId}" class="d-flex align-items-center text-decoration-none text-dark">
                  <img src="${authorAvatar}" class="rounded-circle me-2" style="width: 26px; height: 26px; object-fit: cover;" alt="${escapeHtml(authorName)}">
                  <span class="fw-bold small">${escapeHtml(authorName)}</span>
                </a>
                <div class="d-flex align-items-center gap-2">
                  <span class="text-muted smaller">${formatDateRu(c.created_at)}</span>
                  ${isOwner ? `
                    <button type="button" class="btn btn-sm p-0 text-secondary btn-edit-comment" title="Редактировать"><i class="bi bi-pencil"></i></button>
                    <button type="button" class="btn btn-sm p-0 text-danger btn-delete-comment" title="Удалить"><i class="bi bi-trash"></i></button>
                  ` : ""}
                </div>
              </div>
              <p class="mb-0 small text-secondary comment-text">${escapeHtml(c.text)}</p>
            </div>
          </div>
        `;
            }).join("");
        } catch {
            listEl.innerHTML = `<p class="small text-danger">Не удалось загрузить комментарии.</p>`;
        }
    }

    formEl?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!Auth.requireAuth()) return;
        const text = inputEl.value.trim();
        if (!text) return;

        const btn = formEl.querySelector("button[type='submit']");
        if (btn) btn.disabled = true;

        try {
            await API.post("/comments", {
                recipe_id: targetField === "recipe_id" ? targetId : null,
                blog_id: targetField === "blog_id" ? targetId : null,
                userId: Number(currentUser.id),
                created_at: new Date().toISOString(),
                text
            });
            inputEl.value = "";
            showToast("Комментарий опубликован", "success");
            await loadAndRender();
        } catch (err) {
            showToast(err.message || "Не удалось отправить комментарий", "danger");
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    listEl?.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".btn-edit-comment");
        const deleteBtn = e.target.closest(".btn-delete-comment");

        if (editBtn) {
            const card = editBtn.closest(".comment-item");
            const commentId = card.dataset.commentId;
            const textEl = card.querySelector(".comment-text");
            if (card.querySelector(".inline-edit-box")) return;

            const originalText = textEl.textContent;
            textEl.classList.add("d-none");

            const box = document.createElement("div");
            box.className = "inline-edit-box mt-2";
            box.innerHTML = `
        <textarea class="form-control form-control-sm mb-2" rows="2">${escapeHtml(originalText)}</textarea>
        <div class="d-flex gap-2 justify-content-end">
          <button type="button" class="gl-btn gl-btn-outline gl-btn-sm btn-cancel-edit">Отмена</button>
          <button type="button" class="gl-btn gl-btn-primary gl-btn-sm btn-save-edit">Сохранить</button>
        </div>
      `;
            textEl.after(box);

            box.querySelector(".btn-cancel-edit").addEventListener("click", () => {
                box.remove();
                textEl.classList.remove("d-none");
            });

            box.querySelector(".btn-save-edit").addEventListener("click", async () => {
                const updatedText = box.querySelector("textarea").value.trim();
                if (!updatedText) return;
                try {
                    await API.patch(`/comments/${commentId}`, { text: updatedText });
                    textEl.textContent = updatedText;
                    showToast("Комментарий обновлён", "success");
                } catch (err) {
                    showToast(err.message || "Ошибка при обновлении", "danger");
                } finally {
                    box.remove();
                    textEl.classList.remove("d-none");
                }
            });
        }

        if (deleteBtn) {
            const card = deleteBtn.closest(".comment-item");
            commentIdPendingDelete = card.dataset.commentId;
            if (deleteModalEl) {
                window.bootstrap.Modal.getOrCreateInstance(deleteModalEl).show();
            }
        }
    });

    confirmDeleteBtn?.addEventListener("click", async () => {
        if (!commentIdPendingDelete) return;
        try {
            await API.delete(`/comments/${commentIdPendingDelete}`);
            commentIdPendingDelete = null;
            if (deleteModalEl) {
                window.bootstrap.Modal.getInstance(deleteModalEl)?.hide();
            }
            showToast("Комментарий удалён");
            await loadAndRender();
        } catch (err) {
            showToast(err.message || "Не удалось удалить комментарий", "danger");
        }
    });

    loadAndRender();
}
