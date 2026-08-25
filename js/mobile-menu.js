/**
 * mobile-menu.js
 * ---------------------------------------------------------------------------
 * Sidebar retrátil (drawer) usada em telas estreitas (tablets/celulares).
 * ---------------------------------------------------------------------------
 */

function criarBackdropMobile() {
    if (document.getElementById('sidebar-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'sidebar-backdrop';
    backdrop.className = 'sidebar-backdrop';
    backdrop.onclick = fecharMenuMobile;
    document.body.appendChild(backdrop);
}

function criarBotaoMenuMobile() {
    if (document.getElementById('mobile-menu-btn')) return null;
    const btn = document.createElement('button');
    btn.id = 'mobile-menu-btn';
    btn.className = 'mobile-menu-btn';
    btn.title = 'Abrir menu';
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
    btn.onclick = alternarMenuMobile;
    return btn;
}

function alternarMenuMobile() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;
    sidebar.classList.toggle('mobile-open');
    if (backdrop) backdrop.classList.toggle('mobile-open', sidebar.classList.contains('mobile-open'));
}

function fecharMenuMobile() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('mobile-open');
}
