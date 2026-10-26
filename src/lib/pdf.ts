// Exportacion de reportes a PDF con el encabezado institucional.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { colors, institucion } from '../../shared/theme';

export function exportarPdf({
  titulo,
  subtitulo,
  columnas,
  filas,
  archivo,
}: {
  titulo: string;
  subtitulo?: string;
  columnas: string[];
  filas: (string | number | null | undefined)[][];
  archivo: string;
}) {
  const doc = new jsPDF({ orientation: columnas.length > 5 ? 'landscape' : 'portrait' });
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFillColor(colors.primary);
  doc.rect(0, 0, ancho, 24, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(14);
  doc.text(institucion.nombre, 14, 11);
  doc.setFontSize(9);
  doc.text(`Sistema de Gestión Integral - ${institucion.ciudad}`, 14, 18);

  doc.setTextColor(colors.textStrong);
  doc.setFontSize(13);
  doc.text(titulo, 14, 34);
  doc.setFontSize(9);
  doc.setTextColor(colors.muted);
  doc.text(`${subtitulo ? `${subtitulo} - ` : ''}Emitido el ${new Date().toLocaleString('es-AR')}`, 14, 40);

  autoTable(doc, {
    startY: 45,
    head: [columnas],
    body: filas.map((fila) => fila.map((celda) => (celda === null || celda === undefined ? '-' : String(celda)))),
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: colors.primary, textColor: '#ffffff' },
    alternateRowStyles: { fillColor: colors.background },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(colors.subtle);
      doc.text(`Página ${doc.getNumberOfPages()}`, ancho - 30, doc.internal.pageSize.getHeight() - 8);
    },
  });

  doc.text(`Total de registros: ${filas.length}`, 14, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8);
  doc.save(`${archivo}.pdf`);
}
