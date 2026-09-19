# Silicon Core V2

## Descrição do Projeto
Sistema de gerenciamento e acompanhamento de status de máquinas (planta), projetado para controle de manutenção, recepção e análise de performance (BI). O projeto permite que mantenedores, recepcionistas e administradores interajam em tempo real com o status de cada equipamento na fábrica.

## Stack Tecnológica
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Arquitetura SPA customizada).
- **Backend / Persistência**: Supabase (PostgreSQL, Authentication, Realtime WebSockets).
- **Gráficos / BI**: Chart.js.

## Funcionalidades Principais
- **Gestão de Planta**: Acompanhamento em tempo real do status de máquinas e equipamentos.
- **Recepção e Triagem**: Fluxo de entrada, controle de chamados e encaminhamento para manutenção.
- **Relatórios e BI**: Dashboards interativos e relatórios analíticos de performance da fábrica.
- **Controle de Acesso**: Autenticação de usuários e controle de permissões por perfis/cargos.
- **Personalização de UI**: Interface responsiva com alternância de temas (Claro/Escuro).

## Estrutura do Projeto
- `index.html`: Ponto de entrada (Single Page Application).
- `/css/`: Folhas de estilo centralizadas (`styles.css`).
- `/js/`: Lógica modular separada por domínio (ex: `auth.js`, `planta.js`, `relatorios.js`, `permissoes.js`).
- `/*.sql`: Scripts de banco de dados na raiz (schemas, seeds e migrations do Supabase).
- `/.project-context/`: Documentação técnica detalhada do sistema.

## Como Executar
Sendo uma aplicação estática puramente client-side (Vanilla JS), basta servir o arquivo `index.html` através de qualquer servidor web local (ex: Live Server, http-server, python -m http.server). As credenciais do Supabase já estão configuradas no client (`js/supabase-client.js`).

## Configuração do Banco de Dados (Supabase)
Na raiz do projeto existem scripts SQL que devem ser executados no SQL Editor do Supabase para configurar o backend:
1. `schema.sql`: Cria a estrutura base das tabelas e políticas de segurança (RLS).
2. `seed_maquinas.sql`: Popula o banco com os dados iniciais das máquinas.
3. `setup_bi_completo.sql` e arquivos de migration: Estruturam views e tabelas necessárias para os módulos de análise (BI) e relatórios.

## Documentação Adicional
Para aprofundamento técnico, consulte os arquivos dentro de `.project-context/`:
- `architecture.md`: Arquitetura do projeto.
- `modules.md`: Descrição das responsabilidades de cada arquivo JavaScript.
- `data-flow.md`: Fluxo de dados e conexões em tempo real.
- `decisions.md`: Registro de decisões técnicas.
- `known-issues.md`: Bugs conhecidos e trabalhos pendentes.
