// js/supabase.js
// URLs que precisam ser configuradas no Supabase Dashboard (Auth > URL Configuration):
// - http://127.0.0.1:5500/* (Live Server)
// - http://localhost:5500/* (Live Server)
// - http://127.0.0.1:3000/* (Dev Server)
// - http://localhost:3000/* (Dev Server)

const SUPABASE_URL = 'https://dcrzvxepwsenjofvpkcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjcnp2eGVwd3NlbmpvZnZwa2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTQ0MTEsImV4cCI6MjA2NDUzMDQxMX0.uYb5jzwSELIx2zx3th2dx1CckUqkmbvOgPZpxMuxoSo';

let initializationPromise = null;

window.initSupabase = async function() {
    // Se já temos um cliente inicializado, retorna ele
    if (window.supabaseClient) {
        console.log('[Supabase] Cliente já inicializado, reusando instância.');
        return window.supabaseClient;
    }

    // Se já estamos inicializando, retorna a promise existente
    if (initializationPromise) {
        console.log('[Supabase] Inicialização em andamento, aguardando...');
        return initializationPromise;
    }

    try {
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
            alert('[ERRO] A biblioteca Supabase não foi carregada corretamente. Verifique sua conexão com a internet e o link do CDN.');
            throw new Error('Biblioteca Supabase (CDN) não carregada ou inválida.');
        }
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                storage: window.localStorage,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                flowType: 'pkce'
            },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            global: {
                fetch: fetch.bind(globalThis),
                headers: {}
            },
            auth: {
                storageKey: 'supabase.auth.token',
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                flowType: 'pkce'
            }
        });
        if (!window.supabaseClient) {
            alert('[ERRO] Falha ao criar o cliente Supabase.');
            throw new Error('Falha ao criar o cliente Supabase.');
        }
        console.log('[OK] Supabase cliente inicializado.');
        return window.supabaseClient;
    } catch (error) {
        alert('[ERRO] Falha ao inicializar Supabase: ' + error.message);
        console.error('[ERRO] Falha ao inicializar Supabase:', error);
        throw error;
    }
}