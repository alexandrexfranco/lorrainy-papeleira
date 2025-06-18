/**
 * Utilitários para otimização de performance
 */

import { initImageLoader } from './image-loader.js';
import { getOptimizedConfig } from './optimization-config.js';

/**
 * Debounce function para otimizar eventos de scroll
 */
function debounce(func, wait) {
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

/**
 * Otimizar carregamento de imagens
 */
function optimizeImageLoading() {
    try {
        const config = getOptimizedConfig();
        const imageLoader = initImageLoader({
            threshold: config.lazyLoading.threshold,
            rootMargin: config.lazyLoading.rootMargin,
            timeout: config.lazyLoading.timeout,
            placeholder: config.lazyLoading.placeholder
        });
        
        return imageLoader;
    } catch (error) {
        console.warn('Erro ao inicializar carregador de imagens:', error);
        return null;
    }
}

/**
 * Otimizar scroll events
 */
function optimizeScrollEvents() {
    const config = getOptimizedConfig();
    const scrollHandler = debounce(() => {
        // Lógica de scroll otimizada
        const scrollTop = window.pageYOffset;
        
        // Botão voltar ao topo
        const backToTop = document.querySelector('.back-to-top');
        if (backToTop) {
            if (scrollTop > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }
    }, config.performance.scrollDebounceDelay);

    window.addEventListener('scroll', scrollHandler, { passive: true });
}

/**
 * Preload de recursos críticos
 */
function preloadCriticalResources() {
    const config = getOptimizedConfig();
    
    // Preload de imagens críticas
    config.preload.criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

/**
 * Otimizar carregamento de fontes
 */
function optimizeFontLoading() {
    const config = getOptimizedConfig();
    
    // Preload de fontes críticas
    config.preload.criticalFonts.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        link.onload = () => {
            link.rel = 'stylesheet';
        };
        document.head.appendChild(link);
    });
}

/**
 * Otimizar carregamento de CSS
 */
function optimizeCSSLoading() {
    const config = getOptimizedConfig();
    
    config.preload.criticalCSS.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
    });
}

/**
 * Configurar service worker para cache (se disponível)
 */
function setupServiceWorker() {
    const config = getOptimizedConfig();
    
    if (config.useServiceWorker) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registrado:', registration);
                })
                .catch(error => {
                    console.log('Erro ao registrar Service Worker:', error);
                });
        });
    }
}

/**
 * Configurar meta tags para performance
 */
function setupPerformanceMetaTags() {
    const config = getOptimizedConfig();
    
    // Adicionar meta tags para performance
    const metaTags = [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'theme-color', content: '#3498db' },
        { name: 'color-scheme', content: 'light' },
        { httpEquiv: 'X-UA-Compatible', content: 'IE=edge' }
    ];
    
    metaTags.forEach(tag => {
        const meta = document.createElement('meta');
        Object.assign(meta, tag);
        document.head.appendChild(meta);
    });
}

/**
 * Inicializar otimizações de performance
 */
function initPerformanceOptimizations() {
    try {
        const config = getOptimizedConfig();
        
        // Configurar meta tags
        setupPerformanceMetaTags();
        
        // Preload de recursos críticos
        preloadCriticalResources();
        optimizeFontLoading();
        optimizeCSSLoading();
        
        // Otimizar carregamento de imagens
        const imageLoader = optimizeImageLoading();
        
        // Otimizar eventos de scroll
        optimizeScrollEvents();
        
        // Configurar service worker
        setupServiceWorker();
        
        console.log('Otimizações de performance inicializadas com sucesso', {
            browser: config.browser,
            features: config.features
        });
        
        return {
            imageLoader,
            success: true,
            config
        };
    } catch (error) {
        console.error('Erro ao inicializar otimizações de performance:', error);
        return {
            imageLoader: null,
            success: false,
            error
        };
    }
}

// Exportar funções
export {
    initPerformanceOptimizations,
    optimizeImageLoading,
    optimizeScrollEvents,
    debounce
}; 