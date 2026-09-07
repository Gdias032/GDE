/**
 * recepcao.js
 * ---------------------------------------------------------------------------
 * Tela de "Atuação na Máquina": iniciar/parar serviço, checklist técnico
 * e validação/registro da recepção (aprovada ou rejeitada).
 * ---------------------------------------------------------------------------
 */

// ============================================================================
// CONFIGURAÇÃO DA TELA DE ATUAÇÃO / RECEPÇÃO
// ============================================================================

/** 
 * Prepara a tela de recepção conforme o status da máquina e perfil logado. 
 * Libera botões, carrega inputs e bloqueia edição se necessário.
 */
function configurarTelaRecepcao() {
    const maq = todasAsMaquinas.find(m => m.id === maquinaAtualId);
    if (!maq) return;

    const badge = document.getElementById('maquina-badge');
    badge.innerText = `${maq.id} - ${maq.andamento}`;
    badge.className = `badge ${maq.status}`;
    document.getElementById('label-data-inicio').innerHTML = `<strong>Início:</strong> ${escapeHtml(maq.dataInicio)}`;
    document.getElementById('label-data-fim').innerHTML = `<strong>Término:</strong> ${escapeHtml(maq.dataFim)}`;
    document.getElementById('input-obs').value = maq.obs;

    const btnIniciar = document.getElementById('btn-iniciar-servico');
    const btnParar = document.getElementById('btn-parar-servico');
    const btnSalvar = document.getElementById('btn-salvar-recepcao');
    const btnReabrir = document.getElementById('btn-reabrir-recepcao');
    const checkboxes = document.querySelectorAll('.chk-recepcao');

    document.querySelectorAll('.switch').forEach(label => label.onclick = null); // limpa eventos de telas anteriores

    const cardIdentificacao = document.getElementById('card-identificacao');
    const displayRecepcionador = document.getElementById('nome-recepcionador-display');
    const inputRegistroRecepcao = document.getElementById('input-registro-recepcionador');

    // Reinicia a variável de validação local a cada vez que abre a máquina
    recepcionadorValidoAtual = null;

    if (mantenedorValidoAtual && maq.andamento === 'Não Iniciado') {
        buscarMantenedorPorRegistro(mantenedorValidoAtual.registro);
    }

    btnIniciar.style.display = 'none';
    btnParar.style.display = 'none';
    btnSalvar.style.display = 'none';
    if (btnReabrir) btnReabrir.style.display = 'none';

    if (maq.andamento === 'Não Iniciado') {
        btnIniciar.style.display = 'inline-flex';
        cardIdentificacao.style.display = 'block';
        if (inputRegistroRecepcao) inputRegistroRecepcao.disabled = true;
        checkboxes.forEach(chk => chk.disabled = true);

    } else if (maq.status === 'yellow') {
        btnParar.style.display = 'inline-flex';
        cardIdentificacao.style.display = 'block';
        if (maq.realizou) document.getElementById('input-responsavel').value = maq.realizou;
        if (inputRegistroRecepcao) inputRegistroRecepcao.disabled = true;
        checkboxes.forEach(chk => chk.disabled = true);

    } else if (maq.status === 'purple') {
        btnSalvar.style.display = 'inline-flex';
        cardIdentificacao.style.display = 'block';
        if (maq.realizou) document.getElementById('input-responsavel').value = maq.realizou;

        if (perfilAtual === 'admin') {
            // Administrador pode digitar livremente o registro de quem está
            // recepcionando (ex: para atribuir/autorizar em nome de um
            // funcionário), com a validação de permissão feita em
            // buscarRecepcionadorPorRegistro().
            if (inputRegistroRecepcao) inputRegistroRecepcao.disabled = false;
            buscarRecepcionadorPorRegistro(inputRegistroRecepcao ? inputRegistroRecepcao.value : '');
        } else {
            // CORREÇÃO DE SEGURANÇA: para os demais perfis, o campo de
            // matrícula NÃO pode ser digitado livremente. Antes, qualquer
            // usuário logado podia digitar o registro de outra pessoa com
            // permissão (ex: '2001') e o sistema gravava a recepção como
            // de quem está autenticado na sessão atual.
            const usuarioLogado = usuarioLogadoSessao;
            const matriculaPropria = usuarioLogado ? usuarioLogado.matricula : '';
            if (inputRegistroRecepcao) {
                inputRegistroRecepcao.value = matriculaPropria;
                inputRegistroRecepcao.disabled = true;
            }
            buscarRecepcionadorPorRegistro(matriculaPropria);
        }

    } else {
        cardIdentificacao.style.display = 'block';
        if (maq.realizou) document.getElementById('input-responsavel').value = maq.realizou;
        if (displayRecepcionador) {
            displayRecepcionador.innerText = maq.recepcionou;
            displayRecepcionador.style.color = maq.status === 'green' ? 'var(--status-green)' : 'var(--status-red)';
        }

        if (inputRegistroRecepcao) inputRegistroRecepcao.disabled = true;
        document.getElementById('input-obs').disabled = true;
        checkboxes.forEach(chk => { chk.checked = (maq.status === 'green'); chk.disabled = true; });

        if (maq.status === 'red' && perfilAtual === 'admin' && btnReabrir) {
            btnReabrir.style.display = 'inline-flex';
        }
    }
}

// ============================================================================
// FLUXO DO MANTENEDOR: INICIAR E PARAR SERVIÇO
// ============================================================================

/** Registra o Início da manutenção na máquina */
async function iniciarServico() {
    if (!mantenedorValidoAtual) {
        mostrarAlertaModal('Validação Requerida', 'Atenção: Apenas perfis de mantenedor com matrícula validada podem dar Start!', 'warning');
        return;
    }

    const maq = todasAsMaquinas.find(m => m.id === maquinaAtualId);
    if (!maq) return;

    maq.status = 'yellow';
    maq.andamento = 'Em Progresso';
    maq.dataInicio = new Date().toLocaleDateString('pt-BR');
    maq.dataInicioObj = new Date().toISOString(); // Para uso no banco
    maq.dataFim = '-';
    maq.realizou = mantenedorValidoAtual.nome;
    maq.realizouId = mantenedorValidoAtual.registro; // Registro/ID real do usuario logado

    const sucesso = await salvarMaquinaSupabase(maq.id);
    if (sucesso) {
        configurarTelaRecepcao();
    }
}

/** Confirmação para parar serviço (antes de alterar no banco) */
function confirmarPararServico() {
    const maq = todasAsMaquinas.find(m => m.id === maquinaAtualId);
    if (!maq) return;

    if (maq.realizouId && usuarioLogadoSessao && maq.realizouId !== usuarioLogadoSessao.registro) {
        mostrarAlertaModal('Ação não permitida', 'Esse trabalho só pode ser finalizado pela pessoa que o iniciou.', 'warning');
        return;
    }

    mostrarConfirmacaoModal({
        titulo: "Finalizar Atuação Técnica",
        mensagem: `Tem certeza que deseja finalizar a manutenção na máquina ${maquinaAtualId}? Ela passará para o status "Aguardando Recepção".`,
        textoConfirmar: "Finalizar Serviço",
        corConfirmar: "#8b5cf6",
        onConfirm: pararServico
    });
}

/** Registra a conclusão técnica da manutenção (Status: Aguardando Recepção) */
async function pararServico() {
    const maq = todasAsMaquinas.find(m => m.id === maquinaAtualId);
    if (!maq) return;

    maq.status = 'purple';
    maq.andamento = 'Aguardando Recepção';
    maq.dataFim = new Date().toLocaleDateString('pt-BR');
    maq.dataFimObj = new Date().toISOString(); // Para o banco
    maq.obs = document.getElementById('input-obs').value;

    const sucesso = await salvarMaquinaSupabase(maq.id);
    if (sucesso) {
        mostrarAlertaModal('Serviço Concluído', `Atuação finalizada na Máquina ${maq.id}! Status alterado para: Aguardando Recepção.`, 'success');
        navigateTo('planta');
    }
}

// ============================================================================
// FLUXO DE RECEPÇÃO: SALVAR OU SOLICITAR PERMISSÃO
// ============================================================================

/** Verifica permissão antes de tentar salvar; se não tiver, abre o fluxo de solicitação. */
function tentarSalvarRecepcao() {
    if (!verificarPermissaoEfetuarRecepcao()) {
        abrirModalSemPermissao('Efetuar Recepção');
        return;
    }
    salvarRecepcao();
}

/** Avalia os itens do checklist e decide aprovar (Verde) ou rejeitar (Vermelho) */
async function salvarRecepcao() {
    if (!recepcionadorValidoAtual) {
        mostrarAlertaModal('Identificação Necessária', 'Atenção: sua matrícula precisa estar validada e com permissão de acesso para efetuar a recepção desta máquina!', 'warning');
        return;
    }

    const maq = todasAsMaquinas.find(m => m.id === maquinaAtualId);
    if (!maq) return;

    const totalCheckboxes = document.querySelectorAll('.chk-recepcao').length;
    const checkboxesMarcados = document.querySelectorAll('.chk-recepcao:checked').length;

    maq.obs = document.getElementById('input-obs').value;
    maq.recepcionou = recepcionadorValidoAtual.nome;
    maq.recepcionouId = recepcionadorValidoAtual.registro === 'adm' ? null : recepcionadorValidoAtual.registro; // Admin default

    if (checkboxesMarcados === totalCheckboxes) {
        maq.status = 'green';
        maq.andamento = 'Recepção Aprovada';
    } else {
        maq.status = 'red';
        maq.andamento = 'Recepção Rejeitada';
    }

    const sucesso = await salvarMaquinaSupabase(maq.id);
    if (sucesso) {
        if (maq.status === 'green') {
            mostrarAlertaModal('Recepção Aprovada', `Recepção da Máquina ${maq.id} APROVADA por ${maq.recepcionou}!`, 'success');
        } else {
            mostrarAlertaModal('Recepção Rejeitada', `Recepção REJEITADA por ${maq.recepcionou}. A máquina possui itens pendentes.`, 'danger');
        }
        navigateTo('planta');
    }
}

// ============================================================================
// FLUXO DO ADMIN: REABRIR MÁQUINA
// ============================================================================

/** Confirmação para desfazer uma recepção rejeitada (somente Admin) */
function confirmarReabrirRecepcaoRejeitada() {
    mostrarConfirmacaoModal({
        titulo: "Reabrir Recepção Rejeitada",
        mensagem: `Atenção Administrador: Deseja reabrir a Máquina ${maquinaAtualId} alterando o status de "Rejeitada" de volta para "Aguardando Recepção"?`,
        textoConfirmar: "Reabrir para Inspeção",
        corConfirmar: "#f59e0b",
        onConfirm: reabrirRecepcaoRejeitada
    });
}

/** Reverte o status da máquina rejeitada para "Aguardando Recepção" (Roxo) */
async function reabrirRecepcaoRejeitada() {
    const maq = todasAsMaquinas.find(m => m.id === maquinaAtualId);
    if (!maq) return;

    maq.status = 'purple';
    maq.andamento = 'Aguardando Recepção';
    maq.obs += ` [Status reaberto pelo Admin em ${new Date().toLocaleDateString('pt-BR')}]`;

    const sucesso = await salvarMaquinaSupabase(maq.id);
    if (sucesso) {
        mostrarAlertaModal('Status Alterado', `A Máquina ${maq.id} foi reaberta e retornou ao status "Aguardando Recepção".`, 'info');
        navigateTo('planta');
    }
}