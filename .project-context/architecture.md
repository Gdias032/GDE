# Arquitetura do Sistema

## Visão Geral
A aplicação segue o padrão **Single Page Application (SPA)** implementada puramente com Vanilla JavaScript. Não há frameworks de renderização como React ou Vue. Todo o gerenciamento de backend foi delegado ao **Supabase** (Backend-as-a-Service).

## Camadas da Aplicação

### 1. Camada de Apresentação (UI)
- Centralizada no `index.html` (Shell da aplicação com Navbar e Sidebar).
- Conteúdo dinâmico injetado na div `#app-content` via roteamento manual e manipulação direta de DOM (`innerHTML`).
- Estilização feita através de um único arquivo consolidado `css/styles.css`.

### 2. Camada de Lógica de Negócio e Roteamento
- Dividida em múltiplos scripts JS no diretório `/js`.
- `navigation.js` controla qual tela ("view") está ativa e invoca suas respectivas funções de renderização.
- Telas baseadas em templates literais no arquivo `views.js`.

### 3. Camada de Estado e Dados
- Estado mantido globalmente em memória no arquivo `state.js`.
- O estado se sincroniza de forma assíncrona com o Supabase.
- Assinaturas de eventos Realtime via WebSocket (`schema-db-changes`) garantem que a UI reflita mudanças feitas por outros usuários simultaneamente.

### 4. Camada de Persistência (Supabase / PostgreSQL)
- **Authentication**: Gerencia os usuários logados.
- **Database**: Tabelas de `usuarios`, `maquinas_planta`, `solicitacoes_permissao`, etc.
- **RLS (Row Level Security)**: Habilitado para as tabelas e configurado de forma abrangente para usuários autenticados.
