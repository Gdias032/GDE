# Problemas Conhecidos, Debitos Técnicos e Oportunidades de Melhoria

## 1. Vulnerabilidades Potenciais à "Cross-Site Scripting" (XSS)
Como a aplicação confia majoritariamente em injeções massivas através de `innerHTML` utilizando os templates presentes em `views.js`, é imperativo que absolutamente todos os dados manipulados (especialmente preenchidos via observações abertas do banco de dados) utilizem a função utilitária `escapeHtml` (localizada em `utils.js`). A negligência esporádica dessa sanitização permite ataques vetoriais em que entradas de usuários viram Javascript indesejado rodando no navegador de outros operadores globais.

## 2. Controle Flexível de Políticas e RLS
No arquivo `schema.sql`, o Supabase tem o RLS (Row Level Security) devidamente ativado. No entanto, as políticas configuradas são extremamente flexíveis:
`CREATE POLICY "Acesso total..." ON ... FOR ALL USING (auth.role() = 'authenticated');`
Isso significa que o banco confia totalmente em quem está logado, independente do cargo real no sistema. Todas as proteções contra edições indesejadas (ex: Impedir que "Recepcionistas" alterem permissões master de sistema) repousam 100% sobre o cliente Front-End ocultar esses botões. Caso as chamadas à API sejam forjadas externamente com o Token válido de um Recepcionista logado, o banco será modificado indevidamente. É necessária a transição de validação para as Policies baseadas em Roles.

## 3. Renderização Reativa "Force Update"
A atual estratégia acoplada do *Supabase Realtime* (em `state.js`) impõe que, diante de absolutamente *qualquer* evento de modificação advindo do Web Socket para a estrutura pública do banco de dados, a interface acione a função `carregarDadosSupabase()`, que repuxa em peso uma matriz integral de todas as tabelas pesadas de máquinas. Subsequentemente, redesenha todo o componente visual raiz correspondente. À medida que o volume de registros e ocorrências da planta escalonarem, esse "Force Update" cego trará gargalos dramáticos de performance no fluxo de rede e perdas de taxa de quadros (FPS) no client-side.

## 4. Poluição de Escopo e Dependências Cíclicas
O `index.html` estipula uma corrente monolítica de mais de 15 tags `<script>` na ordem exata e inquebrável estipulada pelo programador. A não aderência de *EcmaScript Modules* (import/export) não deixa claro quais blocos exportam ou dependem diretamente das variáveis declaradas em outros blocos. Esta arquitetura frágil pode quebrar em implementações triviais por mera reordenação assíncrona ou desatenção em novos mantenedores da base.

## Problemas Recém Resolvidos (Setembro/2026)
- **Falta da Coluna `avatar_base64`**: A tabela `usuarios` estava disparando o erro `42703 column avatar_base64 does not exist` pois a coluna não existia em bancos criados recentemente. A coluna foi adicionada ao `schema.sql` oficial e populada.
- **Conflitos de Papéis e Permissões (RBAC)**: Ajustadas as regras de negócio no frontend (ex: em `funcionarios.js`) para garantir que os diferentes papéis operacionais consigam atuar em seus respectivos módulos sem esbarrar indevidamente em tabelas de controle de acesso não relacionadas ao seu fluxo.
- **Integração do Módulo de BI (Construtor v2)**: Adicionada tela rica de relatórios analíticos sem causar regressões na interface legada de plantas, encapsulando lógicas sensíveis de filtro nas procedures do Postgres com RLS contornado pontualmente.
