/**
 * perfil.js
 * ---------------------------------------------------------------------------
 * Modal "Meu Perfil": exibe dados do usuário logado e permite trocar a
 * foto de avatar (guardada em base64 no localStorage).
 *
 * NOTA: como a foto é salva em base64 no localStorage, imagens grandes
 * consomem bastante espaço (o limite típico de localStorage é ~5-10MB
 * por origem). Por isso já existe um limite de 2MB por imagem abaixo —
 * não remova essa validação.
 * ---------------------------------------------------------------------------
 */

function chaveFotoAtual() {
    if (usuarioLogadoSessao) {
        return `silicon_foto_${usuarioLogadoSessao.registro}`;
    }
    return 'silicon_foto_adm';
}

function renderizarAvatarUsuario() {
    const userCircle = document.querySelector('.user-circle');
    const sidebarAvatar = document.querySelector('.sidebar .avatar');
    let foto = usuarioLogadoSessao ? usuarioLogadoSessao.avatar : null;

    if (foto) {
        if (userCircle) {
            userCircle.style.backgroundImage = `url(${foto})`;
            userCircle.style.backgroundSize = 'cover';
            userCircle.style.backgroundPosition = 'center';
            userCircle.innerText = '';
        }
        if (sidebarAvatar) {
            sidebarAvatar.style.backgroundImage = `url(${foto})`;
            sidebarAvatar.style.backgroundSize = 'cover';
            sidebarAvatar.style.backgroundPosition = 'center';
            sidebarAvatar.innerText = '';
        }
    } else {
        const iniciais = (usuarioLogadoSessao && usuarioLogadoSessao.perfil === 'admin') ? 'SA' : 
                         (usuarioLogadoSessao && usuarioLogadoSessao.perfil === 'recepcionista' ? 'RC' : 'MN');
                         
        if (userCircle) {
            userCircle.style.backgroundImage = '';
            userCircle.innerText = iniciais;
        }
        if (sidebarAvatar) {
            sidebarAvatar.style.backgroundImage = '';
            sidebarAvatar.innerText = iniciais;
            sidebarAvatar.style.display = 'flex';
            sidebarAvatar.style.alignItems = 'center';
            sidebarAvatar.style.justifyContent = 'center';
            sidebarAvatar.style.color = '#fff';
            sidebarAvatar.style.fontWeight = '700';
        }
    }
}

function abrirModalPerfil() {
    if (!perfilAtual) return;
    let modal = document.getElementById('modal-perfil');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-perfil';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const usuarioLogado = usuarioLogadoSessao;
    const nome = usuarioLogado ? usuarioLogado.nome : 'Master / Admin';
    const cargo = usuarioLogado && usuarioLogado.cargo ? usuarioLogado.cargo : (perfilAtual === 'admin' ? 'Administrador do Sistema' : 'Funcionário');
    const matricula = usuarioLogado && usuarioLogado.matricula ? usuarioLogado.matricula : '—';
    const nivelAcesso = perfilAtual === 'admin' ? 'Administrador' : (perfilAtual === 'recepcionista' ? 'Recepcionista' : 'Mantenedor');
    let foto = usuarioLogadoSessao ? usuarioLogadoSessao.avatar : null;
    const iniciais = perfilAtual === 'mantenedor' ? 'MN' : (perfilAtual === 'recepcionista' ? 'RC' : 'SA');

    modal.innerHTML = `
    <div class="modal-card" style="text-align:center; max-width: 360px;">
        <div class="modal-header" style="margin-bottom: 18px;">
            <h3 style="margin:0;">Meu Perfil</h3>
            <span class="modal-close" onclick="fecharModalPerfil()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
        </div>
        <div class="perfil-avatar-wrapper" onclick="document.getElementById('input-foto-perfil').click()" title="Clique para alterar a foto">
            <div class="perfil-avatar-img" id="perfil-avatar-preview" style="${foto ? `background-image:url('${foto}');` : ''}">${foto ? '' : iniciais}</div>
            <div class="perfil-avatar-overlay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>Alterar foto</span>
            </div>
        </div>
        ${foto ? `<button style="background: none; border: none; color: var(--status-red); font-size: 11px; margin-top: 8px; cursor: pointer; text-decoration: underline;" onclick="removerFotoPerfil()">Remover foto</button>` : ''}
        <input type="file" id="input-foto-perfil" accept="image/*" style="display:none;" onchange="trocarFotoPerfil(this)">
        <h3 style="margin-top: 16px; color: var(--text-light); font-size: 17px;">${escapeHtml(nome)}</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-top: 2px;">${escapeHtml(cargo)}</p>
        <div class="perfil-info-box">
            <div><span>Matrícula</span><strong>${escapeHtml(matricula)}</strong></div>
            <div><span>Nível de Acesso</span><strong>${escapeHtml(nivelAcesso)}</strong></div>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-top: 14px; line-height: 1.4;">Apenas a foto de perfil pode ser alterada por aqui. Para outras alterações de cadastro, contate o Administrador.</p>
        ${perfilAtual === 'mantenedor' || perfilAtual === 'recepcionista' || perfilAtual === 'admin' ? `
        <button class="btn-modern btn-purple" style="width: 100%; margin-top: 15px; justify-content: center;" onclick="fecharModalPerfil(); navigateTo('estatisticasFuncionario');">
            Ver Minhas Estatísticas
        </button>` : ''}
    </div>`;
    modal.style.display = 'flex';
}

function fecharModalPerfil() {
    const modal = document.getElementById('modal-perfil');
    if (modal) modal.style.display = 'none';
}

async function trocarFotoPerfil(input) {
    const arquivo = input.files && input.files[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
        mostrarAlertaModal('Formato Inválido', 'Por favor, selecione um arquivo de imagem válido.', 'warning');
        return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
        mostrarAlertaModal('Arquivo Muito Grande', 'A imagem deve ter no máximo 2MB.', 'warning');
        return;
    }

    const leitor = new FileReader();
    leitor.onload = async function (e) {
        const dataUrl = e.target.result;
        
        if (!usuarioLogadoSessao || !usuarioLogadoSessao.registro) {
            mostrarAlertaModal('Erro', 'Usuário não logado.', 'warning');
            return;
        }

        const { error } = await supabaseClient
            .from('usuarios')
            .update({ avatar_base64: dataUrl })
            .eq('id', usuarioLogadoSessao.registro);

        if (error) {
            console.error('Erro ao salvar foto', error);
            mostrarAlertaModal('Não foi possível salvar', 'Erro ao salvar a imagem no banco de dados.', 'danger');
            return;
        }

        usuarioLogadoSessao.avatar = dataUrl;
        renderizarAvatarUsuario();

        // Atualiza a interface do modal reabrindo-o para mostrar o botão de remover foto
        abrirModalPerfil();
        mostrarAlertaModal('Foto Atualizada', 'Sua foto de perfil foi atualizada com sucesso!', 'success');
    };
    leitor.readAsDataURL(arquivo);
}

async function removerFotoPerfil() {
    if (!usuarioLogadoSessao || !usuarioLogadoSessao.registro) {
        mostrarAlertaModal('Erro', 'Usuário não logado.', 'warning');
        return;
    }

    const { error } = await supabaseClient
        .from('usuarios')
        .update({ avatar_base64: null })
        .eq('id', usuarioLogadoSessao.registro);

    if (error) {
        console.error('Erro ao remover foto', error);
        mostrarAlertaModal('Erro', 'Erro ao remover a foto no banco de dados.', 'danger');
        return;
    }

    usuarioLogadoSessao.avatar = null;
    renderizarAvatarUsuario();
    abrirModalPerfil(); // Reabre para atualizar a UI do modal
    mostrarAlertaModal('Sucesso', 'Sua foto de perfil foi removida.', 'success');
}

// Removido salvarStorageSeguroBruto e localStorage.

async function renderizarEstatisticasFuncionario() {
    if (!usuarioLogadoSessao) return;

    let meta = parseInt(localStorage.getItem('bi_meta_individual')) || 30;
    const elMeta = document.getElementById('estatisticas-meta-individual');
    if (elMeta) elMeta.textContent = meta;

    const tbody = document.getElementById('tabela-estatisticas-recentes');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;"><div class="skeleton" style="width: 100%; height: 20px;"></div></td></tr>';

    try {
        // Fetch all the machines from cache or DB using fetchPlantaData if possible, or directly from Supabase
        let maquinas = [];
        if (typeof fetchPlantaData === 'function') {
            maquinas = await fetchPlantaData();
        } else {
            const { data, error } = await supabaseClient.from('recepcoes').select('*').order('data_hora_termino', { ascending: false });
            if (error) throw error;
            maquinas = data || [];
        }

        // Filtra as máquinas do funcionário logado e apenas status green ou red
        let maquinasFuncionario = [];
        const labelConcluidas = document.getElementById('estatisticas-label-concluidas');

        if (usuarioLogadoSessao.perfil === 'recepcionista') {
            maquinasFuncionario = maquinas.filter(m => m.recepcionista && m.recepcionista.trim() === usuarioLogadoSessao.nome.trim() && (m.status === 'green' || m.status === 'red'));
            if (labelConcluidas) labelConcluidas.textContent = 'Máquinas Recepcionadas';
        } else {
            maquinasFuncionario = maquinas.filter(m => m.mantenedor && m.mantenedor.trim() === usuarioLogadoSessao.nome.trim() && (m.status === 'green' || m.status === 'red'));
            if (labelConcluidas) labelConcluidas.textContent = 'Máquinas Concluídas';
        }


        const concluidas = maquinasFuncionario.filter(m => m.status === 'green').length;
        const elConcluidas = document.getElementById('estatisticas-concluidas');
        if (elConcluidas) elConcluidas.textContent = concluidas;

        const diffContainer = document.getElementById('estatisticas-diff-container');
        if (diffContainer) {
            const diff = concluidas - meta;
            diffContainer.textContent = diff >= 0 ? `+${diff}` : diff;
            diffContainer.style.color = diff >= 0 ? 'var(--status-green)' : 'var(--status-red)';
        }

        let taxaEficiencia = meta > 0 ? Math.round((concluidas / meta) * 100) : 0;
        const elTaxa = document.getElementById('estatisticas-taxa');
        if (elTaxa) elTaxa.textContent = taxaEficiencia + '%';
        
        const barraTaxa = document.getElementById('estatisticas-barra-taxa');
        if (barraTaxa) {
            barraTaxa.style.width = Math.min(taxaEficiencia, 100) + '%';
            barraTaxa.style.background = taxaEficiencia >= 100 ? 'var(--status-green)' : 'var(--accent-blue)';
        }

        if (tbody) {
            // Sort to show most recent first
            maquinasFuncionario.sort((a, b) => new Date(b.data_fim || b.data_inicio) - new Date(a.data_fim || a.data_inicio));
            
            if (maquinasFuncionario.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhum histórico concluído encontrado.</td></tr>';
            } else {
                let html = '';
                // Limitar a 50 mais recentes para não pesar
                maquinasFuncionario.slice(0, 50).forEach(m => {
                    let statusLabel = m.status === 'green' ? '<span class="badge" style="background:var(--status-green);color:#fff;">Aprovada</span>' :
                                      m.status === 'red' ? '<span class="badge" style="background:var(--status-red);color:#fff;">Rejeitada</span>' :
                                      (m.status === 'yellow' || m.status === 'purple') ? '<span class="badge" style="background:var(--status-yellow);color:#000;">Em Progresso</span>' :
                                      '<span class="badge dark">Outro</span>';
                    
                    let dataInicio = m.data_inicio ? new Date(m.data_inicio).toLocaleString('pt-BR') : '-';
                    let dataFim = m.data_fim ? new Date(m.data_fim).toLocaleString('pt-BR') : '-';

                    let maquinaIdRaw = m.id || m.id_maquina || m.maquina || m.maquina_id || '';
                    let numeroMaquina = maquinaIdRaw.replace(/\D/g, ''); // Extract only numbers
                    if (!numeroMaquina) numeroMaquina = '-';

                    let linha = m.linha || (maquinaIdRaw.charAt(0).toUpperCase() || '-');

                    html += `<tr>
                        <td style="font-weight: bold; color: var(--text-light);">Máquina ${escapeHtml(linha)}${escapeHtml(numeroMaquina)}</td>
                        <td>${statusLabel}</td>
                        <td style="font-size: 12px; color: var(--text-muted);">${dataInicio}</td>
                        <td style="font-size: 12px; color: var(--text-muted);">${dataFim}</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }
        }
    } catch (e) {
        console.error('Erro ao carregar estatísticas:', e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--status-red);">Erro ao carregar os dados.</td></tr>';
    }
}
