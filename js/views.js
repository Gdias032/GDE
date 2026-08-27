/**
 * views.js
 * ---------------------------------------------------------------------------
 * Templates HTML de cada "tela" do SPA (Single Page Application manual,
 * sem framework). `navigateTo()` (em navigation.js) troca o conteúdo de
 * #app-content por um destes templates.
 * ---------------------------------------------------------------------------
 */
const views = {
    login: `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 85vh; width: 100%;">
        <div class="login-card">
            <h2 style="margin-bottom: 4px; color: var(--text-light); font-size: 22px; font-weight: 700;">Silicon Core V2</h2>
            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Autenticação de Acesso ao Sistema</p>
            <div class="login-field">
                <label>E-mail</label>
                <div class="modern-input-wrapper">
                    <span class="input-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                    <input type="email" id="login-usuario" class="modern-input" placeholder="Digite seu e-mail">
                </div>
            </div>
            <div class="login-field">
                <label>Senha de Acesso</label>
                <div class="modern-input-wrapper">
                    <span class="input-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                    <input type="password" id="login-senha" class="modern-input" placeholder="Digite sua senha">
                </div>
            </div>
            <p id="login-erro-msg" style="color: var(--status-red); font-size: 12px; display: none; margin-bottom: 12px; text-align: left; font-weight: 500;"></p>
            <button class="btn-modern btn-purple" style="width: 100%; justify-content: center; padding: 12px; font-size: 14px; margin-top: 5px;" onclick="realizarLogin()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Acessar Sistema
            </button>
        </div>
    </div>`,

    planta: `
    <div style="display: flex; gap: 15px; width: 100%;">
        <div class="grid-container" style="flex: 1; min-width: 0;">
            <div class="grid-header">
                <h2>Layout da Planta (Linhas A até J - 12 Máquinas por Linha)</h2>
                <div style="display: flex; gap: 12px; align-items: center; font-size: 11px; color: var(--text-muted);">
                    <span><strong style="color:#475569;">●</strong> Não Iniciado</span>
                    <span><strong style="color:var(--status-yellow);">●</strong> Em Progresso</span>
                    <span><strong style="color:#8b5cf6;">●</strong> Aguardando Recepção</span>
                    <span><strong style="color:var(--status-green);">●</strong> Aprovada</span>
                    <span><strong style="color:var(--status-red);">●</strong> Rejeitada</span>
                </div>
            </div>
            <div class="matriz" id="matriz-planta"></div>
        </div>
        <div class="card admin-only" style="width: 240px; max-width: 240px; flex-shrink: 0; padding: 18px; align-self: flex-start;" id="painel-analise-lateral">
            <!-- Conteúdo injetado dinamicamente por renderizarAnalisesRapidas() -->
        </div>
    </div>`,

    analise: `
    <div class="bi-dashboard">
        <div class="card">
            <h3 style="font-size:12px; color:var(--text-muted); font-weight:700;">PROGRESSO TOTAL</h3>
            <div class="stat-value" id="stat-value-bi">0%</div>
        </div>
        <div class="card col-span-3" style="height: 320px;">
            <h3 style="font-size:14px; margin-bottom: 15px; font-weight:600;">Registros Diários</h3>
            <canvas id="lineChart"></canvas>
        </div>
    </div>`,

    recepcao: `
    <div class="recepcao-container">
        <div class="breadcrumb" style="margin-bottom: 12px;">
            <span>Layout da Planta / </span> <strong style="color: var(--text-light);">Atuação na Máquina</strong>
        </div>
        <div class="recepcao-header-card">
            <div class="recepcao-title-group">
                <h2>
                    <span>Máquina</span>
                    <span id="maquina-badge" class="badge dark"></span>
                </h2>
                <div class="meta-dates">
                    <span id="label-data-inicio"><strong>Início:</strong> -</span>
                    <span id="label-data-fim"><strong>Término:</strong> -</span>
                </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button id="btn-iniciar-servico" class="btn-modern" style="background-color: var(--status-yellow); color: #000; display: none;" onclick="iniciarServico()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start / Iniciar Serviço
                </button>
                <button id="btn-parar-servico" class="btn-modern btn-purple" style="display: none;" onclick="confirmarPararServico()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Parar Serviço / Finalizar Manutenção
                </button>
                <button id="btn-salvar-recepcao" class="btn-modern" style="background-color: var(--status-green); color: #000; display: none;" onclick="tentarSalvarRecepcao()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Finalizar & Validar Recepção
                </button>
                <button id="btn-reabrir-recepcao" class="btn-modern" style="background-color: #f59e0b; color: #000; display: none;" onclick="confirmarReabrirRecepcaoRejeitada()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> Reabrir / Alterar Status (Admin)
                </button>
                <button class="btn-cancelar" style="padding: 10px 16px; border-radius: 8px;" onclick="navigateTo('planta')">Voltar</button>
            </div>
        </div>
        <div class="recepcao-grid">
            <div class="checklist-card" id="checklist-container">
                <div class="checklist-header">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Checklist de Verificação Técnica
                    </h3>
                    <span class="badge dark" style="font-size: 11px;">Inspeção Qualitativa</span>
                </div>
                <ul class="checklist-list" id="lista-verificacao">
                    <li class="checklist-item"><span>Verificar fixação dos mancais do braço</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                    <li class="checklist-item"><span>Verificar fixação dos sensores indutivos</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                    <li class="checklist-item"><span>Verificar posicionamento dos bicos pulverizadores</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                    <li class="checklist-item"><span>Verificar se todos os sensores estão instalados corretamente</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                    <li class="checklist-item"><span>Verificar amortecimento lado prensa e lado carro</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                    <li class="checklist-item"><span>Verificar se braços giratórios batem na estrutura</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                    <li class="checklist-item"><span>Verificar pulverização</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                    <li class="checklist-item"><span>Verificar funcionamento em modo automático</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                    <li class="checklist-item"><span>Sistema apto para operação?</span><label class="switch"><input type="checkbox" class="chk-recepcao"><span class="slider"></span></label></li>
                </ul>
            </div>
            <div class="recepcao-sidebar">
                <div class="sidebar-card" id="card-identificacao">
                    <h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Identificação de Responsáveis
                    </h3>
                    <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px;">
                        <div class="field-group" style="margin-bottom: 0;">
                            <label>Mantenedor Atuante</label>
                            <input type="text" id="input-responsavel" class="modern-input" placeholder="Aguardando validação..." readonly>
                        </div>
                    </div>
                    <div id="secao-recepcionador">
                        <div class="field-group">
                            <label>Recepcionado por</label>
                            <div id="nome-recepcionador-display" class="user-display-box">Aguardando validação...</div>
                        </div>
                        <div class="field-group" style="margin-bottom: 0;">
                            <label>Matrícula do Recepcionista</label>
                            <div class="modern-input-wrapper">
                                <span class="input-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                                <input type="text" id="input-registro-recepcionador" class="modern-input" placeholder="Digite o registro (ex: 2001)" oninput="buscarRecepcionadorPorRegistro(this.value)">
                            </div>
                            <p id="msg-validacao-recepcao" class="status-msg" style="color: var(--status-red);"></p>
                        </div>
                    </div>
                </div>
                <div class="sidebar-card">
                    <h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Observações Técnicas
                    </h3>
                    <textarea id="input-obs" class="modern-textarea" placeholder="Descreva os detalhes da manutenção, pendências ou observações do processo..."></textarea>
                </div>
            </div>
        </div>
    </div>`,

    listaRecepcoes: `
    <div class="recepcao-container">
        <div class="breadcrumb"><span> / Recepções /</span> Lista Geral</div>
        <div class="recepcao-header">
            <h2>Lista Geral de Ocorrências</h2>
            <input type="text" id="input-busca-recepcao" class="search-input" placeholder="Buscar..." style="width: 320px;" oninput="filtrarTabelaRecepcoes(this.value)">
        </div>
        <div class="card" style="margin-top: 10px; padding: 0; overflow-y: auto; overflow-x: auto; max-height: 65vh;">
            <table class="tabela-recepcoes">
                <thead style="position: sticky; top: 0; z-index: 10;">
                    <tr>
                        <th>ID Máquina</th><th>Status</th><th>Início</th><th>Término</th>
                        <th>Mantenedor Atuante</th><th>Recepcionado Por</th><th>Ação</th>
                    </tr>
                </thead>
                <tbody id="tabela-recepcoes-body"></tbody>
            </table>
        </div>
    </div>`,

    solicitacoes: `
    <div class="recepcao-container">
        <div class="breadcrumb"><span> / Painel do Administrador /</span> Solicitações de Acesso</div>
        <div class="recepcao-header"><h2>Solicitações de Autorização de Perfil</h2></div>
        <div class="card" style="margin-top: 15px; padding: 0; overflow-y: auto; overflow-x: auto; max-height: 65vh;">
            <table class="tabela-recepcoes">
                <thead style="position: sticky; top: 0; z-index: 10;">
                    <tr>
                        <th>Data</th><th>Matrícula</th><th>Solicitante</th><th>Permissão Requerida</th>
                        <th>Justificativa</th><th>Status</th><th>Ação do Administrador</th>
                    </tr>
                </thead>
                <tbody id="tabela-solicitacoes-body"></tbody>
            </table>
        </div>
    </div>`
};
