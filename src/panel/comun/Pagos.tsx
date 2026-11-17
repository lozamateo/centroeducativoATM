// Pagos (Parte 3): facturas por alumno, pago por transferencia con comprobante e historial de deuda.
// Es una simulación para el trabajo práctico: no se procesa dinero real.
import { useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { AlertTriangle, Banknote, CalendarClock, CheckCircle2, FileDown, Landmark, Paperclip, Receipt } from 'lucide-react';
import { DATOS_TRANSFERENCIA, fecha, fechaHora, nombreMes, pesos, tonoFactura } from '../../../shared/format';
import type { CuentaAlumno, ComprobanteArchivo, Factura, PagoRegistrado } from '../../../shared/types';
import { Badge, Button, Card, DataState, Empty, Feedback, Field, Input, Modal, Tabs } from '../../components/ui';
import { descargarBase64, facturaPdf, reciboPdf } from '../../lib/pdf';
import { useAction, useData } from '../../lib/useData';

export interface PagosConfig {
  cargar: (rango: { desde?: string; hasta?: string }) => Promise<CuentaAlumno>;
  comprobante?: (id: number) => Promise<ComprobanteArchivo>;
  // Sin "pagar" la vista es de consulta (alumno y administración: el administrador solo define valores).
  pagar?: (facturaId: number, data: Record<string, unknown>) => Promise<PagoRegistrado>;
}

const TIPOS_ARCHIVO = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_BYTES = 2 * 1024 * 1024;

export function PagosAlumnoVista({ config }: { config: PagosConfig }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [vista, setVista] = useState<'facturas' | 'deuda'>('facturas');
  const { data, loading, error, reload } = useData(() => config.cargar({ desde: desde || undefined, hasta: hasta || undefined }), [desde, hasta]);
  const [aPagar, setAPagar] = useState<{ factura: Factura; itemIds: number[] } | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);

  return (
    <DataState loading={loading && !data} error={error} onRetry={reload}>
      {data && (
        <div className="stack">
          <div className="grid grid-4">
            <Resumen icon={<AlertTriangle />} titulo="Deuda vencida" valor={pesos(data.deuda.total_adeudado)}
              detalle={data.deuda.adeuda_desde ? `Adeuda desde ${nombreMes(data.deuda.adeuda_desde)}` : 'Sin deuda vencida'} />
            <Resumen icon={<CalendarClock />} titulo="A vencer" valor={pesos(data.deuda.a_vencer)} detalle="Se paga del 1 al 15 de cada mes" />
            <Resumen icon={<Receipt />} titulo="Cuota" valor={data.descuento_hermanos ? 'Con descuento' : 'Tarifa general'}
              detalle={data.descuento_hermanos ? `Grupo familiar con ${data.hijos_en_el_colegio} hijos` : 'Un solo hijo en el centro'} />
            <Resumen icon={<Landmark />} titulo="Forma de pago" valor="Transferencia" detalle="No se aceptan pagos en efectivo" />
          </div>

          {ultimo && <div className="alert alert-ok"><span>{ultimo}</span></div>}

          <Tabs active={vista} onChange={setVista} tabs={[
            { key: 'facturas', label: 'Facturas y comprobantes' },
            { key: 'deuda', label: 'Historial de deuda' },
          ]} />

          {vista === 'facturas' ? (
            <>
              <Card>
                <div className="inline-form">
                  <Field label="Desde (mes)"><Input type="month" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
                  <Field label="Hasta (mes)"><Input type="month" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
                  {(desde || hasta) && <Button variant="ghost" onClick={() => { setDesde(''); setHasta(''); }}>Ver todas</Button>}
                </div>
              </Card>
              {data.facturas.length ? data.facturas.map((f) => (
                <FacturaCard key={f.id} factura={f} config={config} onPagar={(itemIds) => setAPagar({ factura: f, itemIds })} />
              )) : <Empty texto="No hay facturas en el período elegido." />}
            </>
          ) : (
            <HistorialDeuda cuenta={data} />
          )}

          {aPagar && config.pagar && (
            <PagoModal
              factura={aPagar.factura}
              itemIds={aPagar.itemIds}
              onClose={() => setAPagar(null)}
              onPagar={async (body) => {
                const pago = await config.pagar!(aPagar.factura.id, body);
                const items = aPagar.factura.items.filter((i) => aPagar.itemIds.includes(i.id));
                setUltimo(`Pago registrado. Comprobante de pago ${pago.recibo} por ${pesos(pago.importe)} (factura ${pago.factura}).`);
                reciboPdf({
                  recibo: pago.recibo, fecha: pago.fecha, importe: pago.importe, factura: pago.factura, alumno: data.alumno,
                  mes: aPagar.factura.mes, numero_operacion: String(body.numero_operacion), fecha_transferencia: String(body.fecha_transferencia), items,
                });
                setAPagar(null);
                reload();
              }}
            />
          )}
        </div>
      )}
    </DataState>
  );
}

function Resumen({ icon, titulo, valor, detalle }: { icon: ReactNode; titulo: string; valor: string; detalle: string }) {
  return (
    <div className="summary-card">
      <div className="feature-icon small">{icon}</div>
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalle}</small>
    </div>
  );
}

function FacturaCard({ factura: f, config, onPagar }: { factura: Factura; config: PagosConfig; onPagar: (itemIds: number[]) => void }) {
  const pendientes = f.items.filter((i) => !i.pago_id);
  const [seleccion, setSeleccion] = useState<number[]>(() => pendientes.map((i) => i.id));
  const totalSel = f.items.filter((i) => seleccion.includes(i.id)).reduce((s, i) => s + i.importe, 0);
  const accion = useAction();
  const alternar = (id: number) => setSeleccion(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);

  return (
    <Card title={`${f.mes} · Factura ${f.numero}`} actions={
      <>
        <Badge tone={tonoFactura[f.estado]}>{f.estado}</Badge>
        <Button size="sm" variant="outline" icon={<FileDown size={16} />} onClick={() => facturaPdf(f)}>Factura PDF</Button>
      </>
    }>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <p className="muted small">Emitida el {fecha(f.fecha_emision)} · Vence el {fecha(f.vence)} · Total {pesos(f.total)} · Pagado {pesos(f.pagado)} · <strong>Saldo {pesos(f.saldo)}</strong></p>
      <ul className="item-list factura-items">
        {f.items.map((i) => (
          <li key={i.id}>
            <label className="factura-item">
              {config.pagar && !i.pago_id && <input type="checkbox" checked={seleccion.includes(i.id)} onChange={() => alternar(i.id)} />}
              <span><strong>{i.descripcion}</strong><small>{i.tipo}</small></span>
            </label>
            <div className="cuota-acciones">
              <span>{pesos(i.importe)}</span>
              <Badge tone={i.pago_id ? 'success' : 'neutral'}>{i.pago_id ? 'Pagado' : 'Pendiente'}</Badge>
            </div>
          </li>
        ))}
      </ul>
      {config.pagar && pendientes.length > 0 && (
        <div className="factura-pagar">
          <span className="muted small">Elegí los ítems que pagaste por transferencia.</span>
          <Button disabled={!seleccion.length} onClick={() => onPagar(seleccion)}>Pagar seleccionados ({pesos(totalSel)})</Button>
        </div>
      )}
      {f.pagos && f.pagos.length > 0 && (
        <div className="pagos-lista">
          <strong className="small">Pagos y comprobantes</strong>
          {f.pagos.map((p) => (
            <div key={p.id} className="pago-fila">
              <div>
                <strong>{p.numero} · {pesos(p.importe)}</strong>
                <small>Transferencia del {fecha(p.fecha_transferencia)} · Op. {p.numero_operacion} · Registrado {fechaHora(p.fecha)}</small>
                <small>{p.items.join(', ')}</small>
              </div>
              <div className="cuota-acciones">
                {config.comprobante && p.comprobantes.map((c) => (
                  <Button key={c.id} size="sm" variant="ghost" icon={<Paperclip size={16} />} loading={accion.busy}
                    onClick={() => accion.run(async () => {
                      const archivo = await config.comprobante!(c.id);
                      descargarBase64(archivo.nombre_archivo, archivo.tipo_mime, archivo.contenido);
                    })}>
                    {c.nombre_archivo}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PagoModal({ factura, itemIds, onClose, onPagar }: {
  factura: Factura;
  itemIds: number[];
  onClose: () => void;
  onPagar: (body: Record<string, unknown>) => Promise<void>;
}) {
  const items = factura.items.filter((i) => itemIds.includes(i.id));
  const total = items.reduce((s, i) => s + i.importe, 0);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [operacion, setOperacion] = useState('');
  const [fechaTr, setFechaTr] = useState(hoy);
  const [archivo, setArchivo] = useState<{ nombre: string; tipo: string; contenido: string } | null>(null);
  const accion = useAction();

  const elegirArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    accion.setMessage(null);
    if (!file) return setArchivo(null);
    if (!TIPOS_ARCHIVO.includes(file.type)) return accion.setMessage({ tipo: 'error', texto: 'El comprobante debe ser PDF, PNG o JPG.' });
    if (file.size > MAX_BYTES) return accion.setMessage({ tipo: 'error', texto: 'El comprobante no puede superar los 2 MB.' });
    const reader = new FileReader();
    reader.onload = () => setArchivo({ nombre: file.name, tipo: file.type, contenido: String(reader.result).split(',')[1] ?? '' });
    reader.readAsDataURL(file);
  };

  return (
    <Modal title={`Pagar factura ${factura.numero}`} onClose={onClose} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button loading={accion.busy} disabled={!archivo || !operacion}
          onClick={() => accion.run(() => onPagar({ item_ids: itemIds, numero_operacion: operacion, fecha_transferencia: fechaTr, comprobante: archivo }))}>
          Confirmar pago de {pesos(total)}
        </Button>
      </>
    }>
      <div className="stack">
        <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
        <div className="info-list">
          {items.map((i) => <div key={i.id} className="info-row"><span>{i.descripcion}</span><strong>{pesos(i.importe)}</strong></div>)}
          <div className="info-row"><span>Total a pagar</span><strong className="importe">{pesos(total)}</strong></div>
        </div>
        <div className="pago-detalle">
          <strong><Banknote size={16} /> Transferí a esta cuenta (datos ficticios)</strong>
          <span>Alias: {DATOS_TRANSFERENCIA.alias}</span>
          <span>CBU: {DATOS_TRANSFERENCIA.cbu}</span>
          <span>Titular: {DATOS_TRANSFERENCIA.titular}</span>
        </div>
        <div className="form-grid">
          <Field label="N.º de operación"><Input value={operacion} onChange={(e) => setOperacion(e.target.value.trim())} placeholder="Ej: 0045879123" maxLength={30} /></Field>
          <Field label="Fecha de la transferencia"><Input type="date" value={fechaTr} max={hoy} onChange={(e) => setFechaTr(e.target.value)} /></Field>
        </div>
        <Field label="Comprobante de la transferencia" hint="PDF, PNG o JPG de hasta 2 MB. Se asocia a esta factura.">
          <Input type="file" accept="application/pdf,image/png,image/jpeg" onChange={elegirArchivo} />
        </Field>
        <p className="muted small">Simulación para el trabajo práctico: no se realiza ningún movimiento de dinero real. Al confirmar, el sistema emite el comprobante de pago.</p>
      </div>
    </Modal>
  );
}

function HistorialDeuda({ cuenta }: { cuenta: CuentaAlumno }) {
  const { deuda } = cuenta;
  if (!deuda.items.length) {
    return <Card><p className="muted"><CheckCircle2 size={16} /> No hay ítems pendientes de pago.</p></Card>;
  }
  return (
    <div className="stack">
      {deuda.por_tipo.length > 0 && (
        <div className="grid grid-4">
          {deuda.por_tipo.map((t) => (
            <div key={t.tipo} className="summary-card"><span>{t.tipo}</span><strong>{pesos(t.total)}</strong><small>Deuda vencida</small></div>
          ))}
        </div>
      )}
      <Card title="Ítems pendientes de pago">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Mes</th><th>Factura</th><th>Ítem</th><th>Detalle</th><th>Importe</th><th>Estado</th></tr></thead>
            <tbody>
              {deuda.items.map((i) => (
                <tr key={i.id}>
                  <td data-label="Mes">{i.mes}</td>
                  <td data-label="Factura">{i.factura}</td>
                  <td data-label="Ítem">{i.tipo}</td>
                  <td data-label="Detalle">{i.descripcion}</td>
                  <td data-label="Importe">{pesos(i.importe)}</td>
                  <td data-label="Estado"><Badge tone={i.vencido ? 'danger' : 'info'}>{i.vencido ? 'Vencido' : 'A vencer'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
