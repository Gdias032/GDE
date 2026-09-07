/**
 * state.js
 * ---------------------------------------------------------------------------
 * Estado global da aplicação e sincronização com Supabase.
 *
 * Agora, todos os dados são carregados do banco via `carregarDadosSupabase()`
 * de forma assíncrona.
 * ---------------------------------------------------------------------------
 */

// Estado de navegação / sessão atual
let maquinaAtualId = null;
let perfilAtual = null;               // 'admin' | 'mantenedor' | null
let mantenedorValidoAtual = null;     // funcionário validado como mantenedor atuante na máquina
let recepcionadorValidoAtual = null;  // funcionário validado como recepcionador na máquina
let usuarioLogadoSessao = null;       // Dados REAIS da sessão do usuário logado (nome, matricula, cargo, etc)
let meuGraficoBI = null;              // instância do Chart.js da tela de análise

// Dados do banco
let todasAsMaquinas = [];
let solicitacoesAutorizacao = [];
let permissoesEspeciais = {};

/**
 * Carrega todos os dados iniciais do Supabase após o login.
 * Usa joins (relações) para trazer os nomes vinculados aos IDs das tabelas.
 */
async function carregarDadosSupabase() {
    // 1. Carregar Máquinas
    const { data: maqData, error: maqError } = await supabaseClient
        .from('maquinas_planta')
        .select(`
            *,
            mantenedor:id_mantenedor_atual(nome_completo, avatar_base64),
            recepcionista:id_recepcionista_atual(nome_completo, avatar_base64)
        `)
        .order('linha', { ascending: true })
        .order('coluna', { ascending: true });
    
    if (maqError) {
        console.error('Erro ao carregar máquinas:', maqError);
    } else if (maqData) {
        todasAsMaquinas = maqData.map(m => ({
            id: m.id,
            status: m.status_cor,
            andamento: m.andamento,
            realizou: m.mantenedor ? m.mantenedor.nome_completo : '-',
            realizouId: m.id_mantenedor_atual, // Guardado para usar no update depois
            mantenedorAvatar: m.mantenedor ? m.mantenedor.avatar_base64 : null,
            recepcionou: m.recepcionista ? m.recepcionista.nome_completo : '',
            recepcionouId: m.id_recepcionista_atual,
            recepcionistaAvatar: m.recepcionista ? m.recepcionista.avatar_base64 : null,
            dataInicio: m.data_inicio ? new Date(m.data_inicio).toLocaleDateString('pt-BR') : '',
            dataFim: m.data_fim ? new Date(m.data_fim).toLocaleDateString('pt-BR') : '-',
            obs: m.observacoes || ''
        }));
    }

    // 2. Carregar Solicitações
    const { data: solData, error: solError } = await supabaseClient
        .from('solicitacoes_permissao')
        .select(`
            *,
            solicitante:id_solicitante(matricula, nome_completo)
        `)
        .order('data_solicitacao', { ascending: false });

    if (solError) {
        console.error('Erro ao carregar solicitações:', solError);
    } else if (solData) {
        solicitacoesAutorizacao = solData.map(s => ({
            id: s.id, // UUID
            registro: s.solicitante ? s.solicitante.matricula : 'Desconhecido',
            solicitanteId: s.id_solicitante,
            nome: s.solicitante ? s.solicitante.nome_completo : 'Desconhecido',
            permissao: s.tipo_permissao,
            mensagem: s.justificativa || '',
            status: s.status === 'PENDENTE' ? 'Pendente' : (s.status === 'APROVADA' ? 'Aprovado' : 'Recusado'),
            data: new Date(s.data_solicitacao).toLocaleDateString('pt-BR')
        }));
    }

    // 3. Carregar Permissões Especiais Ativas
    const { data: permData, error: permError } = await supabaseClient
        .from('permissoes_especiais')
        .select(`
            *,
            usuario:id_usuario(matricula)
        `);
    
    if (permError) {
        console.error('Erro ao carregar permissões:', permError);
    } else if (permData) {
        permissoesEspeciais = {};
        permData.forEach(p => {
            if (p.usuario) {
                permissoesEspeciais[p.usuario.matricula] = true;
            }
        });
    }

    atualizarProgressoGeral();
    atualizarNotificacoesPendentes();
}

/** Salva as alterações de uma MÁQUINA no Supabase (Update) */
async function salvarMaquinaSupabase(maquinaId) {
    const maq = todasAsMaquinas.find(m => m.id === maquinaId);
    if (!maq) return false;

    // Convertendo dados do front pro formato do banco (null em vez de '-' etc)
    const dadosUpdate = {
        status_cor: maq.status,
        andamento: maq.andamento,
        id_mantenedor_atual: maq.realizouId || null,
        id_recepcionista_atual: maq.recepcionouId || null,
        data_inicio: maq.dataInicio !== '' ? maq.dataInicioObj || new Date().toISOString() : null,
        data_fim: maq.dataFim !== '-' ? maq.dataFimObj || new Date().toISOString() : null,
        observacoes: maq.obs
    };

    const { error } = await supabaseClient
        .from('maquinas_planta')
        .update(dadosUpdate)
        .eq('id', maquinaId);

    if (error) {
        console.error('Erro ao salvar máquina:', error);
        return false;
    }
    
    atualizarProgressoGeral();
    return true;
}

/** Atualiza a barra/percentual de progresso geral (máquinas aprovadas / total). */
function atualizarProgressoGeral() {
    if (todasAsMaquinas.length === 0) return;
    const concluidas = todasAsMaquinas.filter(m => m.status === 'green').length;
    const porcentagem = Math.round((concluidas / todasAsMaquinas.length) * 100);
    const elBarra = document.getElementById('barra-progresso-total');
    const elTexto = document.getElementById('texto-progresso-total');
    if (elBarra) elBarra.style.width = `${porcentagem}%`;
    if (elTexto) elTexto.innerText = `${porcentagem}%`;
}

/** Atualiza os 3 badges de contagem de solicitações pendentes (sino, sidebar, topnav). */
function atualizarNotificacoesPendentes() {
    const qtdPendentes = solicitacoesAutorizacao.filter(s => s.status === 'Pendente').length;
    atualizarBadgeElemento('notif-badge', qtdPendentes);
    atualizarBadgeElemento('sidebar-solicitacoes-badge', qtdPendentes);
    atualizarBadgeElemento('topnav-solicitacoes-badge', qtdPendentes);
}

/** Inicializa os listeners do Supabase Realtime para que a tela atualize sozinha */
let realtimeAtivo = false;
function inicializarRealtime() {
    if (realtimeAtivo) return; // Evita criar multiplos canais
    
    supabaseClient
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            async (payload) => {
                console.log('Mudança no banco detectada em tempo real!', payload);
                // Busca os dados novos do banco
                await carregarDadosSupabase();
                
                // Re-renderiza a tela atual para refletir as mudanças imediatamente
                if (typeof renderizarMatriz === 'function' && document.getElementById('matriz-planta')) {
                    renderizarMatriz();
                    renderizarAnalisesRapidas();
                }
                if (typeof renderizarTabelaSolicitacoes === 'function' && document.getElementById('tabela-solicitacoes-body')) {
                    renderizarTabelaSolicitacoes();
                }
                // Se a tela de recepção (máquina aberta) estiver visível e a máquina foi alterada, atualiza a tela
                if (typeof configurarTelaRecepcao === 'function' && maquinaAtualId && document.getElementById('view-recepcao').style.display === 'block') {
                    configurarTelaRecepcao();
                }
            }
        )
        .subscribe();
    
    realtimeAtivo = true;
}
