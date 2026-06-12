import { hydraulicPresets } from '../services/presets.js';

export const baseTemplates = {
    friccion: {
        haaland: "const termino = Math.pow(rugosidad / (3.7 * diametro), 1.11) + (6.9 / reynolds);\nreturn Math.pow(-1.8 * Math.log10(termino), -2);",
        laminar: "return 64.0 / reynolds;",
        user_custom: "const termino = Math.pow(rugosidad / (3.7 * diametro), 1.11) + (6.9 / reynolds);\nreturn Math.pow(-1.8 * Math.log10(termino), -2);"
    },
    durand: {
        durand_std: "return 1.25 * fl * Math.sqrt(2.0 * g * diametro * (Ss - 1.0));",
        durand_mod: "return 1.45 * fl * Math.sqrt(2.0 * g * diametro * (Ss - 1.0)) * (1.0 + 0.5 * cp);",
        user_custom: "return 1.25 * fl * Math.sqrt(2.0 * g * diametro * (Ss - 1.0));"
    },
    viscosidad: {
        thomas: "return visc_agua * (1.0 + 2.5 * cv + 10.05 * cv * cv + 0.00273 * Math.exp(16.6 * cv));",
        einstein: "return visc_agua * Math.pow(1.0 - 2.5 * cv, -1);",
        user_custom: "return visc_agua * (1.0 + 2.5 * cv + 10.05 * cv * cv + 0.00273 * Math.exp(16.6 * cv));"
    },
    celeridad: {
        korteweg: "return Math.sqrt(2.0e9 / density) / Math.sqrt(1.0 + (2.0e9 / E) * (D / espesor));",
        fijo: "return celeridad_base;",
        user_custom: "return celeridad_base;"
    },
    cave: {
        cave_std: "return {\"HR\": hr_base, \"ER\": er_base};",
        cave_log: "return {\"HR\": hr_base * (1.0 - 0.05 * Math.log(cp + 0.1)), \"ER\": er_base * 0.98};",
        user_custom: "return {\"HR\": hr_base, \"ER\": er_base};"
    }
};

export function loadEquationsFromStorage() {
    const keys = ['friccion', 'durand', 'viscosidad', 'celeridad', 'cave'];
    keys.forEach(key => {
        const saved = localStorage.getItem(`pump_custom_${key}`);
        if (saved) {
            baseTemplates[key]['user_custom'] = saved;
        }
    });
}

export function saveEquationToStorage(category, code) {
    baseTemplates[category]['user_custom'] = code;
    localStorage.setItem(`pump_custom_${category}`, code);
}

export function initializeDOMEvents(recalculateCallback) {
    document.getElementById('fluidMode').addEventListener('change', (e) => {
        const isConcentration = e.target.value === 'concentracion';
        document.getElementById('groupCp').classList.toggle('hidden', !isConcentration);
        document.getElementById('groupGe').classList.toggle('hidden', !isConcentration);
        document.getElementById('groupDensidad').classList.toggle('hidden', isConcentration);
    });

    document.getElementById('pipeMaterial').addEventListener('change', (e) => {
        const roughnessValues = { acero: 0.00025, hdpe: 0.00001, pvc: 0.000005 };
        document.getElementById('rugosidad').value = roughnessValues[e.target.value] || 0.00025;
    });

    document.getElementById('tplFriccion').addEventListener('change', (e) => {
        document.getElementById('formulaFriccion').value = baseTemplates.friccion[e.target.value];
    });
    document.getElementById('tplDurand').addEventListener('change', (e) => {
        document.getElementById('formulaDurand').value = baseTemplates.durand[e.target.value];
    });
    document.getElementById('tplViscosidad').addEventListener('change', (e) => {
        document.getElementById('formulaViscosidad').value = baseTemplates.viscosidad[e.target.value];
    });
    document.getElementById('tplCeleridad').addEventListener('change', (e) => {
        document.getElementById('formulaCeleridad').value = baseTemplates.celeridad[e.target.value];
    });
    document.getElementById('tplCave').addEventListener('change', (e) => {
        document.getElementById('formulaCave').value = baseTemplates.cave[e.target.value];
    });

    document.getElementById('btnSaveFriccion').addEventListener('click', () => {
        saveEquationToStorage('friccion', document.getElementById('formulaFriccion').value);
        document.getElementById('tplFriccion').value = 'user_custom';
    });
    document.getElementById('btnSaveDurand').addEventListener('click', () => {
        saveEquationToStorage('durand', document.getElementById('formulaDurand').value);
        document.getElementById('tplDurand').value = 'user_custom';
    });
    document.getElementById('btnSaveViscosidad').addEventListener('click', () => {
        saveEquationToStorage('viscosidad', document.getElementById('formulaViscosidad').value);
        document.getElementById('tplViscosidad').value = 'user_custom';
    });
    document.getElementById('btnSaveCeleridad').addEventListener('click', () => {
        saveEquationToStorage('celeridad', document.getElementById('formulaCeleridad').value);
        document.getElementById('tplCeleridad').value = 'user_custom';
    });
    document.getElementById('btnSaveCave').addEventListener('click', () => {
        saveEquationToStorage('cave', document.getElementById('formulaCave').value);
        document.getElementById('tplCave').value = 'user_custom';
    });

    const pumpCurveTypeSelect = document.getElementById('pumpCurveType');
    if (pumpCurveTypeSelect) {
        pumpCurveTypeSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('panelBomba3Puntos').classList.toggle('hidden', val !== '3puntos');
            document.getElementById('panelBombaCoeficientes').classList.toggle('hidden', val !== 'coeficientes');
        });
    }

    document.getElementById('selectorPreset').addEventListener('change', (e) => {
        const preset = hydraulicPresets[e.target.value];
        if (preset) {
            applyPresetToForm(preset);
            if (recalculateCallback) recalculateCallback();
        }
    });
}

export function preloadDefaultTemplates() {
    document.getElementById('formulaFriccion').value = baseTemplates.friccion.haaland;
    document.getElementById('formulaDurand').value = baseTemplates.durand.durand_std;
    document.getElementById('formulaViscosidad').value = baseTemplates.viscosidad.thomas;
    document.getElementById('formulaCeleridad').value = baseTemplates.celeridad.korteweg;
    document.getElementById('formulaCave').value = baseTemplates.cave.cave_std;
}

export function applyPresetToForm(p) {
    document.getElementById('fluidMode').value = p.mode;
    document.getElementById('cp').value = p.cp;
    document.getElementById('geSolidos').value = p.solid_sg;
    document.getElementById('densidad').value = p.direct_density;
    document.getElementById('viscCinematica').value = p.viscosity;
    document.getElementById('presionVapor').value = p.vapor_pressure;
    document.getElementById('factorEspuma').value = p.froth_factor;
    document.getElementById('caudalM3h').value = p.flow_rate_m3h;
    document.getElementById('cotaEstatica').value = p.static_head;
    document.getElementById('difPresionMca').value = p.differential_pressure;
    document.getElementById('difPresionMcaFinal').value = p.differential_pressure_final;
    document.getElementById('cotaSuccion').value = p.suction_lift;
    document.getElementById('presionAtm').value = p.atmospheric_pressure;
    document.getElementById('eficienciaBomba').value = p.pump_efficiency;
    document.getElementById('eficienciaMotor').value = p.motor_efficiency;
    document.getElementById('erCave').value = p.er_cave;
    document.getElementById('factorSeguridad').value = p.safety_factor;
    document.getElementById('pipeMaterial').value = p.pipe_material;
    document.getElementById('rugosidad').value = p.roughness;
    document.getElementById('dSuc').value = p.d_suc;
    document.getElementById('lSuc').value = p.l_suc;
    document.getElementById('kSuc').value = p.k_suc;
    document.getElementById('dDes').value = p.d_des;
    document.getElementById('lDes').value = p.l_des;
    document.getElementById('kDes').value = p.k_des;
    document.getElementById('hrCave').value = p.hr_cave;
    document.getElementById('flDurand').value = p.fl_durand;
    document.getElementById('celeridad').value = p.celerity;
    document.getElementById('tiempoCierre').value = p.closure_time;

    document.getElementById('fluidMode').dispatchEvent(new Event('change'));
}

export function retrieveFormData() {
    const flowVal = parseFloat(document.getElementById('caudalM3h').value);
    const diffPressVal = parseFloat(document.getElementById('difPresionMca').value);
    const diffPressFinalVal = parseFloat(document.getElementById('difPresionMcaFinal').value);

    return {
        mode: document.getElementById('fluidMode').value,
        cp: parseFloat(document.getElementById('cp').value) || 0.0,
        solid_sg: parseFloat(document.getElementById('geSolidos').value) || 2.65, 
        direct_density: parseFloat(document.getElementById('densidad').value) || 1000.0,
        viscosity: parseFloat(document.getElementById('viscCinematica').value) || 1.0e-6, 
        vapor_pressure: parseFloat(document.getElementById('presionVapor').value) || 0.24,
        froth_factor: parseFloat(document.getElementById('factorEspuma').value) || 1.0, 
        flow_rate_m3h: isNaN(flowVal) ? 100.0 : flowVal,
        static_head: parseFloat(document.getElementById('cotaEstatica').value) || 0.0,
        differential_pressure: isNaN(diffPressVal) ? 0.0 : diffPressVal,
        differential_pressure_final: isNaN(diffPressFinalVal) ? (isNaN(diffPressVal) ? 0.0 : diffPressVal) : diffPressFinalVal,
        suction_lift: parseFloat(document.getElementById('cotaSuccion').value) || 0.0,
        atmospheric_pressure: parseFloat(document.getElementById('presionAtm').value) || 10.33,
        pump_efficiency: parseFloat(document.getElementById('eficienciaBomba').value) || 70.0,
        motor_efficiency: parseFloat(document.getElementById('eficienciaMotor').value) || 0.95,
        er_cave: parseFloat(document.getElementById('erCave').value) || 1.0, 
        safety_factor: parseFloat(document.getElementById('factorSeguridad').value) || 1.15,
        npshr: parseFloat(document.getElementById('npshr').value) || 0.0,
        pipe_material: document.getElementById('pipeMaterial').value,
        
        pump_curve_type: document.getElementById('pumpCurveType') ? document.getElementById('pumpCurveType').value : "none",
        pump_shutoff: parseFloat(document.getElementById('bombaShutOff').value) || 0.0,
        pump_q_bep: parseFloat(document.getElementById('bombaQBep').value) || 0.0,
        pump_h_bep: parseFloat(document.getElementById('bombaHBep').value) || 0.0,
        pump_q_max: parseFloat(document.getElementById('bombaQMax').value) || 0.0,
        pump_h_max: parseFloat(document.getElementById('bombaHMax').value) || 0.0,
        pump_coef_a: parseFloat(document.getElementById('bombaCoefA').value) || 0.0,
        pump_coef_b: parseFloat(document.getElementById('bombaCoefB').value) || 0.0,
        pump_coef_c: parseFloat(document.getElementById('bombaCoefC').value) || 0.0,

        suction: {
            inner_diameter: parseFloat(document.getElementById('dSuc').value) || 0.25,
            length: parseFloat(document.getElementById('lSuc').value) || 1.0,
            roughness: parseFloat(document.getElementById('rugosidad').value) || 0.00005,
            total_k: parseFloat(document.getElementById('kSuc').value) || 0.0
        },
        discharge: {
            inner_diameter: parseFloat(document.getElementById('dDes').value) || 0.20,
            length: parseFloat(document.getElementById('lDes').value) || 1.0,
            roughness: parseFloat(document.getElementById('rugosidad').value) || 0.00005,
            total_k: parseFloat(document.getElementById('kDes').value) || 0.0
        },
        hr_cave: parseFloat(document.getElementById('hrCave').value) || 1.0, 
        fl_durand: parseFloat(document.getElementById('flDurand').value) || 1.00,
        celerity: parseFloat(document.getElementById('celeridad').value) || 1000.0,
        closure_time: parseFloat(document.getElementById('tiempoCierre').value) || 5.0
    };
}