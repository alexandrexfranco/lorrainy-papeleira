// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar Supabase
        if (!window.supabaseClient) {
            await window.initSupabase();
        }
        
        // Verificar autenticação
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error('Usuário não autenticado:', authError);
            window.location.href = '../../pages/public/login.html';
            return;
        }

        // Verificar se é super admin
        const { data: userData, error: profileError } = await window.supabaseClient
            .from('usuarios')
            .select('tipo, nome')
            .eq('id', user.id)
            .single();

        if (profileError || !userData) {
            console.error('Erro ao buscar perfil do usuário:', profileError);
            window.location.href = '../../pages/public/login.html';
            return;
        }

        if (userData.tipo !== 'superadmin') {
            console.error('Usuário não é super admin');
            window.location.href = '../../pages/public/login.html';
            return;
        }

        // Atualizar título com o nome do usuário
        const welcomeElement = document.getElementById('welcome');
        if (welcomeElement) {
            welcomeElement.textContent = `Bem-vindo, ${userData.nome || 'Super Admin'}`;
        }

        // Carregar dados do plano
        await carregarPlanoAtual();
    } catch (error) {
        console.error("Erro no carregamento do dashboard:", error);
        showToast("Ocorreu um erro ao carregar o painel", "error");
    }
});

// ========== FUNÇÕES DE PLANO ==========
async function carregarPlanoAtual() {
    console.log('Iniciando carregamento do plano...');
    const planoDiv = document.getElementById('plano-atual');
    
    if (!window.supabaseClient) {
        console.log('Inicializando Supabase em carregarPlanoAtual...');
        await window.initSupabase();
    }
    
    console.log('Cliente Supabase disponível:', !!window.supabaseClient);
    
    planoDiv.innerHTML = '<div class="superadmin-item-info"><div><span><i class="fas fa-circle-notch fa-spin"></i> Carregando plano...</span></div></div>';
    
    try {
        console.log('Buscando administrador...');
        // Buscar o administrador (tipo = admin)
        const { data: admins, error: adminError } = await window.supabaseClient
            .from('usuarios')
            .select('id, nome, email')
            .eq('tipo', 'admin');
            
        console.log('Resultado da busca do admin:', { admins, adminError });

        if (adminError) {
            console.error('Erro ao buscar administrador:', adminError);
            planoDiv.innerHTML = '<div class="superadmin-item-info"><div><span class="text-error"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar dados do administrador.</span></div></div>';
            return;
        }

        if (!admins || admins.length === 0) {
            planoDiv.innerHTML = '<div class="superadmin-item-info"><div><span class="text-error"><i class="fas fa-exclamation-triangle"></i> Nenhum administrador encontrado.</span></div></div>';
            return;
        }

        const admin = admins[0]; // Pegar o primeiro administrador
        
        // Buscar o plano ativo deste administrador com campos específicos
        const { data: planos, error: planoError } = await window.supabaseClient
            .from('planos')
            .select('*')
            .eq('admin_id', admin.id)
            .order('data_ativacao', { ascending: false })
            .limit(1);

        if (planoError) {
            console.error('Erro ao buscar plano:', planoError);
            planoDiv.innerHTML = '<div class="superadmin-item-info"><div><span class="text-error"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar dados do plano.</span></div></div>';
            return;
        }
        
        const plano = planos && planos.length > 0 ? planos[0] : null;
        
        // Log para debug do plano encontrado
        console.log('Plano encontrado:', plano);
        console.log('ID do plano:', plano?.id);
        console.log('Tipo do ID do plano:', typeof plano?.id);
        
        // Ajuste para o timezone correto e remoção da parte de tempo
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let vencimento = null;
        if (plano?.data_vencimento) {
            // Se data_vencimento é uma string YYYY-MM-DD, converter para Date
            if (typeof plano.data_vencimento === 'string') {
                vencimento = new Date(plano.data_vencimento);
            } else {
                vencimento = new Date(plano.data_vencimento);
            }
            vencimento.setHours(0, 0, 0, 0);
        }

        const diasRestantes = vencimento ? Math.max(0, Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))) : null;

        // Para debug
        console.log('Data Ativação:', plano?.data_ativacao);
        console.log('Data Vencimento:', plano?.data_vencimento);
        console.log('Data Hoje:', hoje.toISOString());
        console.log('Data Vencimento processada:', vencimento?.toISOString());
        console.log('Dias Restantes:', diasRestantes);
        
        // Atualizar a interface com os dados do plano
        planoDiv.innerHTML = `
            <div class="superadmin-item-info" data-plano-id="${plano?.id || ''}">
                <div class="plano-grid">
                    <div class="plano-section">
                        <h3>Informações do Administrador</h3>
                        <span><b>Nome:</b> ${admin.nome || ''}</span>
                        <span><b>Email:</b> ${admin.email || ''}</span>
                        <div class="botoes-container">
                            <button onclick="editarAdmin('${admin.id}')" class="btn-salvar" style="background-color: #27ae60;">
                                <i class="fas fa-edit"></i> Editar Admin
                            </button>
                        </div>
                    </div>
                    <div class="plano-section">
                        <h3>Detalhes do Plano</h3>
                        ${plano ? `
                            <div class="plano-info">
                                <label><b>Status:</b></label>
                                <select id="status-plano" class="select-status">
                                    <option value="true" ${plano.ativo ? 'selected' : ''}>Ativo</option>
                                    <option value="false" ${!plano.ativo ? 'selected' : ''}>Desativado</option>
                                </select>
                            </div>
                            <span><b>Tipo do Plano:</b> ${plano.plano === 'premium' ? 'Premium' : 'Gratuito'}</span>
                            <span><b>Data de Ativação:</b> ${formatarData(plano.data_ativacao)}</span>
                            ${plano.plano === 'premium' ? `
                                <div class="plano-info">
                                    <label><b>Data de Vencimento:</b></label>
                                    <input type="date" id="data-vencimento" 
                                           value="${plano.data_vencimento ? plano.data_vencimento : ''}"
                                           min="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <span><b>Status do Vencimento:</b> ${diasRestantes === 0 ? 'Vence hoje' : diasRestantes < 0 ? 'Vencido' : `Faltam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`}</span>
                            ` : ''}
                            <div class="botoes-container">
                                <button onclick="salvarAlteracoes()" class="btn-salvar">
                                    <i class="fas fa-save"></i> Salvar Alterações
                                </button>
                                <button onclick="sair()" class="btn-sair">
                                    <i class="fas fa-sign-out-alt"></i> Sair
                                </button>
                            </div>
                        ` : `
                            <span>Sem plano cadastrado</span>
                            <div class="botoes-container">
                                <button onclick="criarPlano('${admin.id}')" class="btn-salvar" style="background-color: #27ae60;">
                                    <i class="fas fa-plus"></i> Criar Plano
                                </button>
                                <button onclick="sair()" class="btn-sair">
                                    <i class="fas fa-sign-out-alt"></i> Sair
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar plano:', error);
        planoDiv.innerHTML = '<div class="superadmin-item-info"><div><span class="text-error"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar informações.</span></div></div>';
    }
}

// ========== EDITAR ADMINISTRADOR ==========
window.editarAdmin = async function(adminId) {
    try {
        // Buscar dados atuais do administrador
        const { data: admin, error: adminError } = await window.supabaseClient
            .from('usuarios')
            .select('nome, email')
            .eq('id', adminId)
            .single();

        if (adminError) throw adminError;

        // Mostrar formulário de edição usando SweetAlert2
        const { value: formValues } = await Swal.fire({
            title: 'Editar Administrador',
            html: `
                <input id="swal-nome" class="swal2-input" placeholder="Nome" value="${admin.nome || ''}" required>
                <input id="swal-email" class="swal2-input" placeholder="Email" value="${admin.email || ''}" required type="email">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Salvar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const nome = document.getElementById('swal-nome').value;
                const email = document.getElementById('swal-email').value;
                if (!nome || !email) {
                    Swal.showValidationMessage('Por favor preencha todos os campos');
                    return false;
                }
                if (!email.includes('@')) {
                    Swal.showValidationMessage('Email inválido');
                    return false;
                }
                return { nome, email };
            }
        });

        if (formValues) {
            // Atualizar dados do administrador
            const { error } = await window.supabaseClient
                .from('usuarios')
                .update({
                    nome: formValues.nome,
                    email: formValues.email
                })
                .eq('id', adminId);

            if (error) throw error;

            showToast('Dados do administrador atualizados com sucesso!');
            await carregarPlanoAtual(); // Recarregar os dados
        }
    } catch (error) {
        console.error('Erro ao editar administrador:', error);
        showToast('Erro ao editar administrador', 'error');
    }
}

// ========== CRIAR PLANO ==========
window.criarPlano = async function(adminId) {
    try {
        const { value: formValues } = await Swal.fire({
            title: 'Criar Novo Plano',
            html: `
                <select id="swal-plano-tipo" class="swal2-input" required>
                    <option value="">Selecione o tipo</option>
                    <option value="gratuito">Gratuito</option>
                    <option value="premium">Premium</option>
                </select>
                <input id="swal-data-vencimento" class="swal2-input" type="date" placeholder="Data de Vencimento" min="${new Date().toISOString().split('T')[0]}">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Criar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const tipo = document.getElementById('swal-plano-tipo').value;
                const dataVencimento = document.getElementById('swal-data-vencimento').value;
                if (!tipo) {
                    Swal.showValidationMessage('Por favor selecione o tipo do plano');
                    return false;
                }
                if (tipo === 'premium' && !dataVencimento) {
                    Swal.showValidationMessage('Data de vencimento é obrigatória para planos premium');
                    return false;
                }
                return { tipo, dataVencimento };
            }
        });

        if (formValues) {
            const hoje = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
            
            const novoPlano = {
                admin_id: adminId,
                plano: formValues.tipo,
                data_ativacao: hoje,
                data_vencimento: formValues.dataVencimento || hoje, // Para planos gratuitos, usar hoje como vencimento
                ativo: true
            };

            console.log('Dados do novo plano:', novoPlano);

            const { data, error } = await window.supabaseClient
                .from('planos')
                .insert([novoPlano])
                .select();

            if (error) {
                console.error('Erro ao criar plano:', error);
                throw error;
            }

            console.log('Plano criado:', data);
            showToast('Plano criado com sucesso!');
            await carregarPlanoAtual(); // Recarregar os dados
        }
    } catch (error) {
        console.error('Erro ao criar plano:', error);
        showToast('Erro ao criar plano', 'error');
    }
}

// ========== FUNÇÕES DE EDIÇÃO DO PLANO ==========
window.salvarAlteracoes = async function() {
    console.log('Iniciando salvamento das alterações...');
    const planoElement = document.getElementById('plano-atual');
    const planoInfo = planoElement.querySelector('.superadmin-item-info');
    const planoId = planoInfo?.dataset.planoId;

    console.log('ID do plano (original):', planoId);
    console.log('Tipo do ID:', typeof planoId);

    if (!planoId) {
        showToast('Não foi possível identificar o plano', 'error');
        return;
    }

    // Converter para número se for string
    const planoIdNum = parseInt(planoId, 10);
    console.log('ID do plano (convertido):', planoIdNum);

    // Validar se o ID é um número válido (para IDs numéricos)
    if (isNaN(planoIdNum) || planoIdNum <= 0) {
        console.error('ID do plano inválido:', planoIdNum);
        showToast('ID do plano inválido', 'error');
        return;
    }

    try {
        // Verificar se o usuário atual é super admin
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) {
            showToast('Usuário não autenticado', 'error');
            return;
        }

        const { data: userData, error: profileError } = await window.supabaseClient
            .from('usuarios')
            .select('tipo')
            .eq('id', user.id)
            .single();

        if (profileError || !userData || userData.tipo !== 'superadmin') {
            showToast('Sem permissão para alterar planos', 'error');
            return;
        }

        const statusSelect = document.getElementById('status-plano');
        const dataVencimento = document.getElementById('data-vencimento');
        
        console.log('Valores dos campos:', {
            status: statusSelect?.value,
            dataVencimento: dataVencimento?.value
        });

        if (!statusSelect) {
            showToast('Campo de status não encontrado', 'error');
            return;
        }

        const atualizacao = {
            ativo: statusSelect.value === 'true'
        };

        // Adicionar data de vencimento apenas se o campo existir
        if (dataVencimento && dataVencimento.value) {
            atualizacao.data_vencimento = dataVencimento.value;
        }

        console.log('Dados para atualização:', atualizacao);
        console.log('ID do plano para atualização:', planoIdNum);

        // Primeiro, verificar se o plano existe
        const { data: planoExistente, error: checkError } = await window.supabaseClient
            .from('planos')
            .select('id')
            .eq('id', planoIdNum)
            .single();

        if (checkError) {
            console.error('Erro ao verificar plano:', checkError);
            showToast('Plano não encontrado', 'error');
            return;
        }

        console.log('Plano encontrado:', planoExistente);

        const { data, error: updateError } = await window.supabaseClient
            .from('planos')
            .update(atualizacao)
            .eq('id', planoIdNum)
            .select();

        if (updateError) {
            console.error('Erro do Supabase:', updateError);
            console.error('Detalhes do erro:', {
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                code: updateError.code
            });
            throw updateError;
        }

        console.log('Resposta do Supabase:', data);
        console.log('Atualização realizada com sucesso');
        showToast('Alterações salvas com sucesso!', 'success');
        await carregarPlanoAtual(); // Recarregar os dados
    } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        console.error('Tipo do erro:', typeof error);
        console.error('Mensagem do erro:', error.message);
        
        // Mostrar mensagem mais específica baseada no tipo de erro
        let mensagemErro = 'Erro ao salvar alterações';
        if (error.message) {
            if (error.message.includes('permission')) {
                mensagemErro = 'Sem permissão para alterar este plano';
            } else if (error.message.includes('constraint')) {
                mensagemErro = 'Dados inválidos para o plano';
            } else if (error.message.includes('not found')) {
                mensagemErro = 'Plano não encontrado';
            }
        }
        
        showToast(mensagemErro, 'error');
    }
}

// Expor função de logout globalmente também
window.sair = async function() {
    try {
        await window.supabaseClient.auth.signOut();
        window.location.href = '../../pages/public/login.html';
    } catch (error) {
        console.error('Erro ao sair:', error);
        showToast('Erro ao sair do sistema', 'error');
    }
}

// ========== UTILIDADES ==========
function formatarData(dataString) {
    if (!dataString) return '';
    
    // Se já é uma string de data no formato YYYY-MM-DD, usar diretamente
    if (typeof dataString === 'string' && dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    
    // Se é uma data completa, converter
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showToast(message, type = 'success') {
    // Usando o sistema de toast correto
    const container = document.querySelector('.toast-container') || (() => {
        const cont = document.createElement('div');
        cont.className = 'toast-container';
        document.body.appendChild(cont);
        return cont;
    })();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    // Estrutura do toast com ícone e mensagem
    toast.innerHTML = `
        <div class="toast-content">
            <i class="toast-icon ${getToastIcon(type)}" aria-hidden="true"></i>
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

    // Remove o toast após 3 segundos
    setTimeout(() => {
        dismissToast(toast);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

function dismissToast(toast) {
    // Adiciona a animação de saída
    toast.style.animation = 'slideOut 0.3s forwards';
    
    toast.addEventListener('animationend', () => {
        toast.remove();
    }, { once: true });
}