/**
 * state.js
 * ---------------------------------------------------------------------------
 * Estado global da aplicação e persistência em localStorage.
 *
 * ⚠️ LIMITAÇÃO ARQUITETURAL IMPORTANTE — LEIA ANTES DE COLOCAR EM PRODUÇÃO:
 * Este app guarda TODOS os dados (máquinas, solicitações, permissões,
 * fotos de perfil) em localStorage, que é local a cada navegador/PC.
 * Isso significa que:
 *   - Um mantenedor no computador do Setor A e uma recepcionista no
 *     computador do Setor B NÃO compartilham os mesmos dados — cada
 *     máquina tem sua própria "planta" isolada.
 *   - Duas abas abertas ao mesmo tempo podem sobrescrever uma a outra
 *     (não há travamento/merge de escrita concorrente).
 *   - Limpar o cache do navegador apaga todo o histórico.
 * Para um sistema real de múltiplos usuários/estações, os dados
 * precisam vir de um backend (API + banco de dados), com estas mesmas
 * funções (`salvar*Storage`) substituídas por chamadas fetch().
 * ---------------------------------------------------------------------------
 */

// Estado de navegação / sessão atual
let maquinaAtualId = null;
let perfilAtual = null;               // 'admin' | 'mantenedor' | null
let mantenedorValidoAtual = null;     // funcionário validado como mantenedor atuante
let recepcionadorValidoAtual = null;  // funcionário validado como recepcionador
let meuGraficoBI = null;              // instância do Chart.js da tela de análise

/**
 * Gera a matriz inicial de máquinas (letras x números) definida em
 * CONFIG_PLANTA, todas com status "Não Iniciado".
 */
function gerarMaquinasIniciais() {
    const maquinas = [];
    CONFIG_PLANTA.letras.forEach(letra => {
        for (let i = 1; i <= CONFIG_PLANTA.maquinasPorLinha; i++) {
            maquinas.push({
                id: `${letra}${i}`,
                status: 'dark',
                andamento: 'Não Iniciado',
                dataInicio: '',
                dataFim: '-',
                realizou: '-',
                recepcionou: '',
                obs: ''
            });
        }
    });
    return maquinas;
}

// Carrega do localStorage ou inicializa pela primeira vez
let todasAsMaquinas = lerStorageSeguro('silicon_maquinas', null) || gerarMaquinasIniciais();
if (!lerStorageSeguro('silicon_maquinas', null)) {
    salvarStorageSeguro('silicon_maquinas', todasAsMaquinas);
}

let solicitacoesAutorizacao = lerStorageSeguro('silicon_solicitacoes', solicitacoesIniciais);
let permissoesEspeciais = lerStorageSeguro('silicon_permissoes', {});

/** Persiste as máquinas e atualiza a barra de progresso geral. */
function salvarMaquinasStorage() {
    salvarStorageSeguro('silicon_maquinas', todasAsMaquinas);
    atualizarProgressoGeral();
}

/** Persiste as solicitações e atualiza os badges de notificação. */
function salvarSolicitacoesStorage() {
    salvarStorageSeguro('silicon_solicitacoes', solicitacoesAutorizacao);
    atualizarNotificacoesPendentes();
}

/** Persiste o mapa de permissões especiais concedidas pelo admin. */
function salvarPermissoesStorage() {
    salvarStorageSeguro('silicon_permissoes', permissoesEspeciais);
}

/** Atualiza a barra/percentual de progresso geral (máquinas aprovadas / total). */
function atualizarProgressoGeral() {
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
