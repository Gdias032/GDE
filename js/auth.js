/**
 * auth.js
 * ---------------------------------------------------------------------------
 * Gerenciamento de Autenticação e Sessão
 * 
 * Responsável por realizar o login, validar as credenciais junto ao Supabase,
 * resgatar os perfis (Mantenedor, Recepcionista, Admin), construir a sessão
 * global (usuarioLogadoSessao) e aplicar as restrições visuais do menu.
 * ---------------------------------------------------------------------------
 */

// ============================================================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================================================

/** 
 * Realiza o login utilizando o email (matrícula formatada) e senha.
 * @param {Event} event - Evento de submit do formulário
 */
async function realizarLogin(event) {
    const email = document.getElementById('login-usuario').value.trim();
    const senha = document.getElementById('login-senha').value.trim();
    const msgErro = document.getElementById('login-erro-msg');

    if (!email) {
        msgErro.innerText = 'Por favor, digite o e-mail.';
        msgErro.style.display = 'block';
        return;
    }

    // Tenta fazer o login no Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        console.error('Erro Supabase Auth:', error);
        msgErro.innerText = error.message || 'Credenciais incorretas! Tente novamente.';
        msgErro.style.display = 'block';
        return;
    }
    msgErro.style.display = 'none';

    // Busca o perfil do usuário no banco de dados (tabela usuarios)
    const { data: userData, error: userError } = await supabaseClient
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (userError || !userData) {
        msgErro.innerText = 'Este usuário não possui um perfil cadastrado no sistema.';
        msgErro.style.display = 'block';
        await supabaseClient.auth.signOut();
        return;
    }

    const perfilDB = userData.perfil_acesso.toLowerCase();

    // ------------------------------------------------------------------------
    // CONSTRUÇÃO DA SESSÃO GLOBAL
    // ------------------------------------------------------------------------
    const dadosSessao = { 
        nome: userData.nome_completo, 
        registro: userData.id, 
        matricula: userData.matricula, 
        cargo: userData.cargo, 
        perfil: perfilDB,
        avatar: userData.avatar_base64
    };
    
    // Armazena a sessão permanente (usada em Perfil e Validações)
    usuarioLogadoSessao = dadosSessao;

    // Variáveis legadas de máquina (compatibilidade)
    if (perfilDB === 'mantenedor') {
        mantenedorValidoAtual = dadosSessao;
    } else if (perfilDB === 'recepcionista' || perfilDB === 'admin') {
        recepcionadorValidoAtual = dadosSessao;
    }

    await fazerLogin(perfilDB, userData.nome_completo);
}

// ============================================================================
// GERENCIAMENTO DE SESSÃO
// ============================================================================

/** Confirmação e execução do Logout */
async function confirmarLogout() {
    mostrarConfirmacaoModal({
        titulo: "Sair do Sistema",
        mensagem: "Deseja realmente encerrar sua sessão e voltar para a tela de login?",
        textoConfirmar: "Sair",
        corConfirmar: "var(--status-red)",
        onConfirm: async () => {
            await supabaseClient.auth.signOut();
            navigateTo('login');
        }
    });
}

/** 
 * Aplica o perfil logado na interface: 
 * - Mostra/esconde itens de menu específicos
 * - Baixa os dados globais do Supabase
 * - Navega para a planta
 */
async function fazerLogin(perfil, nomeUsuario = 'Usuário') {
    perfilAtual = perfil;
    
    // Libera a exibição das barras superior e lateral
    document.querySelector('.sidebar').style.display = 'flex';
    document.querySelector('.top-navbar').style.display = 'flex';

    // ------------------------------------------------------------------------
    // CONTROLE DE ACESSO VISUAL (MENUS)
    // ------------------------------------------------------------------------
    if (perfilAtual === 'mantenedor' || perfilAtual === 'recepcionista') {
        document.querySelectorAll('.sidebar-menu li, .top-menu a').forEach(el => {
            const texto = el.innerText.toLowerCase();
            // Mantém visíveis: Planta/Layout, Recepções, Solicitações e Sair
            const permitido = texto.includes('planta') || texto.includes('layout') ||
                texto.includes('solicita') || texto.includes('recep') || texto.includes('sair');
            el.style.display = permitido ? 'flex' : 'none';
        });
        document.querySelector('.user-info p').innerText = nomeUsuario;
    } else {
        document.querySelectorAll('.sidebar-menu li, .top-menu a').forEach(el => {
            el.style.display = 'flex';
        });
        document.querySelector('.user-info p').innerText = nomeUsuario + ' (Admin)';
    }

    renderizarAvatarUsuario();
    
    // ⚠️ CRÍTICO: Aguarda baixar os dados reais do Supabase (Máquinas e Solicitações)
    await carregarDadosSupabase();
    
    // Inicia o listener de Realtime para atualizar a tela quando outros modificarem os dados
    inicializarRealtime();
    
    navigateTo('planta');
}
