/**
 * GustoLab — Модуль профиля пользователя и портфолио автора
 * Управляет сменой аватара, редактированием профиля и подписками.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Предпросмотр сменяемого аватара в модальном окне
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

    // Сохранение данных профиля
    const editProfileForm = document.getElementById("editProfileForm");
    if (editProfileForm) {
        editProfileForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const newName = document.getElementById("editNameInput") ? document.getElementById("editNameInput").value : "";
            const newSpecialty = document.getElementById("editSpecialtyInput") ? document.getElementById("editSpecialtyInput").value : "";
            const newBio = document.getElementById("editBioInput") ? document.getElementById("editBioInput").value : "";

            const myUsernameText = document.getElementById("myUsernameText");
            const mySpecialtyText = document.getElementById("mySpecialtyText");
            const myBioText = document.getElementById("myBioText");
            const myAvatarImg = document.getElementById("myAvatarImg");

            if (newName && myUsernameText) myUsernameText.textContent = newName;
            if (newSpecialty && mySpecialtyText) mySpecialtyText.textContent = newSpecialty;
            if (newBio && myBioText) myBioText.textContent = newBio;
            if (myAvatarImg && stagedAvatarUrl) myAvatarImg.src = stagedAvatarUrl;

            const modalEl = document.getElementById("editProfileModal");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        });
    }

    // Управление подписками на странице автора и в кабинете
    document.querySelectorAll(".author-sub-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const isActive = btn.classList.contains("active-sub");
            btn.classList.toggle("active-sub", !isActive);

            const span = btn.querySelector("span");
            if (span) {
                span.textContent = !isActive ? "Вы подписаны" : "Подписаться на автора";
            }

            const followersCount = document.getElementById("followersCount");
            if (followersCount) {
                let count = parseInt(followersCount.textContent, 10);
                followersCount.textContent = !isActive ? count + 1 : count - 1;
            }
        });
    });
});
