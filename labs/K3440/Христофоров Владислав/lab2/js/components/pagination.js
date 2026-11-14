/**
 * Компонент постраничной навигации
 */
export function renderPagination({ container, currentPage, totalCount, pageLimit, onPageChange }) {
    if (!container) return;
    const totalPages = Math.ceil(totalCount / pageLimit);

    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    let html = `<ul class="pagination justify-content-center mb-0">`;
    html += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <button type="button" class="page-link" data-page="${currentPage - 1}" aria-label="Предыдущая">&laquo;</button>
    </li>
  `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
      <li class="page-item ${i === currentPage ? "active" : ""}">
        <button type="button" class="page-link" data-page="${i}">${i}</button>
      </li>
    `;
    }

    html += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <button type="button" class="page-link" data-page="${currentPage + 1}" aria-label="Следующая">&raquo;</button>
    </li>
  `;
    html += `</ul>`;

    container.innerHTML = html;

    container.querySelectorAll(".page-link").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetPage = parseInt(btn.dataset.page, 10);
            if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
                onPageChange(targetPage);
            }
        });
    });
}