// modal.js - Componente simples para exibir e ocultar modais na página de login

export function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}

export function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

// Fecha modal ao clicar no X ou fora do conteúdo
export function setupModalCloseEvents() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                modal.classList.remove('show');
            }
        });
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        }
    });
}

// Inicialização automática para modais presentes na página
if (typeof window !== 'undefined') {
    window.showModal = showModal;
    window.hideModal = hideModal;
    document.addEventListener('DOMContentLoaded', setupModalCloseEvents);
}
