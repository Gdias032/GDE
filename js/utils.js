/**
 * utils.js
 * ---------------------------------------------------------------------------
 * Funções utilitárias genéricas, reaproveitadas por várias telas:
 *  - escapeHtml(): previne XSS ao injetar texto do usuário no HTML
 *  - atualizarBadgeElemento(): evita repetir a mesma lógica 3x
 *  - Sistema de modais (confirmação e alerta)
 * ---------------------------------------------------------------------------
 */

/**
 * Escapa caracteres especiais de HTML antes de inserir texto vindo do
 * usuário (ex: observações técnicas, justificativas de solicitação)
 * dentro de innerHTML/atributos data-*.
 *
 * CORREÇÃO DE SEGURANÇA: no código original, campos como `obs` e
 * `mensagem` (preenchidos livremente pelo usuário em <textarea>) eram
 * inseridos direto via innerHTML. Isso permite XSS — por exemplo,
 * alguém digitando `<img src=x onerror="...">` numa observação faria
 * esse código executar quando outro usuário passasse o mouse na célula
 * (tooltip) ou abrisse a tela de solicitações. Sempre passe texto
 * vindo do usuário por esta função antes de colocá-lo no HTML.
 */
function escapeHtml(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Mostra/oculta e atualiza o texto de um badge de notificação (contador).
 * Substitui a lógica repetida 3x (sino, sidebar, topnav) no código original.
 */
function atualizarBadgeElemento(idElemento, quantidade) {
    const el = document.getElementById(idElemento);
    if (!el) return;
    el.style.display = quantidade > 0 ? 'inline-block' : 'none';
    if (quantidade > 0) el.innerText = quantidade;
}

/**
 * Wrapper simples para leitura segura do localStorage.
 * Evita que o app quebre em modo de navegação anônima/privado (onde
 * algumas engines bloqueiam localStorage) ou com JSON corrompido.
 */
function lerStorageSeguro(chave, valorPadrao) {
    try {
        const bruto = localStorage.getItem(chave);
        return bruto ? JSON.parse(bruto) : valorPadrao;
    } catch (erro) {
        console.warn(`Falha ao ler "${chave}" do localStorage. Usando valor padrão.`, erro);
        return valorPadrao;
    }
}

/**
 * Wrapper simples para escrita segura no localStorage.
 * Retorna true/false para quem chamar decidir se precisa avisar o usuário.
 */
function salvarStorageSeguro(chave, valor) {
    try {
        localStorage.setItem(chave, JSON.stringify(valor));
        return true;
    } catch (erro) {
        console.warn(`Falha ao salvar "${chave}" no localStorage (quota cheia ou modo privado?).`, erro);
        return false;
    }
}

// ==========================================
// SISTEMA DE POP-UPS MODAIS
// ==========================================

/**
 * Modal de confirmação genérico (ex: "Deseja realmente sair?").
 * @param {Object} opcoes
 * @param {string} opcoes.titulo
 * @param {string} opcoes.mensagem
 * @param {string} opcoes.textoConfirmar
 * @param {string} opcoes.corConfirmar
 * @param {Function} opcoes.onConfirm - callback executado se o usuário confirmar
 */
function mostrarConfirmacaoModal({ titulo = "Atenção", mensagem, textoConfirmar = "Confirmar", corConfirmar = "var(--status-red)", onConfirm }) {
    let modal = document.getElementById('modal-confirmacao');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-confirmacao';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
    <div class="modal-card" style="text-align: center; max-width: 420px;">
        <div style="display: flex; justify-content:center; margin-bottom: 12px;">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="${corConfirmar}" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3 style="margin-bottom: 10px; color: var(--text-light); font-size: 18px;">${escapeHtml(titulo)}</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 22px; line-height: 1.5;">${escapeHtml(mensagem)}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn-cancelar" style="flex: 1;" onclick="fecharModalConfirmacao()">Cancelar</button>
            <button id="btn-modal-confirmar-acao" class="btn-modern" style="flex: 1; justify-content: center; background-color: ${corConfirmar}; color: var(--text-light);">${escapeHtml(textoConfirmar)}</button>
        </div>
    </div>`;
    modal.style.display = 'flex';
    document.getElementById('btn-modal-confirmar-acao').onclick = () => {
        fecharModalConfirmacao();
        if (typeof onConfirm === 'function') onConfirm();
    };
}

function fecharModalConfirmacao() {
    const modal = document.getElementById('modal-confirmacao');
    if (modal) modal.style.display = 'none';
}

/**
 * Modal de alerta simples (informativo / sucesso / aviso / erro).
 * @param {string} titulo
 * @param {string} mensagem
 * @param {'info'|'success'|'warning'|'danger'} tipo
 */
function mostrarAlertaModal(titulo, mensagem, tipo = 'info') {
    let modal = document.getElementById('modal-alerta');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-alerta';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const icones = {
        info: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        success: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        warning: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        danger: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    };
    const iconSvg = icones[tipo] || icones.info;

    modal.innerHTML = `
    <div class="modal-card" style="text-align: center; max-width: 400px;">
        <div style="display: flex; justify-content:center; margin-bottom: 12px;">${iconSvg}</div>
        <h3 style="margin-bottom: 8px; color: var(--text-light); font-size: 18px;">${escapeHtml(titulo)}</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px; line-height: 1.5;">${escapeHtml(mensagem)}</p>
        <button class="btn-modern btn-purple" style="width: 100%; justify-content: center;" onclick="fecharModalAlerta()">Entendido</button>
    </div>`;
    modal.style.display = 'flex';
}

function fecharModalAlerta() {
    const modal = document.getElementById('modal-alerta');
    if (modal) modal.style.display = 'none';
}
