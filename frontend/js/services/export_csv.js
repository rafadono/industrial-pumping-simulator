import { translations } from './languages.js';

export function triggerCSVDownload(cache, lang = 'en') {
    const t = translations[lang];
    if (!cache) {
        alert(t.alert_csv_error);
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (lang === 'es') {
        csvContent += "Parametro,Valor,Unidad\n";
        csvContent += `Caudal Analizado,${cache.flow_rate_m3h || 324},m3/h\n`;
        csvContent += `Densidad calculada,${cache.density.toFixed(2)},kg/m3\n`;
        csvContent += `Sm Fluido,${cache.Sm.toFixed(3)},-\n`;
        csvContent += `Altura Dinamica Total (TDH),${cache.tdh_mcp.toFixed(2)},mcl\n`;
        csvContent += `TDH Equivalente Agua,${cache.tdh_mca.toFixed(2)},mca\n`;
        csvContent += `NPSH Disponible (NPSHa),${cache.npsha.toFixed(2)},mcl\n`;
        csvContent += `Potencia Motor Calculada,${cache.power.P_kw.toFixed(2)},kW\n`;
        csvContent += `Sobrepresion Golpe Ariete,${cache.water_hammer.overpressure_wcm.toFixed(2)},mca\n`;
    } else {
        csvContent += "Parameter,Value,Unit\n";
        csvContent += `Analyzed Flow Rate,${cache.flow_rate_m3h || 324},m3/h\n`;
        csvContent += `Calculated Density,${cache.density.toFixed(2)},kg/m3\n`;
        csvContent += `Fluid SG,${cache.Sm.toFixed(3)},-\n`;
        csvContent += `Total Dynamic Head (TDH),${cache.tdh_mcp.toFixed(2)},mcl\n`;
        csvContent += `Water Equivalent TDH,${cache.tdh_mca.toFixed(2)},mca\n`;
        csvContent += `Available NPSH (NPSHa),${cache.npsha.toFixed(2)},mcl\n`;
        csvContent += `Calculated Motor Power,${cache.power.P_kw.toFixed(2)},kW\n`;
        csvContent += `Water Hammer Overpressure,${cache.water_hammer.overpressure_wcm.toFixed(2)},wcm\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hydraulic_report_${Math.floor(Date.now() / 1000)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
