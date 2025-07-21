import { showToast } from '../../components/toast.js';

// Variáveis globais
let currentUserId = null;
let currentProfileData = null;

// Elementos do DOM
let listaPedidosElement;
let novoPedidoModal;
let novoPedidoModalCloseBtn;
let novoPedidoForm;
let novoPedidoModalCancelarBtn;
let novoPedidoModalMessageEl;
let pedidoNomeClienteInput;
let pedidoWhatsappClienteInput;
let pedidoTemaInput;
let pedidoTamanhoBoloSelect;
let pedidoDataEventoInput;
let pedidoTipoEntregaSelect;
let pedidoEnderecoEntregaGroup;
let pedidoEnderecoPreview;
let pedidoDescricaoTextarea;
let pedidoObservacaoTextarea;

// Elementos do DOM do Modal de Edição
let editarPedidoModal;
let editarPedidoForm;
let editarPedidoTemaInput;
let editarPedidoTamanhoSelect;
let editarPedidoDataInput;
let editarPedidoTipoEntregaSelect;
let editarPedidoEnderecoGroup;
let editarPedidoEnderecoPreview;
let editarPedidoDescricaoTextarea;
let editarPedidoObservacaoTextarea;
let editarPedidoModalMessage;

// Funções Globais
window.handlePageLogout = async function() {
    try {
        if (!window.supabaseClient) {
            await window.initSupabase();
        }
        
        // Tenta fazer logout
        const { error } = await window.supabaseClient.auth.signOut();
        
        // Se der erro de sessão ausente ou qualquer outro erro, 
        // ainda assim redireciona para a página inicial
        if (error && !error.message?.includes('Auth session missing')) {
            console.error('Erro ao fazer logout:', error);
        }

        // Limpa qualquer dado local e redireciona
        localStorage.clear();
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        // Mesmo com erro, tenta redirecionar
        localStorage.clear();
        window.location.href = '/index.html';
    }
};

window.abrirNovoPedidoModal = async function() {
    try {
        if (!currentProfileData) {
            await loadUserProfileAndInitialData();
            if (!currentProfileData) {
                showFeedbackModal('Erro', 'Não foi possível carregar seus dados de perfil. Tente recarregar a página.', 'error');
                return;
            }
        }

        if (novoPedidoModal) {
            if (novoPedidoForm) novoPedidoForm.reset();
            if (novoPedidoModalMessageEl) {
                novoPedidoModalMessageEl.textContent = '';
                novoPedidoModalMessageEl.className = '';
            }

            popularDadosClienteFormPedido();
            popularTamanhosBolo();
            
            if (pedidoTipoEntregaSelect) pedidoTipoEntregaSelect.value = 'RETIRAR';
            if (pedidoEnderecoEntregaGroup) pedidoEnderecoEntregaGroup.style.display = 'none';

            if (pedidoDataEventoInput) {
                const hoje = new Date();
                const amanha = new Date(hoje);
                amanha.setDate(hoje.getDate() + 1);
                pedidoDataEventoInput.setAttribute('min', amanha.toISOString().split('T')[0]);
                pedidoDataEventoInput.value = amanha.toISOString().split('T')[0];
            }
            novoPedidoModal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Erro ao abrir modal:', error);
        showFeedbackModal('Erro', 'Não foi possível abrir o modal de novo pedido.', 'error');
    }
};

// Funções Auxiliares
function showFeedbackModal(title, message, type = 'info') {
    // Convertido para usar o sistema de toast padrão
    showToast(`${title}: ${message}`, type);
}

function popularDadosClienteFormPedido() {
    console.log('Populando dados do formulário de pedido...');
    if (currentProfileData) {
        if (pedidoNomeClienteInput) {
            pedidoNomeClienteInput.value = currentProfileData.nome || '';
        }
        if (pedidoWhatsappClienteInput) {
            pedidoWhatsappClienteInput.value = currentProfileData.whatsapp || '';
        }
    }
}

function popularTamanhosBolo() {
    if (!pedidoTamanhoBoloSelect) return;
    
    while (pedidoTamanhoBoloSelect.options.length > 1) {
        pedidoTamanhoBoloSelect.remove(1);
    }
    
    if (pedidoTamanhoBoloSelect.options.length === 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Selecione o tamanho (opcional)";
        pedidoTamanhoBoloSelect.appendChild(defaultOption);
    }

    for (let i = 10; i <= 30; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} cm`;
        pedidoTamanhoBoloSelect.appendChild(option);
    }
}

// Função para popular o select de tamanhos no modal de edição
function popularTamanhosBoloEdicao() {
    if (!editarPedidoTamanhoSelect) return;
    
    while (editarPedidoTamanhoSelect.options.length > 1) {
        editarPedidoTamanhoSelect.remove(1);
    }
    
    if (editarPedidoTamanhoSelect.options.length === 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Selecione o tamanho (opcional)";
        editarPedidoTamanhoSelect.appendChild(defaultOption);
    }

    for (let i = 10; i <= 30; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} cm`;
        editarPedidoTamanhoSelect.appendChild(option);
    }
}

async function loadUserProfileAndInitialData() {
    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error('Usuário não logado:', authError);
            showFeedbackModal('Sessão Expirada', 'Você precisa estar logado. Redirecionando...', 'error');
            setTimeout(() => { window.location.href = '/pages/public/login.html'; }, 2500);
            return;
        }
        currentUserId = user.id;

        const { data: profile, error: profileError } = await window.supabaseClient
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            if (profileError.code === 'PGRST116') {
                showFeedbackModal('Perfil Incompleto', 'Seu perfil não foi encontrado. Contate o suporte.', 'error');
            } else {
                throw profileError;
            }
            currentProfileData = { nome: user.email, whatsapp: '', email: user.email };
        } else if (profile) {
            currentProfileData = { ...profile, email: user.email };
        } else {
            currentProfileData = { nome: user.email, whatsapp: '', email: user.email };
            showFeedbackModal('Aviso', 'Não foi possível carregar todos os detalhes do seu perfil.', 'info');
        }

        if (typeof window.carregarMeusPedidos === 'function') {
            await window.carregarMeusPedidos();
        }
    } catch (err) {
        console.error("Erro ao carregar perfil do cliente:", err);
        showFeedbackModal('Erro ao Carregar', 'Não foi possível carregar os dados do seu perfil: ' + err.message, 'error');
    }
}

// Função para inicializar elementos do DOM
function initDOMElements() {
    listaPedidosElement = document.getElementById('lista-pedidos');
    novoPedidoModal = document.getElementById('novo-pedido-modal');
    novoPedidoModalCloseBtn = document.getElementById('novo-pedido-modal-close-btn');
    novoPedidoForm = document.getElementById('novo-pedido-form');
    novoPedidoModalCancelarBtn = document.getElementById('novo-pedido-modal-cancelar-btn');
    novoPedidoModalMessageEl = document.getElementById('novo-pedido-modal-message');
    pedidoNomeClienteInput = document.getElementById('pedido-nome-cliente');
    pedidoWhatsappClienteInput = document.getElementById('pedido-whatsapp-cliente');
    pedidoTemaInput = document.getElementById('pedido-tema');
    pedidoTamanhoBoloSelect = document.getElementById('pedido-tamanho-bolo');
    pedidoDataEventoInput = document.getElementById('pedido-data-evento');
    pedidoTipoEntregaSelect = document.getElementById('pedido-tipo-entrega');
    pedidoEnderecoEntregaGroup = document.getElementById('pedido-endereco-entrega-group');
    pedidoEnderecoPreview = document.getElementById('pedido-endereco-preview');
    pedidoDescricaoTextarea = document.getElementById('pedido-descricao');
    pedidoObservacaoTextarea = document.getElementById('pedido-observacao');
}

// Chamada inicial e quando o DOM é modificado
document.addEventListener('DOMContentLoaded', initDOMElements);
// Inicializa também no momento do import para garantir
initDOMElements();

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar elementos do DOM
        listaPedidosElement = document.getElementById('lista-pedidos');
        novoPedidoModal = document.getElementById('novo-pedido-modal');
        novoPedidoModalCloseBtn = document.getElementById('novo-pedido-modal-close-btn');
        novoPedidoForm = document.getElementById('novo-pedido-form');
        novoPedidoModalCancelarBtn = document.getElementById('novo-pedido-modal-cancelar-btn');
        novoPedidoModalMessageEl = document.getElementById('novo-pedido-modal-message');
        pedidoNomeClienteInput = document.getElementById('pedido-nome-cliente');
        pedidoWhatsappClienteInput = document.getElementById('pedido-whatsapp-cliente');
        pedidoTemaInput = document.getElementById('pedido-tema');
        pedidoTamanhoBoloSelect = document.getElementById('pedido-tamanho-bolo');
        pedidoDataEventoInput = document.getElementById('pedido-data-evento');
        pedidoTipoEntregaSelect = document.getElementById('pedido-tipo-entrega');
        pedidoEnderecoEntregaGroup = document.getElementById('pedido-endereco-entrega-group');
        pedidoEnderecoPreview = document.getElementById('pedido-endereco-preview');
        pedidoDescricaoTextarea = document.getElementById('pedido-descricao');
        pedidoObservacaoTextarea = document.getElementById('pedido-observacao');

        // Inicializar elementos do modal de edição
        editarPedidoModal = document.getElementById('editar-pedido-modal');
        editarPedidoForm = document.getElementById('editar-pedido-form');
        editarPedidoTemaInput = document.getElementById('editar-pedido-tema');
        editarPedidoTamanhoSelect = document.getElementById('editar-pedido-tamanho');
        editarPedidoDataInput = document.getElementById('editar-pedido-data');
        editarPedidoTipoEntregaSelect = document.getElementById('editar-pedido-tipo-entrega');
        editarPedidoEnderecoGroup = document.getElementById('editar-pedido-endereco-group');
        editarPedidoEnderecoPreview = document.getElementById('editar-pedido-endereco-preview');
        editarPedidoDescricaoTextarea = document.getElementById('editar-pedido-descricao');
        editarPedidoObservacaoTextarea = document.getElementById('editar-pedido-observacao');
        editarPedidoModalMessage = document.getElementById('editar-pedido-modal-message');

        // Inicializar Supabase
        if (!window.supabaseClient) {
            await window.initSupabase();
            console.log('✅ Supabase inicializado no dashboard do cliente.');
        }        // Carregar dados do usuário e preencher o card do perfil
        await loadUserProfileAndInitialData();
        await preencherCardPerfilCliente();
        console.log('✅ Dados do usuário carregados e perfil atualizado');

        // Event Listeners
        const btnLogout = document.getElementById('logout-button');
        if (btnLogout) {
            btnLogout.addEventListener('click', window.handlePageLogout);
        }

        // Event listeners do modal
        if (novoPedidoModalCloseBtn) {
            novoPedidoModalCloseBtn.addEventListener('click', () => {
                if (novoPedidoModal) novoPedidoModal.style.display = 'none';
            });
        }

        if (novoPedidoModalCancelarBtn) {
            novoPedidoModalCancelarBtn.addEventListener('click', () => {
                if (novoPedidoModal) novoPedidoModal.style.display = 'none';
            });
        }

        if (novoPedidoModal) {
            novoPedidoModal.addEventListener('click', (event) => {
                if (event.target === novoPedidoModal) {
                    novoPedidoModal.style.display = 'none';
                }
            });
        }

        // Formulário de novo pedido
        if (novoPedidoForm) {
            novoPedidoForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (novoPedidoModalMessageEl) {
                    novoPedidoModalMessageEl.textContent = '';
                    novoPedidoModalMessageEl.className = '';
                }

                if (!currentUserId) {
                    showFeedbackModal('Erro de Sessão', 'Sua sessão parece ter expirado. Por favor, faça login novamente.', 'error');
                    return;
                }

                const submitButton = document.getElementById('novo-pedido-submit-btn');
                const originalButtonText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                submitButton.disabled = true;

                const tema = pedidoTemaInput.value.trim();
                const tamanho_bolo_cm = pedidoTamanhoBoloSelect.value ? parseInt(pedidoTamanhoBoloSelect.value) : null;
                const data_evento = pedidoDataEventoInput.value;
                const tipo_entrega = pedidoTipoEntregaSelect.value;
                const descricao_pedido = pedidoDescricaoTextarea.value.trim();
                const observacao_pedido = pedidoObservacaoTextarea.value.trim();

                if (!tema || !data_evento || !tipo_entrega || !descricao_pedido) {
                    showFeedbackModal('Campos Obrigatórios', 'Por favor, preencha: Tema, Data do Evento, Tipo de Entrega e Descrição.', 'error');
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                    return;
                }

                if (pedidoTamanhoBoloSelect.value && tamanho_bolo_cm && (tamanho_bolo_cm < 10 || tamanho_bolo_cm > 30)) {
                    showFeedbackModal('Tamanho Inválido', 'O tamanho do bolo selecionado é inválido (deve ser entre 10cm e 30cm).', 'error');
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                    return;
                }

                const pedidoData = {
                    id_cliente: currentUserId,
                    tema,
                    tamanho_bolo_cm,
                    data_evento,
                    tipo_entrega,
                    descricao_pedido,
                    observacao_pedido
                };

                if (tipo_entrega === 'ENTREGAR') {
                    const dadosParaEndereco = currentProfileData;
                    const enderecoCompleto = (dadosParaEndereco && [
                        dadosParaEndereco.rua,
                        dadosParaEndereco.numero_casa,
                        dadosParaEndereco.complemento,
                        dadosParaEndereco.bairro,
                        dadosParaEndereco.cidade,
                        dadosParaEndereco.estado,
                        dadosParaEndereco.cep
                    ].filter(Boolean).join(', ').trim()) || null;
                    
                    if (!enderecoCompleto) {
                        showFeedbackModal('Endereço Necessário', 'Para entrega, seu endereço completo precisa estar cadastrado no seu perfil. Por favor, atualize-o.', 'error');
                        submitButton.innerHTML = originalButtonText;
                        submitButton.disabled = false;
                        return;
                    }
                    pedidoData.endereco_entrega_completo = enderecoCompleto;
                }

                try {
                    let response;
                    const isEditMode = novoPedidoForm.dataset.modo === 'editar';
                    const pedidoId = novoPedidoForm.dataset.pedidoId;

                    if (isEditMode && pedidoId) {
                        // Verifica se o pedido ainda está pendente antes de atualizar
                        const { data: pedidoAtual, error: checkError } = await window.supabaseClient
                            .from('pedidos')
                            .select('status_pedido')
                            .eq('id', pedidoId)
                            .single();

                        if (checkError) throw checkError;

                        if (pedidoAtual.status_pedido !== 'Pendente') {
                            throw new Error('Este pedido não pode mais ser editado pois seu status foi alterado.');
                        }

                        // Atualiza o pedido existente
                        response = await window.supabaseClient
                            .from('pedidos')
                            .update(pedidoData)
                            .eq('id', pedidoId)
                            .select()
                            .single();
                    } else {
                        // Cria um novo pedido
                        pedidoData.status_pedido = 'Pendente';
                        response = await window.supabaseClient
                            .from('pedidos')
                            .insert([pedidoData])
                            .select()
                            .single();
                    }

                    if (response.error) {
                        console.error('Erro Supabase ao gravar pedido:', response.error, response);
                        showFeedbackModal('Erro ao gravar pedido', 'Detalhe: ' + (response.error.message || 'Erro desconhecido.'), 'error');
                        throw response.error;
                    }

                    const actionText = isEditMode ? 'atualizado' : 'enviado';
                    showFeedbackModal(
                        isEditMode ? 'Pedido Atualizado!' : 'Pedido Enviado!',
                        `Seu pedido para o tema "${response.data.tema}" foi ${actionText} com sucesso e está pendente de análise.`,
                        'success'
                    );

                    // Limpa o modo de edição
                    novoPedidoForm.dataset.modo = '';
                    novoPedidoForm.dataset.pedidoId = '';

                    // Fecha o modal e recarrega a lista
                    if (novoPedidoModal) novoPedidoModal.style.display = 'none';
                    if (typeof window.carregarMeusPedidos === 'function') window.carregarMeusPedidos();

                } catch (err) {
                    console.error('Erro ao processar pedido:', err);
                    showFeedbackModal('Erro no Pedido', 'Não foi possível processar seu pedido: ' + err.message, 'error');
                } finally {
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                }
            });
        }

        // Event Listeners do Modal de Edição
        const editarPedidoCloseBtn = document.getElementById('editar-pedido-modal-close-btn');
        const editarPedidoCancelarBtn = document.getElementById('editar-pedido-cancelar-btn');
        
        if (editarPedidoCloseBtn) {
            editarPedidoCloseBtn.addEventListener('click', fecharModalEdicao);
        }
        
        if (editarPedidoCancelarBtn) {
            editarPedidoCancelarBtn.addEventListener('click', fecharModalEdicao);
        }
        
        if (editarPedidoModal) {
            editarPedidoModal.addEventListener('click', (event) => {
                if (event.target === editarPedidoModal) fecharModalEdicao();
            });
        }

        // Atualizar tipo de entrega no modal de edição
        if (editarPedidoTipoEntregaSelect) {
            editarPedidoTipoEntregaSelect.addEventListener('change', function() {
                if (editarPedidoEnderecoGroup) {
                    editarPedidoEnderecoGroup.style.display = this.value === 'ENTREGAR' ? 'block' : 'none';
                    if (this.value === 'ENTREGAR' && currentProfileData) {
                        const endereco = [
                            currentProfileData.rua,
                            currentProfileData.numero_casa,
                            currentProfileData.complemento,
                            currentProfileData.bairro,
                            currentProfileData.cidade,
                            currentProfileData.estado,
                            currentProfileData.cep
                        ].filter(Boolean).join(', ').trim();
                        
                        if (editarPedidoEnderecoPreview) {
                            editarPedidoEnderecoPreview.textContent = endereco || 'Nenhum endereço cadastrado';
                        }
                    }
                }
            });
        }

        // Handler do formulário de edição
        if (editarPedidoForm) {
            editarPedidoForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                
                const submitBtn = document.getElementById('editar-pedido-submit-btn');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                submitBtn.disabled = true;

                try {
                    const pedidoId = editarPedidoForm.dataset.pedidoId;
                    if (!pedidoId) throw new Error('ID do pedido não encontrado');
                    const pedidoIdNum = Number(pedidoId);

                    // Verifica se o pedido ainda está pendente
                    const { data: pedidoAtual, error: checkError } = await window.supabaseClient
                        .from('pedidos')
                        .select('status_pedido')
                        .eq('id', pedidoId)
                        .single();

                    if (checkError) throw checkError;
                    if (pedidoAtual.status_pedido !== 'Pendente') {
                        throw new Error('Este pedido não pode mais ser editado pois seu status foi alterado.');
                    }

                    // Prepara os dados atualizados
                    const pedidoAtualizado = {
                        tema: editarPedidoTemaInput.value.trim(),
                        tamanho_bolo_cm: editarPedidoTamanhoSelect.value ? parseInt(editarPedidoTamanhoSelect.value) : null,
                        data_evento: editarPedidoDataInput.value,
                        tipo_entrega: editarPedidoTipoEntregaSelect.value,
                        descricao_pedido: editarPedidoDescricaoTextarea.value.trim(),
                        observacao_pedido: editarPedidoObservacaoTextarea.value.trim()
                    };

                    // Adiciona endereço se for entrega
                    if (pedidoAtualizado.tipo_entrega === 'ENTREGAR') {
                        const endereco = [
                            currentProfileData.rua,
                            currentProfileData.numero_casa,
                            currentProfileData.complemento,
                            currentProfileData.bairro,
                            currentProfileData.cidade,
                            currentProfileData.estado,
                            currentProfileData.cep
                        ].filter(Boolean).join(', ').trim();

                        if (!endereco) {
                            throw new Error('Para entrega, seu endereço completo precisa estar cadastrado no seu perfil.');
                        }
                        pedidoAtualizado.endereco_entrega_completo = endereco;
                    }

                    console.log('Tentando atualizar pedido:', { pedidoId, pedidoIdNum, pedidoAtualizado });
                    // Atualiza o pedido
                    const { data: updateData, error: updateError, status, statusText } = await window.supabaseClient
                        .from('pedidos')
                        .update(pedidoAtualizado)
                        .eq('id', pedidoIdNum);

                    console.log('Resposta update pedido:', { updateData, updateError, status, statusText });                    if (updateError) throw updateError;
                    if (status !== 204) {
                        showFeedbackModal('Atenção', 'O pedido não foi atualizado. Verifique se o pedido existe e está pendente.', 'warning');
                        return;
                    }

                    fecharModalEdicao();
                    
                    // Recarrega a lista de pedidos
                    await window.carregarMeusPedidos();
                    
                    // Mostra mensagem de sucesso após atualizar a lista
                    showFeedbackModal('Pedido atualizado com sucesso!');

                } catch (err) {
                    console.error('Erro ao atualizar pedido:', err);
                    showFeedbackModal('Erro', 'Não foi possível atualizar o pedido: ' + err.message, 'error');
                } finally {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
            });
        }

        // Event listener para o botão de novo pedido
        const novoPedidoBtn = document.getElementById('novo-pedido-btn');
        if (novoPedidoBtn) {
            novoPedidoBtn.addEventListener('click', async () => {
                try {
                    await window.abrirNovoPedidoModal();
                } catch (error) {
                    console.error('Erro ao abrir modal de novo pedido:', error);
                    showToast('Erro ao abrir formulário de novo pedido', 'error');
                }
            });
        }

        // Event listener para o botão de atualizar perfil
        const btnAtualizarPerfil = document.getElementById('btn-atualizar-perfil-dashboard');
        if (btnAtualizarPerfil) {
            btnAtualizarPerfil.addEventListener('click', () => {
                window.location.href = '/pages/public/edit-profile.html';
            });
        }

        console.log('✅ Página do cliente inicializada com sucesso');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showFeedbackModal('Erro', 'Ocorreu um erro ao inicializar a página.', 'error');
    }
});

// Funções de gerenciamento de pedidos
window.carregarMeusPedidos = async function() {
    // Garante que o elemento da lista está definido
    if (!listaPedidosElement) {
        listaPedidosElement = document.getElementById('lista-pedidos');
        if (!listaPedidosElement) {
            console.error("carregarMeusPedidos: Elemento lista-pedidos não encontrado no DOM");
            return;
        }
    }
    
    // Verifica se o usuário está logado
    if (!currentUserId) {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (user) {
                currentUserId = user.id;
            } else {
                listaPedidosElement.innerHTML = '<li>Não foi possível identificar o usuário para carregar os pedidos.</li>';
                return;
            }
        } catch (error) {
            console.error("Erro ao obter usuário:", error);
            listaPedidosElement.innerHTML = '<li>Não foi possível identificar o usuário para carregar os pedidos.</li>';
            return;
        }
    }

    listaPedidosElement.innerHTML = '<li class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando seus pedidos...</li>';

    try {
        const { data: pedidos, error } = await window.supabaseClient
            .from('pedidos')
            .select('id, data_pedido, tema, descricao_pedido, status_pedido, valor_pedido')
            .eq('id_cliente', currentUserId)
            .order('data_pedido', { ascending: false });

        if (error) throw error;

        listaPedidosElement.innerHTML = '';        if (pedidos && pedidos.length > 0) {
            pedidos.forEach(pedido => {
            const item = document.createElement('li');
                item.classList.add('pedido-item-card-v3');
                const dataPedidoFormatada = new Date(pedido.data_pedido).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                });                // Normaliza o status para a classe CSS
                const statusClass = (pedido.status_pedido || 'pendente').toLowerCase().replace('_', '-');
                console.log('Status original:', pedido.status_pedido, 'Status class:', statusClass);
                
                const statusMap = {
                    'pendente': 'Pendente',
                    'aprovado': 'Aprovado',
                    'em-producao': 'Em Produção',
                    'finalizado': 'Finalizado',
                    'entregue': 'Entregue',
                    'cancelado': 'Cancelado'
                };
                
                const statusText = statusMap[statusClass] || 'Pendente';
                const statusHtml = `<span class="status-pedido status-${statusClass}">${statusText}</span>`;
                console.log('HTML gerado:', statusHtml);
                  item.innerHTML = `
                    <div class="pedido-v3-id-data">
                        <span class="pedido-v3-id">Pedido #${pedido.id}</span>
                        <span class="pedido-v3-data">${dataPedidoFormatada}</span>
                    </div>
                    <div class="pedido-v3-info">
                        <p><span class="info-label">Tema:</span> <span class="info-valor">${pedido.tema || 'Não especificado'}</span></p>
                        <p><span class="info-label">Status:</span> ${statusHtml}</p>
                        <p><span class="info-label">Valor:</span> <span class="info-valor valor-pedido">${pedido.valor_pedido ? 'R$ ' + parseFloat(pedido.valor_pedido).toFixed(2).replace('.', ',') : '<em>Aguardando</em>'}</span></p>
                    </div>
                    <div class="pedido-v3-acao">
                        <button class="btn btn-ver-detalhes-v3" data-pedido-id="${pedido.id}">
                            <i class="fas fa-eye"></i> Detalhes do Pedido
                        </button>                        ${pedido.status_pedido === 'Pendente' ? `
                        <button class="btn btn-editar-pedido" data-pedido-id="${pedido.id}">
                            <i class="fas fa-edit"></i> Editar Pedido
                        </button>
                        <button class="btn btn-comunicar" data-pedido-id="${pedido.id}">
                            <i class="fab fa-whatsapp"></i> Comunicar Lorrainy
                        </button>
                        ` : ''}
                    </div>
                `;                const btnDetalhes = item.querySelector('.btn-ver-detalhes-v3');
                const btnEditar = item.querySelector('.btn-editar-pedido');
                const btnComunicar = item.querySelector('.btn-comunicar');
                
                if (btnComunicar) {
                    btnComunicar.addEventListener('click', async (e) => {
                        const pedidoId = e.currentTarget.dataset.pedidoId;
                        try {
                            const { data: pedidoDetalhado, error } = await window.supabaseClient
                                .from('pedidos')
                                .select('*')
                                .eq('id', pedidoId)
                                .single();
                            if (error) throw error;
                            compartilharPedidoWhatsApp(pedidoDetalhado);
                        } catch (err) {
                            showToast('Erro ao buscar detalhes do pedido para compartilhar', 'error');
                        }
                    });
                }

                if (btnDetalhes) {
                    btnDetalhes.addEventListener('click', async (e) => {
                        const pedidoId = e.currentTarget.dataset.pedidoId;
                        try {
                            const { data: pedidoDetalhado, error } = await window.supabaseClient
                                .from('pedidos')
                                .select('*')
                                .eq('id', pedidoId)
                                .single();
                            if (error) throw error;
                            if (typeof window.exibirDetalhesPedido === 'function') {
                                window.exibirDetalhesPedido(pedidoDetalhado);
                            } else {
                                alert('Detalhes do pedido: ' + JSON.stringify(pedidoDetalhado, null, 2));
                            }
                        } catch (err) {
                            showFeedbackModal('Erro', 'Não foi possível carregar os detalhes do pedido.', 'error');
                        }
                    });
                }                if (btnEditar) {
                    btnEditar.addEventListener('click', (e) => {
                        const pedidoId = e.currentTarget.dataset.pedidoId;
                        abrirModalEdicao(pedidoId);
                    });
                }                listaPedidosElement.appendChild(item);
            });
        } else {
            listaPedidosElement.innerHTML = '<li class="no-orders"><i class="fas fa-info-circle"></i> Você ainda não tem nenhum pedido.</li>';
        }
    } catch (err) {
        console.error("Erro ao carregar e exibir pedidos:", err);
        if (listaPedidosElement) listaPedidosElement.innerHTML = '<li>Ocorreu um erro ao carregar seus pedidos.</li>';
        showFeedbackModal('Erro nos Pedidos', 'Não foi possível carregar seus pedidos: ' + err.message, 'error');
    }
};

// Função para fechar o modal de edição
function fecharModalEdicao() {
    if (editarPedidoModal) {
        editarPedidoModal.style.display = 'none';
        if (editarPedidoForm) editarPedidoForm.reset();
    }
}

// Função para abrir o modal de edição com os dados do pedido
async function abrirModalEdicao(pedidoId) {
    try {
        const { data: pedido, error } = await window.supabaseClient
            .from('pedidos')
            .select('*')
            .eq('id', pedidoId)
            .single();

        if (error) throw error;

        // Verifica se o pedido ainda está pendente
        if (pedido.status_pedido !== 'Pendente') {
            showFeedbackModal('Não Permitido', 'Apenas pedidos com status Pendente podem ser editados.', 'error');
            return;
        }

        // Preenche os campos do formulário
        if (editarPedidoTemaInput) editarPedidoTemaInput.value = pedido.tema || '';
        if (editarPedidoTamanhoSelect) {
            popularTamanhosBoloEdicao();
            editarPedidoTamanhoSelect.value = pedido.tamanho_bolo_cm || '';
        }
        if (editarPedidoDataInput) editarPedidoDataInput.value = pedido.data_evento || '';
        if (editarPedidoTipoEntregaSelect) {
            editarPedidoTipoEntregaSelect.value = pedido.tipo_entrega || 'RETIRAR';
            if (editarPedidoEnderecoGroup) {
                editarPedidoEnderecoGroup.style.display = pedido.tipo_entrega === 'ENTREGAR' ? 'block' : 'none';
            }
            if (editarPedidoEnderecoPreview && pedido.tipo_entrega === 'ENTREGAR') {
                editarPedidoEnderecoPreview.textContent = pedido.endereco_entrega_completo || 'Endereço não disponível';
            }
        }
        if (editarPedidoDescricaoTextarea) editarPedidoDescricaoTextarea.value = pedido.descricao_pedido || '';
        if (editarPedidoObservacaoTextarea) editarPedidoObservacaoTextarea.value = pedido.observacao_pedido || '';

        // Armazena o ID do pedido no formulário
        if (editarPedidoForm) editarPedidoForm.dataset.pedidoId = pedidoId;

        // Abre o modal
        if (editarPedidoModal) editarPedidoModal.style.display = 'flex';
    } catch (err) {
        console.error('Erro ao carregar pedido para edição:', err);
        showFeedbackModal('Erro', 'Não foi possível carregar o pedido para edição.', 'error');
    }
}

// Função para preencher o card do perfil
async function preencherCardPerfilCliente() {
    console.log('🔄 Iniciando preencherCardPerfilCliente...');
    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error('❌ Erro ao obter usuário:', authError);
            return;
        }
        console.log('✅ Usuário autenticado:', user.id);        const nomeEl = document.getElementById('nome-profile-cliente');
        const fotoEl = document.getElementById('profile-photo-preview');
        const whatsappEl = document.getElementById('client-profile-whatsapp');
        const emailEl = document.getElementById('client-profile-email');

        if (!nomeEl || !fotoEl || !whatsappEl || !emailEl) {
            console.error('❌ Elementos do DOM não encontrados:', { 
                nomeEl: !!nomeEl, 
                fotoEl: !!fotoEl,
                whatsappEl: !!whatsappEl,
                emailEl: !!emailEl 
            });
            return;
        }

        const { data: profile, error: profileError } = await window.supabaseClient
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .single();

        console.log('📝 Dados do perfil:', profile);

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('❌ Erro ao buscar perfil:', profileError);
            if (nomeEl) nomeEl.textContent = user.email || 'Cliente';
            return;
        }

        if (nomeEl) {            const nomeDisplay = profile?.nome || user.email || 'Cliente';
            console.log('👤 Atualizando nome para:', nomeDisplay);
            nomeEl.textContent = nomeDisplay;
        }        // Função auxiliar para criar um contato com ícone
        function updateContactInfo(container, value, iconClass) {
            if (!container) return;
            
            // Limpa o conteúdo atual
            container.innerHTML = '';
            
            // Cria e adiciona o ícone
            const icon = document.createElement('i');
            icon.className = iconClass;
            icon.style.marginRight = '8px';
            icon.style.color = 'var(--primary-color)';
            container.appendChild(icon);
            
            // Adiciona um espaço depois do ícone
            container.appendChild(document.createTextNode(' '));
            
            // Cria e adiciona o texto
            const textSpan = document.createElement('span');
            textSpan.className = 'contact-info';
            textSpan.textContent = value;
            container.appendChild(textSpan);
            
            // Garante que os estilos estão corretos
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '8px';
            container.style.marginBottom = '4px';
        }

        // Atualiza WhatsApp
        if (whatsappEl) {
            const whatsappDisplay = profile?.whatsapp || 'Não cadastrado';
            updateContactInfo(whatsappEl, whatsappDisplay, 'fa-brands fa-whatsapp');
        }

        // Atualiza Email
        if (emailEl) {
            const emailDisplay = user.email || 'Não cadastrado';
            updateContactInfo(emailEl, emailDisplay, 'fa-solid fa-envelope');
        }

        if (fotoEl) {
            if (profile?.foto_perfil_url) {
                console.log('🖼️ Buscando URL assinada para foto:', profile.foto_perfil_url);
                const { data: urlData, error: urlError } = await window.supabaseClient
                    .storage
                    .from('fotos-perfil')
                    .createSignedUrl(profile.foto_perfil_url, 3600);

                if (!urlError && urlData?.signedUrl) {
                    console.log('✅ URL da foto gerada com sucesso');
                    fotoEl.src = urlData.signedUrl;
                } else {
                    console.warn('⚠️ Erro ao gerar URL da foto:', urlError);                    fotoEl.src = '../../img/placeholder_imagem_default.png';
                }
            } else {
                console.log('ℹ️ Usuário sem foto de perfil, usando placeholder');
                fotoEl.src = '../../img/placeholder_imagem_default.png';
            }
        }
        console.log('✅ Card do perfil atualizado com sucesso');
    } catch (err) {
        console.error('❌ Erro ao preencher card do perfil:', err);
        const nomeEl = document.getElementById('nome-profile-cliente');
        const fotoEl = document.getElementById('profile-photo-preview');
        
        if (nomeEl) nomeEl.textContent = 'Cliente';
        if (fotoEl) fotoEl.src = '../../img/placeholder_imagem_default.png';
    }
}

// Função para formatar o texto do pedido para WhatsApp
function formatarPedidoParaWhatsApp(pedido) {
    let texto = `🎂 *PEDIDO #${pedido.id}*\n\n`;
    texto += `📋 *Tema:* ${pedido.tema}\n`;
    texto += `📏 *Tamanho:* ${pedido.tamanho_bolo_cm}cm\n`;
    texto += `📅 *Data do Evento:* ${new Date(pedido.data_evento).toLocaleDateString()}\n`;
    texto += `📝 *Descrição:* ${pedido.descricao_pedido}\n`;
    
    if (pedido.observacao_pedido) {
        texto += `📌 *Observações:* ${pedido.observacao_pedido}\n`;
    }
    
    texto += `\n🚚 *Entrega:* ${pedido.tipo_entrega === 'ENTREGAR' ? 'Delivery' : 'Retirar no Local'}\n`;
    if (pedido.tipo_entrega === 'ENTREGAR' && pedido.endereco_entrega_completo) {
        texto += `📍 *Endereço:* ${pedido.endereco_entrega_completo}\n`;
    }
    
    texto += `\n📊 *Status:* ${pedido.status_pedido}`;
    
    return texto;
}

// Função para compartilhar pedido via WhatsApp
function compartilharPedidoWhatsApp(pedido) {
    const texto = formatarPedidoParaWhatsApp(pedido);
    const numeroWhatsApp = '27997366910';
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;
    window.open(urlWhatsApp, '_blank');
}