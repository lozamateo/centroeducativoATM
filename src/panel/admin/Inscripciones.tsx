// Motor de inscripciones desde secretaria: matricula, deportes, transporte y comedor (RF-09 a RF-13).
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { dias, fecha } from '../../../shared/format';
import { Badge, Button, Card, DataState, Feedback, Field, PageHeader, Select, Table, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useData } from '../../lib/useData';
import { AlumnoVista } from '../comun/AlumnoVista';
import type { AccionesFamilia } from '../comun/AlumnoVista';

type TabKey = 'alumno' | 'matriculas' | 'deportes' | 'transporte' | 'comedor';

export function InscripcionesPage() {
  const [tab, setTab] = useState<TabKey>('alumno');
  return (
    <>
      <PageHeader title="Inscripciones" subtitle="Matrícula, deportes, transporte y comedor con validacion automática de reglas." />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'alumno', label: 'Inscribir alumno' },
        { key: 'matriculas', label: 'Matrículas' },
        { key: 'deportes', label: 'Deportes' },
        { key: 'transporte', label: 'Transporte' },
        { key: 'comedor', label: 'Comedor' },
      ]} />
      {tab === 'alumno' && <PorAlumno />}
      {tab === 'matriculas' && <Matriculas />}
      {tab === 'deportes' && <DeportesLista />}
      {tab === 'transporte' && <TransporteLista />}
      {tab === 'comedor' && <ComedorLista />}
    </>
  );
}

function PorAlumno() {
  const alumnos = useData(() => api.admin.alumnos());
  const [alumnoId, setAlumnoId] = useState<number | null>(null);

  return (
    <div className="stack">
      <Card>
        <Field label="Alumno">
          <Select value={alumnoId ?? ''} onChange={(e) => setAlumnoId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Seleccionar alumno</option>
            {(alumnos.data ?? []).filter((a) => a.activo).map((a) => (
              <option key={a.id} value={a.id}>{a.apellido}, {a.nombre} - DNI {a.dni} - {a.nivel}</option>
            ))}
          </Select>
        </Field>
      </Card>
      {alumnoId && <Inscribir key={alumnoId} id={alumnoId} />}
    </div>
  );
}

function Inscribir({ id }: { id: number }) {
  const detalle = useData(() => api.admin.detalleAlumno(id), [id]);
  const opciones = useData(() => api.admin.opcionesAlumno(id), [id]);
  const recargar = () => { detalle.reload(); opciones.reload(); };

  const acciones: AccionesFamilia = {
    opciones: opciones.data,
    matricular: (cursoId) => api.admin.matricular(id, cursoId),
    inscribirDeporte: (comisionId) => api.admin.inscribirDeporte(id, comisionId),
    bajaDeporte: (inscripcionId) => api.admin.bajaDeporte(inscripcionId),
    inscribirTransporte: (recorridoId, parada) => api.admin.inscribirTransporte(id, recorridoId, parada),
    bajaTransporte: (inscripcionId) => api.admin.bajaTransporte(inscripcionId),
    inscribirComedor: (data) => api.admin.inscribirComedor({ alumno_id: id, ...data }),
    bajaComedor: (inscripcionId) => api.admin.bajaComedor(inscripcionId),
  };

  return (
    <DataState loading={detalle.loading && !detalle.data} error={detalle.error} onRetry={detalle.reload}>
      {detalle.data && <AlumnoVista alumno={detalle.data} acciones={acciones} onCambio={recargar} />}
    </DataState>
  );
}

function Matriculas() {
  const cursos = useData(() => api.admin.cursos());
  const [curso, setCurso] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.matriculas({ curso_id: curso ? Number(curso) : undefined }), [curso]);
  const accion = useAction();

  return (
    <div className="stack">
      <div className="filters">
        <Select value={curso} onChange={(e) => setCurso(e.target.value)}>
          <option value="">Todos los cursos</option>
          {(cursos.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nivel} - {c.anio} {c.division}</option>)}
        </Select>
      </div>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(m) => m.id} columns={[
            { header: 'Alumno', render: (m) => m.alumno },
            { header: 'DNI', render: (m) => m.dni },
            { header: 'Curso', render: (m) => m.curso },
            { header: 'Comprobante', render: (m) => m.comprobante },
            { header: 'Fecha', render: (m) => fecha(m.created_at) },
            { header: 'Estado', render: (m) => <Badge tone={m.estado === 'Activa' ? 'success' : 'neutral'}>{m.estado}</Badge> },
            { header: '', className: 'actions', render: (m) => m.estado !== 'Baja' && (
              <Button variant="ghost" size="sm" icon={<Trash2 size={16} />}
                onClick={() => window.confirm(`Dar de baja la matrícula de ${m.alumno}?`) && accion.run(() => api.admin.bajaMatricula(m.id), 'Matrícula dada de baja.').then((ok) => { if (ok) reload(); })}>
                Baja
              </Button>
            ) },
          ]} />
        </Card>
      </DataState>
    </div>
  );
}

function DeportesLista() {
  const { data, loading, error, reload } = useData(() => api.admin.inscripcionesDeporte());
  const accion = useAction();
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <Card>
        <Table rows={data ?? []} rowKey={(i) => i.id} columns={[
          { header: 'Deporte', render: (i) => i.deporte },
          { header: 'Comisión', render: (i) => i.comision },
          { header: 'Alumno', render: (i) => i.alumno },
          { header: 'DNI', render: (i) => i.dni },
          { header: 'Desde', render: (i) => fecha(i.created_at) },
          { header: '', className: 'actions', render: (i) => (
            <Button variant="ghost" size="sm" icon={<Trash2 size={16} />}
              onClick={() => window.confirm(`Dar de baja a ${i.alumno} de ${i.deporte}?`) && accion.run(() => api.admin.bajaDeporte(i.id), 'Baja registrada.').then((ok) => { if (ok) reload(); })}>
              Baja
            </Button>
          ) },
        ]} />
      </Card>
    </DataState>
  );
}

function TransporteLista() {
  const { data, loading, error, reload } = useData(() => api.admin.transporte());
  const accion = useAction();
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <Card>
        <Table rows={data ?? []} rowKey={(t) => t.id} columns={[
          { header: 'Recorrido', render: (t) => t.recorrido },
          { header: 'Alumno', render: (t) => t.alumno },
          { header: 'DNI', render: (t) => t.dni },
          { header: 'Parada', render: (t) => t.parada ?? '-' },
          { header: 'Comprobante', render: (t) => t.comprobante },
          { header: '', className: 'actions', render: (t) => (
            <Button variant="ghost" size="sm" icon={<Trash2 size={16} />}
              onClick={() => window.confirm(`Dar de baja el transporte de ${t.alumno}?`) && accion.run(() => api.admin.bajaTransporte(t.id), 'Baja registrada.').then((ok) => { if (ok) reload(); })}>
              Baja
            </Button>
          ) },
        ]} />
      </Card>
    </DataState>
  );
}

function ComedorLista() {
  const { data, loading, error, reload } = useData(() => api.admin.comedor());
  const accion = useAction();
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <Card>
        <Table rows={data ?? []} rowKey={(c) => c.id} columns={[
          { header: 'Alumno', render: (c) => c.alumno },
          { header: 'DNI', render: (c) => c.dni },
          { header: 'Modalidad', render: (c) => c.modalidad },
          { header: 'Días', render: (c) => dias(c.dias) },
          { header: 'Dieta especial', render: (c) => c.dieta_especial ?? '-' },
          { header: '', className: 'actions', render: (c) => (
            <Button variant="ghost" size="sm" icon={<Trash2 size={16} />}
              onClick={() => window.confirm(`Dar de baja el comedor de ${c.alumno}?`) && accion.run(() => api.admin.bajaComedor(c.id), 'Baja registrada.').then((ok) => { if (ok) reload(); })}>
              Baja
            </Button>
          ) },
        ]} />
      </Card>
    </DataState>
  );
}
