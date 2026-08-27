/**
 * planta.js
 * ---------------------------------------------------------------------------
 * Renderização da Planta e Matriz de Máquinas
 * 
 * Responsável por desenhar a matriz de máquinas, gerenciar o hover
 * flutuante (tooltip) e renderizar o painel lateral de análises rápidas
 * (TOP 5 Mantenedores).
 * ---------------------------------------------------------------------------
 */

// ============================================================================
// MATRIZ DE MÁQUINAS E TOOLTIP
// ============================================================================

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

// ============================================================================
// PAINEL DE ANÁLISES RÁPIDAS (RANKING)
// ============================================================================

/** Painel lateral com o TOP 5 de mantenedores por quantidade de atuações (Verdes e Roxas). */
function renderizarAnalisesRapidas() {
    const painel = document.getElementById('painel-analise-lateral');
    if (!painel) return;

    const contagem = {};
    todasAsMaquinas.forEach(m => {
        if (m.realizou && m.realizou !== '-' && m.realizou !== '') {
            if (!contagem[m.realizou]) {
                contagem[m.realizou] = { verdes: 0, roxas: 0 };
            }
            if (m.status === 'green') contagem[m.realizou].verdes++;
            if (m.status === 'purple') contagem[m.realizou].roxas++;
        }
    });

    // Filtra para remover quem tem 0 verdes e 0 roxas
    const ranking = Object.keys(contagem)
        .map(nome => ({ nome, verdes: contagem[nome].verdes, roxas: contagem[nome].roxas }))
        .filter(item => item.verdes > 0 || item.roxas > 0)
        .sort((a, b) => b.verdes - a.verdes)
        .slice(0, 5);

    const maxCount = ranking.length > 0 ? ranking[0].verdes + ranking[0].roxas : 0;

    let html = `
        <h3 style="font-size: 14px; margin-bottom: 5px; display: flex; align-items:center; gap:6px; color: var(--text-light);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Análises Rápidas
        </h3>
        <p style="color: var(--text-muted); font-size: 10px; margin-top: 10px; margin-bottom: 12px; letter-spacing: 0.5px; font-weight:700;">TOP 5 - ATUAÇÕES POR MANTENEDOR</p>
    `;

    if (ranking.length === 0) {
        html += `<p style="font-size: 11px; color: var(--text-muted); margin-top: 20px;">Nenhum dado registrado até o momento.</p>`;
    } else {
        ranking.forEach((item, index) => {
            let cor = '#3b82f6'; // Azul por padrão (intermediários)
            if (index === 0) {
                cor = 'var(--status-green)'; // 1º lugar = Verde
            } else if (index === 1) {
                cor = 'var(--status-yellow)'; // 2º lugar = Amarelo
            } else if (index === ranking.length - 1 && ranking.length > 2) {
                cor = 'var(--status-red)'; // Último lugar = Vermelho (só se houver mais de 2 para ter um último de verdade)
            } else if (index === ranking.length - 1) {
                cor = 'var(--status-red)'; // Vermelho para o último
            }

            const percentualVerde = maxCount > 0 ? Math.round((item.verdes / maxCount) * 100) : 0;
            const percentualRoxo = maxCount > 0 ? Math.round((item.roxas / maxCount) * 100) : 0;
            
            html += `
            <div style="background: var(--input-bg-soft); padding: 12px; border-radius: 8px; margin-bottom: 10px; border:1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                    <span style="color: var(--text-main);">${escapeHtml(item.nome)}</span>
                    <div>
                        <span style="color: ${cor}; font-weight: bold;">${item.verdes} aprov.</span>
                        ${item.roxas > 0 ? `<span style="color: #c084fc; font-size: 10px; margin-left: 5px;">(+${item.roxas} roxos)</span>` : ''}
                    </div>
                </div>
                <div style="width: 100%; height: 5px; background: var(--border-color); border-radius: 3px; overflow: hidden; display: flex;">
                    <div style="background: ${cor}; width: ${percentualVerde}%; height: 100%; transition: width 0.5s ease;"></div>
                    ${item.roxas > 0 ? `<div style="background: #8b5cf6; width: ${percentualRoxo}%; height: 100%; transition: width 0.5s ease;"></div>` : ''}
                </div>
            </div>`;
        });
    }

    painel.innerHTML = html;
}
