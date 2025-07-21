// Inicialização do perfil do cliente no dashboard
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabaseClient) {
        try {
            await window.initSupabase();
        } catch (error) {
            console.error('Erro ao inicializar Supabase:', error);
            alert('Erro crítico ao carregar a página. Tente novamente.');
            return;
        }
    }

    // Atualizar card do perfil
    const atualizarCardPerfil = async () => {
        console.log('Atualizando card do perfil...');
        const nomeEl = document.getElementById('nome-profile-cliente');
        const fotoEl = document.getElementById('profile-photo-preview');

        if (!nomeEl) {
            console.error('Elemento nome-profile-cliente não encontrado');
            return;
        }

        try {
            const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
            if (authError || !user) {
                console.error('Usuário não autenticado:', authError);
                window.location.href = '/index.html';
                return;
            }

            console.log('Buscando dados do usuário:', user.id);
            const { data, error } = await window.supabaseClient
                .from('usuarios')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Erro ao buscar perfil:', error);
                nomeEl.textContent = user.email || 'Cliente';
                return;
            }

            if (data) {
                console.log('Dados do perfil recebidos:', data);
                nomeEl.textContent = data.nome || user.email || 'Cliente';
                
                // Atualiza WhatsApp e Email
                const whatsappEl = document.getElementById('client-profile-whatsapp');
                const emailEl = document.getElementById('client-profile-email');
                
                if (whatsappEl) {
                    whatsappEl.textContent = `WhatsApp: ${data.whatsapp || 'Não informado'}`;
                }
                if (emailEl) {
                    emailEl.textContent = `Email: ${user.email || 'Não informado'}`;
                }

                if (fotoEl && data.foto_perfil_url) {
                    const { data: urlData, error: urlError } = await window.supabaseClient
                        .storage
                        .from('fotos-perfil')
                        .createSignedUrl(data.foto_perfil_url, 3600);
                    
                    if (!urlError && urlData?.signedUrl) {
                        fotoEl.src = urlData.signedUrl;
                    }
                }
            } else {
                nomeEl.textContent = user.email || 'Cliente';
            }
        } catch (err) {
            console.error('Erro ao atualizar card do perfil:', err);
            if (nomeEl) nomeEl.textContent = 'Cliente';
        }
    };

    // Atualizar o card do perfil
    await atualizarCardPerfil();

    // Adiciona handler para upload de foto do perfil
    const photoInput = document.getElementById('client-profile-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    console.error('Usuário não autenticado');
                    return;
                }

                // Upload da nova foto
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                const filePath = `fotos_perfil/${fileName}`;

                const { error: uploadError } = await window.supabaseClient
                    .storage
                    .from('perfil')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Erro no upload:', uploadError);
                    alert('Erro ao fazer upload da foto. Tente novamente.');
                    return;
                }

                // Atualiza a URL da foto no banco
                const { error: updateError } = await window.supabaseClient
                    .from('usuarios')
                    .update({ foto_perfil_url: filePath })
                    .eq('id', user.id);

                if (updateError) {
                    console.error('Erro ao atualizar perfil:', updateError);
                    alert('Erro ao salvar foto no perfil. Tente novamente.');
                    return;
                }

                // Atualiza a imagem na tela
                const { data: { publicUrl } } = window.supabaseClient
                    .storage
                    .from('perfil')
                    .getPublicUrl(filePath);

                const fotoEl = document.getElementById('profile-photo-preview');
                if (fotoEl) {
                    fotoEl.src = publicUrl;
                }

                alert('Foto atualizada com sucesso!');
            } catch (error) {
                console.error('Erro ao processar foto:', error);
                alert('Erro ao processar foto. Tente novamente.');
            }
        });
    }

    // Função para exibir detalhes do pedido no modal
    window.exibirDetalhesPedido = async function(pedido) {
        const formatarData = (dataString) => {
            if (!dataString) return 'Não definida';
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
        };        const formatarStatus = (status) => {
            // Converte o status para o formato correto (minúsculo e com hífen)
            const normalizedStatus = status.toLowerCase().replace('_', '-');
            
            const statusMap = {
                'pendente': { texto: 'Pendente', classe: 'status-pendente' },
                'aprovado': { texto: 'Aprovado', classe: 'status-aprovado' },
                'em-producao': { texto: 'Em Produção', classe: 'status-em-producao' },
                'finalizado': { texto: 'Finalizado', classe: 'status-finalizado' },
                'entregue': { texto: 'Entregue', classe: 'status-entregue' },
                'cancelado': { texto: 'Cancelado', classe: 'status-cancelado' }
            };
            
            const statusInfo = statusMap[normalizedStatus] || { texto: status, classe: 'status-pendente' };
            console.log('Status formatado:', { original: status, normalizado: normalizedStatus, info: statusInfo }); // Debug
            return statusInfo;
        };

        // Preenche os detalhes no modal
    document.getElementById('detalhe-numero-pedido').textContent = `Pedido #${pedido.id}`;        const statusEl = document.getElementById('detalhe-status-pedido');
    const statusInfo = formatarStatus(pedido.status_pedido);
    statusEl.textContent = statusInfo.texto.toUpperCase();
    
    // Aplica as classes corretamente formatadas para o status
    const normalizedStatus = pedido.status_pedido.toLowerCase().replace('_', '-');
    statusEl.className = `status-pedido status-${normalizedStatus}`;
    console.log('Classes aplicadas ao status:', statusEl.className); // Debug
    
    document.getElementById('detalhe-tema').textContent = pedido.tema || '---';
    document.getElementById('detalhe-tamanho').textContent = pedido.tamanho_bolo_cm ? 
        `${pedido.tamanho_bolo_cm} cm` : '---';
    document.getElementById('detalhe-data').textContent = formatarData(pedido.data_evento);
    document.getElementById('detalhe-tipo-entrega').textContent = pedido.tipo_entrega === 'entregar' ? 
        '🚚 Entrega em Domicílio' : '🏪 Retirar no Local';
    document.getElementById('detalhe-descricao').textContent = pedido.descricao_pedido || '---';
    document.getElementById('detalhe-observacao').textContent = pedido.observacao_pedido || '---';        // Configura os botões
        const editarBtn = document.getElementById('editar-pedido-btn');
        if (editarBtn) {
            // Define a visibilidade do botão de editar
            if (pedido.status_pedido !== 'Pendente') {
                editarBtn.style.display = 'none';
            } else {
                editarBtn.style.display = 'inline-flex';
            }

            editarBtn.onclick = () => {
                document.getElementById('detalhes-pedido-modal').style.display = 'none';
                window.editarPedido(pedido);
            };
        }

        const fecharBtn = document.getElementById('fechar-detalhes-pedido');
        if (fecharBtn) {
            fecharBtn.onclick = () => {
                document.getElementById('detalhes-pedido-modal').style.display = 'none';
            };
        }

        // Adiciona funcionalidade para fechar com o botão X
        const closeBtn = document.getElementById('detalhes-pedido-modal-close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.getElementById('detalhes-pedido-modal').style.display = 'none';
            };
        }

        // Adiciona funcionalidade para fechar clicando fora do modal
        const modal = document.getElementById('detalhes-pedido-modal');
        if (modal) {
            modal.onclick = (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };
        }

        // Exibe o modal
        document.getElementById('detalhes-pedido-modal').style.display = 'flex';
    }
});
