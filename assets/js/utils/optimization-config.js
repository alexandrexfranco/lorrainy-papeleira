/**
 * Configurações de otimização para reduzir avisos do navegador
 */

export const OPTIMIZATION_CONFIG = {
    // Configurações de lazy loading
    lazyLoading: {
        threshold: 0.1,
        rootMargin: '50px 0px',
        timeout: 10000,
        placeholder: 'img/placeholder_imagem_default.png'
    },
    
    // Configurações de performance
    performance: {
        scrollDebounceDelay: 16, // ~60fps
        imageLoadTimeout: 10000,
        fontDisplay: 'swap'
    },
    
    // Configurações de cache
    cache: {
        maxAge: 86400, // 24 horas
        staleWhileRevalidate: 604800 // 7 dias
    },
    
    // Configurações de preload
    preload: {
        criticalImages: [
            'img/topos/topo1.webp',
            'img/topos/topo2.webp',
            'img/topos/topo3.webp'
        ],
        criticalCSS: [
            'assets/css/shared/base.css',
            'assets/css/layouts/index.css'
        ],
        criticalFonts: [
            'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap'
        ]
    },
    
    // Configurações de compressão
    compression: {
        images: {
            webp: true,
            avif: false, // Suporte limitado
            quality: 85
        }
    }
};

/**
 * Configurações específicas para diferentes navegadores
 */
export const BROWSER_CONFIG = {
    chrome: {
        // Chrome tem bom suporte para lazy loading nativo
        useNativeLazyLoading: true,
        intersectionObserver: true
    },
    firefox: {
        // Firefox tem suporte limitado para lazy loading nativo
        useNativeLazyLoading: false,
        intersectionObserver: true
    },
    safari: {
        // Safari tem suporte limitado
        useNativeLazyLoading: false,
        intersectionObserver: true
    },
    edge: {
        // Edge baseado em Chromium
        useNativeLazyLoading: true,
        intersectionObserver: true
    }
};

/**
 * Detectar navegador e retornar configurações apropriadas
 */
export function getBrowserConfig() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
        return BROWSER_CONFIG.chrome;
    } else if (userAgent.includes('firefox')) {
        return BROWSER_CONFIG.firefox;
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        return BROWSER_CONFIG.safari;
    } else if (userAgent.includes('edg')) {
        return BROWSER_CONFIG.edge;
    }
    
    // Fallback para configuração genérica
    return {
        useNativeLazyLoading: false,
        intersectionObserver: true
    };
}

/**
 * Configurações de fallback para navegadores antigos
 */
export const FALLBACK_CONFIG = {
    // Para navegadores sem Intersection Observer
    noIntersectionObserver: {
        loadAllImages: true,
        useScrollListener: true,
        debounceScroll: true
    },
    
    // Para navegadores sem suporte a WebP
    noWebP: {
        useJPEG: true,
        usePNG: true
    },
    
    // Para navegadores sem suporte a lazy loading nativo
    noNativeLazyLoading: {
        useCustomLazyLoading: true,
        preloadCritical: true
    }
};

/**
 * Verificar suporte a recursos modernos
 */
export function checkFeatureSupport() {
    return {
        intersectionObserver: 'IntersectionObserver' in window,
        nativeLazyLoading: 'loading' in HTMLImageElement.prototype,
        webp: (() => {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        })(),
        avif: (() => {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
        })(),
        serviceWorker: 'serviceWorker' in navigator,
        fetch: 'fetch' in window
    };
}

/**
 * Obter configurações otimizadas baseadas no navegador
 */
export function getOptimizedConfig() {
    const browserConfig = getBrowserConfig();
    const featureSupport = checkFeatureSupport();
    
    return {
        ...OPTIMIZATION_CONFIG,
        browser: browserConfig,
        features: featureSupport,
        
        // Configurações dinâmicas baseadas no suporte
        useNativeLazyLoading: browserConfig.useNativeLazyLoading && featureSupport.nativeLazyLoading,
        useIntersectionObserver: browserConfig.intersectionObserver && featureSupport.intersectionObserver,
        useWebP: featureSupport.webp,
        useAvif: featureSupport.avif,
        useServiceWorker: featureSupport.serviceWorker
    };
} 