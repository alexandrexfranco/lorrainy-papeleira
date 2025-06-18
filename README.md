# Sistema de Gerenciamento Web

Este é um sistema web com três níveis de acesso: Cliente, Administrador e Super Administrador.

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript
- Supabase (Banco de dados e Autenticação)

## Estrutura do Projeto

```
├── pages/
│   ├── public/                   → Páginas públicas
│   │   ├── index.html           → Redirecionamento para login
│   │   ├── login.html           → Login e cadastro
│   │   ├── edit-profile.html    → Edição de perfil
│   │   ├── payment.html         → Página de pagamento
│   │   └── reset-password.html  → Redefinição de senha
│   ├── admin/                   → Área do administrador
│   │   └── dashboard-admin.html
│   ├── client/                  → Área do cliente
│   │   └── dashboard-client.html
│   └── superadmin/              → Área do superadmin
│       └── dashboard-superadmin.html
├── assets/
│   ├── css/
│   │   ├── components/          → Componentes CSS reutilizáveis
│   │   │   ├── buttons.css     → Estilos de botões
│   │   │   ├── loader.css      → Componente de carregamento
│   │   │   ├── modal.css       → Componente de modal
│   │   │   └── toast.css       → Notificações toast
│   │   ├── layouts/            → Estilos específicos de layout
│   │   │   ├── admin.css       → Layout do admin
│   │   │   ├── client.css      → Layout do cliente
│   │   │   ├── edit-profile.css  → Layout da edição de perfil
│   │   │   └── superadmin.css  → Layout do superadmin
│   │   └── shared/             → Estilos compartilhados
│   │       ├── base.css        → Estilos base e reset
│   │       ├── style.css       → Estilos globais
│   │       └── variables.css   → Variáveis CSS
│   └── js/
│       ├── components/         → Componentes JavaScript
│       │   ├── loader.js      → Componente de carregamento
│       │   ├── modal.js       → Componente de modal
│       │   └── toast.js       → Notificações toast
│       ├── modules/           → Módulos JavaScript
│       │   ├── auth.js        → Autenticação
│       │   ├── supabase.js    → Configuração do Supabase
│       │   ├── utils.js       → Funções utilitárias
│       │   └── user-helpers.js → Funções auxiliares de usuário
│       └── pages/             → Scripts específicos de página
│           ├── admin/         → Scripts da área admin
│           ├── client/        → Scripts da área cliente
│           └── superadmin/    → Scripts da área superadmin

├── js/                     → Arquivos JavaScript
│   ├── auth.js            → Autenticação (login, cadastro e logout)
│    ├── client.js          → Funcionalidades do cliente
│   ├── admin.js           → Funcionalidades do administrador
│   ├── superadmin.js      → Funcionalidades do superadministrador
│   └── supabase.js        → Conexão com o Supabase
```

## Instalação e Execução

1. Clone o repositório
2. No Windows, execute o arquivo `install.bat`
3. Ou manualmente:
   ```bash
   npm install
   npm start
   ```
4. Acesse http://localhost:3000 no navegador

## Funcionalidades

### Cliente
- Login e cadastro
- Visualização e edição do perfil
- Gerenciamento de pedidos

### Administrador
- Gerenciamento de clientes
- Gerenciamento de pedidos
- Relatórios básicos

### Super Administrador
- Gerenciamento de administradores
- Configurações do sistema
- Relatórios avançados

## Componentes

### CSS
- Sistema de design consistente com variáveis CSS
- Componentes reutilizáveis (botões, modais, etc.)
- Layouts específicos por tipo de usuário

### JavaScript
- Módulos independentes e reutilizáveis
- Sistema de notificações toast
- Gerenciamento de estado com Supabase
- Componentes dinâmicos (loader, modal)

## Melhorias Implementadas

1. Reorganização completa da estrutura do projeto
2. Implementação de componentes reutilizáveis
3. Separação de responsabilidades (CSS/JS)
4. Sistema de feedback visual aprimorado
5. Melhorias de acessibilidade
6. Otimizações de performance

## Próximos Passos

1. Implementação de testes automatizados
2. Documentação detalhada de componentes
3. Implementação de PWA
4. Otimização de assets

## Segurança

O sistema utiliza as seguintes medidas de segurança:
- Autenticação via Supabase
- Controle de acesso baseado em papéis (RBAC)
- Validação de dados no cliente e servidor
- Tokens JWT para autenticação

## Desenvolvimento

Para contribuir com o projeto:
1. Crie um fork do repositório
2. Crie uma branch para sua feature
3. Faça commit das suas alterações
4. Push para a branch
5. Crie um Pull Request
