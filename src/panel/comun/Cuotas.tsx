// Cuotas mensuales: vista por alumno (familia, alumno y secretaría) y panel de deudores.
// El pago es una simulación para el trabajo práctico: no se conecta con ningún banco.
import { useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, FileDown, Landmark, Users, Wallet } from 'lucide-react';
import { DATOS_TRANSFERENCIA, fecha, fechaHora, mesCorto, pesos, tonoCuota } from '../../../shared/format';
import type { Cuota, CuotasAlumno, MetodoPago } from '../../../shared/types';
import { Badge, Button, Card, DataState, Feedback, Modal, PageHeader, Select, StatCard, Table } from '../../components/ui';
import { api } from '../../lib/api';
import { exportarPdf } from '../../lib/pdf';
import { useAction, useData } from '../../lib/useData';

export interface CuotasConfig {
  cargar: () => Promise<CuotasAlumno>;
  // Sin "pagar" la vista es de solo lectura (portal del alumno).
  pagar?: (periodo: string, metodo: MetodoPago) => Promise<unknown>;
  // Secretaría registra pagos recibidos; la familia paga.
  modo: 'familia' | 'admin' | 'lectura';
}

export function CuotasAlumnoVista({ config }: { config: CuotasConfig }) {
  const { data, loading, error, reload } = useData(config.cargar);
  const [aPagar, setAPagar] = useState<Cuota | null>(null);
  const [comprobante, setComprobante] = useState<{ cuota: Cuota; metodo: MetodoPago; codigo: string } | null>(null);

  return (
    <DataState loading={loading && !data} error={error} onRetry={reload}>
      {data && (
        <div className="stack">
          <div className="grid grid-4">
            <div className="summary-card">
              <div className="feature-icon small"><Wallet /></div>
              <span>Cuota mensual</span>
              <strong>{pesos(data.importe_mensual)}</strong>
              <small>{data.descuento_hermanos ? `Grupo familiar con ${data.hijos_en_el_colegio} hijos` : 'Tarifa general'}</small>
            </div>
            <div className="summary-card">
              <div className="feature-icon small">{data.adeuda_desde ? <AlertTriangle /> : <CheckCircle2 />}</div>
              <span>Estado</span>
              <strong>{data.adeuda_desde ? `Adeuda desde ${data.cuotas.find((c) => c.periodo === data.adeuda_desde)?.mes}` : 'Al día'}</strong>
              <small>{data.cuotas_vencidas} cuota(s) vencida(s)</small>
            </div>
            <div className="summary-card">
              <div className="feature-icon small"><Banknote /></div>
              <span>Total adeudado</span>
              <strong>{pesos(data.total_adeudado)}</strong>
              <small>Se paga del 1 al 15 de cada mes</small>
            </div>
            <div className="summary-card">
              <div className="feature-icon small"><Users /></div>
              <span>Cuotas pagadas</span>
              <strong>{data.pagadas} de {data.cuotas.length}</strong>
              <small>$ 40.000 general · $ 30.000 c/u con 2 o más hijos</small>
            </div>
          </div>

          {comprobante && (
            <div className="alert alert-ok">
              <span>
                Pago registrado: {comprobante.cuota.mes} · {pesos(comprobante.cuota.importe)} · {comprobante.metodo}. Comprobante <strong>{comprobante.codigo}</strong>.
              </span>
            </div>
          )}

          <Card title="Cuotas del período" actions={<span className="muted small">Pago simulado (trabajo académico)</span>}>
            <ul className="item-list cuotas-lista">
              {data.cuotas.map((c) => (
                <li key={c.periodo} className={c.estado === 'Vencida' ? 'cuota-vencida' : ''}>
                  <div>
                    <strong>{c.mes} · {pesos(c.importe)}</strong>
                    <small>
                      {c.pago
                        ? `Pagada el ${fechaHora(c.pago.fecha)} · ${c.pago.metodo} · Comprobante ${c.pago.comprobante}`
                        : `Vence el ${fecha(c.vence)}`}
                    </small>
                  </div>
                  <div className="cuota-acciones">
                    <Badge tone={tonoCuota[c.estado]}>{c.estado}</Badge>
                    {config.pagar && c.se_puede_pagar && (
                      <Button size="sm" onClick={() => setAPagar(c)}>{config.modo === 'admin' ? 'Registrar pago' : 'Pagar'}</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {aPagar && config.pagar && (
            <PagoModal
              cuota={aPagar}
              alumno={data.alumno}
              modo={config.modo}
              onClose={() => setAPagar(null)}
              onPagar={async (metodo) => {
                const res = (await config.pagar!(aPagar.periodo, metodo)) as { comprobante?: string };
                setComprobante({ cuota: aPagar, metodo, codigo: res?.comprobante ?? '' });
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

function PagoModal({ cuota, alumno, modo, onClose, onPagar }: {
  cuota: Cuota;
  alumno: string;
  modo: CuotasConfig['modo'];
  onClose: () => void;
  onPagar: (metodo: MetodoPago) => Promise<void>;
}) {
  const [metodo, setMetodo] = useState<MetodoPago>('Transferencia');
  const accion = useAction();

  return (
    <Modal title={`Pagar cuota de ${cuota.mes}`} onClose={onClose} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button loading={accion.busy} onClick={() => accion.run(() => onPagar(metodo))}>
          Pagar {pesos(cuota.importe)}
        </Button>
      </>
    }>
      <div className="stack">
        <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
        <div className="info-list">
          <div className="info-row"><span>Alumno</span><strong>{alumno}</strong></div>
          <div className="info-row"><span>Cuota</span><strong>{cuota.mes}</strong></div>
          <div className="info-row"><span>Vencimiento</span><strong>{fecha(cuota.vence)}</strong></div>
          <div className="info-row"><span>Importe a pagar</span><strong className="importe">{pesos(cuota.importe)}</strong></div>
        </div>
        <fieldset className="metodos-pago">
          <legend className="field-label">Forma de pago</legend>
          {(['Transferencia', 'Efectivo'] as MetodoPago[]).map((m) => (
            <label key={m} className={`metodo ${metodo === m ? 'metodo-activo' : ''}`}>
              <input type="radio" name="metodo" checked={metodo === m} onChange={() => setMetodo(m)} />
              {m === 'Transferencia' ? <Landmark size={20} /> : <Banknote size={20} />}
              <span>{m}</span>
            </label>
          ))}
        </fieldset>
        {metodo === 'Transferencia' ? (
          <div className="pago-detalle">
            <strong>Datos para transferir (ficticios)</strong>
            <span>Alias: {DATOS_TRANSFERENCIA.alias}</span>
            <span>CBU: {DATOS_TRANSFERENCIA.cbu}</span>
            <span>Titular: {DATOS_TRANSFERENCIA.titular}</span>
          </div>
        ) : (
          <div className="pago-detalle">
            <strong>Pago en efectivo</strong>
            <span>{modo === 'admin' ? 'Registrá el efectivo recibido en secretaría.' : 'Se abona en secretaría de lunes a viernes de 7:30 a 12:30.'}</span>
          </div>
        )}
        <p className="muted small">Este pago es una simulación para el trabajo práctico: no se realiza ningún movimiento de dinero real.</p>
      </div>
    </Modal>
  );
}

// Panel de administración: quién adeuda y desde qué mes.
export function CuotasPage() {
  const niveles = useData(() => api.niveles());
  const [nivel, setNivel] = useState('');
  const [soloDeudores, setSoloDeudores] = useState(false);
  const { data, loading, error, reload } = useData(
    () => api.admin.cuotas({ nivel_id: nivel ? Number(nivel) : undefined, solo_deudores: soloDeudores }),
    [nivel, soloDeudores],
  );
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  const filaSel = data?.filas.find((f) => f.alumno_id === alumnoId);

  const pdf = () =>
    data &&
    exportarPdf({
      titulo: soloDeudores ? 'Alumnos con cuotas adeudadas' : 'Estado de cuotas por alumno',
      subtitulo: `Al ${fecha(data.hoy)}`,
      columnas: ['Alumno', 'DNI', 'Curso', 'Cuota', 'Adeuda desde', 'Vencidas', 'Total adeudado'],
      filas: data.filas.map((f) => [
        f.alumno, f.dni, f.curso ?? f.nivel, pesos(f.importe_mensual),
        f.adeuda_desde ? mesCorto(f.adeuda_desde) : 'Al día', f.cuotas_vencidas, pesos(f.total_adeudado),
      ]),
      archivo: 'estado-cuotas',
    });

  return (
    <>
      <PageHeader
        title="Cuotas"
        subtitle="Cuota mensual de $ 40.000 ($ 30.000 por hijo si el grupo familiar tiene 2 o más). Se paga del 1 al 15 de cada mes."
        actions={<Button variant="outline" icon={<FileDown size={18} />} disabled={!data?.filas.length} onClick={pdf}>Descargar PDF</Button>}
      />
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        {data && (
          <div className="stack">
            <div className="grid grid-4">
              <StatCard label="Alumnos al día" value={data.resumen.al_dia} icon={<CheckCircle2 />} tone="success" />
              <StatCard label="Alumnos con deuda" value={data.resumen.con_deuda} icon={<AlertTriangle />} tone="danger" />
              <StatCard label="Total adeudado" value={pesos(data.resumen.total_adeudado)} icon={<Banknote />} tone="warning" />
              <StatCard label="Cobrado este mes" value={pesos(data.resumen.cobrado_mes_actual)} icon={<Wallet />} tone="info" />
            </div>

            <Card title="Estado por alumno y mes" actions={
              <>
                <Select value={nivel} onChange={(e) => setNivel(e.target.value)}>
                  <option value="">Todos los niveles</option>
                  {(niveles.data ?? []).map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                </Select>
                <label className="check-inline">
                  <input type="checkbox" checked={soloDeudores} onChange={(e) => setSoloDeudores(e.target.checked)} /> Solo deudores
                </label>
              </>
            }>
              <div className="cuotas-leyenda">
                <span><i className="dot dot-success" /> Pagada</span>
                <span><i className="dot dot-danger" /> Vencida</span>
                <span><i className="dot dot-info" /> En término (1 al 15)</span>
                <span><i className="dot dot-neutral" /> Próxima</span>
              </div>
              {data.filas.length ? (
                <div className="table-wrap">
                  <table className="table cuotas-matriz">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Adeuda desde</th>
                        <th>Total</th>
                        {data.periodos.map((p) => <th key={p.periodo} className="mes">{mesCorto(p.periodo)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.filas.map((f) => (
                        <tr key={f.alumno_id} className={f.alumno_id === alumnoId ? 'fila-activa' : ''}>
                          <td>
                            <button className="link-button" onClick={() => setAlumnoId(f.alumno_id)}>{f.alumno}</button>
                            <small className="muted block">{f.curso ?? f.nivel} · {pesos(f.importe_mensual)}</small>
                          </td>
                          <td>{f.adeuda_desde ? <Badge tone="danger">{mesCorto(f.adeuda_desde)}</Badge> : <Badge tone="success">Al día</Badge>}</td>
                          <td>{pesos(f.total_adeudado)}</td>
                          {f.meses.map((m) => (
                            <td key={m.periodo} className="mes" title={`${mesCorto(m.periodo)}: ${m.estado}`}>
                              <i className={`dot dot-${tonoCuota[m.estado]}`} aria-label={m.estado} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No hay alumnos con cuotas adeudadas.</p>
              )}
            </Card>

            <Card title="Deudores" actions={<span className="muted small">Ordenados por antigüedad de la deuda</span>}>
              <Table
                rows={data.filas.filter((f) => f.cuotas_vencidas > 0).sort((a, b) => (a.adeuda_desde ?? '').localeCompare(b.adeuda_desde ?? ''))}
                rowKey={(f) => f.alumno_id}
                empty="Todos los alumnos están al día."
                columns={[
                  { header: 'Alumno', render: (f) => f.alumno },
                  { header: 'Curso', render: (f) => f.curso ?? f.nivel },
                  { header: 'Adeuda desde', render: (f) => (f.adeuda_desde ? mesCorto(f.adeuda_desde) : '-') },
                  { header: 'Cuotas vencidas', render: (f) => f.cuotas_vencidas },
                  { header: 'Total adeudado', render: (f) => <strong>{pesos(f.total_adeudado)}</strong> },
                  { header: '', render: (f) => <Button size="sm" variant="outline" onClick={() => setAlumnoId(f.alumno_id)}>Ver cuotas</Button> },
                ]}
              />
            </Card>

            {alumnoId && (
              <Modal wide title={`Cuotas de ${filaSel?.alumno ?? 'alumno'}`} onClose={() => { setAlumnoId(null); reload(); }}>
                <CuotasAlumnoVista key={alumnoId} config={{
                  modo: 'admin',
                  cargar: () => api.admin.cuotasAlumno(alumnoId),
                  pagar: (periodo, metodo) => api.admin.pagarCuota(alumnoId, periodo, metodo),
                }} />
              </Modal>
            )}
          </div>
        )}
      </DataState>
    </>
  );
}
