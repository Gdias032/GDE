/**
 * theme.js
 * ---------------------------------------------------------------------------
 * Alternância entre tema claro e escuro (usa data-theme no <html> e
 * as variáveis CSS definidas em css/styles.css).
 * ---------------------------------------------------------------------------
 */

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    salvarStorageSeguro('silicon_tema', tema);
    // Mantemos setItem simples aqui (string, não JSON) por compatibilidade
    // com o valor já salvo em instalações anteriores do sistema:
    try { localStorage.setItem('silicon_tema', tema); } catch (e) { /* ignorado */ }
}

function alternarTema() {
    const temaAtual = document.documentElement.getAttribute('data-theme') || 'dark';
    aplicarTema(temaAtual === 'dark' ? 'light' : 'dark');
}

function inicializarTema() {
    let temaSalvo = null;
    try { temaSalvo = localStorage.getItem('silicon_tema'); } catch (e) { /* modo privado etc. */ }

    if (temaSalvo) {
        aplicarTema(temaSalvo);
        return;
    }
    // Sem preferência salva: respeita o esquema de cores do sistema operacional
    const prefereClaro = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    aplicarTema(prefereClaro ? 'light' : 'dark');
}

/**
 * Botão de tema inserido dentro de ".top-actions", ao lado dos demais
 * ícones da navbar (sino de notificações / avatar).
 */
function criarBotaoTema() {
    if (document.getElementById('theme-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.className = 'theme-toggle-btn icon-btn-notif';
    btn.title = 'Alternar tema claro/escuro';
    btn.innerHTML = `
        <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    `;
    btn.onclick = alternarTema;

    const topActions = document.querySelector('.top-actions');
    const userCircle = document.querySelector('.user-circle');
    if (topActions) {
        topActions.insertBefore(btn, userCircle || null);
    } else {
        document.body.appendChild(btn);
    }
}
