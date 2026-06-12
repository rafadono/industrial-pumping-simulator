import { translations } from '../services/languages.js';

let chartInstance = null;

export function updateCurveChart(initialPoints, finalPoints, pumpPoints, currentQ, currentTdh, iniIntersection, finIntersection, lang = 'en') {
    const ctx = document.getElementById('systemCurveChart').getContext('2d');
    const t = translations[lang];
    
    if (chartInstance) chartInstance.destroy();

    const datasets = [
        {
            label: t.chart_ciclo_ini,
            data: initialPoints.map(p => ({ x: p.Q_m3h, y: p.TDH_mcp })),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.02)',
            borderWidth: 2,
            fill: true
        },
        {
            label: t.chart_ciclo_fin,
            data: finalPoints.map(p => ({ x: p.Q_m3h, y: p.TDH_mcp })),
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129, 140, 248, 0.02)',
            borderWidth: 2,
            fill: true,
            borderDash: [4, 4]
        },
        {
            label: t.chart_punto_consigna,
            data: [{ x: currentQ, y: currentTdh }],
            pointBackgroundColor: '#ef4444',
            pointRadius: 6,
            showLine: false
        }
    ];

    if (pumpPoints && pumpPoints.length > 0) {
        datasets.push({
            label: t.chart_curva_bomba,
            data: pumpPoints.map(p => ({ x: p.Q_m3h, y: p.H_bomba })),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            fill: false
        });

        if (iniIntersection && iniIntersection.Q_m3h > 0) {
            datasets.push({
                label: t.chart_cruce_ini,
                data: [{ x: iniIntersection.Q_m3h, y: iniIntersection.H_mcl }],
                pointBackgroundColor: '#10b981',
                pointRadius: 6,
                showLine: false
            });
        }
        if (finIntersection && finIntersection.Q_m3h > 0) {
            datasets.push({
                label: t.chart_cruce_fin,
                data: [{ x: finIntersection.Q_m3h, y: finIntersection.H_mcl }],
                pointBackgroundColor: '#f43f5e',
                pointRadius: 6,
                showLine: false
            });
        }
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: true, 
                    labels: { color: '#94a3b8', font: { size: 9 }, boxWidth: 10 } 
                } 
            },
            scales: {
                x: { 
                    type: 'linear', 
                    title: { display: true, text: lang === 'es' ? 'Caudal (m³/h)' : 'Flow Rate (m³/h)', color: '#94a3b8' },
                    grid: { color: '#334155' }, 
                    ticks: { color: '#94a3b8' } 
                },
                y: { 
                    title: { display: true, text: lang === 'es' ? 'TDH / Altura (m)' : 'TDH / Head (m)', color: '#94a3b8' },
                    grid: { color: '#334155' }, 
                    ticks: { color: '#94a3b8' } 
                }
            }
        }
    });
}
