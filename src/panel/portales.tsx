// Portales de autogestion: familia, alumno y docente.
import { useState } from 'react';
import { ArrowLeft, ChevronRight, Mail, Users } from 'lucide-react';
import { fechaHora, horarios, tonoApto } from '../../shared/format';
import type { Notificacion } from '../../shared/types';
import { Badge, Card, DataState, Empty, PageHeader, Table } from '../components/ui';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { facturaPdf } from '../lib/pdf';
import { useAction, useData } from '../lib/useData';
import { CorreoModal } from './admin/Pagos';
import { AlumnoVista } from './comun/AlumnoVista';
import type { AccionesFamilia } from './comun/AlumnoVista';

export function FamiliaInicio() {
  const { data, loading, error, reload } = useData(() => api.familia.hijos());
  return (
    <>
      <PageHeader title="Mis hijos" subtitle="Gestiona la matrícula, deportes, transporte y comedor de cada alumno." />
      <DataState loading={loading} error={error} onRetry={reload}>
        {data?.length ? (
          <div className="grid grid-2">
            {data.map((hijo) => (
              <Link key={hijo.alumno_id} href={`/panel/hijos/${hijo.alumno_id}`} className="child-card">
                <div className="avatar large">{hijo.alumno.split(', ')[1]?.[0]}{hijo.alumno[0]}</div>
                <div className="child-info">
                  <strong>{hijo.alumno}</strong>
                  <span>{hijo.nivel} · {hijo.curso ?? 'Sin matrícula'}</span>
                  <div className="badges">
                    <Badge tone={tonoApto[hijo.estado_apto]}>Apto {hijo.estado_apto.toLowerCase()}</Badge>
                    {hijo.transporte && <Badge tone="info">Transporte</Badge>}
                    {hijo.comedor && <Badge tone="info">Comedor</Badge>}
                  </div>
                </div>
                <ChevronRight className="child-arrow" />
              </Link>
            ))}
          </div>
        ) : (
          <Empty texto="No hay alumnos vinculados a tu cuenta. Comunicate con secretaría." />
        )}
      </DataState>
      <CorreosFamilia />
    </>
  );
}

// Correos que el sistema envió a la familia (recordatorio de pago y aviso de deuda; simulados).
function CorreosFamilia() {
  const { data } = useData(() => api.familia.correos());
  const [abierto, setAbierto] = useState<Notificacion | null>(null);
  const accion = useAction();
  if (!data?.length) return null;
  return (
    <Card title="Correos recibidos">
      <ul className="item-list">
        {data.slice(0, 8).map((n) => (
          <li key={n.id}>
            <div><button className="link-button" onClick={() => setAbierto(n)}><Mail size={15} /> {n.asunto}</button><small>{n.tipo} · {fechaHora(n.enviado_en)}</small></div>
            <Badge tone={n.tipo === 'Aviso de deuda' ? 'danger' : 'info'}>{n.tipo}</Badge>
          </li>
        ))}
      </ul>
      {abierto && <CorreoModal correo={abierto} onClose={() => setAbierto(null)} descargar={(id) => accion.run(async () => facturaPdf(await api.familia.factura(id)))} />}
    </Card>
  );
}

export function FamiliaHijo({ id }: { id: number }) {
  const detalle = useData(() => api.familia.hijo(id), [id]);
  const opciones = useData(() => api.familia.opciones(id), [id]);
  const recargar = () => {
    detalle.reload();
    opciones.reload();
  };

  const acciones: AccionesFamilia = {
    opciones: opciones.data,
    matricular: (cursoId) => api.familia.matricular(id, cursoId),
    inscribirDeporte: (comisionId) => api.familia.inscribirDeporte(id, comisionId),
    bajaDeporte: (inscripcionId) => api.familia.bajaDeporte(id, inscripcionId),
    inscribirTransporte: (recorridoId, parada) => api.familia.inscribirTransporte(id, recorridoId, parada),
    bajaTransporte: (inscripcionId) => api.familia.bajaTransporte(id, inscripcionId),
    inscribirComedor: (data) => api.familia.inscribirComedor(id, data),
    bajaComedor: (inscripcionId) => api.familia.bajaComedor(id, inscripcionId),
  };

  return (
    <>
      <Link href="/panel" className="back-link"><ArrowLeft size={16} /> Mis hijos</Link>
      <DataState loading={detalle.loading && !detalle.data} error={detalle.error} onRetry={detalle.reload}>
        {detalle.data && (
          <>
            <PageHeader title={detalle.data.alumno} subtitle={`${detalle.data.nivel ?? ''} · ${detalle.data.curso ?? 'Sin matricula'}`} />
            <AlumnoVista alumno={detalle.data} acciones={acciones} onCambio={recargar} pagos={{
              cargar: (rango) => api.familia.cuenta(id, rango),
              comprobante: (comprobanteId) => api.familia.comprobante(id, comprobanteId),
              pagar: (facturaId, body) => api.familia.pagar(id, facturaId, body),
            }} />
          </>
        )}
      </DataState>
    </>
  );
}

export function AlumnoInicio() {
  const { data, loading, error, reload } = useData(() => api.portalAlumno());
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <>
          <PageHeader title={`Hola, ${data.alumno.split(', ')[1] ?? data.alumno}`} subtitle={`${data.nivel ?? ''} · ${data.curso ?? 'Sin matricula'}`} />
          <AlumnoVista alumno={data} pagos={{ cargar: (rango) => api.cuentaAlumnoPropio(rango) }} />
        </>
      )}
    </DataState>
  );
}

export function DocenteInicio() {
  const { data, loading, error, reload } = useData(() => api.portalDocente());
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <>
          <PageHeader title={`Prof. ${data.profesor.nombre} ${data.profesor.apellido}`} subtitle={data.profesor.especialidad ?? 'Docente'} />
          <div className="stack">
            <h2 className="section-title">Materias a cargo</h2>
            {data.materias.length ? (
              data.materias.map((m) => (
                <Card key={m.id} title={`${m.materia} · ${m.curso}`} actions={<Badge tone="info"><Users size={14} /> {m.alumnos.length} alumnos</Badge>}>
                  <Table rows={m.alumnos} rowKey={(a) => a.dni} empty="Sin alumnos matriculados." columns={[
                    { header: 'Alumno', render: (a) => a.alumno },
                    { header: 'DNI', render: (a) => a.dni },
                  ]} />
                </Card>
              ))
            ) : (
              <Empty texto="No tenés materias asignadas." />
            )}

            <h2 className="section-title">Comisiones deportivas</h2>
            {data.comisiones.length ? (
              data.comisiones.map((c) => (
                <Card key={c.id} title={`${c.deporte} · ${c.comision}`} actions={<Badge tone="info">{c.alumnos.length}/{c.cupo}</Badge>}>
                  <p className="muted small">{horarios(c.horarios)}</p>
                  <Table rows={c.alumnos} rowKey={(a) => a.dni} empty="Sin inscriptos." columns={[
                    { header: 'Alumno', render: (a) => a.alumno },
                    { header: 'DNI', render: (a) => a.dni },
                    { header: 'Apto', render: (a) => <Badge tone={a.apto === 'Vigente' ? 'success' : 'danger'}>{a.apto}</Badge> },
                    { header: 'Alergias', render: (a) => a.alergias ?? '-' },
                  ]} />
                </Card>
              ))
            ) : (
              <Empty texto="No tenés comisiones deportivas a cargo." />
            )}
          </div>
        </>
      )}
    </DataState>
  );
}
