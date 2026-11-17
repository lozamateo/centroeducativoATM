// Administración de pagos (Parte 3): facturación, tarifas, reportes de pagos y correos automáticos.
// El administrador solo define valores; los pagos los registran las familias con su comprobante.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, FileDown, Mail, Receipt, Send } from 'lucide-react';
import { fecha, fechaHora, nombreMes, pesos, tonoFactura } from '../../../shared/format';
import type { Notificacion, PagoServicioFila, ReportePagosEstado } from '../../../shared/types';
import { Badge, Button, Card, DataState, Empty, Feedback, Field, Input, Modal, PageHeader, Select, StatCard, Table, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { exportarPdf, facturaPdf } from '../../lib/pdf';
import { useAction, useData } from '../../lib/useData';
import { PagosAlumnoVista } from '../comun/Pagos';

type TabKey = 'facturacion' | 'tarifas' | 'reportes' | 'correos';

export function PagosPage() {
  const [tab, setTab] = useState<TabKey>('facturacion');
  return (
    <>
      <PageHeader title="Pagos" subtitle="Facturas mensuales por alumno: cuota, deportes, transporte y comedor. Las familias pagan por transferencia y adjuntan el comprobante." />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'facturacion', label: 'Facturación y deudores' },
        { key: 'tarifas', label: 'Tarifas' },
        { key: 'reportes', label: 'Reportes de pagos' },
        { key: 'correos', label: 'Correos enviados' },
      ]} />
      {tab === 'facturacion' && <Facturacion />}
      {tab === 'tarifas' && <TarifasEditor />}
      {tab === 'reportes' && <ReportesPagos />}
      {tab === 'correos' && <Correos />}
    </>
  );
}

const descargarFactura = async (id: number) => facturaPdf(await api.admin.factura(id));

function Facturacion() {
  const [periodo, setPeriodo] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.facturacion({ periodo: periodo || undefined }), [periodo]);
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  const [nuevo, setNuevo] = useState('');
  const accion = useAction();

  return (
    <DataState loading={loading && !data} error={error} onRetry={reload}>
      {data && (
        <div className="stack">
          <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
          <div className="grid grid-4">
            <StatCard label={`Facturado ${nombreMes(data.periodo)}`} value={pesos(data.resumen.facturado)} icon={<Receipt />} />
            <StatCard label="Cobrado del período" value={pesos(data.resumen.cobrado)} icon={<Banknote />} tone="success" />
            <StatCard label="Pagadas / incompletas / impagas" value={`${data.resumen.pagadas} / ${data.resumen.incompletas} / ${data.resumen.impagas}`} icon={<CheckCircle2 />} tone="info" />
            <StatCard label="Deuda vencida total" value={pesos(data.resumen.deuda_vencida)} icon={<AlertTriangle />} tone="danger" />
          </div>

          <Card title="Deudores (adeudan desde)" actions={
            <Button variant="outline" icon={<FileDown size={18} />} disabled={!data.deudores.length} onClick={() => exportarPdf({
              titulo: 'Alumnos con deuda vencida', subtitulo: `Al ${fecha(data.hoy)}`,
              columnas: ['Legajo', 'Alumno', 'Nivel', 'Adeuda desde', 'Facturas', 'Total adeudado'],
              filas: data.deudores.map((d) => [d.legajo, d.alumno, d.nivel, d.adeuda_desde_mes, d.facturas, pesos(d.total_adeudado)]),
              archivo: 'deudores',
            })}>PDF</Button>
          }>
            <Table rows={data.deudores} rowKey={(d) => d.alumno_id} empty="No hay deuda vencida." columns={[
              { header: 'Legajo', render: (d) => d.legajo },
              { header: 'Alumno', render: (d) => <button className="link-button" onClick={() => setAlumnoId(d.alumno_id)}>{d.alumno}</button> },
              { header: 'Nivel', render: (d) => d.nivel },
              { header: 'Adeuda desde', render: (d) => <Badge tone="danger">{d.adeuda_desde_mes}</Badge> },
              { header: 'Facturas', render: (d) => d.facturas },
              { header: 'Total adeudado', render: (d) => <strong>{pesos(d.total_adeudado)}</strong> },
            ]} />
          </Card>

          <Card title={`Facturas de ${nombreMes(data.periodo)}`} actions={
            <>
              <Select value={data.periodo} onChange={(e) => setPeriodo(e.target.value)}>
                {[...new Set([...data.periodos, data.periodo])].sort().map((p) => <option key={p} value={p}>{nombreMes(p)}</option>)}
              </Select>
            </>
          }>
            <div className="inline-form">
              <Field label="Generar facturas de un mes" hint="Toma los servicios que cada alumno tiene activos en ese momento. No duplica facturas.">
                <Input type="month" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
              </Field>
              <Button disabled={!nuevo} loading={accion.busy} onClick={() => accion.run(async () => {
                const r = await api.admin.generarFacturas(nuevo);
                accion.setMessage({ tipo: 'ok', texto: `${nombreMes(r.periodo)}: ${r.creadas} factura(s) nuevas.` });
                setPeriodo(nuevo);
                reload();
              })}>Generar</Button>
            </div>
            <Table rows={data.facturas} rowKey={(f) => f.id} empty="No hay facturas en este mes." columns={[
              { header: 'Factura', render: (f) => f.numero },
              { header: 'Alumno', render: (f) => <button className="link-button" onClick={() => setAlumnoId(f.alumno_id)}>{f.alumno}</button> },
              { header: 'Total', render: (f) => pesos(f.total) },
              { header: 'Pagado', render: (f) => pesos(f.pagado) },
              { header: 'Saldo', render: (f) => <strong>{pesos(f.saldo)}</strong> },
              { header: 'Estado', render: (f) => <Badge tone={tonoFactura[f.estado]}>{f.estado}</Badge> },
              { header: '', render: (f) => <Button size="sm" variant="ghost" icon={<FileDown size={16} />} onClick={() => accion.run(() => descargarFactura(f.id))}>PDF</Button> },
            ]} />
          </Card>

          {alumnoId && (
            <Modal wide title="Estado de cuenta del alumno" onClose={() => setAlumnoId(null)}>
              <PagosAlumnoVista key={alumnoId} config={{
                cargar: (rango) => api.admin.cuentaAlumno(alumnoId, rango),
                comprobante: (id) => api.admin.comprobante(id),
              }} />
            </Modal>
          )}
        </div>
      )}
    </DataState>
  );
}

function TarifasEditor() {
  const { data, loading, error, reload, setData } = useData(() => api.admin.tarifas());
  const accion = useAction();
  const [valores, setValores] = useState<Record<string, string>>({});
  const valor = (k: string, actual: number) => valores[k] ?? String(actual);
  const guardar = (tipo: 'general' | 'deporte' | 'recorrido', clave: string | number) =>
    accion.run(async () => {
      setData(await api.admin.actualizarTarifa(tipo, clave, Number(valores[`${tipo}-${clave}`])));
      setValores((v) => { const copia = { ...v }; delete copia[`${tipo}-${clave}`]; return copia; });
    }, 'Valor actualizado. Se aplica a las próximas facturas.');

  const fila = (tipo: 'general' | 'deporte' | 'recorrido', clave: string | number, nombre: ReactNode, actual: number) => {
    const k = `${tipo}-${clave}`;
    return (
      <li key={k}>
        <div>{nombre}</div>
        <div className="cuota-acciones">
          <Input type="number" min={0} step={500} value={valor(k, actual)} onChange={(e) => setValores({ ...valores, [k]: e.target.value })} style={{ width: 130 }} aria-label={`Importe ${String(clave)}`} />
          <Button size="sm" disabled={valores[k] === undefined || Number(valores[k]) === actual} loading={accion.busy} onClick={() => guardar(tipo, clave)}>Guardar</Button>
        </div>
      </li>
    );
  };

  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="stack">
          <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
          <p className="muted">El administrador solo define los valores. Los cambios se aplican a las facturas que se generen a partir de ahora.</p>
          <div className="grid grid-3">
            <Card title="Cuota y comedor">
              <ul className="item-list">{data.generales.map((t) => fila('general', t.clave, <strong>{t.descripcion}</strong>, t.importe))}</ul>
            </Card>
            <Card title="Deportes (valor por deporte)">
              <ul className="item-list">{data.deportes.map((d) => fila('deporte', d.id, <><strong>{d.nombre}</strong><small>Responsable: {d.profesor_responsable ?? '-'}</small></>, d.precio_mensual))}</ul>
            </Card>
            <Card title="Transporte (valor por recorrido)">
              <ul className="item-list">{data.recorridos.map((r) => fila('recorrido', r.id, <><strong>{r.nombre}</strong><small>{r.zona}</small></>, r.precio_mensual))}</ul>
            </Card>
          </div>
        </div>
      )}
    </DataState>
  );
}

type ReporteKey = 'ingresos' | 'completos' | 'incompletos' | 'deportes' | 'transporte';

function ReportesPagos() {
  const [tipo, setTipo] = useState<ReporteKey>('ingresos');
  const [desde, setDesde] = useState('2026-08');
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 7));
  const rango = { desde: desde || undefined, hasta: hasta || undefined };
  return (
    <div className="stack">
      <Card>
        <div className="inline-form">
          <Field label="Reporte">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as ReporteKey)}>
              <option value="ingresos">Ingresos por período</option>
              <option value="completos">Pagos completos (por año y alumno)</option>
              <option value="incompletos">Pagos incompletos (por año y alumno)</option>
              <option value="deportes">Pagos por deporte, nivel, horario y profesor</option>
              <option value="transporte">Pagos por recorrido de transporte</option>
            </Select>
          </Field>
          <Field label="Desde"><Input type="month" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
          <Field label="Hasta"><Input type="month" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        </div>
      </Card>
      {tipo === 'ingresos' && <Ingresos rango={rango} />}
      {tipo === 'completos' && <PorEstado rango={rango} completos />}
      {tipo === 'incompletos' && <PorEstado rango={rango} completos={false} />}
      {tipo === 'deportes' && <PagosDeportes rango={rango} />}
      {tipo === 'transporte' && <PagosTransporte rango={rango} />}
    </div>
  );
}

type Rango = { desde?: string; hasta?: string };
const textoRango = (r: Rango) => `${r.desde ? nombreMes(r.desde) : 'inicio'} a ${r.hasta ? nombreMes(r.hasta) : 'hoy'}`;
const BotonPdf = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <Button variant="outline" icon={<FileDown size={18} />} onClick={onClick} disabled={disabled}>Descargar PDF</Button>
);

function Ingresos({ rango }: { rango: Rango }) {
  const { data, loading, error, reload } = useData(() => api.admin.ingresos(rango), [rango.desde, rango.hasta]);
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <Card title={`Ingresos: ${pesos(data.total)}`} actions={<BotonPdf disabled={!data.detalle.length} onClick={() => exportarPdf({
          titulo: 'Listado de ingresos por período', subtitulo: textoRango(rango),
          columnas: ['Fecha', 'Comprobante', 'Operación', 'Alumno', 'Factura', 'Mes', 'Importe'],
          filas: [...data.detalle.map((p) => [fecha(p.fecha_transferencia), p.recibo, p.numero_operacion, p.alumno, p.factura, nombreMes(p.periodo), pesos(p.importe)]),
            ['', '', '', '', '', 'TOTAL', pesos(data.total)]],
          archivo: 'ingresos',
        })} />}>
          <div className="grid grid-4">
            {data.por_mes.map((m) => <div key={m.periodo} className="summary-card"><span>{m.mes}</span><strong>{pesos(m.total)}</strong></div>)}
          </div>
          <Table rows={data.detalle} rowKey={(p) => p.id} empty="No hubo ingresos en el período." columns={[
            { header: 'Fecha', render: (p) => fecha(p.fecha_transferencia) },
            { header: 'Comprobante', render: (p) => p.recibo },
            { header: 'Operación', render: (p) => p.numero_operacion },
            { header: 'Alumno', render: (p) => p.alumno },
            { header: 'Factura', render: (p) => `${p.factura} · ${nombreMes(p.periodo)}` },
            { header: 'Importe', render: (p) => <strong>{pesos(p.importe)}</strong> },
          ]} />
        </Card>
      )}
    </DataState>
  );
}

function PorEstado({ rango, completos }: { rango: Rango; completos: boolean }) {
  const { data, loading, error, reload } = useData(
    () => (completos ? api.admin.pagosCompletos(rango) : api.admin.pagosIncompletos(rango)),
    [rango.desde, rango.hasta, completos],
  );
  const titulo = completos ? 'Pagos completos' : 'Pagos incompletos';
  const pdf = (d: ReportePagosEstado) => exportarPdf({
    titulo: `${titulo} por año y alumno`, subtitulo: textoRango(rango),
    columnas: ['Año', 'Legajo', 'Alumno', 'Mes', 'Factura', 'Total', 'Pagado', 'Saldo'],
    filas: d.anios.flatMap((a) => a.alumnos.flatMap((al) => al.facturas.map((f) => [a.anio, al.legajo, al.alumno, f.mes, f.numero, pesos(f.total), pesos(f.pagado), pesos(f.saldo)]))),
    archivo: completos ? 'pagos-completos' : 'pagos-incompletos',
  });
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <Card title={`${titulo} (${data.cantidad} facturas)`} actions={<BotonPdf disabled={!data.cantidad} onClick={() => pdf(data)} />}>
          {!completos && <p className="muted small">Facturas con al menos un pago registrado pero con saldo pendiente.</p>}
          {data.anios.length ? data.anios.map((a) => (
            <div key={a.anio} className="stack">
              <h3 className="grupo-titulo">Año {a.anio} · Total {pesos(a.total)} · Pagado {pesos(a.pagado)}{!completos && ` · Saldo ${pesos(a.saldo)}`}</h3>
              <Table rows={a.alumnos} rowKey={(al) => al.alumno_id} columns={[
                { header: 'Legajo', render: (al) => al.legajo },
                { header: 'Alumno', render: (al) => al.alumno },
                { header: 'Meses', render: (al) => al.facturas.map((f) => f.mes.split(' ')[0]).join(', ') },
                { header: 'Total', render: (al) => pesos(al.total) },
                { header: 'Pagado', render: (al) => pesos(al.pagado) },
                { header: 'Saldo', render: (al) => <strong>{pesos(al.saldo)}</strong> },
              ]} />
            </div>
          )) : <Empty texto="No hay facturas en el período." />}
        </Card>
      )}
    </DataState>
  );
}

function filtroSelect<T extends { id: number; nombre: string }>(label: string, value: string, set: (v: string) => void, opciones: T[] | null, todos: string) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(e) => set(e.target.value)}>
        <option value="">{todos}</option>
        {(opciones ?? []).map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
      </Select>
    </Field>
  );
}

const estadoPago = (p: PagoServicioFila) => <Badge tone={p.pagado ? 'success' : 'danger'}>{p.pagado ? `Pagado ${p.recibo}` : 'Impago'}</Badge>;

function PagosDeportes({ rango }: { rango: Rango }) {
  const deportes = useData(() => api.admin.deportes());
  const niveles = useData(() => api.niveles());
  const profesores = useData(() => api.admin.profesores());
  const [deporte, setDeporte] = useState('');
  const [nivel, setNivel] = useState('');
  const [profesor, setProfesor] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.pagosDeportes({
    ...rango, deporte_id: Number(deporte) || undefined, nivel_id: Number(nivel) || undefined, profesor_id: Number(profesor) || undefined,
  }), [rango.desde, rango.hasta, deporte, nivel, profesor]);
  const filas = data ?? [];
  return (
    <Card title="Pagos por deporte, nivel, horario y profesor" actions={<BotonPdf disabled={!filas.length} onClick={() => exportarPdf({
      titulo: 'Pagos de alumnos por deporte', subtitulo: textoRango(rango),
      columnas: ['Deporte', 'Nivel', 'Horario', 'Profesor', 'Alumno', 'Mes', 'Importe', 'Estado'],
      filas: filas.map((p) => [p.deporte, p.nivel, p.horario, p.profesor, p.alumno, nombreMes(p.periodo), pesos(p.importe), p.pagado ? `Pagado ${p.recibo}` : 'Impago']),
      archivo: 'pagos-deportes',
    })} />}>
      <div className="inline-form">
        {filtroSelect('Deporte', deporte, setDeporte, deportes.data, 'Todos')}
        {filtroSelect('Nivel', nivel, setNivel, niveles.data, 'Todos')}
        {filtroSelect('Profesor', profesor, setProfesor, (profesores.data ?? []).map((p) => ({ id: p.id, nombre: `${p.apellido}, ${p.nombre}` })), 'Todos')}
      </div>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Resumir filas={filas} />
        <Table rows={filas} rowKey={(p) => p.id} empty="Sin registros." columns={[
          { header: 'Deporte', render: (p) => `${p.deporte} (${p.comision})` },
          { header: 'Nivel', render: (p) => p.nivel },
          { header: 'Horario', render: (p) => p.horario },
          { header: 'Profesor', render: (p) => p.profesor },
          { header: 'Alumno', render: (p) => p.alumno },
          { header: 'Mes', render: (p) => nombreMes(p.periodo) },
          { header: 'Importe', render: (p) => pesos(p.importe) },
          { header: 'Estado', render: estadoPago },
        ]} />
      </DataState>
    </Card>
  );
}

function PagosTransporte({ rango }: { rango: Rango }) {
  const recorridos = useData(() => api.recorridos());
  const [recorrido, setRecorrido] = useState('');
  const { data, loading, error, reload } = useData(
    () => api.admin.pagosTransporte({ ...rango, recorrido_id: Number(recorrido) || undefined }),
    [rango.desde, rango.hasta, recorrido],
  );
  const filas = data ?? [];
  return (
    <Card title="Pagos por recorrido de transporte" actions={<BotonPdf disabled={!filas.length} onClick={() => exportarPdf({
      titulo: 'Pagos de alumnos por recorrido de transporte', subtitulo: textoRango(rango),
      columnas: ['Recorrido', 'Alumno', 'Legajo', 'Mes', 'Factura', 'Importe', 'Estado'],
      filas: filas.map((p) => [p.recorrido, p.alumno, p.legajo, nombreMes(p.periodo), p.factura, pesos(p.importe), p.pagado ? `Pagado ${p.recibo}` : 'Impago']),
      archivo: 'pagos-transporte',
    })} />}>
      <div className="inline-form">{filtroSelect('Recorrido', recorrido, setRecorrido, recorridos.data, 'Todos')}</div>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Resumir filas={filas} />
        <Table rows={filas} rowKey={(p) => p.id} empty="Sin registros." columns={[
          { header: 'Recorrido', render: (p) => p.recorrido },
          { header: 'Alumno', render: (p) => p.alumno },
          { header: 'Legajo', render: (p) => p.legajo },
          { header: 'Mes', render: (p) => nombreMes(p.periodo) },
          { header: 'Importe', render: (p) => pesos(p.importe) },
          { header: 'Estado', render: estadoPago },
        ]} />
      </DataState>
    </Card>
  );
}

function Resumir({ filas }: { filas: PagoServicioFila[] }) {
  const pagado = filas.filter((f) => f.pagado).reduce((s, f) => s + f.importe, 0);
  const impago = filas.filter((f) => !f.pagado).reduce((s, f) => s + f.importe, 0);
  return <p className="muted">Cobrado {pesos(pagado)} · Impago {pesos(impago)} · {filas.length} ítems facturados</p>;
}

function Correos() {
  const [tipo, setTipo] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.notificaciones(tipo || undefined), [tipo]);
  const [fechaSim, setFechaSim] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const [abierto, setAbierto] = useState<Notificacion | null>(null);
  const accion = useAction();

  return (
    <div className="stack">
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <Card title="Envío automático">
        <p className="muted small">
          Todos los días se ejecuta una tarea (Vercel Cron): el <strong>último día hábil</strong> de cada mes envía a cada familia el total del mes siguiente
          con su composición y las facturas adjuntas; el <strong>día 20</strong> envía la deuda a quien no completó el pago. Los correos son simulados:
          quedan registrados acá y en la cuenta de cada familia.
        </p>
        <div className="inline-form">
          <Field label="Simular la tarea de una fecha" hint="Ej: 30/11/2026 (último día hábil) o 20/11/2026.">
            <Input type="date" value={fechaSim} onChange={(e) => setFechaSim(e.target.value)} />
          </Field>
          <Button icon={<Send size={18} />} loading={accion.busy} onClick={() => accion.run(async () => {
            const r = await api.admin.ejecutarTareas(fechaSim);
            accion.setMessage({ tipo: 'ok', texto: r.mensaje ?? r.resultados.map((x) => `${x.tipo} (${nombreMes(x.periodo)}): ${x.enviados} correo(s).`).join(' ') });
            reload();
          })}>Ejecutar</Button>
        </div>
      </Card>
      <Card title="Correos enviados" actions={
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos</option>
          <option>Recordatorio de pago</option>
          <option>Aviso de deuda</option>
          <option>Recuperar contraseña</option>
        </Select>
      }>
        <DataState loading={loading} error={error} onRetry={reload}>
          <Table rows={data ?? []} rowKey={(n) => n.id} empty="Todavía no se enviaron correos." columns={[
            { header: 'Fecha', render: (n) => fechaHora(n.enviado_en) },
            { header: 'Tipo', render: (n) => <Badge tone={n.tipo === 'Aviso de deuda' ? 'danger' : n.tipo === 'Recordatorio de pago' ? 'info' : 'neutral'}>{n.tipo}</Badge> },
            { header: 'Para', render: (n) => `${n.destinatario_nombre} <${n.destinatario_email}>` },
            { header: 'Asunto', render: (n) => <button className="link-button" onClick={() => setAbierto(n)}>{n.asunto}</button> },
          ]} />
        </DataState>
      </Card>
      {abierto && <CorreoModal correo={abierto} onClose={() => setAbierto(null)} descargar={(id) => accion.run(() => descargarFactura(id))} />}
    </div>
  );
}

// Vista de un correo (la usa también el portal de familias).
export function CorreoModal({ correo, onClose, descargar }: { correo: Notificacion; onClose: () => void; descargar: (facturaId: number) => void }) {
  return (
    <Modal wide title={correo.asunto} onClose={onClose}>
      <div className="stack">
        <p className="muted small"><Mail size={14} /> {correo.tipo} · {fechaHora(correo.enviado_en)}{correo.destinatario_email ? ` · Para ${correo.destinatario_email}` : ''} · Correo simulado</p>
        <pre className="correo-cuerpo">{correo.cuerpo}</pre>
        {correo.factura_ids.length > 0 && (
          <div className="cuota-acciones" style={{ justifyContent: 'flex-start' }}>
            <span className="muted small">Adjuntos:</span>
            {correo.factura_ids.map((id) => (
              <Button key={id} size="sm" variant="outline" icon={<FileDown size={16} />} onClick={() => descargar(id)}>Factura FC-{String(id).padStart(6, '0')}.pdf</Button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
