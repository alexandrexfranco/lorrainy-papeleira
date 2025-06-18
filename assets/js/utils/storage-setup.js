/**
 * Utilitário para configurar o storage do Supabase
 */

import { getOptimizedConfig } from './optimization-config.js';

/**
 * Verificar e configurar buckets de storage
 */
export async function setupStorage() {
    try {
        const config = getOptimizedConfig();
        
        if (!window.supabaseClient) {
            console.error('Cliente Supabase não inicializado');
            return { success: false, error: 'Cliente não inicializado' };
        }

        // Verificar buckets existentes
        const { data: buckets, error: bucketsError } = await window.supabaseClient.storage.listBuckets();
        
        if (bucketsError) {
            console.error('Erro ao listar buckets:', bucketsError);
            return { success: false, error: bucketsError };
        }

        console.log('Buckets encontrados:', buckets);

        // Verificar se o bucket fotos-perfil existe
        const fotosPerfilBucket = buckets.find(bucket => bucket.name === 'fotos-perfil');
        
        if (!fotosPerfilBucket) {
            console.warn('Bucket fotos-perfil não encontrado');
            return { 
                success: false, 
                error: 'Bucket fotos-perfil não existe',
                suggestion: 'Crie o bucket fotos-perfil no painel do Supabase'
            };
        }

        // Verificar permissões do bucket
        const { data: policies, error: policiesError } = await window.supabaseClient.storage
            .from('fotos-perfil')
            .list('', { limit: 1 });

        if (policiesError) {
            console.error('Erro ao verificar permissões:', policiesError);
            return { 
                success: false, 
                error: policiesError,
                suggestion: 'Verifique as políticas de acesso do bucket'
            };
        }

        console.log('Bucket fotos-perfil configurado corretamente');
        return { success: true, bucket: fotosPerfilBucket };

    } catch (error) {
        console.error('Erro ao configurar storage:', error);
        return { success: false, error };
    }
}

/**
 * Testar upload de arquivo
 */
export async function testFileUpload(file) {
    try {
        if (!file) {
            throw new Error('Nenhum arquivo fornecido');
        }

        // Validar arquivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Tipo de arquivo não suportado');
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('Arquivo muito grande (máximo 5MB)');
        }

        // Gerar nome único
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `test-${Date.now()}.${fileExt}`;
        const filePath = `fotos_perfil/${fileName}`;

        console.log('Testando upload:', { fileName, filePath, fileSize: file.size });

        // Tentar upload
        const { data, error } = await window.supabaseClient.storage
            .from('fotos-perfil')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw error;
        }

        console.log('Upload bem-sucedido:', data);

        // Limpar arquivo de teste
        setTimeout(async () => {
            try {
                await window.supabaseClient.storage
                    .from('fotos-perfil')
                    .remove([filePath]);
                console.log('Arquivo de teste removido');
            } catch (cleanupError) {
                console.warn('Erro ao limpar arquivo de teste:', cleanupError);
            }
        }, 5000);

        return { success: true, data };

    } catch (error) {
        console.error('Erro no teste de upload:', error);
        return { success: false, error };
    }
}

/**
 * Verificar configuração completa do storage
 */
export async function checkStorageConfiguration() {
    const setupResult = await setupStorage();
    
    if (!setupResult.success) {
        return {
            status: 'error',
            message: 'Configuração do storage falhou',
            details: setupResult
        };
    }

    return {
        status: 'success',
        message: 'Storage configurado corretamente',
        details: setupResult
    };
} 