# Silicon Core V2

## Descrição do Projeto
Sistema de gerenciamento e acompanhamento de status de máquinas (planta), projetado para controle de manutenção, recepção e análise de performance (BI). O projeto permite que mantenedores, recepcionistas e administradores interajam em tempo real com o status de cada equipamento na fábrica.

## Stack Tecnológica
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Arquitetura SPA customizada).
- **Backend / Persistência**: Supabase (PostgreSQL, Authentication, Realtime WebSockets).
- **Gráficos / BI**: Chart.js.

## Como Executar
Sendo uma aplicação estática puramente client-side (Vanilla JS), basta servir o arquivo `index.html` através de qualquer servidor web local (ex: Live Server, http-server, python -m http.server). As chaves do Supabase necessárias (anon key) já estão configuradas diretamente no client.
