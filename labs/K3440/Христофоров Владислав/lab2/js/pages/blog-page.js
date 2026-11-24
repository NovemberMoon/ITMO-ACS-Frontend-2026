/**
 * Контроллер ленты кулинарного блога и детальной статьи
 */
import { API } from "../core/api.js";
import { Auth } from "../core/auth.js";
import { initCommentsSection } from "../components/comments.js";
import { renderPagination } from "../components/pagination.js";
import { escapeHtml, formatDateRu, buildUsersMap, showToast, DEFAULT_AVATAR } from "../core/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    Auth.syncHeaderUI();

    const blogList = document.getElementById("blogList");
    const blogPagination = document.getElementById("blogPagination");
    const blogSearchInput = document.getElementById("blogSearchInput");
    const blogEmptyState = document.getElementById("blogEmptyState");
    const blogEmptyTitle = document.getElementById("blogEmptyTitle");
    const blogEmptyDesc = document.getElementById("blogEmptyDesc");
    const blogEmptyLoginLink = document.getElementById("blogEmptyLoginLink");
    const blogTabAllBtn = document.getElementById("blogTabAllBtn");
    const blogTabSubsBtn = document.getElementById("blogTabSubsBtn");
    const currentUser = Auth.getCurrentUser();

    const urlParams = new URLSearchParams(window.location.search);
    const blogId = parseInt(urlParams.get("id"), 10);

    let usersMap = new Map();
    let allBlogLikes = [];

    try {
        const [users, likes] = await Promise.all([
            API.get("/users"),
            API.get("/likes?targetType=blog")
        ]);
        usersMap = buildUsersMap(users);
        allBlogLikes = Array.isArray(likes) ? likes : [];
    } catch {
        usersMap = new Map();
        allBlogLikes = [];
    }

    function getBlogLikesCount(targetBlogId) {
        return allBlogLikes.filter((item) => Number(item.targetId) === Number(targetBlogId)).length;
    }

    // Лента публикаций блога
    if (blogList) {
        let currentPage = 1;
        let blogFeedMode = "all";
        const PAGE_LIMIT = 2;
        let debounceTimer = null;

        function showBlogEmpty(title, desc, showLogin = false) {
            blogList.innerHTML = "";
            if (blogPagination) blogPagination.innerHTML = "";
            if (blogEmptyTitle) blogEmptyTitle.textContent = title;
            if (blogEmptyDesc) blogEmptyDesc.textContent = desc;
            blogEmptyLoginLink?.classList.toggle("d-none", !showLogin);
            blogEmptyState?.classList.remove("d-none");
        }

        async function loadBlogs() {
            const query = blogSearchInput ? blogSearchInput.value.trim() : "";

            if (blogFeedMode === "subscriptions") {
                if (!currentUser || !Auth.isAuthenticated()) {
                    showBlogEmpty(
                        "Требуется авторизация",
                        "Войдите в аккаунт, чтобы читать статьи авторов из ваших подписок.",
                        true
                    );
                    return;
                }

                try {
                    const subs = await API.get(`/subscriptions?userId=${currentUser.id}`);
                    const followingIds = new Set(subs.map((s) => Number(s.following_id)));
                    if (followingIds.size === 0) {
                        showBlogEmpty(
                            "У вас пока нет подписок",
                            "Подпишитесь на интересующих шефов в каталоге или профилях авторов, чтобы видеть их публикации здесь."
                        );
                        return;
                    }

                    const params = new URLSearchParams();
                    if (query) params.append("q", query);
                    const allBlogs = await API.get(`/blogs?${params.toString()}`);
                    const filteredBlogs = (Array.isArray(allBlogs) ? allBlogs : []).filter((b) =>
                        followingIds.has(Number(b.userId))
                    );

                    if (filteredBlogs.length === 0) {
                        showBlogEmpty(
                            "Публикации не найдены",
                            "В ваших подписках пока нет статей, соответствующих запросу."
                        );
                        return;
                    }

                    const startIdx = (currentPage - 1) * PAGE_LIMIT;
                    const pagedBlogs = filteredBlogs.slice(startIdx, startIdx + PAGE_LIMIT);
                    renderBlogCards(pagedBlogs);
                    renderPagination({
                        container: blogPagination,
                        currentPage,
                        totalCount: filteredBlogs.length,
                        pageLimit: PAGE_LIMIT,
                        onPageChange: (page) => {
                            currentPage = page;
                            loadBlogs();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                    });
                } catch {
                    blogList.innerHTML = `<p class="text-danger text-center py-4">Не удалось загрузить ленту подписок блога.</p>`;
                }
                return;
            }

            const params = new URLSearchParams({
                _page: currentPage,
                _limit: PAGE_LIMIT
            });
            if (query) params.append("q", query);

            try {
                const response = await API.get(`/blogs?${params.toString()}`);
                const blogs = Array.isArray(response) ? response : (response.data || []);
                const totalCount = response.totalCount ?? blogs.length;

                if (blogs.length === 0) {
                    showBlogEmpty("Публикации не найдены", "Попробуйте изменить поисковый запрос.");
                    return;
                }

                renderBlogCards(blogs);
                renderPagination({
                    container: blogPagination,
                    currentPage,
                    totalCount,
                    pageLimit: PAGE_LIMIT,
                    onPageChange: (page) => {
                        currentPage = page;
                        loadBlogs();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                });
            } catch {
                blogList.innerHTML = `<p class="text-danger text-center py-4">Не удалось загрузить публикации блога.</p>`;
            }
        }

        function renderBlogCards(blogs) {
            blogEmptyState?.classList.add("d-none");

            blogList.innerHTML = blogs.map((b) => {
                const author = usersMap.get(Number(b.userId));
                const authorName = author ? author.name : "Автор GustoLab";
                const authorAvatar = author ? author.avatar_url : DEFAULT_AVATAR;
                const likesCount = getBlogLikesCount(b.id);

                const coverHtml = b.image_url
                    ? `<img src="${b.image_url}" class="img-fluid rounded-3 w-100" style="height: 200px; object-fit: cover;" alt="${escapeHtml(b.title)}">`
                    : `<div class="rounded-3 bg-light border d-flex align-items-center justify-content-center text-secondary w-100" style="height: 200px;">
                        <i class="bi bi-journal-richtext display-4 opacity-50" aria-hidden="true"></i>
                        </div>`;

                return `
                    <article class="card border-0 shadow-sm rounded-4 overflow-hidden bg-white p-4 blog-card">
                        <div class="row g-4 align-items-center">
                        <div class="col-md-5">
                            ${coverHtml}
                        </div>
                        <div class="col-md-7">
                            <div class="d-flex align-items-center gap-2 mb-2">
                            <a href="author.html?id=${b.userId}" class="text-secondary small fw-semibold text-decoration-none">
                                <img src="${authorAvatar}" class="rounded-circle me-1" style="width: 22px; height: 22px; object-fit: cover;" alt="">
                                ${escapeHtml(authorName)}
                            </a>
                            <span class="text-muted small">&bull; ${formatDateRu(b.created_at)}</span>
                            </div>
                            <h2 class="h5 fw-bold fs-5 mb-2">
                            <a href="blog-post.html?id=${b.id}" class="text-dark">${escapeHtml(b.title)}</a>
                            </h2>
                            <p class="text-secondary small mb-3">${escapeHtml(b.summary)}</p>
                            <div class="d-flex justify-content-between align-items-center small text-secondary">
                            <div>
                                <span class="me-3"><i class="bi bi-heart-fill text-danger me-1" aria-hidden="true"></i>${likesCount}</span>
                                <span><i class="bi bi-clock me-1" aria-hidden="true"></i>${escapeHtml(b.read_time || "5 мин")}</span>
                            </div>
                            <a href="blog-post.html?id=${b.id}" class="fw-bold" aria-label="Читать далее: ${escapeHtml(b.title)}">Читать далее &rarr;</a>
                            </div>
                        </div>
                        </div>
                    </article>
                    `;
            }).join("");
        }

        blogTabAllBtn?.addEventListener("click", () => {
            blogFeedMode = "all";
            blogTabAllBtn.classList.add("active");
            blogTabAllBtn.setAttribute("aria-selected", "true");
            blogTabSubsBtn?.classList.remove("active");
            blogTabSubsBtn?.setAttribute("aria-selected", "false");
            currentPage = 1;
            loadBlogs();
        });

        blogTabSubsBtn?.addEventListener("click", () => {
            blogFeedMode = "subscriptions";
            blogTabSubsBtn.classList.add("active");
            blogTabSubsBtn.setAttribute("aria-selected", "true");
            blogTabAllBtn?.classList.remove("active");
            blogTabAllBtn?.setAttribute("aria-selected", "false");
            currentPage = 1;
            loadBlogs();
        });

        blogSearchInput?.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadBlogs();
            }, 300);
        });

        await loadBlogs();
    }

    // Детальный просмотр статьи блога
    if (document.getElementById("blogPostContent")) {
        if (!blogId) {
            window.location.replace("blog.html");
            return;
        }

        let currentPost = null;
        let activeSubscription = null;
        let postLikes = allBlogLikes.filter((item) => Number(item.targetId) === Number(blogId));
        const likeBlogBtn = document.getElementById("likeBlogBtn");
        const likeBlogCount = document.getElementById("likeBlogCount");
        const subBtn = document.getElementById("blogAuthorSubBtn");

        function syncPostLikesUI() {
            if (likeBlogCount) likeBlogCount.textContent = postLikes.length;
            if (likeBlogBtn && currentUser) {
                const isLiked = postLikes.some((item) => Number(item.userId) === Number(currentUser.id));
                likeBlogBtn.classList.toggle("active-like", isLiked);
                likeBlogBtn.setAttribute("aria-pressed", String(isLiked));
            }
        }

        try {
            currentPost = await API.get(`/blogs/${blogId}`);
            const author = usersMap.get(Number(currentPost.userId));

            document.title = `${currentPost.title} — Блог GustoLab`;
            document.getElementById("blogPostTitle").textContent = currentPost.title;

            const blogImgEl = document.getElementById("blogPostImage");
            if (blogImgEl && currentPost.image_url) {
                blogImgEl.src = currentPost.image_url;
                blogImgEl.classList.remove("d-none");
            }

            document.getElementById("blogAuthorName").textContent = author ? author.name : "Автор GustoLab";
            const blogAuthorAvatarEl = document.getElementById("blogAuthorAvatar");
            if (blogAuthorAvatarEl) {
                blogAuthorAvatarEl.src = author ? author.avatar_url : DEFAULT_AVATAR;
                blogAuthorAvatarEl.classList.remove("d-none");
            }
            document.getElementById("blogAuthorLink").href = `author.html?id=${currentPost.userId}`;
            document.getElementById("blogPostDate").textContent = `${formatDateRu(currentPost.created_at)} • ${currentPost.read_time || "5 мин"} чтения`;

            syncPostLikesUI();

            document.getElementById("blogPostContent").innerHTML = (currentPost.content || [currentPost.summary])
                .map((p) => `<p class="lh-lg text-secondary mb-3">${escapeHtml(p)}</p>`)
                .join("");

            if (subBtn) {
                if (currentUser && Number(currentUser.id) === Number(currentPost.userId)) {
                    subBtn.classList.add("d-none");
                } else if (currentUser) {
                    const subs = await API.get(`/subscriptions?userId=${currentUser.id}&following_id=${currentPost.userId}`);
                    activeSubscription = subs[0] || null;
                    syncSubBtn();
                }
            }

            const authorBar = document.getElementById("blogAuthorControlBar");
            if (authorBar) {
                const isAuthor = currentUser && Number(currentUser.id) === Number(currentPost.userId);
                authorBar.classList.toggle("d-none", !isAuthor);
                const editBtn = document.getElementById("editBlogLink");
                if (editBtn) editBtn.href = `edit-blog-post.html?id=${currentPost.id}`;
            }

            initCommentsSection({
                targetField: "blog_id",
                targetId: blogId,
                listId: "blogCommentsList",
                formId: "addBlogCommentForm",
                inputId: "blogCommentInput",
                headerId: "blogCommentsCountHeader",
                headerTitlePrefix: "Обсуждение статьи",
                usersMap
            });
        } catch {
            document.querySelector("main").innerHTML = `
                <div class="container py-5 text-center">
                <h3 class="fw-bold mb-2">Статья не найдена</h3>
                <a href="blog.html" class="gl-btn gl-btn-primary mt-2">Вернуться в блог</a>
                </div>
            `;
        }

        function syncSubBtn() {
            if (!subBtn) return;
            const isSub = Boolean(activeSubscription);
            subBtn.classList.toggle("active-sub", isSub);
            subBtn.setAttribute("aria-pressed", String(isSub));
            const span = subBtn.querySelector("span");
            if (span) span.textContent = isSub ? "Вы подписаны" : "Подписаться";
        }

        subBtn?.addEventListener("click", async () => {
            if (!Auth.requireAuth()) return;
            try {
                if (activeSubscription) {
                    await API.delete(`/subscriptions/${activeSubscription.id}`);
                    activeSubscription = null;
                    showToast("Вы отписались от автора");
                } else {
                    activeSubscription = await API.post("/subscriptions", {
                        userId: Number(currentUser.id),
                        following_id: Number(currentPost.userId)
                    });
                    showToast("Подписка оформлена", "success");
                }
                syncSubBtn();
            } catch (err) {
                showToast(err.message || "Ошибка при обновлении подписки", "danger");
            }
        });

        likeBlogBtn?.addEventListener("click", async () => {
            if (!Auth.requireAuth() || !currentPost) return;
            const existingLike = postLikes.find((item) => Number(item.userId) === Number(currentUser.id));

            try {
                if (existingLike) {
                    await API.delete(`/likes/${existingLike.id}`);
                    postLikes = postLikes.filter((item) => Number(item.id) !== Number(existingLike.id));
                } else {
                    const createdLike = await API.post("/likes", {
                        userId: Number(currentUser.id),
                        targetType: "blog",
                        targetId: Number(currentPost.id)
                    });
                    postLikes.push(createdLike);
                }
                syncPostLikesUI();
            } catch (err) {
                showToast(err.message || "Не удалось обновить лайк", "danger");
            }
        });

        document.getElementById("confirmDeleteBlogBtn")?.addEventListener("click", async () => {
            try {
                await API.delete(`/blogs/${blogId}`);
                window.bootstrap.Modal.getInstance(document.getElementById("deleteBlogModal"))?.hide();
                window.location.replace("blog.html");
            } catch (err) {
                showToast(err.message || "Не удалось удалить статью", "danger");
            }
        });
    }
});
