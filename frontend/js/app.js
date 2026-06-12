import { 
    initializeDOMEvents, 
    retrieveFormData, 
    applyPresetToForm, 
    preloadDefaultTemplates, 
    loadEquationsFromStorage 
} from './ui/dom.js';
import { renderUIResults } from './ui/render.js';
import { updateCurveChart } from './ui/charts.js';
import { triggerCSVDownload } from './services/export_csv.js';
import { translations } from './services/languages.js';
import { hydraulicPresets } from './services/presets.js';

let currentLanguage = 'es';
let calculationCache = null;

const modal = document.getElementById('modalFormulaEditor');

function openEditorModal() {
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('opacity-100'), 10);
}

function closeEditorModal() {
    modal.classList.remove('opacity-100');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function changeLanguageInterface(langCode) {
    currentLanguage = langCode;
    
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            elem.innerText = translations[currentLanguage][key];
        }
    });

    if (calculationCache) {
        const inputs = retrieveFormData();
        renderUIResults(calculationCache, inputs.npshr, currentLanguage);
        
        updateCurveChart(
            calculationCache.system_curve, 
            calculationCache.system_curve_final, 
            calculationCache.pump_curve,
            inputs.flow_rate_m3h, 
            calculationCache.tdh_mcp,
            calculationCache.intersection_initial,
            calculationCache.intersection_final,
            currentLanguage
        );
    }
}

async function runSimulation() {
    const inputs = retrieveFormData();

    const payload = {
        mode: inputs.mode, 
        cp: inputs.cp, 
        solid_sg: inputs.solid_sg,
        direct_density: inputs.direct_density, 
        viscosity: inputs.viscosity,
        vapor_pressure: inputs.vapor_pressure, 
        froth_factor: inputs.froth_factor,
        flow_rate_m3h: inputs.flow_rate_m3h, 
        static_head: inputs.static_head,
        differential_pressure: inputs.differential_pressure, 
        differential_pressure_final: inputs.differential_pressure_final,
        suction_lift: inputs.suction_lift, 
        atmospheric_pressure: inputs.atmospheric_pressure, 
        pump_efficiency: inputs.pump_efficiency, 
        motor_efficiency: inputs.motor_efficiency, 
        er_cave: inputs.er_cave, 
        safety_factor: inputs.safety_factor,
        hr_cave: inputs.hr_cave, 
        fl_durand: inputs.fl_durand, 
        celerity: inputs.celerity,
        closure_time: inputs.closure_time, 
        pipe_material: inputs.pipe_material,
        
        friction_formula: document.getElementById('formulaFriccion').value,
        durand_formula: document.getElementById('formulaDurand').value,
        viscosity_formula: document.getElementById('formulaViscosidad').value,
        celerity_formula: document.getElementById('formulaCeleridad').value,
        cave_formula: document.getElementById('formulaCave').value,
        
        pump_curve_type: inputs.pump_curve_type,
        pump_shutoff: inputs.pump_shutoff, 
        pump_q_bep: inputs.pump_q_bep, 
        pump_h_bep: inputs.pump_h_bep,
        pump_q_max: inputs.pump_q_max, 
        pump_h_max: inputs.pump_h_max,
        pump_coef_a: inputs.pump_coef_a, 
        pump_coef_b: inputs.pump_coef_b, 
        pump_coef_c: inputs.pump_coef_c,
        
        suction: inputs.suction,
        discharge: inputs.discharge
    };

    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errLog = await response.json();
            throw new Error(JSON.stringify(errLog.detail));
        }

        calculationCache = await response.json();

        renderUIResults(calculationCache, inputs.npshr, currentLanguage);
        
        updateCurveChart(
            calculationCache.system_curve, 
            calculationCache.system_curve_final, 
            calculationCache.pump_curve,
            inputs.flow_rate_m3h, 
            calculationCache.tdh_mcp,
            calculationCache.intersection_initial,
            calculationCache.intersection_final,
            currentLanguage
        );

    } catch (error) {
        console.error("Communication failure with simulation server:", error);
    }
}

function startSimulator() {
    loadEquationsFromStorage();
    preloadDefaultTemplates();
    applyPresetToForm(hydraulicPresets.concentrado_cobre);

    lucide.createIcons();
    initializeDOMEvents(runSimulation);

    document.getElementById('btnAbrirEditor').addEventListener('click', openEditorModal);
    document.getElementById('btnCerrarEditor').addEventListener('click', closeEditorModal);
    
    document.getElementById('btnAplicarFormulas').addEventListener('click', () => {
        closeEditorModal();
        runSimulation();
    });
    
    document.getElementById('btnRestablecerFormulas').addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });

    document.getElementById('btnCalcular').addEventListener('click', runSimulation);
    
    document.getElementById('btnExportCSV').addEventListener('click', () => {
        if (calculationCache) {
            triggerCSVDownload(calculationCache, currentLanguage);
        }
    });
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    
    const selectorLang = document.getElementById('selectorIdioma');
    selectorLang.addEventListener('change', (e) => {
        changeLanguageInterface(e.target.value);
    });

    runSimulation();
    changeLanguageInterface('es');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSimulator);
} else {
    startSimulator();
}