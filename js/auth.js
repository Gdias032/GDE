/**
 * auth.js
 * ---------------------------------------------------------------------------
 * Login, logout e liberação de menus por perfil.
 *
 * ⚠️ ATENÇÃO — AUTENTICAÇÃO DE PROTÓTIPO:
 * A senha "123" está fixa no código-fonte (visível para qualquer pessoa
 * que abra o app.js pelo navegador) e não há verificação em servidor.
 * Isso é aceitável apenas para demonstração/protótipo. Antes de usar em
 * produção, isso PRECISA ser substituído por autenticação real via
 * backend (usuário/senha com hash, token de sessão, etc).
 * ---------------------------------------------------------------------------
 */

/** Preenche o campo de usuário com um exemplo de acordo com o perfil escolhido. */
function ajustarUsuarioExemplo(perfil) {
    const inputUser = document.getElementById('login-usuario');
    if (inputUser) {
        inputUser.value = perfil === 'admin' ? 'adm' : '1001';
    }
}

function efetuarLoginComValidacao() {
    const perfil = document.getElementById('login-perfil').value;
    const usuario = document.getElementById('login-usuario').value.trim();
    const senha = document.getElementById('login-senha').value.trim();
    const msgErro = document.getElementById('login-erro-msg');

    if (!usuario) {
        msgErro.innerText = 'Por favor, digite o usuário ou matrícula.';
        msgErro.style.display = 'block';
        return;
    }
    if (senha !== '123') {
        msgErro.innerText = 'Senha incorreta! Use a senha: 123';
        msgErro.style.display = 'block';
        return;
    }
    msgErro.style.display = 'none';

    if (perfil === 'mantenedor') {
        const encontrado = bancoFuncionarios.find(f => f.registro === usuario);
        mantenedorValidoAtual = encontrado || bancoFuncionarios[0];
    }

    fazerLogin(perfil);
}

function confirmarLogout() {
    mostrarConfirmacaoModal({
        titulo: "Sair do Sistema",
        mensagem: "Deseja realmente encerrar sua sessão e voltar para a tela de login?",
        textoConfirmar: "Sair",
        corConfirmar: "var(--status-red)",
        onConfirm: () => navigateTo('login')
    });
}

/** Aplica o perfil logado: mostra/esconde itens de menu e navega para a planta. */
function fazerLogin(perfil) {
    perfilAtual = perfil;
    document.querySelector('.sidebar').style.display = 'flex';
    document.querySelector('.top-navbar').style.display = 'flex';

    if (perfilAtual === 'mantenedor') {
        document.querySelectorAll('.sidebar-menu li, .top-menu a').forEach(el => {
            const texto = el.innerText.toLowerCase();
            // Mantém visíveis: Planta/Layout, Solicitações e "Sair / Mudar Perfil"
            const permitido = texto.includes('planta') || texto.includes('layout') ||
                texto.includes('solicita') || texto.includes('sair');
            el.style.display = permitido ? 'flex' : 'none';
        });
        document.querySelector('.user-info p').innerText = mantenedorValidoAtual ? mantenedorValidoAtual.nome : 'Mantenedor';
    } else {
        document.querySelectorAll('.sidebar-menu li, .top-menu a').forEach(el => {
            el.style.display = 'flex';
        });
        document.querySelector('.user-info p').innerText = 'Master / Admin';
    }

    renderizarAvatarUsuario();
    atualizarProgressoGeral();
    atualizarNotificacoesPendentes();
    navigateTo('planta');
}
