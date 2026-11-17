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

// ----- Factura y recibo de pago (simulados: trabajo práctico, sin validez fiscal) -----

type FacturaPdf = {
  numero: string; mes: string; alumno: string; legajo: string; fecha_emision: string; vence: string;
  total: number; pagado: number; saldo: number; estado: string; tutor?: string | null; tutor_dni?: string | null;
  items: { tipo: string; descripcion: string; importe: number; pago_id: number | null }[];
};

const $ = (n: number) => `$ ${n.toLocaleString('es-AR')}`;
const dmy = (f: string) => f.slice(0, 10).split('-').reverse().join('/');

function encabezado(doc: jsPDF, titulo: string, numero: string) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(colors.primary);
  doc.rect(0, 0, ancho, 28, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(15);
  doc.text(institucion.nombre, 14, 12);
  doc.setFontSize(9);
  doc.text(`${institucion.direccion} · ${institucion.telefono} · ${institucion.email}`, 14, 20);
  doc.setFontSize(13);
  doc.text(`${titulo} ${numero}`, ancho - 14, 12, { align: 'right' });
  doc.setTextColor(colors.textStrong);
}

function pie(doc: jsPDF) {
  doc.setFontSize(8);
  doc.setTextColor(colors.subtle);
  doc.text('Documento de ejemplo generado para un trabajo práctico. No tiene validez fiscal ni representa un cobro real.', 14, doc.internal.pageSize.getHeight() - 10);
}

export function facturaPdf(f: FacturaPdf) {
  const doc = new jsPDF();
  encabezado(doc, 'Factura', f.numero);
  doc.setFontSize(10);
  const datos = [
    ['Alumno', `${f.alumno} (legajo ${f.legajo})`],
    ['Responsable de pago', f.tutor ? `${f.tutor}${f.tutor_dni ? ` · DNI ${f.tutor_dni}` : ''}` : '-'],
    ['Período', f.mes],
    ['Emisión', dmy(f.fecha_emision)],
    ['Vencimiento', `${dmy(f.vence)} (se paga del 1 al 15)`],
    ['Estado', f.estado],
  ];
  datos.forEach(([k, v], i) => { doc.setTextColor(colors.subtle); doc.text(k, 14, 40 + i * 7); doc.setTextColor(colors.textStrong); doc.text(v, 62, 40 + i * 7); });
  autoTable(doc, {
    startY: 86,
    head: [['Concepto', 'Detalle', 'Estado', 'Importe']],
    body: f.items.map((i) => [i.tipo, i.descripcion, i.pago_id ? 'Pagado' : 'Pendiente', $(i.importe)]),
    foot: [['', '', 'Total', $(f.total)], ['', '', 'Pagado', $(f.pagado)], ['', '', 'Saldo', $(f.saldo)]],
    styles: { fontSize: 9.5 },
    headStyles: { fillColor: colors.primary, textColor: '#ffffff' },
    footStyles: { fillColor: colors.background, textColor: colors.textStrong, fontStyle: 'bold' },
    columnStyles: { 3: { halign: 'right' } },
  });
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(9.5);
  doc.text('Forma de pago: únicamente transferencia bancaria (no se aceptan pagos en efectivo).', 14, y);
  doc.text('Alias EDUCAR.TRANSFORMAR.CUOTAS · CBU 0000003100099999999999 (datos ficticios).', 14, y + 6);
  doc.text('Luego adjuntá el comprobante desde la web o la app, eligiendo los ítems que pagaste.', 14, y + 12);
  pie(doc);
  doc.save(`factura-${f.numero}.pdf`);
}

export function reciboPdf(r: { recibo: string; fecha: string; importe: number; factura: string; alumno: string; mes: string; numero_operacion: string; fecha_transferencia: string; items: { descripcion: string; importe: number }[] }) {
  const doc = new jsPDF();
  encabezado(doc, 'Comprobante de pago', r.recibo);
  doc.setFontSize(10);
  const datos = [
    ['Alumno', r.alumno], ['Factura', `${r.factura} · ${r.mes}`], ['Fecha de registro', new Date(r.fecha).toLocaleString('es-AR')],
    ['Forma de pago', 'Transferencia bancaria'], ['N.º de operación', r.numero_operacion], ['Fecha de la transferencia', dmy(r.fecha_transferencia)],
  ];
  datos.forEach(([k, v], i) => { doc.setTextColor(colors.subtle); doc.text(k, 14, 40 + i * 7); doc.setTextColor(colors.textStrong); doc.text(v, 66, 40 + i * 7); });
  autoTable(doc, {
    startY: 86,
    head: [['Ítems pagados', 'Importe']],
    body: r.items.map((i) => [i.descripcion, $(i.importe)]),
    foot: [['Total abonado', $(r.importe)]],
    styles: { fontSize: 9.5 },
    headStyles: { fillColor: colors.primary, textColor: '#ffffff' },
    footStyles: { fillColor: colors.background, textColor: colors.textStrong, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  });
  pie(doc);
  doc.save(`comprobante-${r.recibo}.pdf`);
}

// Descarga un archivo recibido en base64 (comprobante de transferencia adjunto).
export function descargarBase64(nombre: string, tipo: string, contenido: string) {
  const bytes = Uint8Array.from(atob(contenido), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
