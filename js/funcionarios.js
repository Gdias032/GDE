/**
 * funcionarios.js
 * ---------------------------------------------------------------------------
 * Validações de Identidade e Checklists
 * 
 * Valida os registros e matrículas digitados nos modais da planta.
 * Controla a liberação do botão Start (Mantenedor) e do Checklist (Recepção).
 * ---------------------------------------------------------------------------
 */

// ============================================================================
// VALIDAÇÃO DE MANTENEDOR (INICIAR SERVIÇO)
// ============================================================================

/** Valida o registro do mantenedor atual e libera o botão de Start. */
function buscarMantenedorPorRegistro(registroLogado) {
    const inputNome = document.getElementById('input-responsavel');
    const btnIniciar = document.getElementById('btn-iniciar-servico');

    if (mantenedorValidoAtual && mantenedorValidoAtual.registro === registroLogado) {
        if (inputNome) {
            inputNome.value = mantenedorValidoAtual.nome;
            inputNome.style.color = 'var(--text-light)';
        }

        const maq = todasAsMaquinas.find(m => m.id === maquinaAtualId);
        if (maq && maq.andamento === 'Não Iniciado' && btnIniciar) {
            btnIniciar.disabled = false;
            btnIniciar.style.opacity = '1';
            btnIniciar.style.cursor = 'pointer';
        }
    } else {
        if (inputNome) {
            inputNome.value = '';
            inputNome.style.color = 'var(--text-muted)';
        }
        if (btnIniciar) {
            btnIniciar.disabled = true;
            btnIniciar.style.opacity = '0.5';
            btnIniciar.style.cursor = 'not-allowed';
        }
    }
}

// ============================================================================
// GESTÃO DO CHECKLIST TÉCNICO
// ============================================================================

/**
 * Trava ou libera o checklist de verificação técnica de acordo com a
 * permissão do responsável validado para "Efetuar Recepção".
 */
function atualizarEstadoChecklistPorPermissao(temPermissao) {
    const checkboxes = document.querySelectorAll('.chk-recepcao');
    checkboxes.forEach(chk => chk.disabled = !temPermissao);
    document.querySelectorAll('#checklist-container .switch').forEach(label => {
        label.style.opacity = temPermissao ? '1' : '0.5';
        label.style.cursor = temPermissao ? 'pointer' : 'not-allowed';
        label.onclick = function (e) {
            if (!temPermissao) {
                e.preventDefault();
                abrirModalSemPermissao('Efetuar Recepção');
            }
        };
    });
}

// ============================================================================
// VALIDAÇÃO DE RECEPCIONISTA (EFETUAR RECEPÇÃO)
// ============================================================================

/**
 * Valida o registro digitado como recepcionador.
 * Consulta o banco de dados no Supabase e checa permissões especiais.
 */
async function buscarRecepcionadorPorRegistro(matriculaDigitada) {
    const msg = document.getElementById('msg-validacao-recepcao');
    const displayNome = document.getElementById('nome-recepcionador-display');
    const matricula = matriculaDigitada.trim();

    // Administrador tem validação especial (pode digitar de outros)
    if (perfilAtual === 'admin') {
        const nomeAdmin = usuarioLogadoSessao ? usuarioLogadoSessao.nome : 'Admin';
        if (!matricula) {
            recepcionadorValidoAtual = { nome: nomeAdmin, registro: usuarioLogadoSessao ? usuarioLogadoSessao.registro : 'adm' };
            if (displayNome) {
                displayNome.innerText = `${nomeAdmin} (Administrador)`;
                displayNome.style.color = 'var(--status-green)';
                displayNome.style.borderColor = 'var(--status-green)';
            }
            if (msg) {
                msg.innerText = 'Acesso de Administrador: recepção seguirá registrada em seu nome.';
                msg.style.color = 'var(--status-green)';
            }
            atualizarEstadoChecklistPorPermissao(true);
            return;
        }

        // Admin pesquisando outro funcionário no banco
        const { data: usuarioBusca, error } = await supabaseClient.from('usuarios').select('*').eq('matricula', matricula).single();
        
        if (error || !usuarioBusca) {
            recepcionadorValidoAtual = { nome: nomeAdmin, registro: usuarioLogadoSessao ? usuarioLogadoSessao.registro : 'adm' };
            if (msg) {
                msg.innerText = `Registro não localizado — a recepção seguirá registrada em seu nome (${nomeAdmin}).`;
                msg.style.color = 'var(--status-yellow)';
            }
            atualizarEstadoChecklistPorPermissao(true);
            return;
        }

        const funcionarioTemPermissao = permissoesEspeciais[usuarioBusca.matricula] === true;
        recepcionadorValidoAtual = { nome: usuarioBusca.nome_completo, registro: usuarioBusca.id };
        
        if (displayNome) {
            displayNome.innerText = `${usuarioBusca.nome_completo} (${usuarioBusca.cargo})`;
            displayNome.style.color = funcionarioTemPermissao ? 'var(--status-green)' : 'var(--status-yellow)';
            displayNome.style.borderColor = funcionarioTemPermissao ? 'var(--status-green)' : 'var(--status-yellow)';
        }
        if (msg) {
            msg.innerText = funcionarioTemPermissao
                ? 'Registro validado!'
                : 'Este funcionário ainda não tem permissão própria, mas você (Administrador) pode autorizar esta recepção em nome dele.';
            msg.style.color = funcionarioTemPermissao ? 'var(--status-green)' : 'var(--status-yellow)';
        }
        atualizarEstadoChecklistPorPermissao(true);
        return;
    }

    // Demais perfis (Mantenedor, Recepcionista)
    const usuarioLogado = usuarioLogadoSessao;
    const matriculaLogada = usuarioLogado ? usuarioLogado.matricula : null;

    if (matricula !== '' && matricula !== matriculaLogada) {
        recepcionadorValidoAtual = null;
        if (displayNome) {
            displayNome.innerText = 'Aguardando validação...';
            displayNome.style.color = 'var(--text-muted)';
            displayNome.style.borderColor = 'var(--border-color)';
        }
        if (msg) {
            msg.innerText = 'Você só pode efetuar a recepção com a sua própria matrícula.';
            msg.style.color = 'var(--status-red)';
        }
        atualizarEstadoChecklistPorPermissao(false);
        return;
    }

    if (!matricula) {
        recepcionadorValidoAtual = null;
        if (displayNome) { displayNome.innerText = 'Aguardando validação...'; displayNome.style.color = 'var(--text-muted)'; }
        if (msg) { msg.innerText = 'Informe o registro para validação.'; msg.style.color = 'var(--status-red)'; }
        atualizarEstadoChecklistPorPermissao(false);
        return;
    }

    const temPermissao = (perfilAtual === 'recepcionista') || (permissoesEspeciais[matriculaLogada] === true);

    if (!temPermissao) {
        recepcionadorValidoAtual = null;
        if (displayNome) {
            displayNome.innerText = `${usuarioLogado.nome} (Sem Permissão)`;
            displayNome.style.color = 'var(--status-red)';
            displayNome.style.borderColor = 'var(--status-red)';
        }
        if (msg) {
            msg.innerText = 'Você não possui permissão para efetuar recepção. Solicite ao Admin.';
            msg.style.color = 'var(--status-red)';
        }
        atualizarEstadoChecklistPorPermissao(false);
        return;
    }

    // Sucesso para o usuário padrão
    recepcionadorValidoAtual = usuarioLogado;
    if (displayNome) {
        displayNome.innerText = `${usuarioLogado.nome} (Autorizado)`;
        displayNome.style.color = 'var(--status-green)';
        displayNome.style.borderColor = 'var(--status-green)';
    }
    if (msg) {
        msg.innerText = 'Sua matrícula foi validada para recepção!';
        msg.style.color = 'var(--status-green)';
    }
    atualizarEstadoChecklistPorPermissao(true);
}