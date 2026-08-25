/**
 * planta.js
 * ---------------------------------------------------------------------------
 * Renderização da grade (matriz) de máquinas na tela "Planta Geral",
 * o tooltip flutuante ao passar o mouse, e o painel lateral de
 * "Análises Rápidas" (ranking de mantenedores).
 * ---------------------------------------------------------------------------
 */

function renderizarMatriz() {
    const matriz = document.getElementById('matriz-planta');
    if (!matriz) return;

    let tooltip = document.getElementById('celula-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'celula-tooltip';
        tooltip.className = 'tooltip-flutuante';
        document.body.appendChild(tooltip);
    }

    let celulasHTML = '';
    todasAsMaquinas.forEach(cel => {
        // CORREÇÃO DE SEGURANÇA: obs é texto livre digitado pelo usuário
        // (ver recepcao.js) e precisa ser escapado antes de virar atributo
        // HTML, para não permitir XSS via observação técnica.
        const obsFormatada = (cel.obs && cel.obs.trim() !== '') ? escapeHtml(cel.obs) : 'Nenhuma observação registrada.';
        celulasHTML += `<div class="celula ${cel.status}"
            data-id="${escapeHtml(cel.id)}"
            data-andamento="${escapeHtml(cel.andamento)}"
            data-realizou="${escapeHtml(cel.realizou)}"
            data-recepcionou="${escapeHtml(cel.recepcionou)}"
            data-datainicio="${escapeHtml(cel.dataInicio)}"
            data-datafim="${escapeHtml(cel.dataFim)}"
            data-obs="${obsFormatada}">${escapeHtml(cel.id)}</div>`;
    });
    matriz.innerHTML = celulasHTML;

    matriz.addEventListener('mouseover', function (e) {
        if (e.target.classList.contains('celula')) {
            const el = e.target;
            tooltip.innerHTML = `
            <div class="tooltip-header">
                <span>Máquina ${el.dataset.id}</span> <span class="badge ${el.classList[1]}" style="font-size: 10px;">${el.dataset.andamento}</span>
            </div>
            <div class="tooltip-body">
                <p><strong>Mantenedor:</strong> ${el.dataset.realizou}</p>
                <p><strong>Recepcionado por:</strong> ${el.dataset.recepcionou}</p>
                <p><strong>Data de Início:</strong> ${el.dataset.datainicio}</p>
                <p><strong>Data de Término:</strong> ${el.dataset.datafim}</p>
                <div class="tooltip-obs-box">
                    <strong>Observação:</strong><br> ${el.dataset.obs}
                </div>
            </div>`;
            tooltip.style.display = 'block';
        }
    });

    matriz.addEventListener('mousemove', e => {
        if (e.target.classList.contains('celula')) {
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        }
    });

    matriz.addEventListener('mouseout', e => {
        if (e.target.classList.contains('celula')) tooltip.style.display = 'none';
    });

    matriz.addEventListener('click', function (e) {
        if (e.target.classList.contains('celula')) {
            tooltip.style.display = 'none';
            navigateTo('recepcao', e.target.dataset.id);
        }
    });
}

/** Painel lateral com o TOP 5 de mantenedores por quantidade de atuações. */
function renderizarAnalisesRapidas() {
    const painel = document.getElementById('painel-analise-lateral');
    if (!painel) return;

    const contagem = {};
    todasAsMaquinas.forEach(m => {
        if (m.realizou && m.realizou !== '-' && m.realizou !== '') {
            contagem[m.realizou] = (contagem[m.realizou] || 0) + 1;
        }
    });

    const ranking = Object.keys(contagem)
        .map(nome => ({ nome, total: contagem[nome] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    const maxCount = ranking.length > 0 ? ranking[0].total : 0;

    let html = `
        <h3 style="font-size: 14px; margin-bottom: 5px; display: flex; align-items:center; gap:6px; color: var(--text-light);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Análises Rápidas
        </h3>
        <p style="color: var(--text-muted); font-size: 10px; margin-top: 10px; margin-bottom: 12px; letter-spacing: 0.5px; font-weight:700;">TOP 5 - ATUAÇÕES POR MANTENEDOR</p>
    `;

    if (ranking.length === 0) {
        html += `<p style="font-size: 11px; color: var(--text-muted); margin-top: 20px;">Nenhum dado registrado até o momento.</p>`;
    } else {
        const cores = ['var(--status-green)', 'var(--status-yellow)', '#8b5cf6', '#3b82f6', '#f43f5e'];
        ranking.forEach((item, index) => {
            const cor = cores[index % cores.length];
            const percentual = maxCount > 0 ? Math.round((item.total / maxCount) * 100) : 0;
            html += `
            <div style="background: var(--input-bg-soft); padding: 12px; border-radius: 8px; margin-bottom: 10px; border:1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                    <span style="color: var(--text-main);">${escapeHtml(item.nome)}</span>
                    <span style="color: ${cor}; font-weight: bold;">${item.total} unid.</span>
                </div>
                <div style="width: 100%; height: 5px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                    <div style="background: ${cor}; width: ${percentual}%; height: 100%; border-radius: 3px; transition: width 0.5s ease;"></div>
                </div>
            </div>`;
        });
    }

    painel.innerHTML = html;
}
