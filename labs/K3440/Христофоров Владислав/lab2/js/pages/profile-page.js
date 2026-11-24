/**
 * Контроллер личного кабинета и публичного профиля шефа
 */
import { API } from "../core/api.js";
import { Auth } from "../core/auth.js";
import { escapeHtml, LABELS, formatDateRu, readImageFile, buildUsersMap, showToast, DEFAULT_AVATAR } from "../core/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    Auth.syncHeaderUI();

    const urlParams = new URLSearchParams(window.location.search);
    const authorId = parseInt(urlParams.get("id"), 10);
    const currentUser = Auth.getCurrentUser();

    function renderBlogThumb(imageUrl, title) {
        if (imageUrl) {
            return `<img src="${imageUrl}" class="rounded-3 flex-shrink-0" style="width: 88px; height: 88px; object-fit: cover;" alt="${escapeHtml(title)}">`;
        }
        return `<div class="rounded-3 bg-light border d-flex align-items-center justify-content-center text-secondary flex-shrink-0" style="width: 88px; height: 88px;">
                <i class="bi bi-journal-richtext fs-3 opacity-50" aria-hidden="true"></i>
            </div>`;
    }

    // Публичный профиль автора
    if (document.getElementById("authorProfileCard")) {
        if (!authorId) {
            window.location.replace("../index.html");
            return;
        }

        try {
            const [author, recipes, blogs, followers, blogLikes] = await Promise.all([
                API.get(`/users/${authorId}`),
                API.get(`/recipes?userId=${authorId}`),
                API.get(`/blogs?userId=${authorId}`),
                API.get(`/subscriptions?following_id=${authorId}`),
                API.get("/likes?targetType=blog")
            ]);

            document.title = `${author.name} — GustoLab`;
            const authorAvatarEl = document.getElementById("authorAvatarImg");
            if (authorAvatarEl) {
                authorAvatarEl.src = author.avatar_url || DEFAULT_AVATAR;
                authorAvatarEl.classList.remove("d-none");
            }
            document.getElementById("authorNameHeader").textContent = author.name;
            document.getElementById("authorHandleText").textContent = `@${author.username}`;
            document.getElementById("authorSpecialtyBadge").textContent = author.specialty || "Шеф-повар";
            document.getElementById("authorBioText").textContent = author.bio || "Участник сообщества GustoLab.";
            document.getElementById("authorLocationText").textContent = author.location || "Россия";

            let followersCount = followers.length;
            document.getElementById("authorRecipesCount").textContent = recipes.length;
            document.getElementById("authorBlogsCount").textContent = blogs.length;
            const followersEl = document.getElementById("followersCount");
            if (followersEl) followersEl.textContent = followersCount;

            const subBtn = document.getElementById("mainAuthorSubBtn");
            if (subBtn) {
                if (currentUser && Number(currentUser.id) === Number(author.id)) {
                    subBtn.classList.add("d-none");
                } else if (currentUser) {
                    const existing = followers.find((s) => Number(s.userId) === Number(currentUser.id));
                    let activeSubId = existing ? existing.id : null;

                    const syncBtn = () => {
                        const isSub = Boolean(activeSubId);
                        subBtn.classList.toggle("active-sub", isSub);
                        subBtn.setAttribute("aria-pressed", String(isSub));
                        subBtn.querySelector("span").textContent = isSub ? "Вы подписаны" : "Подписаться на автора";
                    };
                    syncBtn();

                    subBtn.addEventListener("click", async () => {
                        try {
                            if (activeSubId) {
                                await API.delete(`/subscriptions/${activeSubId}`);
                                activeSubId = null;
                                followersCount = Math.max(0, followersCount - 1);
                            } else {
                                const created = await API.post("/subscriptions", {
                                    userId: Number(currentUser.id),
                                    following_id: Number(author.id)
                                });
                                activeSubId = created.id;
                                followersCount += 1;
                            }
                            if (followersEl) followersEl.textContent = followersCount;
                            syncBtn();
                        } catch (err) {
                            showToast(err.message || "Не удалось обновить подписку", "danger");
                        }
                    });
                } else {
                    subBtn.addEventListener("click", () => Auth.requireAuth());
                }
            }

            const recipesList = document.getElementById("authorRecipesList");
            if (recipesList) {
                recipesList.innerHTML = recipes.length === 0
                    ? `<p class="text-secondary small">Автор пока не опубликовал рецептов.</p>`
                    : recipes.map((r) => `
                        <div class="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white d-flex flex-row gap-3 align-items-center">
                        <img src="${r.image_url}" class="rounded-3 flex-shrink-0" style="width: 88px; height: 88px; object-fit: cover;" alt="${escapeHtml(r.title)}">
                        <div class="flex-grow-1">
                            <span class="gl-badge mb-1 d-inline-block">${LABELS.category[r.category] || r.category}</span>
                            <h3 class="fw-bold fs-6 mb-1"><a href="recipe.html?id=${r.id}" class="text-dark">${escapeHtml(r.title)}</a></h3>
                            <small class="text-secondary d-block mb-2">${r.cooking_time_minutes} мин &bull; Сложность: ${LABELS.difficulty[r.difficulty] || r.difficulty}</small>
                            <a href="recipe.html?id=${r.id}" class="gl-btn gl-btn-outline gl-btn-sm">Смотреть рецепт</a>
                        </div>
                        </div>
                    `).join("");
            }

            const blogsList = document.getElementById("authorBlogsList");
            if (blogsList) {
                blogsList.innerHTML = blogs.length === 0
                    ? `<p class="text-secondary small">Автор пока не опубликовал статей в блог.</p>`
                    : blogs.map((b) => {
                        const likesCount = (blogLikes || []).filter((l) => Number(l.targetId) === Number(b.id)).length;
                        return `
                            <div class="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white d-flex flex-row gap-3 align-items-center">
                                ${renderBlogThumb(b.image_url, b.title)}
                                <div class="flex-grow-1">
                                <h3 class="fw-bold fs-6 mb-1"><a href="blog-post.html?id=${b.id}" class="text-dark">${escapeHtml(b.title)}</a></h3>
                                <small class="text-secondary d-block mb-2">Опубликовано ${formatDateRu(b.created_at)} &bull; ${likesCount} отметок</small>
                                <a href="blog-post.html?id=${b.id}" class="gl-btn gl-btn-outline gl-btn-sm">Читать статью</a>
                                </div>
                            </div>
                            `;
                    }).join("");
            }
        } catch {
            document.querySelector("main").innerHTML = `<div class="container py-5 text-center"><h3>Автор не найден</h3></div>`;
        }
    }

    // Личный кабинет пользователя
    if (document.getElementById("myProfileCard")) {
        if (!Auth.requireAuth()) return;

        try {
            const [freshUser, allUsers, myRecipes, myBlogs, allSubscriptions, blogLikes] = await Promise.all([
                API.get(`/users/${currentUser.id}`),
                API.get("/users"),
                API.get(`/recipes?userId=${currentUser.id}`),
                API.get(`/blogs?userId=${currentUser.id}`),
                API.get("/subscriptions"),
                API.get("/likes?targetType=blog")
            ]);

            const user = Auth.updateStoredUser(freshUser);
            const usersMap = buildUsersMap(allUsers);

            const mySubscriptions = allSubscriptions.filter((s) => Number(s.userId) === Number(user.id));
            const myFollowers = allSubscriptions.filter((s) => Number(s.following_id) === Number(user.id));
            const bookmarkedIds = (user.bookmarked_recipe_ids || []).map(Number);

            const myAvatarEl = document.getElementById("myAvatarImg");
            if (myAvatarEl) {
                myAvatarEl.src = user.avatar_url || DEFAULT_AVATAR;
                myAvatarEl.classList.remove("d-none");
            }
            document.getElementById("myUsernameText").textContent = user.name;
            document.getElementById("myHandleText").textContent = `@${user.username}`;
            document.getElementById("mySpecialtyText").textContent = user.specialty || "Кулинар";
            document.getElementById("myBioText").textContent = user.bio || "Расскажите о своём кулинарном опыте.";

            document.getElementById("statRecipesCount").textContent = myRecipes.length;
            document.getElementById("statBlogsCount").textContent = myBlogs.length;
            document.getElementById("statBookmarksCount").textContent = bookmarkedIds.length;
            document.getElementById("statSubscriptionsCount").textContent = mySubscriptions.length;
            document.getElementById("statFollowersCount").textContent = myFollowers.length;

            // Мои рецепты
            const myRecipesContainer = document.getElementById("tabMyRecipesList");
            if (myRecipesContainer) {
                myRecipesContainer.innerHTML = myRecipes.length === 0
                    ? `<div class="col-12"><p class="text-secondary small">Вы ещё не опубликовали ни одного рецепта.</p></div>`
                    : myRecipes.map((r) => `
                        <div class="col">
                        <div class="card h-100 shadow-sm border-0 rounded-4 d-flex flex-row p-3 align-items-center gap-3 bg-white">
                            <img src="${r.image_url}" class="rounded-3 flex-shrink-0" style="width: 88px; height: 88px; object-fit: cover;" alt="${escapeHtml(r.title)}">
                            <div class="flex-grow-1">
                            <h2 class="h6 fw-bold mb-1">${escapeHtml(r.title)}</h2>
                            <p class="text-secondary small mb-2">${r.cooking_time_minutes} мин &bull; ${LABELS.difficulty[r.difficulty] || r.difficulty}</p>
                            <div class="d-flex gap-2">
                                <a href="recipe.html?id=${r.id}" class="gl-btn gl-btn-outline gl-btn-sm">Просмотр</a>
                                <a href="edit-recipe.html?id=${r.id}" class="gl-btn gl-btn-outline gl-btn-sm"><i class="bi bi-pencil" aria-hidden="true"></i>Изменить</a>
                            </div>
                            </div>
                        </div>
                        </div>
                    `).join("");
            }

            // Закладки
            const savedContainer = document.getElementById("tabSavedRecipesList");
            if (savedContainer) {
                if (bookmarkedIds.length === 0) {
                    savedContainer.innerHTML = `<div class="col-12"><p class="text-secondary small">У вас пока нет сохранённых рецептов в закладках.</p></div>`;
                } else {
                    const savedResults = await Promise.all(
                        bookmarkedIds.map((id) => API.get(`/recipes/${id}`).catch(() => null))
                    );
                    const validSaved = savedResults.filter(Boolean);
                    document.getElementById("statBookmarksCount").textContent = validSaved.length;

                    savedContainer.innerHTML = validSaved.length === 0
                        ? `<div class="col-12"><p class="text-secondary small">Сохранённые рецепты недоступны.</p></div>`
                        : validSaved.map((r) => {
                            const author = usersMap.get(Number(r.userId));
                            return `
                                <div class="col saved-bookmark-col" data-recipe-id="${r.id}">
                                <div class="card h-100 shadow-sm border-0 rounded-4 d-flex flex-row p-3 align-items-center gap-3 bg-white">
                                    <img src="${r.image_url}" class="rounded-3 flex-shrink-0" style="width: 88px; height: 88px; object-fit: cover;" alt="${escapeHtml(r.title)}">
                                    <div class="flex-grow-1">
                                    <h2 class="h6 fw-bold mb-1">${escapeHtml(r.title)}</h2>
                                    <p class="text-secondary small mb-2">Автор: ${escapeHtml(author ? author.name : "Шеф GustoLab")}</p>
                                    <div class="d-flex gap-2">
                                        <a href="recipe.html?id=${r.id}" class="gl-btn gl-btn-outline gl-btn-sm">Открыть</a>
                                        <button type="button" class="gl-btn gl-btn-danger-outline gl-btn-sm btn-remove-bookmark" data-recipe-id="${r.id}" aria-pressed="true">
                                        <i class="bi bi-bookmark-x" aria-hidden="true"></i>Убрать
                                        </button>
                                    </div>
                                    </div>
                                </div>
                                </div>
                            `;
                        }).join("");

                    savedContainer.addEventListener("click", async (e) => {
                        const btn = e.target.closest(".btn-remove-bookmark");
                        if (!btn) return;
                        const targetId = parseInt(btn.dataset.recipeId, 10);
                        const nextIds = (user.bookmarked_recipe_ids || []).map(Number).filter((id) => id !== targetId);
                        try {
                            await API.patch(`/users/${user.id}`, { bookmarked_recipe_ids: nextIds });
                            user.bookmarked_recipe_ids = nextIds;
                            Auth.updateStoredUser({ bookmarked_recipe_ids: nextIds });
                            btn.setAttribute("aria-pressed", "false");
                            btn.closest(".saved-bookmark-col")?.remove();
                            const remainingCols = savedContainer.querySelectorAll(".saved-bookmark-col").length;
                            document.getElementById("statBookmarksCount").textContent = remainingCols;
                            showToast("Рецепт убран из закладок");
                        } catch (err) {
                            showToast(err.message || "Не удалось обновить закладки", "danger");
                        }
                    });
                }
            }

            // Мои статьи
            const myBlogsContainer = document.getElementById("tabMyBlogsList");
            if (myBlogsContainer) {
                myBlogsContainer.innerHTML = myBlogs.length === 0
                    ? `<div class="col-12"><p class="text-secondary small">Вы ещё не публиковали статьи в блог.</p></div>`
                    : myBlogs.map((b) => {
                        const likesCount = (blogLikes || []).filter((l) => Number(l.targetId) === Number(b.id)).length;
                        return `
                            <div class="col">
                                <div class="card h-100 shadow-sm border-0 rounded-4 d-flex flex-row p-3 align-items-center gap-3 bg-white">
                                ${renderBlogThumb(b.image_url, b.title)}
                                <div class="flex-grow-1">
                                    <h2 class="h6 fw-bold mb-1">${escapeHtml(b.title)}</h2>
                                    <p class="text-secondary small mb-2">${formatDateRu(b.created_at)} &bull; ${likesCount} отметок</p>
                                    <div class="d-flex gap-2">
                                    <a href="blog-post.html?id=${b.id}" class="gl-btn gl-btn-outline gl-btn-sm">Читать</a>
                                    <a href="edit-blog-post.html?id=${b.id}" class="gl-btn gl-btn-outline gl-btn-sm"><i class="bi bi-pencil" aria-hidden="true"></i>Изменить</a>
                                    </div>
                                </div>
                                </div>
                            </div>
                            `;
                    }).join("");
            }

            // Подписки
            const subsContainer = document.getElementById("tabSubscriptionsList");
            if (subsContainer) {
                subsContainer.innerHTML = mySubscriptions.length === 0
                    ? `<p class="text-secondary small">Вы пока не подписаны ни на одного автора.</p>`
                    : mySubscriptions.map((sub) => {
                        const target = usersMap.get(Number(sub.following_id));
                        if (!target) return "";
                        return `
                            <div class="card border-0 shadow-sm p-3 bg-white rounded-4 mb-2 sub-row">
                                <div class="d-flex justify-content-between align-items-center">
                                <div class="d-flex align-items-center gap-3">
                                    <img src="${target.avatar_url || DEFAULT_AVATAR}" class="rounded-circle" style="width: 44px; height: 44px; object-fit: cover;" alt="">
                                    <div>
                                    <h2 class="h6 mb-0 fw-bold"><a href="author.html?id=${target.id}" class="text-dark">${escapeHtml(target.name)}</a></h2>
                                    <small class="text-secondary">${escapeHtml(target.specialty || "Кулинар")}</small>
                                    </div>
                                </div>
                                <button type="button" class="gl-toggle-btn active-sub btn-unsub-profile" data-sub-id="${sub.id}" aria-pressed="true">
                                    <span>Отписаться</span>
                                </button>
                                </div>
                            </div>
                            `;
                    }).join("");

                subsContainer.addEventListener("click", async (e) => {
                    const btn = e.target.closest(".btn-unsub-profile");
                    if (!btn) return;
                    try {
                        await API.delete(`/subscriptions/${btn.dataset.subId}`);
                        btn.setAttribute("aria-pressed", "false");
                        btn.closest(".sub-row")?.remove();
                        const countEl = document.getElementById("statSubscriptionsCount");
                        countEl.textContent = Math.max(0, parseInt(countEl.textContent, 10) - 1);
                        showToast("Подписка отменена");
                    } catch (err) {
                        showToast(err.message || "Не удалось отписаться", "danger");
                    }
                });
            }

            // Подписчики
            const followersContainer = document.getElementById("tabSubscribersList");
            if (followersContainer) {
                followersContainer.innerHTML = myFollowers.length === 0
                    ? `<p class="text-secondary small">У вас пока нет подписчиков.</p>`
                    : myFollowers.map((sub) => {
                        const follower = usersMap.get(Number(sub.userId));
                        if (!follower) return "";
                        const alreadyFollowingBack = mySubscriptions.some((s) => Number(s.following_id) === Number(follower.id));
                        return `
                            <div class="card border-0 shadow-sm p-3 bg-white rounded-4 mb-2">
                                <div class="d-flex justify-content-between align-items-center">
                                <div class="d-flex align-items-center gap-3">
                                    <img src="${follower.avatar_url || DEFAULT_AVATAR}" class="rounded-circle" style="width: 44px; height: 44px; object-fit: cover;" alt="">
                                    <div>
                                    <h2 class="h6 mb-0 fw-bold"><a href="author.html?id=${follower.id}" class="text-dark">${escapeHtml(follower.name)}</a></h2>
                                    <small class="text-secondary">${escapeHtml(follower.specialty || "Кулинар")}</small>
                                    </div>
                                </div>
                                <a href="author.html?id=${follower.id}" class="gl-btn gl-btn-outline gl-btn-sm">
                                    ${alreadyFollowingBack ? "Взаимная подписка" : "Профиль"}
                                </a>
                                </div>
                            </div>
                            `;
                    }).join("");
            }

            // Редактирование профиля
            let stagedAvatarUrl = "";
            const avatarInput = document.getElementById("editAvatarFileInput");
            const avatarPreview = document.getElementById("editModalAvatarPreview");

            if (avatarPreview) avatarPreview.src = user.avatar_url || DEFAULT_AVATAR;

            avatarInput?.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    stagedAvatarUrl = await readImageFile(file, 300, 0.85);
                    if (avatarPreview) avatarPreview.src = stagedAvatarUrl;
                } catch (err) {
                    showToast(err.message, "danger");
                }
            });

            const editForm = document.getElementById("editProfileForm");
            if (editForm) {
                document.getElementById("editNameInput").value = user.name;
                document.getElementById("editSpecialtyInput").value = user.specialty || "";
                document.getElementById("editBioInput").value = user.bio || "";
                const roUser = document.getElementById("editReadonlyUsername");
                const roEmail = document.getElementById("editReadonlyEmail");
                if (roUser) roUser.value = user.username;
                if (roEmail) roEmail.value = user.email;

                editForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const updatedFields = {
                        name: document.getElementById("editNameInput").value.trim(),
                        specialty: document.getElementById("editSpecialtyInput").value.trim(),
                        bio: document.getElementById("editBioInput").value.trim(),
                        avatar_url: stagedAvatarUrl || user.avatar_url
                    };

                    try {
                        const res = await API.patch(`/users/${user.id}`, updatedFields);
                        Auth.updateStoredUser(res);
                        window.location.reload();
                    } catch (err) {
                        showToast(err.message || "Не удалось обновить профиль", "danger");
                    }
                });
            }

            document.getElementById("confirmDeleteAccountBtn")?.addEventListener("click", async () => {
                try {
                    await API.delete(`/users/${user.id}`);
                    Auth.logout();
                } catch (err) {
                    showToast(err.message || "Не удалось удалить профиль", "danger");
                }
            });
        } catch (err) {
            console.error("[Ошибка профиля]:", err);
            Auth.logout();
        }
    }
});
