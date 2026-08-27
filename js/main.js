/**
 * main.js
 * ---------------------------------------------------------------------------
 * Ponto de entrada: roda quando o DOM termina de carregar.
 * Este arquivo deve ser o ÚLTIMO <script> carregado no index.html,
 * depois de todos os outros módulos (eles definem as funções que main.js usa).
 * ---------------------------------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', async () => {
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
    
    // Tenta restaurar a sessão caso o usuário tenha apertado F5 (Refresh)
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session && session.user && !error) {
            const { data: userData } = await supabaseClient.from('usuarios').select('*').eq('id', session.user.id).single();
            if (userData) {
                const perfilDB = userData.perfil_acesso.toLowerCase();
                
                const dadosSessao = { nome: userData.nome_completo, registro: userData.id, matricula: userData.matricula, cargo: userData.cargo, perfil: perfilDB };
                usuarioLogadoSessao = dadosSessao;
                
                // Reconstrói a sessão local
                if (perfilDB === 'mantenedor') {
                    mantenedorValidoAtual = dadosSessao;
                } else if (perfilDB === 'recepcionista') {
                    recepcionadorValidoAtual = dadosSessao;
                } else if (perfilDB === 'admin') {
                    recepcionadorValidoAtual = dadosSessao;
                }
                
                // Carrega os dados silenciosamente e vai para a planta, sem pedir senha de novo
                await fazerLogin(perfilDB, userData.nome_completo);
                return;
            }
        }
    } catch (err) {
        console.warn('Não foi possível restaurar a sessão:', err);
    }
    
    // Se não tinha sessão válida, vai para a tela de login normalmente
    atualizarProgressoGeral();
    atualizarNotificacoesPendentes();
    navigateTo('login');
});
