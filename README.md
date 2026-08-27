# Silicon Core V2

Sistema de acompanhamento de manutenção e recepção de máquinas (siliconagem), organizado como um SPA (Single Page Application) simples, sem framework — apenas HTML, CSS e JavaScript puro (vanilla) integrado ao Supabase para persistência de dados em tempo real.

## Estrutura de pastas

```
silicon-core-v2/
├── index.html             # Estrutura fixa (sidebar, navbar) + <script> na ordem correta
├── schema.sql             # Script de criação das tabelas e RLS no Supabase
├── seed_maquinas.sql      # Dados iniciais (mock) para popular o banco de dados
├── css/
│   └── styles.css         # Todos os estilos (tema claro/escuro via CSS variables)
└── js/
    ├── supabase-client.js # Inicialização do cliente Supabase via CDN
    ├── utils.js           # Helpers (escapeHtml, modais)
    ├── state.js           # Estado global, queries do Supabase e lógica Realtime
    ├── theme.js           # Alternância tema claro/escuro
    ├── mobile-menu.js     # Sidebar retrátil (mobile)
    ├── views.js           # Templates HTML de cada tela
    ├── navigation.js      # Roteador manual do SPA
    ├── auth.js            # Login / logout
    ├── funcionarios.js    # Validação de matrícula
    ├── permissoes.js      # Solicitações de permissão especial
    ├── perfil.js          # Modal "Meu Perfil"
    ├── planta.js          # Matriz de máquinas + tooltip + ranking
    ├── recepcao.js        # Tela de atuação/recepção da máquina
    ├── tabelas.js         # Listagens (Recepções e Solicitações)
    ├── analise.js         # Gráfico de BI (Chart.js)
    └── main.js            # Inicialização e carga inicial dos dados
```

## Como rodar

A aplicação não precisa de build ou servidor backend próprio, seguindo as diretrizes do projeto (100% Client-Side + Supabase).

1. **Configuração do Banco de Dados (Supabase)**:
   - Crie um projeto no Supabase.
   - Execute o conteúdo de `schema.sql` e depois `seed_maquinas.sql` no SQL Editor do Supabase.
   - Atualize as constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY` no arquivo `js/supabase-client.js` com os dados do seu projeto.

2. **Execução Local**:
   Sirva os arquivos localmente usando um servidor HTTP simples:
   ```bash
   python3 -m http.server 8080
   # Em seguida acesse http://localhost:8080 no navegador
   ```

## O que foi atualizado nesta versão (Supabase)

As limitações antigas de persistência via `localStorage` foram solucionadas com as seguintes implementações:

1. **Persistência Remota**: A aplicação agora utiliza o Supabase para armazenamento de todos os dados (máquinas, andamentos, solicitações e permissões), substituindo o uso isolado de `localStorage`.
2. **Atualização em Tempo Real (Realtime)**: Configurado o *Supabase Realtime* no arquivo `state.js`. Modificações feitas por qualquer dispositivo são refletidas automaticamente na matriz e nas tabelas para todos os clientes conectados.
3. **Limpeza de Arquivos Obsoletos**: O arquivo `config.js` contendo arrays de mock (máquinas hardcoded) foi removido. Os dados agora vêm integralmente das queries realizadas pelo JS.
4. **Relacionamentos de Dados**: Consultas utilizando os *Joins* do Supabase (`select('*, mantenedor:id(...)')`) para carregar identificações e nomes de forma coesa na renderização de tela.

## Limitações conhecidas (Protótipo)

- **Autenticação**: O sistema de login verifica matrículas em banco, mas a sessão e as senhas não utilizam o módulo *Supabase Auth* (JWT seguro para os usuários) no momento, funcionando apenas de maneira simulada no cliente.
- **Gráfico Histórico ("Eficiência")**: O histórico diário presente em `analise.js` utiliza valores fixos passados. Para dados dinâmicos seria necessário um serviço paralelo (ex: *Edge Functions* ou rotina no banco) para gravar o "fotograma" diário do progresso das máquinas.
