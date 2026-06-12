import { translations } from '../services/languages.js';

export function renderUIResults(data, npshr, lang = 'en') {
    const t = translations[lang];

    document.getElementById('kpiTdh').innerText = data.tdh_mcp.toFixed(2);
    
    const tdhUnit = lang === 'es' ? 'm.c.a. equiv. agua' : 'w.c.m. water equiv.';
    document.getElementById('kpiTdhMca').innerText = `${data.tdh_mca.toFixed(2)} ${tdhUnit}`;
    
    document.getElementById('kpiPotencia').innerText = data.power.P_kw.toFixed(1);
    
    const powerUnit = lang === 'es' ? 'CV (Con F.S.)' : 'HP (With S.F.)';
    document.getElementById('kpiPotenciaCv').innerText = `${data.power.P_cv.toFixed(1)} ${powerUnit}`;
    
    const npshaSlurryUnit = lang === 'es' ? 'm.c.l.' : 'w.c.l.';
    document.getElementById('kpiNpshaValue').innerText = `NPSHa: ${data.npsha.toFixed(2)} ${npshaSlurryUnit} / NPSHr: ${npshr.toFixed(1)} m`;

    const indicator = document.getElementById('statusNpshIndicator');
    const txtStatus = document.getElementById('kpiNpshStatus');
    if (data.npsha >= (npshr + 0.5)) {
        indicator.className = "w-3 h-3 rounded-full bg-emerald-500 animate-pulse";
        txtStatus.innerText = t.status_seguro;
        txtStatus.className = "text-xl font-bold uppercase tracking-wide text-emerald-400";
    } else {
        indicator.className = "w-3 h-3 rounded-full bg-red-500 animate-bounce";
        txtStatus.innerText = t.status_alerta;
        txtStatus.className = "text-xl font-bold uppercase tracking-wide text-red-400";
    }

    document.getElementById('resDensidad').innerText = `${data.density.toFixed(1)} kg/m³`;
    document.getElementById('resSm').innerText = data.Sm.toFixed(3);
    document.getElementById('resVSuc').innerText = `${data.suction_velocity.toFixed(2)} m/s`;
    document.getElementById('resVDes').innerText = `${data.discharge_velocity.toFixed(2)} m/s`;
    
    // Critical submergence anti-vortex
    document.getElementById('resSumergencia').innerText = `${data.submergence_m.toFixed(2)} m`;
    
    // Optimum Diameter Advisor
    const rec = data.rec_diameter;
    const vDes = data.discharge_velocity;
    const badgeDiameter = document.getElementById('resRecDiametro');
    if (vDes > (data.is_slurry ? 2.5 : 3.5)) {
        badgeDiameter.innerText = t.vel_alta;
        badgeDiameter.className = "font-medium text-red-400 text-xs";
    } else if (vDes < 1.2) {
        badgeDiameter.innerText = t.vel_baja;
        badgeDiameter.className = "font-medium text-amber-500 text-xs";
    } else {
        badgeDiameter.innerText = t.vel_ok;
        badgeDiameter.className = "font-medium text-emerald-400 text-xs";
    }
    
    if (data.is_slurry) {
        const headWaterUnit = lang === 'es' ? 'm.c.a.' : 'w.c.m.';
        document.getElementById('resCave').innerText = `${data.cave.H_agua_seleccion_mca.toFixed(2)} ${headWaterUnit}`;
        const transportState = (data.discharge_velocity >= data.durand.VL_ms) ? t.transporte_ok : t.transporte_alerta;
        document.getElementById('resDurand').innerText = `${data.durand.VL_ms.toFixed(2)} m/s (${transportState})`;
    } else {
        document.getElementById('resCave').innerText = t.solo_pulpa;
        document.getElementById('resDurand').innerText = t.solo_pulpa;
    }
    
    const methodName = (data.water_hammer.method === "Allievi") ? t.ariete_rapido : t.ariete_lento;
    document.getElementById('resAriete').innerText = `${data.water_hammer.overpressure_wcm.toFixed(1)} ${t.ariete_mca} [${t.metodo_label}: ${methodName}]`;
}