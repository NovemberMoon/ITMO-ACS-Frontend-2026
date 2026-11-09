/**
 * GustoLab — Модуль конструктора форм и медиа
 * Управляет динамическими строками ингредиентов, шагов и превью изображений.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Предпросмотр изображения рецепта
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

    // Предпросмотр обложки статьи блога
    const blogFileInput = document.getElementById("blogFileInput");
    const blogPreviewContainer = document.getElementById("blogPreviewContainer");
    const blogPreviewImg = document.getElementById("blogPreviewImg");

    if (blogFileInput && blogPreviewContainer && blogPreviewImg) {
        blogFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    blogPreviewImg.src = event.target.result;
                    blogPreviewContainer.classList.remove("d-none");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Динамические строки ингредиентов
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

    // Динамические карточки шагов приготовления
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
