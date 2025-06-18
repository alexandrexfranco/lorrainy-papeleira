/**
 * Utilitário de Lazy Loading otimizado para reduzir avisos
 */

class LazyLoader {
    constructor() {
        this.images = new Map();
        this.observer = null;
        this.init();
    }
    
    init() {
        // Aguardar o DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // Usar Intersection Observer se disponível
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            this.setupFallback();
        }
        
        // Configurar imagens existentes
        this.processExistingImages();
    }
    
    setupIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }
    
    setupFallback() {
        // Para navegadores sem Intersection Observer
        console.warn('Intersection Observer não suportado, usando carregamento imediato');
    }
    
    processExistingImages() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            this.addImage(img);
        });
    }
    
    addImage(img) {
        const key = img.src || img.dataset.src;
        if (!this.images.has(key)) {
            this.images.set(key, img);
            
            if (this.observer) {
                this.observer.observe(img);
            } else {
                // Fallback: carregar imediatamente
                this.loadImage(img);
            }
        }
    }
    
    loadImage(img) {
        const container = img.closest('.image-loading');
        const originalSrc = img.src;
        
        // Se a imagem já foi carregada, não fazer nada
        if (img.complete && img.naturalHeight !== 0) {
            this.handleImageLoad(img, container);
            return;
        }
        
        // Configurar event listeners
        const handleLoad = () => {
            this.handleImageLoad(img, container);
        };
        
        const handleError = () => {
            this.handleImageError(img, container, originalSrc);
        };
        
        // Usar once: true para evitar múltiplos listeners
        img.addEventListener('load', handleLoad, { once: true });
        img.addEventListener('error', handleError, { once: true });
        
        // Se a imagem tem data-src, usar como src
        if (img.dataset.src && !img.src) {
            img.src = img.dataset.src;
        }
    }
    
    handleImageLoad(img, container) {
        // Adicionar classe loaded
        img.classList.add('loaded');
        
        // Remover classe de loading do container
        if (container) {
            container.classList.remove('image-loading');
        }
        
        // Dispatch custom event
        img.dispatchEvent(new CustomEvent('lazyLoaded', {
            detail: { src: img.src, alt: img.alt }
        }));
    }
    
    handleImageError(img, container, originalSrc) {
        // Adicionar classe loaded mesmo em caso de erro
        img.classList.add('loaded');
        
        // Remover classe de loading do container
        if (container) {
            container.classList.remove('image-loading');
        }
        
        // Usar imagem placeholder
        img.src = 'img/placeholder_imagem_default.png';
        img.alt = 'Imagem não disponível';
        
        // Dispatch custom event
        img.dispatchEvent(new CustomEvent('lazyError', {
            detail: { originalSrc }
        }));
    }
    
    // Método para adicionar novas imagens dinamicamente
    addImages(images) {
        if (Array.isArray(images)) {
            images.forEach(img => this.addImage(img));
        } else {
            this.addImage(images);
        }
    }
    
    // Método para limpar
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.images.clear();
    }
}

// Instância global
let lazyLoader = null;

// Função para inicializar
function initLazyLoader() {
    if (!lazyLoader) {
        lazyLoader = new LazyLoader();
    }
    return lazyLoader;
}

// Função para obter instância
function getLazyLoader() {
    return lazyLoader;
}

export {
    LazyLoader,
    initLazyLoader,
    getLazyLoader
}; 