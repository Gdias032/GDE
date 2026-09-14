/**
 * relatorios.js — Construtor de Relatórios (v2)
 * ---------------------------------------------------------------------------
 * Painel com vários visuais na mesma tela, filtros por valor e cross-filter:
 * clicar numa barra de um gráfico filtra todos os outros.
 *
 * O front NUNCA monta SQL. Envia nomes de campo para bi_consultar(), que
 * valida tudo contra bi_catalogo antes de executar.
 *
 * A view desta tela é registrada no objeto `views` no fim do arquivo — o
 * views.js não precisa ser alterado.
 * ---------------------------------------------------------------------------
 */

let catalogoBI = [];
let proximoIdVisual = 1;

const painelBI = {
    periodo: 30,
    filtros: [],   // [{ campo, valor }]
    visuais: []    // [{ id, fonte, dimensao, metrica, agregacao, tipo, chart }]
};

const PALETA_BI = [
    '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
    '#ec4899', '#14b8a6', '#f97316', '#a855f7', '#22c55e'
];

/** Painel inicial — quatro visuais já configurados. */
const VISUAIS_PADRAO = [
    { fonte: 'vw_bi_planta',  dimensao: 'status',  metrica: 'maquinas', agregacao: 'soma', tipo: 'doughnut' },
    { fonte: 'vw_bi_planta',  dimensao: 'linha',   metrica: 'maquinas', agregacao: 'soma', tipo: 'bar' },
    { fonte: 'vw_bi_eventos', dimensao: 'dia',     metrica: 'eventos',  agregacao: 'soma', tipo: 'line' },
    { fonte: 'vw_bi_eventos', dimensao: 'usuario', metrica: 'eventos',  agregacao: 'soma', tipo: 'barra-h' }
];


/* =========================================================================
 * Ciclo de vida
 * ====================================================================== */

async function renderizarRelatorios() {
    if (!document.getElementById('bi-grade')) return;

    if (catalogoBI.length === 0) {
        const { data, error } = await supabaseClient
            .from('bi_catalogo')
            .select('fonte, fonte_rotulo, coluna, coluna_rotulo, papel, ordem')
            .order('ordem', { ascending: true });

        if (error) {
            console.error('Catálogo BI:', error);
            document.getElementById('bi-grade').innerHTML =
                '<div class="card bi-vazio">Não foi possível carregar o catálogo de dados.</div>';
            return;
        }
        catalogoBI = data || [];
    }

    // Monta o painel padrão apenas na primeira visita da sessão
    if (painelBI.visuais.length === 0) {
        VISUAIS_PADRAO.forEach(v => painelBI.visuais.push({ ...v, id: proximoIdVisual++, chart: null }));
    }

    document.getElementById('bi-periodo').value = String(painelBI.periodo);
    montarSeletorFiltro();
    desenharGrade();
    renderizarChipsFiltro();
    atualizarTodosVisuais();
}


/* =========================================================================
 * Filtros
 * ====================================================================== */

/** Popula o seletor de campo com todas as dimensões de todas as fontes. */
function montarSeletorFiltro() {
    const sel = document.getElementById('bi-filtro-campo');
    if (!sel) return;

    const vistos = new Set();
    const opcoes = [];

    catalogoBI
        .filter(c => c.papel === 'dimensao')
        .forEach(c => {
            if (vistos.has(c.coluna)) return;
            vistos.add(c.coluna);
            opcoes.push(`<option value="${c.coluna}" data-fonte="${c.fonte}">${c.coluna_rotulo}</option>`);
        });

    sel.innerHTML = '<option value="">Filtrar por…</option>' + opcoes.join('');
}

/** Ao escolher um campo, busca os valores possíveis. */
async function carregarValoresFiltro() {
    const selCampo = document.getElementById('bi-filtro-campo');
    const selValor = document.getElementById('bi-filtro-valor');
    const campo = selCampo.value;

    if (!campo) {
        selValor.innerHTML = '<option value="">—</option>';
        selValor.disabled = true;
        return;
    }

    const fonte = selCampo.options[selCampo.selectedIndex].dataset.fonte;
    selValor.disabled = true;
    selValor.innerHTML = '<option value="">Carregando…</option>';

    const { data, error } = await supabaseClient.rpc('bi_valores', {
        p_fonte: fonte,
        p_campo: campo,
        p_dias: fonte === 'vw_bi_planta' ? null : painelBI.periodo
    });

    if (error) {
        console.error('bi_valores:', error);
        selValor.innerHTML = '<option value="">Erro ao carregar</option>';
        return;
    }

    selValor.innerHTML = '<option value="">Escolha um valor…</option>' +
        (data || []).map(r => `<option value="${escapar(r.valor)}">${escapar(r.valor)}</option>`).join('');
    selValor.disabled = false;
}

function aplicarFiltroManual() {
    const campo = document.getElementById('bi-filtro-campo').value;
    const valor = document.getElementById('bi-filtro-valor').value;
    if (!campo || !valor) return;

    alternarFiltro(campo, valor);
    document.getElementById('bi-filtro-valor').value = '';
}

/** Adiciona o filtro, ou remove se já estiver ativo com o mesmo valor. */
function alternarFiltro(campo, valor) {
    const existente = painelBI.filtros.findIndex(f => f.campo === campo);

    if (existente >= 0) {
        const mesmoValor = painelBI.filtros[existente].valor === String(valor);
        painelBI.filtros.splice(existente, 1);
        if (!mesmoValor) painelBI.filtros.push({ campo, valor: String(valor) });
    } else {
        painelBI.filtros.push({ campo, valor: String(valor) });
    }

    renderizarChipsFiltro();
    atualizarTodosVisuais();
}

function removerFiltro(campo) {
    painelBI.filtros = painelBI.filtros.filter(f => f.campo !== campo);
    renderizarChipsFiltro();
    atualizarTodosVisuais();
}

function limparFiltros() {
    painelBI.filtros = [];
    renderizarChipsFiltro();
    atualizarTodosVisuais();
}

function renderizarChipsFiltro() {
    const alvo = document.getElementById('bi-chips');
    if (!alvo) return;

    if (painelBI.filtros.length === 0) {
        alvo.innerHTML = '<span class="bi-sem-filtro">Nenhum filtro ativo — clique num gráfico para filtrar</span>';
        return;
    }

    alvo.innerHTML = painelBI.filtros.map(f => `
        <span class="bi-chip">
            <strong>${escapar(rotuloDeColuna(f.campo))}:</strong> ${escapar(f.valor)}
            <button onclick="removerFiltro('${escapar(f.campo)}')" title="Remover">&times;</button>
        </span>`).join('') +
        `<button class="bi-chip-limpar" onclick="limparFiltros()">Limpar tudo</button>`;
}

function mudarPeriodo() {
    painelBI.periodo = parseInt(document.getElementById('bi-periodo').value, 10);
    atualizarTodosVisuais();
}


/* =========================================================================
 * Grade de visuais
 * ====================================================================== */

function desenharGrade() {
    const grade = document.getElementById('bi-grade');
    if (!grade) return;

    grade.innerHTML = painelBI.visuais.map(v => `
        <div class="card bi-visual" id="bi-visual-${v.id}">
            <div class="bi-visual-topo">
                <h4 id="bi-titulo-${v.id}">—</h4>
                <div class="bi-visual-acoes">
                    <button onclick="alternarConfig(${v.id})" title="Configurar">&#9881;</button>
                    <button onclick="removerVisual(${v.id})" title="Remover">&times;</button>
                </div>
            </div>

            <div class="bi-visual-config" id="bi-config-${v.id}" style="display:none;">
                <select onchange="mudarFonteVisual(${v.id}, this.value)" id="bi-f-${v.id}"></select>
                <select onchange="mudarCampoVisual(${v.id}, 'dimensao', this.value)" id="bi-d-${v.id}"></select>
                <select onchange="mudarCampoVisual(${v.id}, 'metrica', this.value)" id="bi-m-${v.id}"></select>
                <select onchange="mudarCampoVisual(${v.id}, 'agregacao', this.value)" id="bi-a-${v.id}">
                    <option value="soma">Soma</option>
                    <option value="media">Média</option>
                    <option value="contar">Contagem</option>
                    <option value="maximo">Máximo</option>
                    <option value="minimo">Mínimo</option>
                </select>
                <select onchange="mudarCampoVisual(${v.id}, 'tipo', this.value)" id="bi-t-${v.id}">
                    <option value="bar">Barras verticais</option>
                    <option value="barra-h">Barras horizontais</option>
                    <option value="line">Linha</option>
                    <option value="doughnut">Rosca</option>
                    <option value="pie">Pizza</option>
                </select>
            </div>

            <div class="bi-visual-corpo">
                <div class="bi-aviso" id="bi-aviso-${v.id}">Carregando…</div>
                <canvas id="bi-canvas-${v.id}"></canvas>
            </div>
        </div>`).join('');

    painelBI.visuais.forEach(v => preencherSelectsVisual(v));
}

function preencherSelectsVisual(v) {
    const fontes = [];
    catalogoBI.forEach(c => {
        if (!fontes.some(f => f.fonte === c.fonte)) fontes.push({ fonte: c.fonte, rotulo: c.fonte_rotulo });
    });

    const selF = document.getElementById(`bi-f-${v.id}`);
    if (selF) {
        selF.innerHTML = fontes.map(f =>
            `<option value="${f.fonte}" ${f.fonte === v.fonte ? 'selected' : ''}>${f.rotulo}</option>`).join('');
    }

    const dims = catalogoBI.filter(c => c.fonte === v.fonte && c.papel === 'dimensao');
    const mets = catalogoBI.filter(c => c.fonte === v.fonte && c.papel === 'metrica');

    const selD = document.getElementById(`bi-d-${v.id}`);
    if (selD) {
        selD.innerHTML = dims.map(d =>
            `<option value="${d.coluna}" ${d.coluna === v.dimensao ? 'selected' : ''}>${d.coluna_rotulo}</option>`).join('');
    }

    const selM = document.getElementById(`bi-m-${v.id}`);
    if (selM) {
        selM.innerHTML = mets.map(m =>
            `<option value="${m.coluna}" ${m.coluna === v.metrica ? 'selected' : ''}>${m.coluna_rotulo}</option>`).join('');
    }

    const selA = document.getElementById(`bi-a-${v.id}`);
    if (selA) selA.value = v.agregacao;
    const selT = document.getElementById(`bi-t-${v.id}`);
    if (selT) selT.value = v.tipo;
}

function alternarConfig(id) {
    const el = document.getElementById(`bi-config-${id}`);
    if (el) el.style.display = (el.style.display === 'none') ? 'grid' : 'none';
}

function mudarFonteVisual(id, fonte) {
    const v = painelBI.visuais.find(x => x.id === id);
    if (!v) return;

    v.fonte = fonte;
    const dims = catalogoBI.filter(c => c.fonte === fonte && c.papel === 'dimensao');
    const mets = catalogoBI.filter(c => c.fonte === fonte && c.papel === 'metrica');
    v.dimensao = dims.length ? dims[0].coluna : null;
    v.metrica  = mets.length ? mets[0].coluna : null;

    preencherSelectsVisual(v);
    atualizarVisual(v);
}

function mudarCampoVisual(id, campo, valor) {
    const v = painelBI.visuais.find(x => x.id === id);
    if (!v) return;
    v[campo] = valor;
    atualizarVisual(v);
}

function adicionarVisual() {
    painelBI.visuais.push({
        id: proximoIdVisual++,
        fonte: 'vw_bi_eventos',
        dimensao: 'acao',
        metrica: 'eventos',
        agregacao: 'soma',
        tipo: 'bar',
        chart: null
    });
    desenharGrade();
    atualizarTodosVisuais();
}

function removerVisual(id) {
    const v = painelBI.visuais.find(x => x.id === id);
    if (v && v.chart) v.chart.destroy();
    painelBI.visuais = painelBI.visuais.filter(x => x.id !== id);
    desenharGrade();
    atualizarTodosVisuais();
}


/* =========================================================================
 * Consulta e desenho
 * ====================================================================== */

function atualizarTodosVisuais() {
    painelBI.visuais.forEach(v => atualizarVisual(v));
}

async function atualizarVisual(v) {
    const titulo = document.getElementById(`bi-titulo-${v.id}`);
    if (titulo) {
        titulo.textContent = `${rotuloDeColuna(v.metrica, v.fonte)} por ${rotuloDeColuna(v.dimensao, v.fonte)}`;
    }

    if (!v.fonte || !v.dimensao || !v.metrica) return;

    // Dimensões cronológicas em ordem natural; o resto por ranking
    const cronologicas = ['dia', 'mes', 'hora'];
    const ordenar = cronologicas.includes(v.dimensao) ? 'rotulo' : 'valor';
    const semPeriodo = (v.fonte === 'vw_bi_planta');

    const { data, error } = await supabaseClient.rpc('bi_consultar', {
        p_fonte: v.fonte,
        p_dimensao: v.dimensao,
        p_metrica: v.metrica,
        p_agregacao: v.agregacao,
        p_dias: semPeriodo ? null : painelBI.periodo,
        p_limite: 15,
        p_ordenar: ordenar,
        p_filtros: painelBI.filtros
    });

    if (error) {
        console.error('bi_consultar:', error);
        avisoVisual(v, 'Erro: ' + error.message);
        return;
    }

    if (!data || data.length === 0) {
        avisoVisual(v, 'Sem dados para essa combinação.');
        return;
    }

    esconderAvisoVisual(v);
    desenharVisual(v, data);
}

function desenharVisual(v, linhas) {
    const canvas = document.getElementById(`bi-canvas-${v.id}`);
    if (!canvas) return;

    const labels   = linhas.map(r => String(r.rotulo));
    const valores  = linhas.map(r => Number(r.valor));
    const circular = (v.tipo === 'doughnut' || v.tipo === 'pie');

    if (v.chart) v.chart.destroy();

    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
    const corGrade = 'rgba(148, 163, 184, 0.15)';

    // Se há filtro ativo nesta dimensão, o valor filtrado fica em destaque
    const filtroAtivo = painelBI.filtros.find(f => f.campo === v.dimensao);
    
    // Mapa de cores para status e andamento
    const MAPA_CORES_STATUS = {
        'não iniciado': '#334155',
        'em andamento': '#f59e0b',
        'em progresso': '#f59e0b',
        'aguardando recepção': '#8b5cf6',
        'recepção aprovada': '#10b981',
        'aprovada': '#10b981',
        'verde': '#10b981',
        'recepção rejeitada': '#ef4444',
        'rejeitada': '#ef4444',
        'vermelha': '#ef4444',
        'dark': '#334155',
        'yellow': '#f59e0b',
        'purple': '#8b5cf6',
        'green': '#10b981',
        'red': '#ef4444'
    };

    const corDe = (i) => {
        const labelText = labels[i].trim().toLowerCase();
        let base;
        
        if (MAPA_CORES_STATUS[labelText]) {
            base = MAPA_CORES_STATUS[labelText];
        } else {
            base = circular ? PALETA_BI[i % PALETA_BI.length] : PALETA_BI[0];
        }
        
        if (!filtroAtivo) return base;
        return labels[i] === filtroAtivo.valor ? base : 'rgba(148,163,184,0.25)';
    };

    v.chart = new Chart(canvas, {
        type: (v.tipo === 'barra-h') ? 'bar' : v.tipo,
        data: {
            labels,
            datasets: [{
                label: rotuloDeColuna(v.metrica, v.fonte),
                data: valores,
                backgroundColor: v.tipo === 'line'
                    ? 'rgba(139, 92, 246, 0.15)'
                    : labels.map((_, i) => corDe(i)),
                borderColor: circular ? 'transparent' : PALETA_BI[0],
                borderWidth: circular ? 0 : 2,
                fill: v.tipo === 'line',
                tension: 0.3,
                borderRadius: circular ? 0 : 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: (v.tipo === 'barra-h') ? 'y' : 'x',
            onClick: (evt, elementos) => {
                if (!elementos || elementos.length === 0) return;
                alternarFiltro(v.dimensao, labels[elementos[0].index]);
            },
            onHover: (evt, elementos) => {
                if (evt && evt.native && evt.native.target) {
                    evt.native.target.style.cursor = elementos.length ? 'pointer' : 'default';
                }
            },
            plugins: {
                legend: {
                    display: circular,
                    position: 'right',
                    labels: { color: corTexto, boxWidth: 10, padding: 8, font: { size: 11 } }
                }
            },
            scales: circular ? {} : {
                x: { ticks: { color: corTexto, font: { size: 10 } }, grid: { color: corGrade } },
                y: { beginAtZero: true, ticks: { color: corTexto, font: { size: 10 } }, grid: { color: corGrade } }
            }
        }
    });
}

function avisoVisual(v, texto) {
    const aviso  = document.getElementById(`bi-aviso-${v.id}`);
    const canvas = document.getElementById(`bi-canvas-${v.id}`);
    if (aviso)  { aviso.textContent = texto; aviso.style.display = 'flex'; }
    if (canvas) canvas.style.display = 'none';
    if (v.chart) { v.chart.destroy(); v.chart = null; }
}

function esconderAvisoVisual(v) {
    const aviso  = document.getElementById(`bi-aviso-${v.id}`);
    const canvas = document.getElementById(`bi-canvas-${v.id}`);
    if (aviso)  aviso.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
}


/* =========================================================================
 * Utilitários
 * ====================================================================== */

function rotuloDeColuna(coluna, fonte) {
    const c = catalogoBI.find(x => x.coluna === coluna && (!fonte || x.fonte === fonte))
           || catalogoBI.find(x => x.coluna === coluna);
    return c ? c.coluna_rotulo : coluna;
}

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}


/* =========================================================================
 * View da tela
 * ====================================================================== */

views.relatorios = `
<div class="relatorios-wrapper">

    <div class="card bi-barra-topo">
        <div class="bi-barra-controles">
            <div class="bi-campo-inline">
                <label for="bi-periodo">Período</label>
                <select id="bi-periodo" onchange="mudarPeriodo()">
                    <option value="7">7 dias</option>
                    <option value="30" selected>30 dias</option>
                    <option value="90">90 dias</option>
                    <option value="3650">Tudo</option>
                </select>
            </div>

            <div class="bi-campo-inline">
                <label for="bi-filtro-campo">Filtro</label>
                <select id="bi-filtro-campo" onchange="carregarValoresFiltro()"></select>
            </div>

            <div class="bi-campo-inline">
                <label for="bi-filtro-valor">Valor</label>
                <select id="bi-filtro-valor" disabled onchange="aplicarFiltroManual()">
                    <option value="">—</option>
                </select>
            </div>

            <button class="btn-modern bi-btn-add" onclick="adicionarVisual()">+ Visual</button>
        </div>

        <div class="bi-chips" id="bi-chips"></div>
    </div>

    <div class="bi-grade" id="bi-grade"></div>

</div>`;
