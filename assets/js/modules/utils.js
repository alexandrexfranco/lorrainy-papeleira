/**
 * Utilitários gerais para o projeto
 */

// Formatação de moeda
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Formatação de data
export function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

// Validação de formulários
export function validateForm(formData, rules) {
    const errors = {};
    
    for (const [field, value] of formData.entries()) {
        const fieldRules = rules[field] || [];
        
        for (const rule of fieldRules) {
            const error = rule(value);
            if (error) {
                errors[field] = error;
                break;
            }
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// Regras de validação comuns
export const validationRules = {
    required: value => !value ? 'Campo obrigatório' : null,
    email: value => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'Email inválido' : null;
    },
    phone: value => {
        const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
        return !phoneRegex.test(value) ? 'Telefone inválido' : null;
    },
    minLength: min => value => 
        value.length < min ? `Mínimo de ${min} caracteres` : null,
    maxLength: max => value => 
        value.length > max ? `Máximo de ${max} caracteres` : null
};

// Manipulação de estado dos botões
export function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('btn-loading');
        button.dataset.originalText = button.textContent;
        button.textContent = 'Carregando...';
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading');
        button.textContent = button.dataset.originalText;
    }
}

// Debounce para funções que não devem ser chamadas muitas vezes
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Local Storage helpers
export const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    },
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return defaultValue;
        }
    },
    remove: key => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Error removing from localStorage:', e);
        }
    }
};

// URL helpers
export function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

// Download helpers
export function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Error handling
export function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    if (error.response) {
        return `Erro do servidor: ${error.response.data.message}`;
    }
    
    if (error.request) {
        return 'Erro de conexão. Verifique sua internet.';
    }
    
    return error.message || 'Ocorreu um erro inesperado.';
}
