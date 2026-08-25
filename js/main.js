/**
 * main.js
 * ---------------------------------------------------------------------------
 * Ponto de entrada: roda quando o DOM termina de carregar.
 * Este arquivo deve ser o ÚLTIMO <script> carregado no index.html,
 * depois de todos os outros módulos (eles definem as funções que main.js usa).
 * ---------------------------------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', () => {
    inicializarTema();
    criarBotaoTema();
    criarBackdropMobile();

    // Injeta o botão de menu mobile no início da navbar superior
    const topNavbar = document.querySelector('.top-navbar');
    if (topNavbar) {
        const btnMenuMobile = criarBotaoMenuMobile();
        if (btnMenuMobile) topNavbar.insertBefore(btnMenuMobile, topNavbar.firstChild);
    }

    // Clique no avatar do usuário (canto superior direito) abre o modal de perfil
    const userCircleEl = document.querySelector('.user-circle');
    if (userCircleEl) {
        userCircleEl.style.cursor = 'pointer';
        userCircleEl.title = 'Meu Perfil';
        userCircleEl.onclick = abrirModalPerfil;
    }

    document.querySelector('.sidebar').style.display = 'none';
    document.querySelector('.top-navbar').style.display = 'none';
    atualizarProgressoGeral();
    atualizarNotificacoesPendentes();
    navigateTo('login');
});
