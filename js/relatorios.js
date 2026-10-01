/**
 * relatorios.js — Dashboard BI Fixo
 * ---------------------------------------------------------------------------
 * Dashboard de BI com layout fixo, populado com dados da planta e histórico.
 * ---------------------------------------------------------------------------
 */

let chartProgressoLinha = null;
let chartPerformanceSemanas = null;
let metaMensal = parseInt(localStorage.getItem('bi_meta_mensal')) || 120;
let metaAnual = parseInt(localStorage.getItem('bi_meta_anual')) || 1440;

// -- Caching Layer --
let biCache = null;
let biCacheTime = 0;
let biCachePromise = null;
const CACHE_TTL = 30000; // 30 seconds

async function fetchPlantaData(force = false) {
    const now = Date.now();
    if (!force && biCache && (now - biCacheTime < CACHE_TTL)) {
        return biCache;
    }
    if (!force && biCachePromise) {
        return await biCachePromise;
    }
    
    biCachePromise = supabaseClient.from('vw_bi_planta').select('*').then(({ data, error }) => {
        if (error) {
            console.error('Erro ao buscar planta:', error);
            biCachePromise = null;
            return [];
        }
        biCache = data || [];
        biCacheTime = Date.now();
        biCachePromise = null;
        return biCache;
    });

    return await biCachePromise;
}

// -- Skeleton Loaders --
function mostrarSkeletonBI() {
    const elementos = [
        'bi-val-progresso', 'bi-val-concluido', 'bi-val-andamento'
    ];
    elementos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('skeleton');
    });
    
    const tbody = document.getElementById('tabela-ranking-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><div class="skeleton" style="width: 100%; height: 20px;"></div></td></tr>';
}

function esconderSkeletonBI() {
    const elementos = [
        'bi-val-progresso', 'bi-val-concluido', 'bi-val-andamento'
    ];
    elementos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('skeleton');
    });
}

async function atualizarMetaMensal(valor) {
    metaMensal = parseInt(valor) || 120;
    localStorage.setItem('bi_meta_mensal', metaMensal);
    renderizarRelatorios(); // re-renderiza para atualizar os cálculos
}

async function atualizarMetaAnual(valor) {
    metaAnual = parseInt(valor) || 1440;
    localStorage.setItem('bi_meta_anual', metaAnual);
    renderizarRelatorios(); // re-renderiza para atualizar os cálculos
}

async function renderizarRelatorios() {
    // Mostrar loader skeleton na UI
    mostrarSkeletonBI();

    // 1. Buscar dados da planta usando cache central
    const maquinas = await fetchPlantaData();

    const totalMaquinas = maquinas.length || metaAnual; // usa a meta anual se não houver máquinas
    const concluidas = maquinas.filter(m => m.status === 'green').length;
    const emAndamento = maquinas.filter(m => m.status === 'yellow' || m.status === 'purple').length;
    
    const pctTotal = Math.round((concluidas / totalMaquinas) * 100) || 0;

    // Atualiza Top Row
    const valProgresso = document.getElementById('bi-val-progresso');
    if (valProgresso) {
        valProgresso.textContent = pctTotal + '%';
        document.getElementById('bi-bar-progresso').style.width = pctTotal + '%';
        
        document.getElementById('bi-val-concluido').textContent = concluidas;
        document.getElementById('bi-val-andamento').textContent = emAndamento;
        
        const inputMetaMensal = document.getElementById('bi-input-meta-mensal');
        if (inputMetaMensal) inputMetaMensal.value = metaMensal;
        const rangeMetaMensal = document.getElementById('bi-range-meta-mensal');
        if (rangeMetaMensal) rangeMetaMensal.value = metaMensal;

        const inputMetaAnual = document.getElementById('bi-input-meta-anual');
        if (inputMetaAnual) inputMetaAnual.value = metaAnual;
        const rangeMetaAnual = document.getElementById('bi-range-meta-anual');
        if (rangeMetaAnual) rangeMetaAnual.value = metaAnual;

        // Progresso por Linha
        renderizarProgressoPorLinha(maquinas);

        // Ranking Mantenedores
        renderizarRankingMantenedores(maquinas);

        // Esconder loader skeleton
        esconderSkeletonBI();

        // Performance Semanal
        await renderizarPerformanceSemanal();
    }
}

function renderizarProgressoPorLinha(maquinas) {
    const linhas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const concluidasPorLinha = [];
    const andamentoPorLinha = [];
    const negadasPorLinha = [];

    linhas.forEach(linha => {
        const mLinha = maquinas.filter(m => m.linha === linha);
        concluidasPorLinha.push(mLinha.filter(m => m.status === 'green').length);
        andamentoPorLinha.push(mLinha.filter(m => m.status === 'yellow' || m.status === 'purple').length);
        negadasPorLinha.push(mLinha.filter(m => m.status === 'red').length);
    });

    const ctx = document.getElementById('barChartLinhas');
    if (!ctx) return;

    if (chartProgressoLinha) chartProgressoLinha.destroy();

    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
    const corGrade = 'rgba(148, 163, 184, 0.15)';

    chartProgressoLinha = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: linhas.map(l => 'Linha ' + l),
            datasets: [
                {
                    label: 'Concluído',
                    data: concluidasPorLinha,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)', // Verde
                    borderRadius: 4
                },
                {
                    label: 'Em Recepção / Andamento',
                    data: andamentoPorLinha,
                    backgroundColor: 'rgba(192, 132, 252, 0.8)', // Roxo
                    borderRadius: 4
                },
                {
                    label: 'Negados',
                    data: negadasPorLinha,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)', // Vermelho
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: corTexto, font: {size: 10} } },
                y: { stacked: true, grid: { color: corGrade }, ticks: { color: corTexto, font: {size: 10} } }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: corTexto, boxWidth: 10, font: {size: 11} }
                }
            }
        }
    });
}

function renderizarRankingMantenedores(maquinas) {
    const counts = {};
    maquinas.forEach(m => {
        if (m.mantenedor && m.mantenedor !== 'Não Atribuído') {
            counts[m.mantenedor] = (counts[m.mantenedor] || 0) + 1;
        }
    });

    const ranking = Object.keys(counts).map(k => ({ nome: k, inst: counts[k] }));
    ranking.sort((a, b) => b.inst - a.inst);

    const container = document.getElementById('bi-ranking-list');
    if (!container) return;

    if (ranking.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Nenhum mantenedor atribuído.</p>';
        return;
    }

    const top5 = ranking.slice(0, 5);
    const maxInst = top5[0].inst || 1;

    let html = '';
    const cores = ['var(--status-green)', 'var(--status-yellow)', 'var(--text-muted)', 'var(--text-muted)', 'var(--text-muted)'];

    top5.forEach((r, i) => {
        const pct = (r.inst / maxInst) * 100;
        const cor = cores[i] || cores[cores.length-1];
        const destaque = i < 2 ? cor : 'var(--text-main)';
        
        html += `
        <div class="bi-ranking-item">
            <div class="bi-ranking-info">
                <span>${escapar(r.nome)}</span>
                <span style="color: ${destaque};">${r.inst} inst.</span>
            </div>
            <div class="bi-ranking-bar">
                <div class="fill" style="width: ${pct}%; background-color: ${cor};"></div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

async function renderizarPerformanceSemanal(isDiaEspecifico = false) {
    const mesInput = document.getElementById('bi-input-mes');
    const diaInput = document.getElementById('bi-input-dia');
    if (!mesInput || !diaInput) return;
    
    let mesVal = mesInput.value;
    let diaVal = diaInput.value;

    if (!mesVal && !diaVal) {
        const now = new Date();
        mesVal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        mesInput.value = mesVal;
    }

    const maquinas = await fetchPlantaData();

    let groupsData = [];

    if (isDiaEspecifico && diaVal) {
        // Limpa o input de mês para não confundir
        mesInput.value = '';
        const d = new Date(diaVal + 'T12:00:00');
        const diaLabel = d.toLocaleDateString('pt-BR');
        
        groupsData.push({
            name: ['Dia Específico', `${diaLabel}`],
            start: new Date(diaVal + 'T00:00:00').getTime(),
            end: new Date(diaVal + 'T23:59:59').getTime(),
            verdes: 0, roxas: 0, vermelhas: 0
        });
    } else {
        // Se isDiaEspecifico foi chamado mas limpou o campo, reseta pro mês
        if (isDiaEspecifico) {
            diaInput.value = '';
            const now = new Date();
            mesVal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            mesInput.value = mesVal;
        } else {
            diaInput.value = ''; // Limpa o dia caso tenha alterado o mês
        }

        const [year, month] = mesVal.split('-').map(Number);
        let currentDate = new Date(year, month - 1, 1);
        let currentWeekNum = 1;

        const checkboxFds = document.getElementById('bi-check-fds');
        const incluirFds = checkboxFds ? checkboxFds.checked : (localStorage.getItem('bi_incluir_fds') === 'true');

        while (currentDate.getMonth() === month - 1) {
            if (!incluirFds) {
                while ((currentDate.getDay() === 0 || currentDate.getDay() === 6) && currentDate.getMonth() === month - 1) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            if (currentDate.getMonth() !== month - 1) break;

            let startOfWeek = new Date(currentDate);
            
            if (!incluirFds) {
                while (currentDate.getDay() !== 5 && currentDate.getMonth() === month - 1) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            } else {
                while (currentDate.getDay() !== 6 && currentDate.getMonth() === month - 1) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            if (currentDate.getMonth() !== month - 1) currentDate.setDate(0); 

            let endOfWeek = new Date(currentDate);
            endOfWeek.setHours(23, 59, 59, 999);
            startOfWeek.setHours(0, 0, 0, 0);

            const startStr = startOfWeek.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
            const endStr = endOfWeek.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});

            groupsData.push({
                name: ['Semana ' + currentWeekNum, `${startStr} a ${endStr}`],
                start: startOfWeek.getTime(),
                end: endOfWeek.getTime(),
                verdes: 0,
                roxas: 0,
                vermelhas: 0
            });

            currentDate.setDate(currentDate.getDate() + 1);
            currentWeekNum++;
        }
    }

    if (maquinas.length > 0) {
        maquinas.forEach(m => {
            if(m.data_fim) {
                const time = new Date(m.data_fim).getTime();
                let groupFound = groupsData.findIndex(w => time >= w.start && time <= w.end);
                
                if (groupFound !== -1) {
                    if (m.status === 'green') groupsData[groupFound].verdes++;
                    else if (m.status === 'purple') groupsData[groupFound].roxas++;
                    else if (m.status === 'red') groupsData[groupFound].vermelhas++;
                }
            }
        });
    }

    const datasets = [
        {
            label: 'Concluído',
            data: groupsData.map(w => w.verdes),
            backgroundColor: 'rgba(34, 197, 94, 0.8)', // Verde
            borderRadius: 4,
            maxBarThickness: 45 // Barra mais grossa
        },
        {
            label: 'Em Recepção',
            data: groupsData.map(w => w.roxas),
            backgroundColor: 'rgba(192, 132, 252, 0.8)', // Roxo
            borderRadius: 4,
            maxBarThickness: 45
        },
        {
            label: 'Negados',
            data: groupsData.map(w => w.vermelhas),
            backgroundColor: 'rgba(239, 68, 68, 0.8)', // Vermelho
            borderRadius: 4,
            maxBarThickness: 45
        }
    ];

    const ctx = document.getElementById('barChartSemanas');
    if (!ctx) return;

    if (chartPerformanceSemanas) chartPerformanceSemanas.destroy();

    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
    const corGrade = 'rgba(148, 163, 184, 0.15)';

    chartPerformanceSemanas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: groupsData.map(w => w.name),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: corTexto, font: {size: 11} } },
                y: { stacked: true, grid: { color: corGrade }, ticks: { color: corTexto, font: {size: 10} } }
            },
            plugins: {
                legend: { position: 'top', labels: { color: corTexto, boxWidth: 10, font: {size: 11} } }
            }
        }
    });
}

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

views.relatorios = `
    <style>
        .skeleton {
            background: linear-gradient(90deg, var(--input-bg) 25%, var(--border-color) 50%, var(--input-bg) 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
            border-radius: 4px;
            color: transparent !important;
            user-select: none;
            pointer-events: none;
        }
        .skeleton * {
            visibility: hidden;
        }
        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    </style>
    <div class="bi-dashboard-grid">
        <!-- Top Row -->
        <div class="bi-top-row">
            <!-- PROGRESSO TOTAL -->
            <div class="card bi-card">
                <div class="bi-card-header">
                    <h3>PROGRESSO TOTAL</h3>
                    <div class="icon-circle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                </div>
                <div class="bi-stat-main" id="bi-val-progresso">0%</div>
                <div class="bi-progress-bar-container">
                    <div class="bi-progress-fill" id="bi-bar-progresso" style="width: 0%;"></div>
                </div>
                <div class="bi-card-footer">
                    <span>Métricas baseadas na planta inteira</span>
                </div>
            </div>

            <!-- CONCLUÍDO -->
            <div class="card bi-card">
                <div class="bi-card-header">
                    <h3>CONCLUÍDO</h3>
                    <div class="icon-circle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-yellow)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>
                <div class="bi-stat-main" id="bi-val-concluido">0</div>
                <div class="bi-sparkline" style="display: flex; flex-direction: column; gap: 4px; padding-top: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; color: var(--text-muted); width: 75px;">Meta Mensal</span>
                        <input type="range" id="bi-range-meta-mensal" min="1" max="500" value="${metaMensal}" oninput="document.getElementById('bi-input-meta-mensal').value=this.value; atualizarMetaMensal(this.value)" style="flex: 1; accent-color: var(--status-yellow); cursor: pointer; margin: 0;">
                        <input type="text" inputmode="numeric" id="bi-input-meta-mensal" onchange="atualizarMetaMensal(this.value)" oninput="document.getElementById('bi-range-meta-mensal').value=this.value" value="${metaMensal}" style="width: 40px; background: transparent; border: none; border-bottom: 1px solid var(--border-color); color: var(--text-main); padding: 0px 2px; font-size: 12px; font-weight: bold; outline: none; text-align: center;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; color: var(--text-muted); width: 75px;">Meta Anual</span>
                        <input type="range" id="bi-range-meta-anual" min="1" max="6000" value="${metaAnual}" oninput="document.getElementById('bi-input-meta-anual').value=this.value; atualizarMetaAnual(this.value)" style="flex: 1; accent-color: var(--status-green); cursor: pointer; margin: 0;">
                        <input type="text" inputmode="numeric" id="bi-input-meta-anual" onchange="atualizarMetaAnual(this.value)" oninput="document.getElementById('bi-range-meta-anual').value=this.value" value="${metaAnual}" style="width: 40px; background: transparent; border: none; border-bottom: 1px solid var(--border-color); color: var(--text-main); padding: 0px 2px; font-size: 12px; font-weight: bold; outline: none; text-align: center;">
                    </div>
                </div>
            </div>

            <!-- EM ANDAMENTO -->
            <div class="card bi-card">
                <div class="bi-card-header">
                    <h3>EM ANDAMENTO</h3>
                    <div class="icon-circle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-yellow)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </div>
                </div>
                <div class="bi-stat-main" id="bi-val-andamento">0</div>
                <div class="bi-badges">
                    <span class="badge dark">Verificações pendentes</span>
                </div>
                <div class="bi-card-footer justify-end">
                    <span>Acompanhamento em tempo real</span>
                </div>
            </div>
        </div>

        <!-- Middle Row -->
        <div class="bi-middle-row">
            <!-- Progresso por Linha -->
            <div class="card bi-card" style="flex: 2;">
                <div class="bi-card-header">
                    <h3 style="font-size: 16px; text-transform: none; color: var(--text-light);">Progresso por Linha</h3>
                    <div class="bi-toggle-btns">
                        <button class="active">Vol</button>
                    </div>
                </div>
                <div class="bi-chart-container">
                    <canvas id="barChartLinhas"></canvas>
                </div>
            </div>

            <!-- Ranking de Mantenedores -->
            <div class="card bi-card" style="flex: 1;">
                <div class="bi-card-header">
                    <h3 style="font-size: 16px; text-transform: none; color: var(--text-light);">Ranking de Mantenedores</h3>
                    <div class="icon-circle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-yellow)" stroke-width="2"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v8a5 5 0 0 1-10 0V4"/></svg>
                    </div>
                </div>
                <div class="bi-ranking-list" id="bi-ranking-list">
                    <!-- Dinâmico -->
                </div>
                <button class="btn-cancelar" style="width: 100%; margin-top: 25px;" onclick="navigateTo('rankingMantenedores')">Ver Lista Completa</button>
            </div>
        </div>

        <!-- Bottom Row -->
        <div class="bi-bottom-row">
            <div class="card bi-card" style="width: 100%;">
                <div class="bi-card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h3 style="font-size: 16px; text-transform: none; color: var(--text-light);">Performance Semanal da Produção</h3>
                    <div style="display: flex; gap: 10px; position: relative;">
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); cursor: pointer; margin-right: 5px;">
                            <input type="checkbox" id="bi-check-fds" onchange="localStorage.setItem('bi_incluir_fds', this.checked); renderizarPerformanceSemanal();" ${localStorage.getItem('bi_incluir_fds') === 'true' ? 'checked' : ''} style="accent-color: var(--accent-blue);"> Incluir FDS
                        </label>
                        <input type="month" id="bi-input-mes" title="Filtrar por Mês" onchange="renderizarPerformanceSemanal()" style="background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 4px; padding: 4px 8px; font-size: 13px; outline: none; cursor: pointer;">
                        
                        <button onclick="document.getElementById('bi-input-dia').showPicker()" title="Ver dia exato" style="background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-muted); border-radius: 4px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </button>
                        <input type="date" id="bi-input-dia" onchange="renderizarPerformanceSemanal(true)" style="position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; right: 0; top: 0;">
                    </div>
                </div>
                <div class="bi-chart-container" style="height: 200px;">
                    <canvas id="barChartSemanas"></canvas>
                </div>
            </div>
        </div>
    </div>`;

async function renderizarRankingCompleto() {
    const tbody = document.getElementById('tabela-ranking-body');
    if (!tbody) return;

    // Estado de carregamento
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><div class="skeleton" style="width: 100%; height: 20px;"></div></td></tr>';

    // Busca os dados das máquinas usando cache
    const maquinas = await fetchPlantaData();
    const { data: usuariosData } = await supabaseClient.from('usuarios').select('nome_completo, matricula');

    const usuarios = usuariosData || [];
    
    // Mapeia nome_completo -> matrícula
    const mapMatriculas = {};
    usuarios.forEach(u => {
        if(u.nome_completo && u.matricula) mapMatriculas[u.nome_completo.trim()] = u.matricula;
    });

    const contagem = {};
    maquinas.forEach(m => {
        const nome = m.mantenedor; 
        if (nome && nome !== '-' && nome !== '' && nome !== 'Não Atribuído') {
            if (!contagem[nome]) {
                contagem[nome] = { verdes: 0, roxas: 0, vermelhas: 0 };
            }
            if (m.status === 'green') contagem[nome].verdes++;
            if (m.status === 'purple') contagem[nome].roxas++;
            if (m.status === 'red') contagem[nome].vermelhas++;
        }
    });

    // Ordena por sucesso (verdes)
    const ranking = Object.keys(contagem)
        .map(nome => ({ nome, verdes: contagem[nome].verdes, roxas: contagem[nome].roxas, vermelhas: contagem[nome].vermelhas }))
        .filter(item => item.verdes > 0 || item.roxas > 0 || item.vermelhas > 0)
        .sort((a, b) => b.verdes - a.verdes);

    if (ranking.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhum dado encontrado para gerar o ranking.</td></tr>';
        return;
    }

    // A meta mensal é usada para calcular a Eficiência
    let meta = parseInt(localStorage.getItem('bi_meta_mensal')) || 120;

    let html = '';
    ranking.forEach((item, index) => {
        let matricula = mapMatriculas[item.nome.trim()] || '-';
        let taxaEficiencia = meta > 0 ? Math.round((item.verdes / meta) * 100) : 0;
        
        let posCor = 'var(--text-main)';
        if (index === 0) posCor = 'var(--status-green)';
        else if (index === 1) posCor = 'var(--status-yellow)';
        else if (index === 2) posCor = '#f97316'; // Laranja

        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="text-align: center; font-weight: bold; font-size: 14px; color: ${posCor};">#${index + 1}</td>
                <td style="color: var(--text-light); font-weight: 500;">${escapeHtml(item.nome)}</td>
                <td><span class="badge dark">${escapeHtml(matricula)}</span></td>
                <td style="text-align: center; color: var(--status-green); font-weight: bold;">${item.verdes}</td>
                <td style="text-align: center; color: var(--status-red); font-weight: bold;">${item.vermelhas}</td>
                <td style="text-align: center;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span style="font-size: 12px; font-weight: bold; color: var(--text-light);">${taxaEficiencia}%</span>
                        <div style="width: 60px; height: 6px; background: var(--input-bg); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${Math.min(taxaEficiencia, 100)}%; height: 100%; background: ${taxaEficiencia >= 100 ? 'var(--status-green)' : 'var(--accent-blue)'}; border-radius: 3px;"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}
