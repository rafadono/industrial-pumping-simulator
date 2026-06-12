export const mathematicalTemplates = {
    friccion: {
        haaland: "const termino = Math.pow(rugosidad / (3.7 * diametro), 1.11) + (6.9 / reynolds);\nreturn Math.pow(-1.8 * Math.log10(termino), -2);",
        laminar: "return 64.0 / reynolds;"
    },
    durand: {
        durand_std: "return 1.25 * fl * Math.sqrt(2.0 * g * diametro * (Ss - 1.0));",
        durand_mod: "return 1.45 * fl * Math.sqrt(2.0 * g * diametro * (Ss - 1.0)) * (1.0 + 0.5 * cp);"
    },
    viscosidad: {
        thomas: "return visc_agua * (1.0 + 2.5 * cv + 10.05 * cv * cv + 0.00273 * Math.exp(16.6 * cv));",
        einstein: "return visc_agua * Math.pow(1.0 - 2.5 * cv, -1);"
    },
    celeridad: {
        korteweg: "return Math.sqrt(2e9 / density) / Math.sqrt(1 + (2e9 / E) * (D / espesor));",
        fijo: "return celeridad_base;"
    },
    cave: {
        cave_std: "return {\"HR\": hr_base, \"ER\": er_base};",
        cave_log: "return {\"HR\": hr_base * (1.0 - 0.05 * Math.log(cp + 0.1)), \"ER\": er_base * 0.98};"
    }
};
