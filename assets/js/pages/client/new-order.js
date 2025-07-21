import { showToast } from '../../components/toast.js';

let currentUserId = null;
let currentProfileData = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!window.supabaseClient) {
            await window.initSupabase();
        }

        // Verificar autenticação
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) {
            showToast('Sessão expirada. Faça login novamente.', 'error');
            window.location.href = '/pages/public/login.html';
            return;
        }

        currentUserId = user.id;

        // Carregar dados do perfil
        await loadUserProfile();

        // Inicializar elementos do formulário
        initializeFormElements();

        // Configurar event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Erro ao inicializar página:', error);
        showToast('Erro ao carregar a página', 'error');
    }
});

async function loadUserProfile() {
    try {
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('usuarios')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (profileError) throw profileError;

        currentProfileData = profile;
        updateAddressPreview();

    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        showToast('Erro ao carregar seus dados', 'error');
    }
}

function initializeFormElements() {
    const tamanhoSelect = document.getElementById('tamanho_bolo');
    const dataEventoInput = document.getElementById('data_evento');

    // Populate tamanhos de bolo
    const tamanhos = [
        { value: '15', label: '15 cm - 15 a 20 fatias' },
        { value: '20', label: '20 cm - 25 a 30 fatias' },
        { value: '25', label: '25 cm - 35 a 40 fatias' },
        { value: '30', label: '30 cm - 45 a 50 fatias' }
    ];

    tamanhos.forEach(({ value, label }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        tamanhoSelect.appendChild(option);
    });

    // Configure data mínima (amanhã)
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    dataEventoInput.setAttribute('min', amanha.toISOString().split('T')[0]);
    dataEventoInput.value = amanha.toISOString().split('T')[0];
}

function setupEventListeners() {
    const form = document.getElementById('new-order-form');
    const tipoEntregaSelect = document.getElementById('tipo_entrega');
    const enderecoGroup = document.getElementById('endereco_entrega_group');

    // Mostrar/ocultar seção de endereço baseado no tipo de entrega
    tipoEntregaSelect.addEventListener('change', (e) => {
        enderecoGroup.style.display = e.target.value === 'entregar' ? 'block' : 'none';
        if (e.target.value === 'entregar') {
            updateAddressPreview();
        }
    });

    // Submit do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            // Preparar dados do pedido
            const pedidoData = {
                id_cliente: currentUserId,
                tema: document.getElementById('tema').value.trim(),
                tamanho_bolo_cm: parseInt(document.getElementById('tamanho_bolo').value),
                data_evento: document.getElementById('data_evento').value,
                tipo_entrega: document.getElementById('tipo_entrega').value,
                descricao_pedido: document.getElementById('descricao_pedido').value.trim(),
                observacao_pedido: document.getElementById('observacao_pedido').value.trim(),
                status_pedido: 'Pendente'
            };

            // Adicionar endereço se for entrega
            if (pedidoData.tipo_entrega === 'ENTREGAR') {
                if (!currentProfileData || !isValidAddress(currentProfileData)) {
                    throw new Error('Para entrega, seu endereço completo precisa estar cadastrado no seu perfil.');
                }
                pedidoData.endereco_entrega_completo = formatAddress(currentProfileData);
            }

            // Enviar pedido
            const { error: insertError } = await window.supabaseClient
                .from('pedidos')
                .insert([pedidoData]);

            if (insertError) throw insertError;

            showToast('Pedido enviado com sucesso!', 'success');
            
            // Redirecionar após 2 segundos
            setTimeout(() => {
                window.location.href = '/pages/client/dashboard-client.html';
            }, 2000);

        } catch (error) {
            console.error('Erro ao processar pedido:', error);
            showToast(error.message || 'Erro ao enviar pedido', 'error');
        } finally {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

function updateAddressPreview() {
    const previewEl = document.getElementById('endereco_preview');
    if (!previewEl) return;

    if (!currentProfileData || !isValidAddress(currentProfileData)) {
        previewEl.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Endereço incompleto. Por favor, atualize seu perfil.
            </div>`;
        return;
    }

    previewEl.innerHTML = `
        <div class="address-card">
            <p><strong>Endereço de Entrega:</strong></p>
            <p>${formatAddress(currentProfileData)}</p>
        </div>`;
}

function isValidAddress(profile) {
    return Boolean(
        profile.rua &&
        profile.numero_casa &&
        profile.bairro &&
        profile.cidade &&
        profile.estado &&
        profile.cep
    );
}

function formatAddress(profile) {
    const parts = [
        profile.rua,
        profile.numero_casa,
        profile.complemento,
        profile.bairro,
        profile.cidade,
        profile.estado,
        profile.cep
    ];
    return parts.filter(Boolean).join(', ');
}
