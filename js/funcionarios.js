/**
 * funcionarios.js
 * ---------------------------------------------------------------------------
 * Validação de matrícula/registro de mantenedores e recepcionadores,
 * e bloqueio/liberação do checklist conforme permissão do usuário.
 * ---------------------------------------------------------------------------
 */

/** Valida o registro digitado como mantenedor atuante e libera o botão de Start. */
function buscarMantenedorPorRegistro(registroDigitado) {
    const inputNome = document.getElementById('input-responsavel');
    const btnIniciar = document.getElementById('btn-iniciar-servico');
    const encontrado = bancoFuncionarios.find(f => f.registro === registroDigitado.trim());

    if (encontrado) {
        mantenedorValidoAtual = encontrado;
        if (inputNome) {
            inputNome.value = encontrado.nome;
            inputNome.style.color = 'var(--text-light)';
        }

        const maq = todasAsMaquinas.find(m => m.id === maquinaAtualId);
        if (maq && maq.andamento === 'Não Iniciado' && btnIniciar) {
            btnIniciar.disabled = false;
            btnIniciar.style.opacity = '1';
            btnIniciar.style.cursor = 'pointer';
        }
    } else {
        mantenedorValidoAtual = null;
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

/**
 * Valida o registro digitado como recepcionador. O Administrador tem
 * permissão geral automática (mesmo sem registro cadastrado); os demais
 * perfis precisam de um registro autorizado pelo Admin em "Solicitações".
 */
function buscarRecepcionadorPorRegistro(registroDigitado) {
    const msg = document.getElementById('msg-validacao-recepcao');
    const displayNome = document.getElementById('nome-recepcionador-display');
    const registro = registroDigitado.trim();
    const encontrado = bancoFuncionarios.find(f => f.registro === registro);

    if (perfilAtual === 'admin') {
        if (!encontrado) {
            recepcionadorValidoAtual = ADMIN_RECEPCIONADOR_PADRAO;
            if (displayNome) {
                displayNome.innerText = 'Master / Admin (Administrador)';
                displayNome.style.color = 'var(--status-green)';
                displayNome.style.borderColor = 'var(--status-green)';
            }
            if (msg) {
                msg.innerText = registro === ''
                    ? 'Acesso de Administrador: permissão geral concedida automaticamente. Se quiser, digite o registro de um funcionário para atribuir a ele.'
                    : 'Registro não localizado — a recepção seguirá registrada em seu nome (Administrador).';
                msg.style.color = registro === '' ? 'var(--status-green)' : 'var(--status-yellow)';
            }
            atualizarEstadoChecklistPorPermissao(true);
            return;
        }

        const funcionarioTemPermissao = permissoesEspeciais[encontrado.registro] === true;
        recepcionadorValidoAtual = encontrado;
        if (displayNome) {
            displayNome.innerText = `${encontrado.nome} (${encontrado.cargo})`;
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

    // Demais perfis (ex.: Mantenedor): só podem recepcionar com a PRÓPRIA
    // matrícula (a de quem está autenticado na sessão), nunca com o
    // registro de outra pessoa — mesmo que essa pessoa tenha permissão.
    //
    // CORREÇÃO DE SEGURANÇA: esta validação existe mesmo com o campo
    // travado (disabled) em recepcao.js, como segunda camada de defesa
    // caso alguém tente forçar a chamada desta função via console/DevTools
    // com o registro de outro funcionário para "assinar" em nome dele.
    const registroDoUsuarioLogado = mantenedorValidoAtual ? mantenedorValidoAtual.registro : null;
    if (registro !== '' && registro !== registroDoUsuarioLogado) {
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

    if (!encontrado) {
        recepcionadorValidoAtual = null;
        if (displayNome) {
            displayNome.innerText = 'Aguardando validação...';
            displayNome.style.color = 'var(--text-muted)';
            displayNome.style.borderColor = 'var(--border-color)';
        }
        if (msg) {
            msg.innerText = registro === '' ? 'Informe o registro para validação.' : 'Registro não localizado no banco de dados.';
            msg.style.color = 'var(--status-red)';
        }
        atualizarEstadoChecklistPorPermissao(false);
        return;
    }

    const temPermissao = permissoesEspeciais[encontrado.registro] === true;

    if (!temPermissao) {
        recepcionadorValidoAtual = null;
        if (displayNome) {
            displayNome.innerText = `${encontrado.nome} (${encontrado.cargo})`;
            displayNome.style.color = 'var(--status-red)';
            displayNome.style.borderColor = 'var(--status-red)';
        }
        if (msg) {
            msg.innerText = 'Este usuário não possui permissão para efetuar recepção.';
            msg.style.color = 'var(--status-red)';
        }
        atualizarEstadoChecklistPorPermissao(false);
        mostrarAlertaModal(
            'Acesso Negado',
            `${encontrado.nome} (matrícula ${encontrado.registro}) não possui permissão para efetuar recepção. Apenas usuários autorizados (ou o Administrador) podem validar esta etapa.`,
            'danger'
        );
        return;
    }

    recepcionadorValidoAtual = encontrado;
    if (displayNome) {
        displayNome.innerText = `${encontrado.nome} (${encontrado.cargo})`;
        displayNome.style.color = 'var(--status-green)';
        displayNome.style.borderColor = 'var(--status-green)';
    }
    if (msg) {
        msg.innerText = 'Registro validado!';
        msg.style.color = 'var(--status-green)';
    }
    atualizarEstadoChecklistPorPermissao(true);
}