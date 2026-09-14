/**
 * navigation.js
 * ---------------------------------------------------------------------------
 * Roteamento manual do SPA: troca o HTML de #app-content pela view
 * correta e chama a função de renderização específica de cada tela.
 * ---------------------------------------------------------------------------
 */

/** Marca o item ativo no menu lateral e no menu superior. */
function sincronizarMenus(viewName) {
    document.querySelectorAll('.top-menu a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('data-target') === viewName);
    });
    document.querySelectorAll('.sidebar-menu li').forEach(li => {
        li.classList.toggle('active', li.getAttribute('data-target') === viewName);
    });
    fecharMenuMobile();
}

/**
 * Navega para uma tela do sistema.
 * @param {string} viewName - chave dentro de `views` (ver views.js)
 * @param {string|null} parametro - usado por 'recepcao' (id da máquina)
 */
function navigateTo(viewName, parametro = null) {
    const tooltip = document.getElementById('celula-tooltip');
    if (tooltip) tooltip.style.display = 'none';

    if (viewName === 'login') {
        perfilAtual = null;
        maquinaAtualId = null;
        mantenedorValidoAtual = null;
        recepcionadorValidoAtual = null;
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.top-navbar').style.display = 'none';
        document.getElementById('app-content').innerHTML = views.login;
        return;
    }

    // Perfil "mantenedor" só pode acessar planta, recepção e solicitações
    if (perfilAtual === 'mantenedor' && viewName !== 'planta' && viewName !== 'recepcao' && viewName !== 'solicitacoes') {
        viewName = 'planta';
    }

    sincronizarMenus(viewName);
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = views[viewName];

    if (viewName === 'planta') {
        renderizarMatriz();
        renderizarAnalisesRapidas();
        if (perfilAtual === 'mantenedor' && document.getElementById('painel-analise-lateral')) {
            document.getElementById('painel-analise-lateral').style.display = 'none';
        }
    } else if (viewName === 'recepcao' && parametro) {
        maquinaAtualId = parametro;
        configurarTelaRecepcao();
    } else if (viewName === 'listaRecepcoes') {
        renderizarTabelaRecepcoes();
    } else if (viewName === 'solicitacoes') {
        renderizarTabelaSolicitacoes();
    } else if (viewName === 'analise') {
        renderizarGraficoAnalise();
    } else if (viewName === 'relatorios') {
        renderizarRelatorios();
    }
}
