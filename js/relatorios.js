/**
 * relatorios.js — Dashboard BI Fixo
 * ---------------------------------------------------------------------------
 * Dashboard de BI com layout fixo, populado com dados da planta e histórico.
 * ---------------------------------------------------------------------------
 */

let chartProgressoLinha = null;
let chartPerformanceSemanas = null;
let chartPanoramaAnual = null;
let chartDonutPlanta = null;
let panoramaHistoricoCache = [];
let panoramaAnoAtual = 'todos';
let biModoPrincipal = 'mensal';
let biCalAno = new Date().getFullYear();
let biCalMes = new Date().getMonth();
let biCalInicializado = false;
let biDiaSelecionado = null;
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

function invalidarCacheBI() {
    biCache = null;
    biCacheTime = 0;
}

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

    const totalMaquinas = maquinas.length || metaAnual;
    const concluidas = maquinas.filter(m => m.status === 'green').length;
    const emProgresso = maquinas.filter(m => m.status === 'yellow').length;
    const emRecepcao = maquinas.filter(m => m.status === 'purple').length;
    const rejeitadas = maquinas.filter(m => m.status === 'red').length;
    const emAndamento = emProgresso + emRecepcao;

    const pctTotal = Math.round((concluidas / totalMaquinas) * 100) || 0;

    const valConcluido = document.getElementById('bi-val-concluido');
    if (valConcluido) {
        valConcluido.textContent = concluidas;

        const elSubTotal = document.getElementById('bi-val-total-planta');
        if (elSubTotal) elSubTotal.textContent = `de ${totalMaquinas} máquinas (${pctTotal}%)`;

        const elAndamento = document.getElementById('bi-val-andamento');
        if (elAndamento) elAndamento.textContent = emProgresso;
        const elRecepcao = document.getElementById('bi-val-recepcao');
        if (elRecepcao) elRecepcao.textContent = emRecepcao;

        const elResumo = document.getElementById('bi-resumo-texto');
        if (elResumo) {
            elResumo.textContent = `${concluidas} máquinas aprovadas (${pctTotal}% da planta), ${emRecepcao} aguardando recepção, ${emProgresso} em manutenção e ${rejeitadas} rejeitadas para ajuste.`;
        }

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

        const totalAvaliado = concluidas + rejeitadas;
        const taxaAprov = totalAvaliado > 0 ? Math.round((concluidas / totalAvaliado) * 100) : 0;
        const elScoreVal = document.getElementById('bi-score-val');
        if (elScoreVal) elScoreVal.textContent = taxaAprov + '%';
        const ticksEl = document.getElementById('bi-score-ticks');
        if (ticksEl) {
            const totalTicks = 24;
            const ativos = Math.round((taxaAprov / 100) * totalTicks);
            ticksEl.innerHTML = Array.from({ length: totalTicks }, (_, idx) =>
                `<span class="bi-v2-score-tick ${idx < ativos ? 'active' : ''}"></span>`
            ).join('');
        }

        if (!biCalInicializado) {
            biCalInicializado = true;
            const { data: ultEv } = await supabaseClient
                .from('historico_maquinas')
                .select('data_evento')
                .order('data_evento', { ascending: false })
                .limit(1);
            if (ultEv && ultEv[0] && ultEv[0].data_evento) {
                const dtUlt = new Date(ultEv[0].data_evento);
                biCalAno = dtUlt.getFullYear();
                biCalMes = dtUlt.getMonth();
            }
        }

        renderizarDonutPlanta(maquinas);
        renderizarRankingMantenedores(maquinas);
        renderizarCalendarioBI();
        esconderSkeletonBI();
        await renderizarGraficoPrincipalBI(maquinas);
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

function trocarModoPrincipalBI(modo) {
    biModoPrincipal = modo;
    biDiaSelecionado = null;
    const info = document.getElementById('bi-cal-dia-info');
    if (info) info.textContent = '';
    document.querySelectorAll('#bi-v2-tabs .bi-v2-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-modo') === modo);
    });
    renderizarCalendarioBI();
    renderizarGraficoPrincipalBI();
}

function mudarMesCalendarioBI(delta) {
    biCalMes += delta;
    if (biCalMes < 0) { biCalMes = 11; biCalAno--; }
    else if (biCalMes > 11) { biCalMes = 0; biCalAno++; }
    biDiaSelecionado = null;
    const info = document.getElementById('bi-cal-dia-info');
    if (info) info.textContent = '';
    renderizarCalendarioBI();
    if (biModoPrincipal === 'semanal' || biModoPrincipal === 'mensal') {
        renderizarGraficoPrincipalBI();
    }
}

async function selecionarDiaCalendarioBI(dia) {
    biDiaSelecionado = (biDiaSelecionado === dia) ? null : dia;
    renderizarCalendarioBI();
    if (biDiaSelecionado) {
        await atualizarInfoDiaCalendarioBI(dia);
    } else {
        const info = document.getElementById('bi-cal-dia-info');
        if (info) info.textContent = '';
    }
    await renderizarGraficoPrincipalBI();
}

async function atualizarInfoDiaCalendarioBI(dia) {
    const info = document.getElementById('bi-cal-dia-info');
    if (!info) return;
    const ini = new Date(biCalAno, biCalMes, dia, 0, 0, 0).toISOString();
    const fim = new Date(biCalAno, biCalMes, dia, 23, 59, 59).toISOString();
    const { count, error } = await supabaseClient
        .from('historico_maquinas')
        .select('id', { count: 'exact', head: true })
        .gte('data_evento', ini)
        .lte('data_evento', fim);
    const dataFmt = `${String(dia).padStart(2, '0')}/${String(biCalMes + 1).padStart(2, '0')}/${biCalAno}`;
    info.textContent = error ? '' : `${dataFmt}: ${count || 0} ocorrência(s) — clique no dia p/ limpar`;
}

function renderizarCalendarioBI() {
    const titulo = document.getElementById('bi-cal-titulo');
    const grid = document.getElementById('bi-cal-grid');
    if (!titulo || !grid) return;

    const mesesFull = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    titulo.textContent = `${mesesFull[biCalMes]}, ${biCalAno}`;

    const dows = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const primeiroDia = new Date(biCalAno, biCalMes, 1).getDay();
    const totalDias = new Date(biCalAno, biCalMes + 1, 0).getDate();
    const hoje = new Date();
    const ehMesAtual = (hoje.getFullYear() === biCalAno && hoje.getMonth() === biCalMes);

    let html = dows.map(d => `<div class="bi-v2-cal-dow">${d}</div>`).join('');
    for (let i = 0; i < primeiroDia; i++) {
        html += `<div class="bi-v2-cal-day muted"></div>`;
    }
    for (let dia = 1; dia <= totalDias; dia++) {
        const selecionado = biDiaSelecionado === dia || (!biDiaSelecionado && ehMesAtual && hoje.getDate() === dia);
        html += `<div class="bi-v2-cal-day ${selecionado ? 'selected' : ''}" onclick="selecionarDiaCalendarioBI(${dia})">${dia}</div>`;
    }
    grid.innerHTML = html;
}

function renderizarDonutPlanta(maquinas) {
    const canvas = document.getElementById('donutChartPlanta');
    const legendEl = document.getElementById('bi-donut-legend');
    const totalEl = document.getElementById('bi-donut-total');
    if (!canvas || !legendEl) return;

    const grupos = [
        { label: 'Aprovadas', val: maquinas.filter(m => m.status === 'green').length, cor: '#22c55e' },
        { label: 'Em Recepção', val: maquinas.filter(m => m.status === 'purple').length, cor: '#a855f7' },
        { label: 'Em Progresso', val: maquinas.filter(m => m.status === 'yellow').length, cor: '#eab308' },
        { label: 'Rejeitadas', val: maquinas.filter(m => m.status === 'red').length, cor: '#ef4444' },
        { label: 'Não Iniciadas', val: maquinas.filter(m => m.status === 'dark').length, cor: '#52525b' }
    ];
    if (totalEl) totalEl.textContent = maquinas.length || 0;

    legendEl.innerHTML = grupos.map(g => `
        <div class="bi-v2-legend-item">
            <span class="bi-v2-legend-left"><span class="bi-v2-legend-dot" style="background:${g.cor};"></span>${g.label}</span>
            <strong style="color: var(--text-light);">${g.val}</strong>
        </div>
    `).join('');

    if (chartDonutPlanta) chartDonutPlanta.destroy();
    chartDonutPlanta = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: grupos.map(g => g.label),
            datasets: [{
                data: grupos.map(g => g.val),
                backgroundColor: grupos.map(g => g.cor),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: { legend: { display: false } }
        }
    });
}

async function renderizarGraficoPrincipalBI(maquinasCache = null) {
    const canvas = document.getElementById('barChartPrincipal');
    if (!canvas) return;
    const maquinas = maquinasCache || await fetchPlantaData();
    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#a3a3a3';
    const corGrade = 'rgba(148, 163, 184, 0.12)';
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const corBarraBase = isLight ? 'rgba(10, 10, 10, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    const corBordaBase = isLight ? 'rgba(10, 10, 10, 0.22)' : 'rgba(255, 255, 255, 0.28)';

    let labels = [];
    let valores = [];
    let datasetLabel = 'Aprovações';

    if (biDiaSelecionado) {
        const iniDia = new Date(biCalAno, biCalMes, biDiaSelecionado, 0, 0, 0).toISOString();
        const fimDia = new Date(biCalAno, biCalMes, biDiaSelecionado, 23, 59, 59).toISOString();
        const { data } = await supabaseClient
            .from('historico_maquinas')
            .select('acao_realizada')
            .gte('data_evento', iniDia)
            .lte('data_evento', fimDia);
        const lista = data || [];
        labels = ['Iniciadas', 'Finalizadas', 'Aprovadas', 'Rejeitadas'];
        valores = [
            lista.filter(e => e.acao_realizada === 'MANUTENCAO_INICIADA').length,
            lista.filter(e => e.acao_realizada === 'MANUTENCAO_FINALIZADA').length,
            lista.filter(e => e.acao_realizada === 'RECEPCAO_APROVADA').length,
            lista.filter(e => e.acao_realizada === 'RECEPCAO_REJEITADA').length
        ];
        datasetLabel = `Dia ${String(biDiaSelecionado).padStart(2, '0')}/${String(biCalMes + 1).padStart(2, '0')}`;
    } else if (biModoPrincipal === 'linha') {
        const linhas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        labels = linhas.map(l => 'Linha ' + l);
        valores = linhas.map(l => maquinas.filter(m => m.linha === l && m.status === 'green').length);
    } else if (biModoPrincipal === 'semanal') {
        const totalDias = new Date(biCalAno, biCalMes + 1, 0).getDate();
        const iniMes = new Date(biCalAno, biCalMes, 1, 0, 0, 0).toISOString();
        const fimMes = new Date(biCalAno, biCalMes, totalDias, 23, 59, 59).toISOString();
        const { data } = await supabaseClient
            .from('historico_maquinas')
            .select('acao_realizada, data_evento')
            .gte('data_evento', iniMes)
            .lte('data_evento', fimMes);
        const semanas = [0, 0, 0, 0, 0];
        const lista = data || [];
        const aprovadas = lista.filter(ev => ev.acao_realizada === 'RECEPCAO_APROVADA');
        const fonte = aprovadas.length > 0 ? aprovadas : lista;
        fonte.forEach(ev => {
            const sem = Math.min(4, Math.floor((new Date(ev.data_evento).getDate() - 1) / 7));
            semanas[sem]++;
        });
        if (fonte.length === 0) {
            maquinas.forEach(m => {
                if (m.data_fim) {
                    const dt = new Date(m.data_fim);
                    if (dt.getFullYear() === biCalAno && dt.getMonth() === biCalMes) {
                        const sem = Math.min(4, Math.floor((dt.getDate() - 1) / 7));
                        semanas[sem]++;
                    }
                }
            });
        }
        labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'];
        valores = semanas;
    } else if (biModoPrincipal === 'mensal') {
        const iniAno = new Date(biCalAno, 0, 1, 0, 0, 0).toISOString();
        const fimAno = new Date(biCalAno, 11, 31, 23, 59, 59).toISOString();
        const { data } = await supabaseClient
            .from('historico_maquinas')
            .select('acao_realizada, data_evento')
            .eq('acao_realizada', 'RECEPCAO_APROVADA')
            .gte('data_evento', iniAno)
            .lte('data_evento', fimAno);
        const meses = Array(12).fill(0);
        (data || []).forEach(ev => { meses[new Date(ev.data_evento).getMonth()]++; });
        labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        valores = meses;
    } else {
        const { data } = await supabaseClient
            .from('historico_maquinas')
            .select('acao_realizada, data_evento')
            .eq('acao_realizada', 'RECEPCAO_APROVADA');
        const mapa = {};
        const anoAtual = new Date().getFullYear();
        for (let a = 2024; a <= anoAtual; a++) mapa[a] = 0;
        (data || []).forEach(ev => {
            const a = new Date(ev.data_evento).getFullYear();
            mapa[a] = (mapa[a] || 0) + 1;
        });
        labels = Object.keys(mapa).sort();
        valores = labels.map(k => mapa[k]);
    }

    const maxVal = Math.max(...valores, 0);
    const bgColors = valores.map(v => (v > 0 && v === maxVal) ? '#f97316' : corBarraBase);
    const borderColors = valores.map(v => (v > 0 && v === maxVal) ? '#fb923c' : corBordaBase);

    if (chartProgressoLinha) chartProgressoLinha.destroy();
    chartProgressoLinha = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: datasetLabel,
                data: valores,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 10,
                maxBarThickness: 38
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: corTexto, font: { size: 11 } } },
                y: { beginAtZero: true, grid: { color: corGrade }, ticks: { color: corTexto, font: { size: 10 }, precision: 0 } }
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
    <div class="bi-v2-grid">
        <!-- Linha Superior: 2/3 Gráfico Principal + 1/3 Calendário & Metas -->
        <div class="bi-v2-top">
            <div class="card bi-card">
                <div class="bi-card-header" style="flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="font-size: 14px; text-transform: none; color: var(--text-muted); margin-bottom: 6px;">Evolução da Produção</h3>
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <div class="bi-stat-main" id="bi-val-concluido" style="margin-bottom: 0; font-size: 38px;">0</div>
                            <span id="bi-diff-mensal"></span>
                            <span id="bi-val-total-planta" style="font-size: 12px; color: var(--text-muted);"></span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <div class="bi-v2-tabs" id="bi-v2-tabs">
                            <button type="button" class="bi-v2-tab" data-modo="linha" onclick="trocarModoPrincipalBI('linha')">Por Linha</button>
                            <button type="button" class="bi-v2-tab" data-modo="semanal" onclick="trocarModoPrincipalBI('semanal')">Semanal</button>
                            <button type="button" class="bi-v2-tab active" data-modo="mensal" onclick="trocarModoPrincipalBI('mensal')">Mensal</button>
                            <button type="button" class="bi-v2-tab" data-modo="anual" onclick="trocarModoPrincipalBI('anual')">Anual</button>
                        </div>
                        <button type="button" onclick="abrirPanoramaAnual()" title="Abrir Panorama Detalhado (2024 até hoje)" style="background: rgba(249, 115, 22, 0.14); border: 1px solid rgba(249, 115, 22, 0.35); color: var(--accent-blue); border-radius: 9999px; padding: 5px 11px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            Panorama Anual
                        </button>
                    </div>
                </div>
                <div class="bi-chart-container" style="height: 235px; margin-top: 8px;">
                    <canvas id="barChartPrincipal"></canvas>
                </div>
            </div>

            <!-- Card Direito: Calendário & Metas -->
            <div class="card bi-card" style="justify-content: space-between;">
                <div>
                    <div class="bi-v2-cal-header">
                        <button type="button" class="bi-v2-cal-nav" onclick="mudarMesCalendarioBI(-1)" title="Mês anterior">&lsaquo;</button>
                        <span id="bi-cal-titulo" style="font-size: 13px; font-weight: 600; color: var(--text-light);"></span>
                        <button type="button" class="bi-v2-cal-nav" onclick="mudarMesCalendarioBI(1)" title="Próximo mês">&rsaquo;</button>
                    </div>
                    <div class="bi-v2-cal-grid" id="bi-cal-grid"></div>
                    <div id="bi-cal-dia-info" style="font-size: 11px; color: var(--text-muted); margin-top: 8px; text-align: center; min-height: 16px;"></div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 10px; margin-top: 10px; border-top: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label for="bi-input-meta-mensal" style="font-size: 11px; color: var(--text-muted); width: 70px; cursor: pointer;">Meta Mensal</label>
                            <div class="bi-meta-control">
                                <input type="number" min="1" id="bi-input-meta-mensal" class="bi-meta-input" onchange="atualizarMetaMensal(this.value)" value="${metaMensal}">
                                <div class="bi-meta-arrows">
                                    <button type="button" class="bi-meta-arrow-btn" onclick="alterarMetaStep('mensal', 1)" aria-label="Aumentar meta mensal"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg></button>
                                    <button type="button" class="bi-meta-arrow-btn" onclick="alterarMetaStep('mensal', -1)" aria-label="Diminuir meta mensal"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label for="bi-input-meta-anual" style="font-size: 11px; color: var(--text-muted); width: 70px; cursor: pointer;">Meta Anual</label>
                            <div class="bi-meta-control">
                                <input type="number" min="1" id="bi-input-meta-anual" class="bi-meta-input" onchange="atualizarMetaAnual(this.value)" value="${metaAnual}">
                                <div class="bi-meta-arrows">
                                    <button type="button" class="bi-meta-arrow-btn" onclick="alterarMetaStep('anual', 1)" aria-label="Aumentar meta anual"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg></button>
                                    <button type="button" class="bi-meta-arrow-btn" onclick="alterarMetaStep('anual', -1)" aria-label="Diminuir meta anual"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg></button>
                                </div>
                            </div>
                        </div>
                        <span id="bi-diff-anual"></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Linha Inferior: 3 Colunas -->
        <div class="bi-v2-bottom">
            <!-- Coluna 1: Resumo do Setor -->
            <div class="card bi-card">
                <div class="bi-card-header">
                    <h3 style="font-size: 15px; text-transform: none; color: var(--text-light); display: flex; align-items: center; gap: 6px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
                        Resumo do Setor
                    </h3>
                    <span style="font-size: 11px; color: var(--text-muted);"><span class="luminous-live-dot"></span>Ao vivo</span>
                </div>
                <p id="bi-resumo-texto" style="font-size: 12px; color: var(--text-muted); line-height: 1.55; margin-bottom: 14px;">Carregando panorama da planta...</p>
                <div class="bi-v2-mini-grid">
                    <div class="bi-v2-mini-box">
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Em Progresso</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span id="bi-val-andamento" style="font-size: 24px; font-weight: 700; color: var(--text-light);">0</span>
                            <span class="badge yellow" style="font-size: 10px;">Manutenção</span>
                        </div>
                    </div>
                    <div class="bi-v2-mini-box">
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Aguardando</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span id="bi-val-recepcao" style="font-size: 24px; font-weight: 700; color: var(--text-light);">0</span>
                            <span class="badge purple" style="font-size: 10px;">Recepção</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Coluna 2: Distribuição da Planta (Donut) -->
            <div class="card bi-card">
                <div class="bi-card-header">
                    <h3 style="font-size: 15px; text-transform: none; color: var(--text-light);">Distribuição da Planta</h3>
                    <span style="font-size: 11px; color: var(--text-muted);">Tempo real</span>
                </div>
                <div class="bi-v2-donut-wrap">
                    <div class="bi-v2-donut-canvas">
                        <canvas id="donutChartPlanta"></canvas>
                        <div class="bi-v2-donut-center">
                            <span id="bi-donut-total" style="font-size: 22px; font-weight: 700; color: var(--text-light); line-height: 1;">120</span>
                            <span style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Total</span>
                        </div>
                    </div>
                    <div class="bi-v2-legend" id="bi-donut-legend"></div>
                </div>
            </div>

            <!-- Coluna 3: Eficiência & Ranking -->
            <div class="card bi-card">
                <div class="bi-card-header">
                    <h3 style="font-size: 15px; text-transform: none; color: var(--text-light);">Eficiência & Ranking</h3>
                    <button type="button" onclick="navigateTo('rankingMantenedores')" style="background: none; border: none; color: var(--accent-blue); font-size: 11px; font-weight: 600; cursor: pointer;">Ver tudo &nearr;</button>
                </div>
                <div class="bi-v2-score-bar">
                    <span style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">Aprovação</span>
                    <div class="bi-v2-score-ticks" id="bi-score-ticks"></div>
                    <span id="bi-score-val" style="font-size: 12px; font-weight: 700; color: var(--text-light);">0%</span>
                </div>
                <div class="bi-ranking-list" id="bi-ranking-list" style="flex: 1;"></div>
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
