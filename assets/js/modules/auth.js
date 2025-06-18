import { toast } from '../components/toast.js';

class Auth {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
    }

    async init() {
        if (!window.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        try {
            // Verifica se já existe uma sessão
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            if (error) {
                // Ignora erro de sessão ausente (esperado na tela de login)
                if (error.name === 'AuthSessionMissingError' || error.message?.includes('Auth session missing')) {
                    this.currentUser = null;
                    this.isInitialized = true;
                    return;
                }
                throw error;
            }
            this.currentUser = user;
            this.isInitialized = true;
            // Listener para mudanças na autenticação
            window.supabaseClient.auth.onAuthStateChange((event, session) => {
                this.handleAuthChange(event, session);
            });
        } catch (error) {
            // Ignora erro de sessão ausente (esperado na tela de login)
            if (error.name === 'AuthSessionMissingError' || error.message?.includes('Auth session missing')) {
                this.currentUser = null;
                this.isInitialized = true;
                return;
            }
            console.error('Error initializing auth:', error);
            throw error;
        }
    }    async login(email, password) {
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                // Traduz as mensagens de erro comuns do Supabase
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Email ou senha incorretos');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Email não confirmado. Por favor, verifique sua caixa de entrada.');
                } else if (error.message.includes('Too many requests')) {
                    throw new Error('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
                }
                throw error;
            }

            this.currentUser = data.user;
            // Buscar informações adicionais do usuário
            const { data: userData, error: userError } = await window.supabaseClient
                .from('usuarios')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                throw new Error('Erro ao carregar dados do usuário');
            }

            // Toast de login efetuado
            toast.show('Login efetuado com sucesso!', 'success');
            // Redirecionar baseado no tipo de usuário
            this.redirectBasedOnUserType(userData.tipo);
            return data;
        } catch (error) {
            toast.show(error.message || 'Erro ao fazer login. Tente novamente.', 'error');
            throw error;
        }
    }    async logout() {
        try {
            const { error } = await window.supabaseClient.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            window.location.href = '/pages/public/login.html';
            
        } catch (error) {
            toast.show('Erro ao fazer logout', 'error');
            console.error('Error during logout:', error);
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email);
            if (error) {
                // Trata erro 429 (Too Many Requests)
                if (error.status === 429 || error.message?.includes('Too Many Requests')) {
                    toast.show('Aguarde 1 minuto antes de solicitar outro e-mail de recuperação.', 'error');
                    return;
                }
                throw error;
            }
            toast.show('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success');
        } catch (error) {
            // Trata erro 429 também aqui, caso venha por exceção
            if (error.status === 429 || error.message?.includes('Too Many Requests')) {
                toast.show('Aguarde 1 minuto antes de solicitar outro e-mail de recuperação.', 'error');
                return;
            }
            toast.show(error.message || 'Erro ao enviar e-mail de recuperação', 'error');
            throw error;
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await window.supabaseClient.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            toast.show('Senha atualizada com sucesso!', 'success');
        } catch (error) {
            toast.show(error.message || 'Erro ao atualizar senha', 'error');
            throw error;
        }
    }

    redirectBasedOnUserType(tipo) {
        const redirectMap = {
            'admin': '/pages/admin/dashboard-admin.html',
            'cliente': '/pages/client/dashboard-client.html',
            'superadmin': '/pages/superadmin/dashboard-superadmin.html'
        };
        const redirect = redirectMap[tipo] || '/pages/public/login.html';
        window.location.href = redirect;
    }    handleAuthChange(event, session) {
        if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            window.location.href = '/pages/public/login.html';
        } else if (event === 'SIGNED_IN') {
            this.currentUser = session?.user || null;
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Exporta uma instância única da classe Auth
export const auth = new Auth();
