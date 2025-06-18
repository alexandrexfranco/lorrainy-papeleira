/**
 * Carregador de imagens otimizado
 */

class ImageLoader {
    constructor(options = {}) {
        this.options = {
            threshold: 0.1,
            rootMargin: '50px 0px',
            timeout: 10000,
            placeholder: 'img/placeholder_imagem_default.png',
            ...options
        };
        
        this.observer = null;
        this.loadedImages = new Set();
        this.failedImages = new Set();
        
        this.init();
    }
    
    init() {
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            this.setupFallback();
        }
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
            threshold: this.options.threshold,
            rootMargin: this.options.rootMargin
        });
        
        // Observar todas as imagens lazy
        this.observeImages();
    }
    
    setupFallback() {
        console.warn('Intersection Observer não suportado, usando carregamento imediato');
        this.loadAllImages();
    }
    
    observeImages() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            if (!this.loadedImages.has(img.src) && !this.failedImages.has(img.src)) {
                this.observer.observe(img);
            }
        });
    }
    
    loadImage(img) {
        const originalSrc = img.src;
        const container = img.closest('.image-loading');
        
        // Marcar como carregando
        this.loadedImages.add(originalSrc);
        
        // Timeout para carregamento
        const timeoutId = setTimeout(() => {
            this.handleImageError(img, container, originalSrc);
        }, this.options.timeout);
        
        // Event listeners
        const handleLoad = () => {
            clearTimeout(timeoutId);
            this.handleImageSuccess(img, container);
        };
        
        const handleError = () => {
            clearTimeout(timeoutId);
            this.handleImageError(img, container, originalSrc);
        };
        
        img.addEventListener('load', handleLoad, { once: true });
        img.addEventListener('error', handleError, { once: true });
        
        // Se a imagem já tem src, não precisa fazer nada
        if (img.complete && img.naturalHeight !== 0) {
            handleLoad();
        }
    }
    
    handleImageSuccess(img, container) {
        img.classList.add('loaded');
        if (container) {
            container.classList.remove('image-loading');
        }
        
        // Dispatch custom event
        img.dispatchEvent(new CustomEvent('imageLoaded', {
            detail: { src: img.src, alt: img.alt }
        }));
    }
    
    handleImageError(img, container, originalSrc) {
        this.failedImages.add(originalSrc);
        this.loadedImages.delete(originalSrc);
        
        img.classList.add('loaded');
        if (container) {
            container.classList.remove('image-loading');
        }
        
        // Usar placeholder
        img.src = this.options.placeholder;
        img.alt = 'Imagem não disponível';
        
        // Dispatch custom event
        img.dispatchEvent(new CustomEvent('imageError', {
            detail: { originalSrc }
        }));
    }
    
    loadAllImages() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            this.loadImage(img);
        });
    }
    
    // Método para recarregar imagens que falharam
    retryFailedImages() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            if (this.failedImages.has(img.src)) {
                this.failedImages.delete(img.src);
                this.loadImage(img);
            }
        });
    }
    
    // Método para limpar cache
    clearCache() {
        this.loadedImages.clear();
        this.failedImages.clear();
    }
    
    // Método para destruir o observer
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Instância global
let imageLoader = null;

// Função para inicializar o carregador
function initImageLoader(options = {}) {
    if (imageLoader) {
        imageLoader.destroy();
    }
    
    imageLoader = new ImageLoader(options);
    return imageLoader;
}

// Função para obter a instância atual
function getImageLoader() {
    return imageLoader;
}

export {
    ImageLoader,
    initImageLoader,
    getImageLoader
}; 