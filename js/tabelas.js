/**
 * tabelas.js
 * ---------------------------------------------------------------------------
 * Renderização das tabelas de listagem: "Recepções" (todas as máquinas)
 * e "Solicitações" (pedidos de permissão especial).
 * ---------------------------------------------------------------------------
 */

function renderizarTabelaRecepcoes(maquinasParaExibir = todasAsMaquinas) {
    const tbody = document.getElementById('tabela-recepcoes-body');
    if (!tbody) return;

    let html = '';
    maquinasParaExibir.forEach(maq => {
        let btnTexto = 'Visualizar';
        if (maq.status === 'dark') btnTexto = 'Iniciar';
        if (maq.status === 'yellow') btnTexto = 'Atuar';
        if (maq.status === 'purple') btnTexto = 'Recepcionar';
        if (maq.status === 'red' && perfilAtual === 'admin') btnTexto = 'Reavaliar';

        html += `
        <tr>
            <td><strong>${escapeHtml(maq.id)}</strong></td>
            <td><span class="badge ${maq.status}">${escapeHtml(maq.andamento)}</span></td>
            <td>${escapeHtml(maq.dataInicio)}</td>
            <td>${escapeHtml(maq.dataFim)}</td>
            <td>${escapeHtml(maq.realizou)}</td>
            <td>${escapeHtml(maq.recepcionou)}</td>
            <td>
                <button class="btn-acao" onclick="navigateTo('recepcao', '${maq.id}')">${btnTexto}</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Nenhuma máquina encontrada.</td></tr>';
}

/** Filtra a tabela de recepções por texto livre (id, status, mantenedor, recepcionador). */
function filtrarTabelaRecepcoes(termo) {
    const busca = termo.toLowerCase().trim();
    const filtradas = todasAsMaquinas.filter(m =>
        m.id.toLowerCase().includes(busca) ||
        m.andamento.toLowerCase().includes(busca) ||
        m.realizou.toLowerCase().includes(busca) ||
        m.recepcionou.toLowerCase().includes(busca)
    );
    renderizarTabelaRecepcoes(filtradas);
}

function renderizarTabelaSolicitacoes() {
    const tbody = document.getElementById('tabela-solicitacoes-body');
    if (!tbody) return;

    let html = '';
    solicitacoesAutorizacao.forEach(sol => {
        let statusBadge = 'dark';
        if (sol.status === 'Pendente') statusBadge = 'yellow';
        if (sol.status === 'Aprovado') statusBadge = 'green';
        if (sol.status === 'Recusado' || sol.status === 'Revogado') statusBadge = 'red';

        let acoesHtml = '<span style="color: var(--text-muted); font-size: 11px;">Sem ações pendentes</span>';

        if (perfilAtual === 'admin') {
            if (sol.status === 'Pendente') {
                acoesHtml = `
                <button class="btn-acao" style="background: rgba(16, 185, 129, 0.2); border-color: var(--status-green); color: #34d399; padding: 5px 10px; font-size: 11px; margin-right: 5px;" onclick="confirmarAcaoPermissao(${sol.id}, 'Aprovado')">Aprovar</button>
                <button class="btn-cancelar" style="padding: 5px 10px; font-size: 11px;" onclick="confirmarAcaoPermissao(${sol.id}, 'Recusado')">Recusar</button>`;
            } else if (sol.status === 'Aprovado') {
                acoesHtml = `
                <button class="btn-cancelar" style="border-color: var(--status-red); color: var(--status-red); font-size: 11px; padding: 5px 10px;" onclick="confirmarAcaoPermissao(${sol.id}, 'Revogado')">Revogar Permissão</button>`;
            }
        }

        html += `
        <tr>
            <td>${escapeHtml(sol.data)}</td>
            <td><strong>${escapeHtml(sol.registro)}</strong></td>
            <td>${escapeHtml(sol.nome)}</td>
            <td><span class="badge purple">${escapeHtml(sol.permissao)}</span></td>
            <td style="max-width: 250px; font-size: 12px; color: var(--text-muted);">${escapeHtml(sol.mensagem)}</td>
            <td><span class="badge ${statusBadge}">${escapeHtml(sol.status)}</span></td>
            <td>${acoesHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Nenhuma solicitação encontrada.</td></tr>';
}
