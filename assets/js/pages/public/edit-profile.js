// Importações necessárias
import { showToast } from '../../components/toast.js';
import { checkStorageConfiguration } from '../../utils/storage-setup.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!window.supabaseClient) {
            await window.initSupabase();
        }

        // Verificar autenticação
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError || !user) {
            window.location.href = '/pages/public/login.html';
            return;
        }

        // Verificar configuração do storage
        const storageCheck = await checkStorageConfiguration();
        if (storageCheck.status === 'error') {
            console.warn('Problema com storage:', storageCheck.details);
            showToast('Aviso: Upload de fotos pode não funcionar', 'warning');
        }

        // Carregar dados do perfil
        await loadProfileData(user.id);

        // Setup do input de foto
        setupPhotoInput();

        // Setup do formulário
        setupFormHandlers();

    } catch (error) {
        console.error('Erro ao inicializar página:', error);
        showToast('Erro ao carregar a página', 'error');
    }
});

async function loadProfileData(userId) {
    try {
        const { data: profile, error } = await window.supabaseClient
            .from('usuarios')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Preencher campos do formulário
        // Dados pessoais
        document.getElementById('profile-nome').value = profile.nome || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-whatsapp').value = profile.whatsapp || '';
        
        // Endereço
        document.getElementById('profile-rua').value = profile.rua || '';
        document.getElementById('profile-numero-casa').value = profile.numero_casa || '';
        document.getElementById('profile-complemento').value = profile.complemento || '';
        document.getElementById('profile-bairro').value = profile.bairro || '';
        document.getElementById('profile-cidade').value = profile.cidade || '';
        document.getElementById('profile-estado').value = profile.estado || '';
        document.getElementById('profile-cep').value = profile.cep || '';
        document.getElementById('profile-ponto-referencia').value = profile.ponto_referencia || '';

        // Carregar foto do perfil se existir
        if (profile.foto_perfil_url) {
            try {
                console.log('Carregando foto:', profile.foto_perfil_url);
                
                const { data: urlData, error: urlError } = await window.supabaseClient
                    .storage
                    .from('fotos-perfil')
                    .createSignedUrl(profile.foto_perfil_url, 3600);

                if (urlError) {
                    console.warn('Erro ao gerar URL da foto:', urlError);
                    // Usar URL pública como fallback
                    const { data: publicUrl } = window.supabaseClient
                        .storage
                        .from('fotos-perfil')
                        .getPublicUrl(profile.foto_perfil_url);
                    
                    if (publicUrl?.publicUrl) {
                        document.getElementById('profile-photo-preview').src = publicUrl.publicUrl;
                    }
                } else if (urlData?.signedUrl) {
                    document.getElementById('profile-photo-preview').src = urlData.signedUrl;
                }
            } catch (photoError) {
                console.warn('Erro ao carregar foto do perfil:', photoError);
                // Continuar sem a foto
            }
        }

    } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error);
        showToast('Erro ao carregar seus dados', 'error');
    }
}

function setupPhotoInput() {
    const photoInput = document.getElementById('profile-photo-input');
    const photoPreview = document.getElementById('profile-photo-preview');
    const clickableArea = document.getElementById('profile-photo-clickable-area');

    if (clickableArea) {
        clickableArea.addEventListener('click', () => photoInput.click());
    }

    if (photoInput) {
        photoInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Obter usuário no início da função
            let currentUser;
            try {
                const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
                if (authError || !user) {
                    showToast('Usuário não autenticado', 'error');
                    return;
                }
                currentUser = user;
            } catch (error) {
                showToast('Erro de autenticação', 'error');
                return;
            }

            try {
                // Validar tipo de arquivo
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    showToast('Tipo de arquivo não suportado. Use JPG, PNG ou WebP', 'error');
                    return;
                }

                // Validar tamanho do arquivo (máximo 5MB)
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    showToast('Arquivo muito grande. Máximo 5MB', 'error');
                    return;
                }

                // Mostrar preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);

                // Upload para o Supabase
                const fileExt = file.name.split('.').pop().toLowerCase();
                const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
                const filePath = `fotos_perfil/${fileName}`;

                console.log('Iniciando upload:', { fileName, filePath, fileSize: file.size, userId: currentUser.id });

                // Tentar upload com diferentes abordagens
                let uploadError = null;
                let uploadData = null;

                // Primeira tentativa: upload direto
                const { data, error } = await window.supabaseClient.storage
                    .from('fotos-perfil')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    console.warn('Primeira tentativa falhou:', error);
                    uploadError = error;
                    
                    // Segunda tentativa: usar nome de arquivo mais simples
                    const simpleFileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
                    const simpleFilePath = simpleFileName;
                    
                    console.log('Tentando upload simples:', simpleFilePath);
                    
                    const { data: data2, error: error2 } = await window.supabaseClient.storage
                        .from('fotos-perfil')
                        .upload(simpleFilePath, file, {
                            cacheControl: '3600',
                            upsert: false
                        });
                    
                    if (error2) {
                        console.error('Segunda tentativa também falhou:', error2);
                        uploadError = error2;
                    } else {
                        uploadData = data2;
                        filePath = simpleFilePath;
                    }
                } else {
                    uploadData = data;
                }

                if (uploadError) {
                    throw uploadError;
                }

                console.log('Upload concluído, atualizando perfil...');

                // Atualizar URL no perfil do usuário
                const { error: updateError } = await window.supabaseClient
                    .from('usuarios')
                    .update({ foto_perfil_url: filePath })
                    .eq('id', currentUser.id);

                if (updateError) {
                    console.error('Erro ao atualizar perfil:', updateError);
                    throw updateError;
                }

                showToast('Foto atualizada com sucesso!', 'success');
                
            } catch (error) {
                console.error('Erro ao atualizar foto:', error);
                
                // Mensagem de erro mais específica
                let errorMessage = 'Erro ao atualizar foto';
                if (error.message) {
                    if (error.message.includes('row-level security policy')) {
                        errorMessage = 'Erro de permissão. Verifique as configurações do Supabase.';
                    } else if (error.message.includes('413')) {
                        errorMessage = 'Arquivo muito grande';
                    } else if (error.message.includes('415')) {
                        errorMessage = 'Tipo de arquivo não suportado';
                    } else if (error.message.includes('storage')) {
                        errorMessage = 'Erro no armazenamento';
                    } else if (error.message.includes('Unauthorized')) {
                        errorMessage = 'Acesso não autorizado. Faça login novamente.';
                    }
                }
                
                showToast(errorMessage, 'error');
                
                // Reverter preview para foto anterior em caso de erro
                try {
                    await loadProfileData(currentUser.id);
                } catch (reloadError) {
                    console.error('Erro ao recarregar perfil:', reloadError);
                }
            }
        });
    }
}

function setupFormHandlers() {
    const form = document.getElementById('profile-form');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                submitBtn.disabled = true;

                const { data: { user } } = await window.supabaseClient.auth.getUser();
                  const formData = {
                    whatsapp: document.getElementById('profile-whatsapp').value.trim(),
                    rua: document.getElementById('profile-rua').value.trim(),
                    numero_casa: document.getElementById('profile-numero-casa').value.trim(),
                    complemento: document.getElementById('profile-complemento').value.trim(),
                    bairro: document.getElementById('profile-bairro').value.trim(),
                    cidade: document.getElementById('profile-cidade').value.trim(),
                    estado: document.getElementById('profile-estado').value.trim().toUpperCase(),
                    cep: document.getElementById('profile-cep').value.trim(),
                    ponto_referencia: document.getElementById('profile-ponto-referencia').value.trim()
                };

                const { error: updateError } = await window.supabaseClient
                    .from('usuarios')
                    .update(formData)
                    .eq('id', user.id);

                if (updateError) throw updateError;

                showToast('Perfil atualizado com sucesso!', 'success');
                
                // Redirecionar de volta para o dashboard após alguns segundos
                setTimeout(() => {
                    window.location.href = '/pages/client/dashboard-client.html';
                }, 2000);

            } catch (error) {
                console.error('Erro ao atualizar perfil:', error);
                showToast('Erro ao atualizar perfil', 'error');
            } finally {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
}
