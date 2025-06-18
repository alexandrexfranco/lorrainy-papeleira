// Helper para comparação de tipos de usuário
function getTipoUsuarioNormalizado(tipo) {
    const tipoLowerCase = (tipo || '').toLowerCase();
    switch (tipoLowerCase) {
        case 'cliente':
            return 'cliente';
        case 'admin':
        case 'admim':
        case 'administrador':
            return 'administrador';
        case 'superadmin':
        case 'super-admin':
        case 'super_admin':
            return 'superadmin';
        default:
            return null;
    }
}

// Helper para validar o tipo de usuário
function isValidUserType(tipo) {
    return getTipoUsuarioNormalizado(tipo) !== null;
}

// Disponibilizando as funções globalmente
window.getTipoUsuarioNormalizado = getTipoUsuarioNormalizado;
window.isValidUserType = isValidUserType;
