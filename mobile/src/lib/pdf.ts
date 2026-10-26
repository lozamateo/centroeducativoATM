// Exportacion de reportes a PDF con el mismo encabezado que la web.
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, institucion } from '../../../shared/theme';

const escapar = (valor: unknown) =>
  String(valor ?? '-').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export async function exportarPdf({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: unknown[][] }) {
  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; color: ${colors.textStrong}; margin: 0; }
    header { background: ${colors.primary}; color: #fff; padding: 16px 24px; }
    header h1 { margin: 0; font-size: 18px; } header p { margin: 4px 0 0; font-size: 11px; }
    main { padding: 18px 24px; } h2 { font-size: 15px; margin: 0 0 4px; }
    .meta { color: ${colors.muted}; font-size: 10px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: ${colors.primary}; color: #fff; text-align: left; padding: 6px; }
    td { padding: 6px; border-bottom: 1px solid ${colors.border}; }
    tr:nth-child(even) td { background: ${colors.background}; }
  </style></head><body>
  <header><h1>${institucion.nombre}</h1><p>Sistema de Gestión Integral - ${institucion.ciudad}</p></header>
  <main><h2>${escapar(titulo)}</h2><div class="meta">Emitido el ${new Date().toLocaleString('es-AR')} · ${filas.length} registros</div>
  <table><thead><tr>${columnas.map((c) => `<th>${escapar(c)}</th>`).join('')}</tr></thead>
  <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${escapar(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></main>
  </body></html>`;

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: titulo, UTI: 'com.adobe.pdf' });
  }
}
