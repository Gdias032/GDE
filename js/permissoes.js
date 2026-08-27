/**
 * permissoes.js
 * ---------------------------------------------------------------------------
 * Fluxo de solicitação de permissão especial ("Efetuar Recepção") e
 * aprovação/recusa/revogação pelo Administrador.
 * ---------------------------------------------------------------------------
 */

function abrirModalSemPermissao(permissaoRequerida = 'Efetuar Recepção') {
    let modal = document.getElementById('modal-permissao');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-permissao';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
    <div class="modal-card">
        <div class="modal-header">
            <h3 style="display: flex; align-items:center; gap:8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Permissão Restrita
            </h3>
            <span class="modal-close" onclick="fecharModalPermissao()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
        </div>
        <div class="modal-body">
            <p style="color: var(--status-red); font-weight: bold; margin-bottom: 10px;">
                Seu perfil não possui autorização para: <u style="color: var(--text-light);">${escapeHtml(permissaoRequerida)}</u>.
            </p>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">
                Escreva abaixo a justificativa para avaliação do Administrador:
            </p>
            <textarea id="msg-solicitacao-permissao" class="modern-textarea" style="height: 90px; margin-bottom: 15px; width:100%;" placeholder="Ex: Necessito realizar a recepção por falta de supervisor no turno..."></textarea>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="btn-cancelar" onclick="fecharModalPermissao()">Cancelar</button>
            <button class="btn-modern btn-purple" onclick="enviarSolicitacaoPermissao('${permissaoRequerida}')">Enviar Solicitação</button>
        </div>
    </div>`;
    modal.style.display = 'flex';
}

function fecharModalPermissao() {
    const modal = document.getElementById('modal-permissao');
    if (modal) modal.style.display = 'none';
}

async function enviarSolicitacaoPermissao(permissao) {
    const msgInput = document.getElementById('msg-solicitacao-permissao');
    const msg = msgInput ? msgInput.value.trim() : '';

    if (!msg) {
        mostrarAlertaModal('Atenção', 'Por favor, descreva a justificativa para a solicitação.', 'warning');
        return;
    }

    // O registro (id do usuario logado) vem do auth.js
    const usuarioLogado = mantenedorValidoAtual || recepcionadorValidoAtual;
    const solicitanteId = usuarioLogado ? usuarioLogado.registro : null;
    
    if (!solicitanteId) {
        mostrarAlertaModal('Erro', 'Usuário não identificado corretamente.', 'danger');
        return;
    }

    const { error } = await supabaseClient.from('solicitacoes_permissao').insert({
        id_solicitante: solicitanteId,
        tipo_permissao: permissao,
        justificativa: msg,
        status: 'PENDENTE'
    });

    if (error) {
        console.error('Erro ao salvar solicitação:', error);
        mostrarAlertaModal('Erro', 'Ocorreu um erro ao enviar a solicitação.', 'danger');
        return;
    }

    // Recarrega os dados globais
    await carregarDadosSupabase();

    fecharModalPermissao();
    mostrarAlertaModal('Solicitação Enviada', 'Sua solicitação foi enviada com sucesso ao Administrador!', 'success');

    if (document.getElementById('tabela-solicitacoes-body')) {
        renderizarTabelaSolicitacoes();
    }
}

/** Verifica se o responsável atual pela recepção tem permissão para efetuá-la. */
function verificarPermissaoEfetuarRecepcao() {
    if (perfilAtual === 'admin') return true;
    const reg = recepcionadorValidoAtual ? recepcionadorValidoAtual.registro : (mantenedorValidoAtual ? mantenedorValidoAtual.registro : '1001');
    return permissoesEspeciais[reg] === true;
}

/**
 * Ação do Administrador sobre uma solicitação (Aprovar / Recusar / Revogar).
 * Reforço de segurança: só o Admin pode chamar isso, mesmo que a função
 * venha a ser invocada por outro caminho que não os botões da tela.
 */
function confirmarAcaoPermissao(idSolicitacao, novoStatus) {
    if (perfilAtual !== 'admin') return;

    const sol = solicitacoesAutorizacao.find(s => s.id === idSolicitacao);
    if (!sol) return;

    if (novoStatus === 'Aprovado') {
        alterarStatusSolicitacao(idSolicitacao, 'Aprovado');
    } else if (novoStatus === 'Recusado') {
        mostrarConfirmacaoModal({
            titulo: "Recusar Solicitação",
            mensagem: `Tem certeza que deseja recusar a solicitação de ${sol.nome}?`,
            textoConfirmar: "Recusar",
            corConfirmar: "var(--status-red)",
            onConfirm: () => alterarStatusSolicitacao(idSolicitacao, 'Recusado')
        });
    } else if (novoStatus === 'Revogado') {
        mostrarConfirmacaoModal({
            titulo: "Revogar Permissão",
            mensagem: `Deseja REVOGAR a permissão concedida a ${sol.nome} (Matrícula ${sol.registro})? Este usuário deixará de efetuar recepções.`,
            textoConfirmar: "Revogar Permissão",
            corConfirmar: "var(--status-red)",
            onConfirm: () => alterarStatusSolicitacao(idSolicitacao, 'Revogado')
        });
    }
}

async function alterarStatusSolicitacao(idSolicitacao, novoStatus) {
    if (perfilAtual !== 'admin') return;

    const sol = solicitacoesAutorizacao.find(s => s.id === idSolicitacao);
    if (!sol) return;

    // Converte status do front para o enum do banco
    const statusBanco = novoStatus === 'Aprovado' ? 'APROVADA' : 'REJEITADA'; // Revogado também fica como rejeitada para fechar a sol.

    const { error: errorUpdate } = await supabaseClient
        .from('solicitacoes_permissao')
        .update({ status: statusBanco, id_admin_resolucao: perfilAtual === 'admin' ? (mantenedorValidoAtual ? mantenedorValidoAtual.registro : null) : null, data_resolucao: new Date().toISOString() })
        .eq('id', idSolicitacao);
    
    if (errorUpdate) {
        console.error('Erro ao atualizar solicitação:', errorUpdate);
        return;
    }

    if (novoStatus === 'Aprovado') {
        const { error: errorInsert } = await supabaseClient.from('permissoes_especiais').insert({
            id_usuario: sol.solicitanteId,
            permissao: sol.permissao
        });
        if (!errorInsert) {
            mostrarAlertaModal('Permissão Concedida', `A permissão de "${sol.permissao}" foi APROVADA para ${sol.nome}.`, 'success');
        }
    } else if (novoStatus === 'Revogado') {
        // Exclui da tabela permissões especiais
        await supabaseClient.from('permissoes_especiais').delete().eq('id_usuario', sol.solicitanteId);
        mostrarAlertaModal('Permissão Revogada', `A permissão do usuário ${sol.nome} foi cancelada com sucesso.`, 'danger');
    } else {
        mostrarAlertaModal('Solicitação Recusada', `A solicitação de ${sol.nome} foi recusada.`, 'info');
    }

    // Recarrega todos os dados
    await carregarDadosSupabase();
    
    if (document.getElementById('tabela-solicitacoes-body')) {
        renderizarTabelaSolicitacoes();
    }
}
