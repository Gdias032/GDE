/**
 * relatorios.js — Dashboard BI Fixo
 * ---------------------------------------------------------------------------
 * Dashboard de BI com layout fixo, populado com dados da planta e histórico.
 * ---------------------------------------------------------------------------
 */

let chartProgressoLinha = null;
let chartPerformanceSemanas = null;
let chartPanoramaAnual = null;
let panoramaHistoricoCache = [];
let panoramaAnoAtual = 'todos';
const META_INDIVIDUAL_PADRAO = 15;
let metaIndividual = parseInt(localStorage.getItem('bi_meta_individual')) || META_INDIVIDUAL_PADRAO;
let metaMensal = parseInt(localStorage.getItem('bi_meta_mensal')) || (metaIndividual * 2);
let metaAnual = parseInt(localStorage.getItem('bi_meta_anual')) || (metaMensal * 12);

/** Ajusta metas padrão (quando não há valor manual salvo) conforme o nº de mantenedores ativos. */
async function sincronizarMetasPorEquipe() {
    const temMensalSalva = localStorage.getItem('bi_meta_mensal') !== null;
    const temAnualSalva = localStorage.getItem('bi_meta_anual') !== null;
    if (temMensalSalva && temAnualSalva) return;

    const { count, error } = await supabaseClient
        .from('usuarios')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true)
        .eq('perfil_acesso', 'MANTENEDOR');

    const qtdMantenedores = (!error && count && count > 0) ? count : 1;
    if (!temMensalSalva) metaMensal = qtdMantenedores * metaIndividual;
    if (!temAnualSalva) metaAnual = metaMensal * 12;
}

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
    metaMensal = parseInt(valor) || (metaIndividual * 2);
    localStorage.setItem('bi_meta_mensal', metaMensal);
    renderizarRelatorios(); // re-renderiza para atualizar os cálculos
}

async function atualizarMetaAnual(valor) {
    metaAnual = parseInt(valor) || (metaMensal * 12);
    localStorage.setItem('bi_meta_anual', metaAnual);
    renderizarRelatorios(); // re-renderiza para atualizar os cálculos
}

async function atualizarMetaIndividual(valor) {
    metaIndividual = parseInt(valor) || META_INDIVIDUAL_PADRAO;
    localStorage.setItem('bi_meta_individual', metaIndividual);
    renderizarRelatorios(); // re-renderiza para atualizar os cálculos
}

function alterarMetaStep(tipo, delta) {
    if (tipo === 'mensal') {
        atualizarMetaMensal(Math.max(1, metaMensal + delta));
    } else if (tipo === 'anual') {
        atualizarMetaAnual(Math.max(1, metaAnual + delta));
    }
}

function formatarPillMeta(diff) {
    const positivo = diff >= 0;
    const texto = diff > 0
        ? `+${diff} acima da meta`
        : (diff === 0 ? 'Meta atingida!' : `${diff} para a meta`);
    const corTexto = positivo ? 'var(--status-green)' : 'var(--status-red)';
    const corFundo = positivo ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)';
    const corBorda = positivo ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    return `<span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; color: ${corTexto}; background: ${corFundo}; border: 1px solid ${corBorda};">${texto}</span>`;
}

async function renderizarRelatorios() {
    // Mostrar loader skeleton na UI
    mostrarSkeletonBI();

    // 1. Buscar dados da planta usando cache central e sincronizar metas com a equipe ativa
    const [maquinas] = await Promise.all([
        fetchPlantaData(),
        sincronizarMetasPorEquipe()
    ]);

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
        const spanDiffMensal = document.getElementById('bi-diff-mensal');
        if (spanDiffMensal) {
            spanDiffMensal.innerHTML = formatarPillMeta(concluidas - metaMensal);
        }

        const inputMetaAnual = document.getElementById('bi-input-meta-anual');
        if (inputMetaAnual) inputMetaAnual.value = metaAnual;
        const spanDiffAnual = document.getElementById('bi-diff-anual');
        if (spanDiffAnual) {
            spanDiffAnual.innerHTML = formatarPillMeta(concluidas - metaAnual);
        }

        const inputMetaIndividual = document.getElementById('bi-input-meta-individual');
        if (inputMetaIndividual) inputMetaIndividual.value = metaIndividual;

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
    const recepcaoPorLinha = [];
    const progressoPorLinha = [];
    const negadasPorLinha = [];

    linhas.forEach(linha => {
        const mLinha = maquinas.filter(m => m.linha === linha);
        concluidasPorLinha.push(mLinha.filter(m => m.status === 'green').length);
        recepcaoPorLinha.push(mLinha.filter(m => m.status === 'purple').length);
        progressoPorLinha.push(mLinha.filter(m => m.status === 'yellow').length);
        negadasPorLinha.push(mLinha.filter(m => m.status === 'red').length);
    });

    const ctx = document.getElementById('barChartLinhas');
    if (!ctx) return;

    if (chartProgressoLinha) chartProgressoLinha.destroy();

    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
    const corGrade = 'rgba(148, 163, 184, 0.12)';

    chartProgressoLinha = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: linhas.map(l => 'Linha ' + l),
            datasets: [
                {
                    label: 'Concluído',
                    data: concluidasPorLinha,
                    backgroundColor: '#22c55e',
                    borderRadius: 4,
                    maxBarThickness: 28
                },
                {
                    label: 'Em Recepção',
                    data: recepcaoPorLinha,
                    backgroundColor: '#a855f7',
                    borderRadius: 4,
                    maxBarThickness: 28
                },
                {
                    label: 'Em Progresso',
                    data: progressoPorLinha,
                    backgroundColor: '#eab308',
                    borderRadius: 4,
                    maxBarThickness: 28
                },
                {
                    label: 'Negados',
                    data: negadasPorLinha,
                    backgroundColor: '#ef4444',
                    borderRadius: 4,
                    maxBarThickness: 28
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: corTexto, font: { size: 11, weight: '600' } }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    suggestedMax: 12,
                    grid: { color: corGrade },
                    ticks: { color: corTexto, font: { size: 10 }, stepSize: 2, precision: 0 }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: corTexto,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8,
                        padding: 14,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        footer: (items) => {
                            const total = items.reduce((acc, it) => acc + (it.parsed.y || 0), 0);
                            return `Ativas na linha: ${total} / 12`;
                        }
                    }
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

    if (groupsData.length > 0) {
        const minStart = new Date(groupsData[0].start).toISOString();
        const maxEnd = new Date(groupsData[groupsData.length - 1].end).toISOString();

        const { data: histData, error: histErr } = await supabaseClient
            .from('historico_maquinas')
            .select('acao_realizada, data_evento')
            .gte('data_evento', minStart)
            .lte('data_evento', maxEnd);

        if (!histErr && histData && histData.length > 0) {
            histData.forEach(ev => {
                const time = new Date(ev.data_evento).getTime();
                const groupFound = groupsData.findIndex(w => time >= w.start && time <= w.end);
                if (groupFound !== -1) {
                    if (ev.acao_realizada === 'RECEPCAO_APROVADA') groupsData[groupFound].verdes++;
                    else if (ev.acao_realizada === 'MANUTENCAO_FINALIZADA') groupsData[groupFound].roxas++;
                    else if (ev.acao_realizada === 'RECEPCAO_REJEITADA') groupsData[groupFound].vermelhas++;
                }
            });
        } else if (maquinas.length > 0) {
            maquinas.forEach(m => {
                if (m.data_fim) {
                    const time = new Date(m.data_fim).getTime();
                    const groupFound = groupsData.findIndex(w => time >= w.start && time <= w.end);
                    if (groupFound !== -1) {
                        if (m.status === 'green') groupsData[groupFound].verdes++;
                        else if (m.status === 'purple') groupsData[groupFound].roxas++;
                        else if (m.status === 'red') groupsData[groupFound].vermelhas++;
                    }
                }
            });
        }
    }

    const datasets = [
        {
            label: 'Concluído',
            data: groupsData.map(w => w.verdes),
            backgroundColor: '#22c55e',
            borderRadius: 5,
            maxBarThickness: 38
        },
        {
            label: 'Enviado p/ Recepção',
            data: groupsData.map(w => w.roxas),
            backgroundColor: '#a855f7',
            borderRadius: 5,
            maxBarThickness: 38
        },
        {
            label: 'Negados',
            data: groupsData.map(w => w.vermelhas),
            backgroundColor: '#ef4444',
            borderRadius: 5,
            maxBarThickness: 38
        }
    ];

    const ctx = document.getElementById('barChartSemanas');
    if (!ctx) return;

    if (chartPerformanceSemanas) chartPerformanceSemanas.destroy();

    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
    const corGrade = 'rgba(148, 163, 184, 0.12)';

    chartPerformanceSemanas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: groupsData.map(w => w.name),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { display: false }, ticks: { color: corTexto, font: { size: 11 } } },
                y: { beginAtZero: true, grid: { color: corGrade }, ticks: { color: corTexto, font: { size: 10 }, precision: 0 } }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: corTexto,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8,
                        padding: 14,
                        font: { size: 11 }
                    }
                }
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
                <div class="bi-sparkline" style="display: flex; flex-direction: column; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label for="bi-input-meta-mensal" style="font-size: 11px; color: var(--text-muted); width: 72px; cursor: pointer;">Meta Mensal</label>
                            <div class="bi-meta-control">
                                <input type="number" min="1" id="bi-input-meta-mensal" class="bi-meta-input" title="Editar meta mensal" onchange="atualizarMetaMensal(this.value)" value="${metaMensal}">
                                <div class="bi-meta-arrows">
                                    <button type="button" class="bi-meta-arrow-btn" onclick="alterarMetaStep('mensal', 1)" title="Aumentar meta mensal" aria-label="Aumentar meta mensal"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg></button>
                                    <button type="button" class="bi-meta-arrow-btn" onclick="alterarMetaStep('mensal', -1)" title="Diminuir meta mensal" aria-label="Diminuir meta mensal"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg></button>
                                </div>
                            </div>
                        </div>
                        <span id="bi-diff-mensal"></span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label for="bi-input-meta-anual" style="font-size: 11px; color: var(--text-muted); width: 72px; cursor: pointer;">Meta Anual</label>
                            <div class="bi-meta-control">
                                <input type="number" min="1" id="bi-input-meta-anual" class="bi-meta-input" title="Editar meta anual" onchange="atualizarMetaAnual(this.value)" value="${metaAnual}">
                                <div class="bi-meta-arrows">
                                    <button type="button" class="bi-meta-arrow-btn" onclick="alterarMetaStep('anual', 1)" title="Aumentar meta anual" aria-label="Aumentar meta anual"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg></button>
                                    <button type="button" class="bi-meta-arrow-btn" onclick="alterarMetaStep('anual', -1)" title="Diminuir meta anual" aria-label="Diminuir meta anual"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg></button>
                                </div>
                            </div>
                        </div>
                        <span id="bi-diff-anual"></span>
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
                        
                        <button type="button" onclick="abrirPanoramaAnual()" title="Ver histórico anual (2024 até hoje)" style="background: rgba(59, 130, 246, 0.14); border: 1px solid rgba(59, 130, 246, 0.35); color: var(--accent-blue); border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            Panorama Anual
                        </button>
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
    </div>

    <!-- Modal Panorama Anual -->
    <div id="modal-panorama-anual" class="modal-overlay" style="display: none;" onclick="if(event.target === this) fecharPanoramaAnual()">
        <div class="modal-card" style="width: 92%; max-width: 820px; text-align: left;">
            <div class="modal-header">
                <h3 style="margin: 0; font-size: 17px; color: var(--text-light);">Panorama Histórico Anual</h3>
                <span class="modal-close" onclick="fecharPanoramaAnual()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </span>
            </div>
            <div id="panorama-anos-tabs" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;"></div>
            <div id="panorama-resumo" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px;"></div>
            <div style="position: relative; height: 290px; width: 100%;">
                <canvas id="chartPanoramaAnual"></canvas>
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

    // A meta individual é usada para calcular a Eficiência
    let meta = parseInt(localStorage.getItem('bi_meta_individual')) || META_INDIVIDUAL_PADRAO;

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

async function abrirPanoramaAnual() {
    const modal = document.getElementById('modal-panorama-anual');
    if (!modal) return;
    modal.style.display = 'flex';

    const tabsEl = document.getElementById('panorama-anos-tabs');
    const resumoEl = document.getElementById('panorama-resumo');
    if (tabsEl) tabsEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Carregando histórico...</span>';
    if (resumoEl) resumoEl.innerHTML = '';

    const { data, error } = await supabaseClient
        .from('historico_maquinas')
        .select('acao_realizada, data_evento')
        .order('data_evento', { ascending: true });

    if (error) {
        console.error('Erro ao carregar panorama anual:', error);
        if (tabsEl) tabsEl.innerHTML = '<span style="font-size: 12px; color: var(--status-red);">Erro ao carregar histórico.</span>';
        return;
    }

    panoramaHistoricoCache = data || [];
    const anosSet = new Set();
    panoramaHistoricoCache.forEach(ev => {
        if (ev.data_evento) anosSet.add(new Date(ev.data_evento).getFullYear());
    });
    const anoCorrente = new Date().getFullYear();
    for (let a = 2024; a <= anoCorrente; a++) anosSet.add(a);

    const anos = Array.from(anosSet).sort((a, b) => a - b);
    panoramaAnoAtual = 'todos';

    if (tabsEl) {
        const botoes = [
            { id: 'todos', label: `Todos (${anos[0]}–${anos[anos.length - 1]})` },
            ...anos.map(a => ({ id: String(a), label: String(a) }))
        ];
        tabsEl.innerHTML = botoes.map(b => `
            <button type="button" data-ano="${b.id}" onclick="selecionarAnoPanorama('${b.id}')"
                style="padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-muted);">
                ${b.label}
            </button>
        `).join('');
    }

    selecionarAnoPanorama('todos');
}

function fecharPanoramaAnual() {
    const modal = document.getElementById('modal-panorama-anual');
    if (modal) modal.style.display = 'none';
}

function selecionarAnoPanorama(ano) {
    panoramaAnoAtual = String(ano);
    document.querySelectorAll('#panorama-anos-tabs button').forEach(btn => {
        const ativo = btn.getAttribute('data-ano') === panoramaAnoAtual;
        btn.style.background = ativo ? 'var(--accent-blue)' : 'var(--input-bg)';
        btn.style.color = ativo ? '#fff' : 'var(--text-muted)';
        btn.style.borderColor = ativo ? 'var(--accent-blue)' : 'var(--border-color)';
    });
    renderizarGraficoPanorama(panoramaAnoAtual);
}

function renderizarGraficoPanorama(ano) {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const eventos = panoramaHistoricoCache.filter(ev => {
        if (!ev.data_evento) return false;
        if (ano === 'todos') return true;
        return String(new Date(ev.data_evento).getFullYear()) === ano;
    });

    const iniciadas = eventos.filter(e => e.acao_realizada === 'MANUTENCAO_INICIADA').length;
    const aprovadas = eventos.filter(e => e.acao_realizada === 'RECEPCAO_APROVADA').length;
    const rejeitadas = eventos.filter(e => e.acao_realizada === 'RECEPCAO_REJEITADA').length;

    const resumoEl = document.getElementById('panorama-resumo');
    if (resumoEl) {
        resumoEl.innerHTML = `
            <div style="background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px;">
                <div style="font-size: 11px; color: var(--text-muted);">Manutenções Iniciadas</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--status-yellow); margin-top: 2px;">${iniciadas}</div>
            </div>
            <div style="background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px;">
                <div style="font-size: 11px; color: var(--text-muted);">Recepções Aprovadas</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--status-green); margin-top: 2px;">${aprovadas}</div>
            </div>
            <div style="background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px;">
                <div style="font-size: 11px; color: var(--text-muted);">Recepções Rejeitadas</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--status-red); margin-top: 2px;">${rejeitadas}</div>
            </div>`;
    }

    let labels = [];
    let serieIniciadas = [];
    let serieAprovadas = [];
    let serieRejeitadas = [];

    if (ano === 'todos') {
        const mapaAnos = {};
        const anoCorrente = new Date().getFullYear();
        for (let a = 2024; a <= anoCorrente; a++) {
            mapaAnos[a] = { ini: 0, apr: 0, rej: 0 };
        }
        eventos.forEach(ev => {
            const y = new Date(ev.data_evento).getFullYear();
            if (!mapaAnos[y]) mapaAnos[y] = { ini: 0, apr: 0, rej: 0 };
            if (ev.acao_realizada === 'MANUTENCAO_INICIADA') mapaAnos[y].ini++;
            else if (ev.acao_realizada === 'RECEPCAO_APROVADA') mapaAnos[y].apr++;
            else if (ev.acao_realizada === 'RECEPCAO_REJEITADA') mapaAnos[y].rej++;
        });
        const chaves = Object.keys(mapaAnos).sort();
        labels = chaves;
        serieIniciadas = chaves.map(k => mapaAnos[k].ini);
        serieAprovadas = chaves.map(k => mapaAnos[k].apr);
        serieRejeitadas = chaves.map(k => mapaAnos[k].rej);
    } else {
        const iniArr = Array(12).fill(0);
        const aprArr = Array(12).fill(0);
        const rejArr = Array(12).fill(0);
        eventos.forEach(ev => {
            const m = new Date(ev.data_evento).getMonth();
            if (ev.acao_realizada === 'MANUTENCAO_INICIADA') iniArr[m]++;
            else if (ev.acao_realizada === 'RECEPCAO_APROVADA') aprArr[m]++;
            else if (ev.acao_realizada === 'RECEPCAO_REJEITADA') rejArr[m]++;
        });
        labels = mesesNomes;
        serieIniciadas = iniArr;
        serieAprovadas = aprArr;
        serieRejeitadas = rejArr;
    }

    const canvas = document.getElementById('chartPanoramaAnual');
    if (!canvas) return;
    if (chartPanoramaAnual) chartPanoramaAnual.destroy();

    chartPanoramaAnual = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Iniciadas', data: serieIniciadas, backgroundColor: '#eab308', borderRadius: 4 },
                { label: 'Aprovadas', data: serieAprovadas, backgroundColor: '#22c55e', borderRadius: 4 },
                { label: 'Rejeitadas', data: serieRejeitadas, backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#9ca3af', font: { size: 12 } } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
                y: { beginAtZero: true, grid: { color: 'rgba(156, 163, 175, 0.12)' }, ticks: { color: '#9ca3af', precision: 0 } }
            }
        }
    });
}
