# Estrutura de Módulos

O projeto é fragmentado nos seguintes módulos principais dentro do diretório `/js`, que devem ser carregados sequencialmente em ordem estrita no `index.html`:

## Inicialização e Configuração
- `supabase-client.js`: Instancia o client do Supabase (URL e chaves).
- `main.js`: Ponto de entrada (`DOMContentLoaded`). Tenta recuperar sessão existente, inicializa eventos de UI gerais (menus, temas) e direciona para a tela inicial ou de login.

## Autenticação e Sessão
- `auth.js`: Lida com o processo de login (`signInWithPassword`), validação na tabela `usuarios` para resgatar perfil (`ADMIN`, `MANTENEDOR`, `RECEPCIONISTA`) e construção da sessão global (`usuarioLogadoSessao`).

## Gerenciamento de Estado
- `state.js`: Coração da aplicação responsável pelos dados. Mantém variáveis globais (ex: `todasAsMaquinas`, `solicitacoesAutorizacao`). Expõe funções para sincronizar dados (`carregarDadosSupabase`) e persistir mutações (`salvarMaquinaSupabase`). Configura as conexões de tempo real (`inicializarRealtime`).

## Roteamento e Views
- `views.js`: Arquivo massivo contendo strings de template HTML (ex: `views.login`, `views.planta`, `views.recepcao`) prontas para injeção no DOM.
- `navigation.js`: Implementa o router manual `navigateTo(viewName)`. Substitui o HTML interno de `#app-content` e orquestra a chamada para a função de renderização correspondente à tela.

## Regras de Negócio e UI (Telas Específicas)
- `planta.js`: Lógica para renderizar a matriz/grid de máquinas e o painel de análise lateral (Dashboard rápido).
- `recepcao.js`: Gerencia a tela de atuação detalhada em uma máquina específica (alteração de status de andamento, apontamento de manutenções).
- `tabelas.js`: Renderiza as exibições tabulares como a lista de recepções pendentes e histórico.
- `analise.js`: Responsável por instanciar e atualizar os gráficos interativos (via Chart.js) da seção de Business Intelligence (BI).

## Funcionalidades Auxiliares (Domain Utilities)
- `permissoes.js`: Lida com todo o ciclo de vida das solicitações de autorização e aprovações.
- `funcionarios.js`: Contém validações auxiliares relacionadas aos cadastros (matrículas).
- `perfil.js`: Gerencia o modal de perfil de usuário logado (avatar, informações pessoais).

## Utilitários e Layout (UI Helpers)
- `utils.js`: Funções utilitárias genéricas (geração de modais de confirmação dinâmicos, sanitização `escapeHtml`).
- `theme.js`: Controle global e persistência local do tema visual (Modo Claro / Modo Escuro).
- `mobile-menu.js`: Controla o comportamento de toggle responsivo da barra lateral (sidebar) em dispositivos móveis.
