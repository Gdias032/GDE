/**
 * analise.js
 * ---------------------------------------------------------------------------
 * Tela de "Eficiência" / BI: percentual de conclusão e gráfico de linha
 * (usa Chart.js, carregado via CDN no index.html).
 *
 * NOTA: os valores [5, 12, 18, 22, 28, 35] no dataset são fixos/simulados
 * (não vêm de dados reais de dias anteriores). Somente o último ponto
 * ("Dom") usa o valor real atual. Isso é aceitável como protótipo visual,
 * mas para um gráfico real seria necessário guardar um histórico diário
 * (ex: um snapshot da contagem de "green" salvo a cada dia).
 * ---------------------------------------------------------------------------
 */

function renderizarGraficoAnalise() {
    const concluidas = todasAsMaquinas.filter(m => m.status === 'green').length;
    const porcentagem = Math.round((concluidas / todasAsMaquinas.length) * 100);
    const statVal = document.getElementById('stat-value-bi');
    if (statVal) statVal.innerText = `${porcentagem}%`;

    const canvas = document.getElementById('lineChart');
    if (!canvas) return;

    if (meuGraficoBI) meuGraficoBI.destroy();

    meuGraficoBI = new Chart(canvas, {
        type: 'line',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Aprovações Realizadas',
                data: [5, 12, 18, 22, 28, 35, concluidas],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: 'var(--text-main)' } } },
            scales: {
                x: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'var(--tint-02)' } },
                y: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'var(--tint-02)' } }
            }
        }
    });
}
