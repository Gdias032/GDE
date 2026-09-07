# Dependências Externas

O projeto atual adota uma abordagem minimalista de bibliotecas, dispensando o uso de Node.js no frontend e gerenciadores de pacotes (npm/yarn) para o empacotamento da aplicação. As dependências são carregadas majoritariamente de forma direta via CDN no arquivo `index.html`.

## Dependências Principais (Frontend)

- **@supabase/supabase-js (v2)**
  - Fonte: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
  - Uso: Biblioteca base para comunicação com o backend BaaS. Gerencia a sessão de autenticação (JWT), executa requisições de persistência e expõe o canal de WebSockets para recebimento de eventos do banco de dados em tempo real.

- **Chart.js**
  - Fonte: `https://cdn.jsdelivr.net/npm/chart.js`
  - Uso: Utilizado de forma proeminente no módulo `analise.js` para renderizar os painéis interativos de análise de performance (BI) e dashboards.

## Dependências e Serviços (Backend)

- **Supabase Cloud / PostgreSQL**
  - O banco de dados definido por `schema.sql` assume a utilização de recursos nativos e extensões do PostgreSQL hospedado na plataforma Supabase (ex: `gen_random_uuid()`).
  - O sistema depende fundamentalmente do *Supabase Auth* e do *Supabase Realtime*.

## Anotações Adicionais

*Assumption*: O arquivo `meu-projeto.bundle` listado no diretório raiz do projeto aparenta ser um artefato gerado de backup de git, dump de banco local ou bundle comprimido legado. Não é referenciado em nenhum momento pelo fluxo de execução web da aplicação.
