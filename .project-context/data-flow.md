# Fluxos de Dados Principais (Data Flow)

## 1. Inicialização e Recuperação de Sessão
1. A aplicação é carregada (`main.js`).
2. Verifica se existe uma sessão válida persistida (Storage do Supabase) chamando `supabaseClient.auth.getSession()`.
3. Se existir, consulta a tabela `usuarios` no DB para validar e extrair o `perfil_acesso`.
4. Constrói o objeto global em memória `usuarioLogadoSessao` e invoca a função `fazerLogin()`.
5. Aciona o carregamento inicial de dados (Passo 3).

## 2. Autenticação Explícita (Login)
1. O usuário submete suas credenciais (email/senha) através do formulário gerado em `views.login`.
2. O módulo `auth.js` (`realizarLogin()`) encaminha os dados para o Supabase Auth.
3. Se as credenciais forem validadas, a aplicação repete os passos de 3 a 5 do fluxo anterior, liberando as barras de navegação com restrições baseadas no perfil retornado e acionando o preenchimento de dados.

## 3. População de Estado e Renderização (Fetch)
1. Ao fazer login, `state.js` -> `carregarDadosSupabase()` executa consultas (`select()`) massivas ao Supabase.
2. Utiliza Joins (relações) nativas do PostgREST (Supabase API) para trazer informações vinculadas como o nome do mantenedor (ex: `mantenedor:id_mantenedor_atual(nome_completo)`).
3. Preenche as variáveis de estado global (`todasAsMaquinas`, `solicitacoesAutorizacao`, `permissoesEspeciais`).
4. Invoca cálculos locais (`atualizarProgressoGeral()`).
5. A função `navigateTo()` insere a view padrão da Planta (dashboard) e invoca seu respectivo método de renderização da interface (`renderizarMatriz()`).

## 4. Mutação de Dados (Update Machine Workflow)
1. Um usuário (ex: Mantenedor) atua sobre uma máquina específica (na view `recepcao`).
2. Eventos de UI capturam a mudança (novo status, apontamentos) e os módulos como `recepcao.js` atualizam as propriedades do objeto em memória referente a essa máquina.
3. Invocam então o serviço `state.js` -> `salvarMaquinaSupabase(id)`.
4. É processado um `UPDATE` no Supabase apenas na tabela `maquinas_planta`.

## 5. Sincronização por Tempo Real (Realtime WebSockets)
1. Durante a etapa 1 de Inicialização, a aplicação aciona `inicializarRealtime()` em `state.js`.
2. A aplicação assina o canal global `schema-db-changes` ouvindo por mutações na API do banco.
3. Quando o banco notifica uma mudança em qualquer parte do mundo, a função de Callback é disparada, executando a ação inteira de *Fetching* e população do estado novamente (`carregarDadosSupabase()`).
4. As funções de renderização UI das views abertas atualmente são disparadas para refletir a nova verdade de forma instantânea (permitindo que dois usuários colaborem ou vejam a planta modificando seu layout em tempo real).
