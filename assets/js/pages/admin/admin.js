// js/admin.js
import '../../modules/supabase.js';
import { showToast } from '../../components/toast.js';
import { showModal, hideModal } from '../../components/modal.js';
import loader from '../../components/loader.js';
import { formatCurrency, formatDate } from '../../modules/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!window.supabaseClient) {
            try {
                await window.initSupabase();
                console.log('✅ Supabase inicializado com sucesso');
            } catch (error) {
                console.error('❌ Erro ao inicializar Supabase:', error);
                toast.show('Erro ao conectar com o servidor. Por favor, recarregue a página.', 'error');
                return;
            }
        }
        const planoOk = await verificarRegrasPlanoAdmin();
        if (!planoOk) {
            return;
        }
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error('Erro ao buscar usuário ou usuário não logado:', authError);
            alert('Você precisa estar logado para acessar esta página.');
            window.location.href = '/index.html';
            return;
        }
        const { data: userData, error: profileError } = await window.supabaseClient
            .from('usuarios')
            .select('tipo, nome, foto_perfil_url')
            .eq('id', user.id)
            .single();
        if (profileError || !userData) {
            console.error('Erro ao buscar perfil do usuário ou perfil não encontrado:', profileError);
            alert('Erro ao buscar informações do seu perfil. Redirecionando para o login.');
            window.location.href = '/index.html';
            return;
        }
        if (userData.tipo !== 'admin') {
            alert('Acesso não autorizado. Esta página é apenas para administradores.');
            window.location.href = '/index.html'; // Ou uma página de "não autorizado"
            return;
        }
        const nomeEl = document.getElementById('admin-profile-nome');
        if (nomeEl) nomeEl.textContent = userData.nome || user.email || 'Administrador';
        const fotoEl = document.getElementById('admin-profile-photo');
        if (fotoEl) {
            if (userData.foto_perfil_url) {
                try {
                    const { data: signedUrlData, error: urlError } = await window.supabaseClient
                        .storage
                        .from('fotos-perfil')
                        .createSignedUrl(userData.foto_perfil_url, 3600);
                    if (!urlError && signedUrlData?.signedUrl) {
                        fotoEl.src = signedUrlData.signedUrl;
                    } else {
                        fotoEl.src = 'img/placeholder_imagem_default.png';
                    }
                } catch (e) {
                    fotoEl.src = 'img/placeholder_imagem_default.png';
                }
            } else {
                fotoEl.src = 'img/placeholder_imagem_default.png';
            }
        }
        const inputFoto = document.getElementById('admin-profile-photo-input');
        if (fotoEl && inputFoto) {
            fotoEl.addEventListener('click', () => inputFoto.click());
            inputFoto.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (!window.supabaseClient) await window.initSupabase();
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) return alert('Usuário não autenticado!');
                const fileExt = file.name.split('.').pop();
                const fileName = `profile-${Date.now()}.${fileExt}`;
                const filePathInBucket = `${user.id}/${fileName}`;
                const { data: userData } = await window.supabaseClient
                    .from('usuarios')
                    .select('foto_perfil_url')
                    .eq('id', user.id)
                    .single();
                if (userData && userData.foto_perfil_url && userData.foto_perfil_url !== filePathInBucket) {
                    await window.supabaseClient.storage
                        .from('fotos-perfil')
                        .remove([userData.foto_perfil_url]);
                }
                const { error: uploadError } = await window.supabaseClient.storage
                    .from('fotos-perfil')
                    .upload(filePathInBucket, file, { cacheControl: '3600', upsert: true });
                if (uploadError) {
                    alert('Erro ao fazer upload da foto: ' + uploadError.message);
                    return;
                }
                const { error: updateError } = await window.supabaseClient
                    .from('usuarios')
                    .update({ foto_perfil_url: filePathInBucket })
                    .eq('id', user.id);
                if (updateError) {
                    alert('Foto enviada, mas erro ao atualizar perfil: ' + updateError.message);
                    return;
                }
                const { data: signedUrlData, error: urlError } = await window.supabaseClient
                    .storage
                    .from('fotos-perfil')
                    .createSignedUrl(filePathInBucket, 3600);
                if (!urlError && signedUrlData?.signedUrl) {
                    fotoEl.src = signedUrlData.signedUrl;
                } else {
                    fotoEl.src = 'img/placeholder_imagem_default.png';
                }
                alert('Foto de perfil atualizada com sucesso!');
            });
        }
        carregarUsuariosAdmin();
        preencherDashboardAdmin();
        carregarPedidosAdmin();
        preencherPlanoHeaderAdmin();
    } catch (error) {
        console.error("Erro no carregamento do dashboard admin:", error);
        alert("Ocorreu um erro ao carregar o painel: " + error.message);
    }
});

let filtroPedidosStatus = '';
let filtroPedidosBusca = '';
let filtroPedidosMes = '';
let filtroClientesBusca = '';

let paginaAtual = 1;
const itensPorPagina = 3;

function pedidoCorrespondeAoFiltro(pedido, statusFiltro) {
    if (!statusFiltro) return true;
    const cardSelecionado = document.querySelector('.admin-card.clickable.selected[data-filter]');
    if (cardSelecionado && cardSelecionado.dataset.filter) {
        const statusPermitidos = cardSelecionado.dataset.filter.split(',');
        return statusPermitidos.includes(pedido.status_pedido);
    }
    return pedido.status_pedido === statusFiltro;
}

async function carregarPedidosAdmin() {
    const listaPedidosElement = document.getElementById('lista-pedidos-admin');
    try {
        if (!window.supabaseClient) await window.initSupabase();
        let { data: pedidosData, error } = await window.supabaseClient
            .from('pedidos')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw error;
        const { data: clientesData, error: clientesError } = await window.supabaseClient
            .from('usuarios')
            .select('*');
        if (clientesError) throw clientesError;
        const clientesMap = {};
        if (clientesData) {
            clientesData.forEach(cliente => {
                clientesMap[cliente.id] = cliente;
            });
        }
        listaPedidosElement.innerHTML = '';
        if (!pedidosData || pedidosData.length === 0) {
            listaPedidosElement.innerHTML = '<li>Nenhum pedido encontrado.</li>';
            return;
        }
        let pedidosFiltrados = pedidosData;
        if (filtroPedidosBusca) {
            const busca = filtroPedidosBusca.toLowerCase();
            pedidosFiltrados = pedidosFiltrados.filter(pedido => {
                const cliente = clientesMap[pedido.id_cliente];
                return (cliente && cliente.nome && cliente.nome.toLowerCase().includes(busca)) ||
                    (pedido.tema && pedido.tema.toLowerCase().includes(busca));
            });
        }
        if (filtroPedidosStatus) {
            pedidosFiltrados = pedidosFiltrados.filter(pedido => pedido.status_pedido === filtroPedidosStatus);
        }
        if (filtroPedidosMes) {
            const [ano, mes] = filtroPedidosMes.split('-');
            pedidosFiltrados = pedidosFiltrados.filter(pedido => {
                if (!pedido.data_evento) return false;
                const dataPedido = new Date(pedido.data_evento);
                return dataPedido.getFullYear() === parseInt(ano) &&
                    dataPedido.getMonth() + 1 === parseInt(mes);
            });
        }
        const totalPedidos = pedidosFiltrados.length;
        const totalPaginas = Math.ceil(totalPedidos / itensPorPagina);
        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        pedidosFiltrados = pedidosFiltrados.slice(inicio, fim);
        listaPedidosElement.innerHTML = '';
        pedidosFiltrados.forEach(pedido => {
            const cliente = clientesMap[pedido.id_cliente] || {};
            const li = document.createElement('li');            // Normaliza o status para a classe CSS
            const statusClass = (pedido.status_pedido || 'pendente')
                .toLowerCase()
                .replace(/[ \s_]/g, '-'); // Substitui espaço e underline por hífen
            const statusMap = {
                'pendente': 'Pendente',
                'aprovado': 'Aprovado',
                'em-producao': 'Em Produção',
                'em produção': 'Em Produção', // aceita com espaço também
                'finalizado': 'Finalizado',
                'entregue': 'Entregue',
                'cancelado': 'Cancelado'
            };
            const statusText = statusMap[statusClass] || 'Pendente';

            li.innerHTML = `
                <div class="admin-pedido-info">
                    <div class="pedido-header">
                        <div class="pedido-identificacao">                            <div class="pedido-id-nome">
                                <span class="pedido-numero">#${pedido.id} <span class="separador">|</span> ${cliente.nome || 'N/A'}</span>
                            </div>
                            <span class="status-pedido status-${statusClass}">
                                <i class="fas fa-circle"></i>
                                ${statusText}
                            </span>
                        </div>
                    </div>

                    <div class="pedido-corpo">
                        <div class="pedido-detalhes">
                            <div class="detalhe-grupo">
                                <span class="detalhe-item">
                                    <i class="fas fa-birthday-cake"></i>
                                    <span class="detalhe-label">Tema:</span>
                                    <span class="detalhe-valor">${pedido.tema || 'N/A'}</span>
                                </span>
                                <span class="detalhe-item">
                                    <i class="fas fa-ruler-horizontal"></i>
                                    <span class="detalhe-label">Tamanho:</span>
                                    <span class="detalhe-valor">${pedido.tamanho_bolo_cm || 'N/A'} cm</span>
                                </span>
                            </div>

                            <div class="detalhe-grupo">
                                <span class="detalhe-item">
                                    <i class="fas fa-calendar-alt"></i>
                                    <span class="detalhe-label">Data do Evento:</span>
                                    <span class="detalhe-valor">${pedido.data_evento ? new Date(pedido.data_evento).toLocaleDateString('pt-BR') : 'N/A'}</span>
                                </span>
                                <span class="detalhe-item">
                                    <i class="fas fa-money-bill-wave"></i>
                                    <span class="detalhe-label">Valor:</span>
                                    <span class="detalhe-valor valor-destaque">R$ ${parseFloat(pedido.valor_pedido || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                                </span>
                            </div>

                            <div class="detalhe-grupo">
                                <span class="detalhe-item">
                                    <i class="fas fa-truck"></i>
                                    <span class="detalhe-label">Entrega:</span>
                                    <span class="detalhe-valor">${pedido.tipo_entrega || 'N/A'}</span>
                                </span>
                                <span class="detalhe-item">
                                    <i class="fas fa-phone"></i>
                                    <span class="detalhe-label">Contato:</span>
                                    <span class="detalhe-valor">${cliente.whatsapp || 'N/A'}</span>
                                </span>
                            </div>

                            ${pedido.tipo_entrega === 'entregar' ? `
                                <div class="detalhe-grupo">
                                    <span class="detalhe-item endereco-completo">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span class="detalhe-label">Endereço:</span>
                                        <div class="detalhe-valor" style="margin-left: 24px;">${pedido.endereco_entrega_completo || 'N/A'}</div>
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="pedido-acoes">
                        <button class="btn-acao editar" onclick="editarPedidoAdmin(${pedido.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-acao excluir" onclick="excluirPedidoAdmin(${pedido.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${cliente.whatsapp ? `
                            <button class="btn-acao whatsapp" onclick="enviarMensagemWhatsApp(event, '${cliente.whatsapp}', '${btoa(JSON.stringify(pedido))}', '${btoa(JSON.stringify(cliente))}')" title="WhatsApp">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            listaPedidosElement.appendChild(li);
        });
        const paginacao = document.createElement('div');
        paginacao.className = 'paginacao';
        if (totalPaginas > 1) {
            paginacao.innerHTML = `
                <button onclick="mudarPagina(-1)" ${paginaAtual <= 1 ? 'disabled' : ''}>Anterior</button>
                <span>Página ${paginaAtual} de ${totalPaginas}</span>
                <button onclick="mudarPagina(1)" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>Próxima</button>
            `;
            listaPedidosElement.appendChild(paginacao);
        }
    } catch (error) {
        console.error("Erro ao carregar pedidos para admin:", error);
        listaPedidosElement.innerHTML = `<li>Erro ao carregar pedidos: ${error.message}</li>`;
    }
}

function mudarPagina(delta) {
    paginaAtual += delta;
    carregarPedidosAdmin();
}

const filtroStatus = document.getElementById('filtro-pedidos-status');
if (filtroStatus) filtroStatus.addEventListener('change', e => { filtroPedidosStatus = e.target.value; carregarPedidosAdmin(); });
const filtroBusca = document.getElementById('filtro-pedidos-busca');
if (filtroBusca) filtroBusca.addEventListener('input', e => { filtroPedidosBusca = e.target.value; carregarPedidosAdmin(); });
const filtroMes = document.getElementById('filtro-pedidos-mes');
if (filtroMes) filtroMes.addEventListener('change', e => { filtroPedidosMes = e.target.value; carregarPedidosAdmin(); });

async function carregarUsuariosAdmin() {
    try {
        if (!window.supabaseClient) await window.initSupabase();
        let query = window.supabaseClient
            .from('usuarios')
            .select('email, nome, tipo, whatsapp')
            .eq('tipo', 'cliente');
        if (!filtroClientesBusca) {
            query = query.limit(5);
        }
        const { data, error } = await query;
        const listaUsuariosElement = document.getElementById('lista-usuarios');
        if (error) {
            console.error('Erro ao carregar lista de usuários:', error);
            if(listaUsuariosElement) listaUsuariosElement.innerHTML = '<li>Erro ao carregar usuários.</li>';
            return;
        }
        if (listaUsuariosElement) {
            listaUsuariosElement.innerHTML = '';            if (error) {
                console.error('Erro ao carregar lista de usuários:', error);
                if(listaUsuariosElement) listaUsuariosElement.innerHTML = '<li>Erro ao carregar usuários.</li>';
                return;
            }

            let dataFiltrada = data;
            if (filtroClientesBusca) {
                const busca = filtroClientesBusca.toLowerCase();
                dataFiltrada = data.filter(usr =>
                    (usr.nome && usr.nome.toLowerCase().includes(busca)) ||
                    (usr.email && usr.email.toLowerCase().includes(busca)) ||
                    (usr.whatsapp && usr.whatsapp.toLowerCase().includes(busca))
                );
            }
            if (dataFiltrada && dataFiltrada.length > 0) {
                dataFiltrada.forEach(usr => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div class="admin-user-info">
                            <span><b>Nome:</b> ${usr.nome || 'N/A'}</span>
                            <span><b>Email:</b> ${usr.email || 'N/A'}</span>
                            <span><b>Tipo:</b> ${usr.tipo || 'N/A'}</span>
                            <span><b>WhatsApp:</b> ${usr.whatsapp || 'N/A'}</span>
                        </div>
                    `;
                    listaUsuariosElement.appendChild(li);
                });
            } else {
                listaUsuariosElement.innerHTML = '<li>Nenhum usuário encontrado.</li>';
            }
        }
    } catch (error) {
        console.error("Erro ao carregar usuários para admin:", error);
        const listaUsuariosElement = document.getElementById('lista-usuarios');
        if(listaUsuariosElement) listaUsuariosElement.innerHTML = '<li>Ocorreu um erro inesperado ao carregar usuários.</li>';
    }
}
const filtroClientes = document.getElementById('filtro-clientes-busca');
if (filtroClientes) filtroClientes.addEventListener('input', e => { filtroClientesBusca = e.target.value; carregarUsuariosAdmin(); });

let chartPedidosMes = null;

async function preencherDashboardAdmin() {
    try {
        if (!window.supabaseClient) await window.initSupabase();
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.warn('Usuário não autenticado ao preencher dashboard');
            return;
        }
        const { data: clientesData, error: errorClientes } = await window.supabaseClient
            .from('usuarios')
            .select('id, tipo')
            .eq('tipo', 'cliente');
        if (errorClientes) {
            console.error('Erro ao buscar clientes:', errorClientes);
            return;
        }
        const { data: pedidosData, error: errorPedidos } = await window.supabaseClient
            .from('pedidos')
            .select('*')
            .order('data_pedido', { ascending: false });
        if (errorPedidos) {
            console.error('Erro ao buscar pedidos:', errorPedidos);
            return;
        }
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();
        let faturamentoMes = 0, faturamentoAno = 0;
        let totalPedidos = 0;
        let clientesAtivos = clientesData ? clientesData.length : 0;
        if (pedidosData && pedidosData.length > 0) {
            totalPedidos = pedidosData.length;
            pedidosData.forEach(pedido => {
                const valor = parseFloat(pedido.valor_pedido) || 0;
                const dataPedido = pedido.data_pedido ? new Date(pedido.data_pedido) : null;
                if (dataPedido) {
                    if (dataPedido.getFullYear() === anoAtual) {
                        faturamentoAno += valor;
                        if (dataPedido.getMonth() + 1 === mesAtual) {
                            faturamentoMes += valor;
                        }
                    }
                }
            });
        }
        const cardFatMes = document.getElementById('faturamento-mes');
        const cardFatAno = document.getElementById('faturamento-ano');
        const cardPedidos = document.getElementById('total-pedidos');
        const cardClientes = document.getElementById('total-usuarios');
        if (cardFatMes) cardFatMes.textContent = 'R$ ' + faturamentoMes.toLocaleString('pt-BR', {minimumFractionDigits:2});
        if (cardFatAno) cardFatAno.textContent = 'R$ ' + faturamentoAno.toLocaleString('pt-BR', {minimumFractionDigits:2});
        if (cardPedidos) cardPedidos.textContent = totalPedidos.toString();
        if (cardClientes) cardClientes.textContent = clientesAtivos.toString();
        const pedidosPorMes = Array(12).fill(0);
        if (pedidosData && pedidosData.length > 0) {
            pedidosData.forEach(pedido => {
                if (pedido.data_pedido) {
                    const data = new Date(pedido.data_pedido);
                    if (data.getFullYear() === anoAtual) {
                        const mes = data.getMonth();
                        pedidosPorMes[mes]++;
                    }
                }
            });
        }
        const graficoEl = document.getElementById('grafico-pedidos-mes');
        if (graficoEl) {
        const ctx = graficoEl.getContext('2d');
        if (chartPedidosMes) {
            chartPedidosMes.destroy();
        }
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está carregado. Verifique se o CDN está funcionando.');
            return;
        }
        chartPedidosMes = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Pedidos',
                    data: pedidosPorMes,
                    backgroundColor: 'rgba(255,105,180,0.7)',
                    borderColor: 'rgba(255,105,180,1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(255,105,180,0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        },
                        max: Math.max(...pedidosPorMes) + 1,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 500
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                }
            }
        });} else {
            console.warn('Elemento do gráfico não encontrado');
        }
    } catch (error) {
        console.error('Erro ao preencher dashboard:', error);
    }
}

window.editarPedidoAdmin = async function(idPedido) {
    if (!window.supabaseClient) await window.initSupabase();
    const { data: pedido, error } = await window.supabaseClient
        .from('pedidos')
        .select('*')
        .eq('id', idPedido)
        .single();
    if (error || !pedido) {
        alert('Erro ao buscar pedido para edição.');
        return;
    }
    document.getElementById('editar-id-pedido').value = pedido.id;
    document.getElementById('editar-tema-pedido').value = pedido.tema || '';
    document.getElementById('editar-tamanho-pedido').value = pedido.tamanho_bolo_cm || '';
    document.getElementById('editar-data-pedido').value = pedido.data_evento || '';
    document.getElementById('editar-status-pedido').value = pedido.status_pedido || 'pendente';
    document.getElementById('editar-valor-pedido').value = pedido.valor_pedido || '';
    document.getElementById('modal-editar-pedido').style.display = 'flex';
}

function fecharModalEditarPedido() {
    document.getElementById('modal-editar-pedido').style.display = 'none';
}
document.getElementById('modal-editar-pedido-close').onclick = fecharModalEditarPedido;
document.getElementById('cancelar-editar-pedido').onclick = fecharModalEditarPedido;

const formEditarPedido = document.getElementById('form-editar-pedido');
formEditarPedido.onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editar-id-pedido').value;
    const tema = document.getElementById('editar-tema-pedido').value;
    const tamanho = document.getElementById('editar-tamanho-pedido').value;
    const dataInput = document.getElementById('editar-data-pedido').value;
    const status = document.getElementById('editar-status-pedido').value; // value do select, padronizado
    const valor = document.getElementById('editar-valor-pedido').value;
    try {
        const { error } = await window.supabaseClient
            .from('pedidos')
            .update({
                tema,
                tamanho_bolo_cm: tamanho,
                data_evento: dataInput,
                status_pedido: status, // salva o value padronizado
                valor_pedido: valor
            })
            .eq('id', id);
        if (error) throw error;
        fecharModalEditarPedido();
        showToastAdmin('Pedido atualizado com sucesso!', 'success');
        carregarPedidosAdmin();
    } catch (err) {
        showToastAdmin('Erro ao salvar edição: ' + err.message, 'error');
    }
};

function showToastAdmin(msg, tipo = 'info') {
    // Utiliza a função showToast importada do componente toast.js
    showToast(msg, tipo);
}

window.excluirPedidoAdmin = async function(idPedido) {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
        const { error } = await window.supabaseClient
            .from('pedidos')
            .delete()
            .eq('id', idPedido);
        if (error) throw error;
        showToastAdmin('Pedido excluído com sucesso!', 'success');
        carregarPedidosAdmin();
    } catch (err) {
        showToastAdmin('Erro ao excluir pedido: ' + err.message, 'error');
    }
}

if (document.getElementById('lista-pedidos-admin')) {
    carregarPedidosAdmin();
}

async function handlePageLogout() {
    try {
        if (!window.supabaseClient) await window.initSupabase();
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Erro ao fazer logout (admin page):', error);
        alert('Erro ao sair: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handlePageLogout);
    }
});

async function getPlanoAtivoAdmin() {
    if (!window.supabaseClient) await window.initSupabase();
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return null;
    const { data: planosAtivos, error } = await window.supabaseClient
        .from('planos')
        .select('*')
        .eq('admin_id', user.id)
        .eq('ativo', true)
        .order('data_ativacao', { ascending: false });
    if (error || !planosAtivos || planosAtivos.length === 0) {
        return null;
    }
    const planoPremium = planosAtivos.find(p => p.plano === 'premium');
    const planoGratuito = planosAtivos.find(p => p.plano === 'gratuito');
    if (planoPremium) {
        const hoje = new Date();
        const dataVencimento = new Date(`${planoPremium.data_vencimento}T00:00:00`);
        dataVencimento.setHours(23, 59, 59, 999);
        if (dataVencimento >= hoje) {
            return planoPremium;
        }
    }
    if (planoGratuito) {
        return planoGratuito;
    }
    return null;
}

async function preencherPlanoHeaderAdmin() {
    const planoAtual = await getPlanoAtivoAdmin();
    const elPlano = document.getElementById('admin-profile-plano');
    const elVenc = document.getElementById('admin-profile-vencimento');
    if (elPlano) {
        let nomePlano = '---';
        if (planoAtual) {
            nomePlano = planoAtual.plano.charAt(0).toUpperCase() + planoAtual.plano.slice(1);
        }
        elPlano.textContent = 'Plano: ' + nomePlano;
    }
    if (elVenc) {
        let textoVencimento = '---';
        if (planoAtual && planoAtual.plano === 'premium' && planoAtual.data_vencimento) {
            const dataVenc = new Date(`${planoAtual.data_vencimento}T00:00:00`);
            textoVencimento = dataVenc.toLocaleDateString('pt-BR');
        }
        elVenc.textContent = 'Vencimento: ' + textoVencimento;
    }
}

async function verificarRegrasPlanoAdmin() {
    const planoAtual = await getPlanoAtivoAdmin();
    if (!planoAtual) {
        showToastAdmin('Seu plano está expirado ou inativo. Renove para continuar usando o sistema.', 'error');
        setTimeout(() => { window.location.href = '/pages/public/payment.html'; }, 2500);
        return false;
    }
    if (planoAtual.plano === 'gratuito') {
        if (!window.supabaseClient) await window.initSupabase();
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
        const { count, error } = await window.supabaseClient
            .from('pedidos')
            .select('id', { count: 'exact', head: true })
            .eq('admin_id', user.id)
            .gte('data_evento', primeiroDiaMes)
            .lte('data_evento', ultimoDiaMes);
        if (error) {
            console.error('Erro ao contar pedidos do mês:', error);
            return true;
        }
        if (count >= 5) {
            showToastAdmin('Seu plano grátis permite 5 pedidos por mês. Faça upgrade para o premium.', 'warning');
            setTimeout(() => { window.location.href = '/pages/public/payment.html'; }, 2500);
            return false;
        }
    }
    return true;
}

function selecionarCardStatus(cardElement) {
    document.querySelectorAll('.admin-card.clickable').forEach(card => {
        card.classList.remove('selected');
    });
    const statusFiltro = cardElement.dataset.status;
    const multiStatus = cardElement.dataset.filter ? cardElement.dataset.filter.split(',') : null;
    const filtroStatus = document.getElementById('filtro-pedidos-status');
    if (filtroStatus.value === statusFiltro ||
        (multiStatus && multiStatus.includes(filtroStatus.value))) {
        filtroStatus.value = '';
        cardElement.classList.remove('selected');
    } else {
        cardElement.classList.add('selected');
        if (multiStatus) {
            filtroStatus.value = multiStatus[0];
            cardElement.setAttribute('current-filter-index', '0');
        } else {
            filtroStatus.value = statusFiltro;
        }
    }
    filtroPedidosStatus = filtroStatus.value;
    const listaPedidos = document.querySelector('.admin-list-card');
    if (listaPedidos) {
        listaPedidos.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    carregarPedidosAdmin();
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.admin-card.clickable').forEach(card => {
        card.addEventListener('click', () => selecionarCardStatus(card));
    });
});

window.enviarMensagemWhatsApp = function(event, whatsapp, pedidoCodificado, clienteCodificado) {
    event.preventDefault();
    try {
        const pedido = JSON.parse(atob(pedidoCodificado));
        const cliente = JSON.parse(atob(clienteCodificado));
        const dataEvento = pedido.data_evento ? new Date(pedido.data_evento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida';
        const valorFormatado = pedido.valor_pedido ?
            `R$ ${parseFloat(pedido.valor_pedido).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` :
            'A definir';
        const tamanhoFormatado = pedido.tamanho_bolo_cm ? `${pedido.tamanho_bolo_cm}cm` : 'Não especificado';
        const mensagem = `*📦 PEDIDO #${pedido.id}*

` +
            `🎂 *Tema:* ${pedido.tema || 'Não especificado'}
` +
            `📏 *Tamanho:* ${tamanhoFormatado}
` +
            `📅 *Data do Evento:* ${dataEvento}
` +
            `📝 *Descrição:* ${pedido.descricao_pedido || '---'}
` +
            (pedido.observacao_pedido ? `💬 *Observações:* ${pedido.observacao_pedido}
` : '') +
            `
🚚 *Tipo de Entrega:* ${pedido.tipo_entrega || 'Não especificado'}
` +
            (pedido.tipo_entrega === 'entregar' && cliente.endereco_entrega_completo ? `📍 *Endereço de Entrega:*
${cliente.endereco_entrega_completo}
` : '') +
            `
💰 *Valor:* ${valorFormatado}
` +
            `
🚦 *Status:* ${pedido.status_pedido || 'Pendente'}` +
            `

✨ *Lorrainy Papeleira*
🌟 Seu pedido é especial para nós!`;
        const mensagemCodificada = encodeURIComponent(mensagem);
        window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${mensagemCodificada}`, '_blank');
    } catch (error) {
        console.error('Erro ao processar dados para WhatsApp:', error);
        alert('Houve um erro ao preparar a mensagem para o WhatsApp');
    }
};