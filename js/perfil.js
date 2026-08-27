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
    if (!userCircle) return;
    let foto = null;
    try { foto = localStorage.getItem(chaveFotoAtual()); } catch (e) { /* modo privado etc. */ }

    if (foto) {
        userCircle.style.backgroundImage = `url(${foto})`;
        userCircle.style.backgroundSize = 'cover';
        userCircle.style.backgroundPosition = 'center';
        userCircle.innerText = '';
    } else {
        userCircle.style.backgroundImage = '';
        if (usuarioLogadoSessao && usuarioLogadoSessao.perfil === 'admin') {
            userCircle.innerText = 'SA';
        } else if (usuarioLogadoSessao && usuarioLogadoSessao.perfil === 'recepcionista') {
            userCircle.innerText = 'RC';
        } else {
            userCircle.innerText = 'MN';
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
    let foto = null;
    try { foto = localStorage.getItem(chaveFotoAtual()); } catch (e) { /* modo privado etc. */ }
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
        <input type="file" id="input-foto-perfil" accept="image/*" style="display:none;" onchange="trocarFotoPerfil(this)">
        <h3 style="margin-top: 16px; color: var(--text-light); font-size: 17px;">${escapeHtml(nome)}</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-top: 2px;">${escapeHtml(cargo)}</p>
        <div class="perfil-info-box">
            <div><span>Matrícula</span><strong>${escapeHtml(matricula)}</strong></div>
            <div><span>Nível de Acesso</span><strong>${escapeHtml(nivelAcesso)}</strong></div>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-top: 14px; line-height: 1.4;">Apenas a foto de perfil pode ser alterada por aqui. Para outras alterações de cadastro, contate o Administrador.</p>
    </div>`;
    modal.style.display = 'flex';
}

function fecharModalPerfil() {
    const modal = document.getElementById('modal-perfil');
    if (modal) modal.style.display = 'none';
}

function trocarFotoPerfil(input) {
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
    leitor.onload = function (e) {
        const dataUrl = e.target.result;
        const salvo = salvarStorageSeguroBruto(chaveFotoAtual(), dataUrl);
        if (!salvo) {
            mostrarAlertaModal('Não foi possível salvar', 'O navegador recusou salvar a imagem (armazenamento cheio ou modo privado). Tente uma imagem menor.', 'warning');
            return;
        }
        renderizarAvatarUsuario();

        const preview = document.getElementById('perfil-avatar-preview');
        if (preview) {
            preview.style.backgroundImage = `url('${dataUrl}')`;
            preview.innerText = '';
        }
        mostrarAlertaModal('Foto Atualizada', 'Sua foto de perfil foi atualizada com sucesso!', 'success');
    };
    leitor.readAsDataURL(arquivo);
}

/** Salva um valor "cru" (não-JSON, ex: data URL de imagem) com tratamento de erro. */
function salvarStorageSeguroBruto(chave, valor) {
    try {
        localStorage.setItem(chave, valor);
        return true;
    } catch (erro) {
        console.warn(`Falha ao salvar "${chave}" no localStorage.`, erro);
        return false;
    }
}
