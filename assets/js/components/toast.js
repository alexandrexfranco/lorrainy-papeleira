class Toast {
    constructor() {
        this.createContainer();
    }

    createContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        // Estrutura do toast com ícone e mensagem
        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon ${this.getIcon(type)}" aria-hidden="true"></i>
                <p class="toast-message">${message}</p>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Força o reflow para garantir a animação
        toast.offsetHeight;
        
        // Adiciona a classe show para iniciar a animação
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(toast);
            }, duration);
        }
    }

    dismiss(toast) {
        // Adiciona a animação de saída
        toast.style.animation = 'slideOut 0.3s forwards';
        
        toast.addEventListener('animationend', () => {
            toast.remove();
        }, { once: true });
    }

    getIcon(type) {
        // Ícones do Font Awesome com estilo rosa
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
}

export const toast = new Toast();
export const showToast = (...args) => toast.show(...args);
