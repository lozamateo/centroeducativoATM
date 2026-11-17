// Motor de reportes gerenciales MIS con exportacion a PDF (RF-16 a RF-21).
import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { DIAS, dias, fecha, tonoApto } from '../../../shared/format';
import { Badge, Button, Card, DataState, Field, InfoRow, PageHeader, Select, Table, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { exportarPdf } from '../../lib/pdf';
import { useData } from '../../lib/useData';

type TabKey = 'transporte' | 'curso' | 'deportes' | 'comedor' | 'alumno' | 'por-alumno' | 'docente' | 'materia' | 'docentes-nivel' | 'alumnos-deporte';

export function ReportesPage() {
  const [tab, setTab] = useState<TabKey>('transporte');
  return (
    <>
      <PageHeader title="Reportes gerenciales" subtitle="Información consolidada para la toma de decisiones. Todos los reportes se descargan en PDF." />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'transporte', label: 'Padrón de transporte' },
        { key: 'curso', label: 'Padrón por curso' },
        { key: 'deportes', label: 'Ocupación de deportes' },
        { key: 'comedor', label: 'Comedor' },
        { key: 'alumno', label: 'Ficha 360 del alumno' },
        { key: 'por-alumno', label: 'Por alumno' },
        { key: 'docente', label: 'Por docente' },
        { key: 'materia', label: 'Alumnos por materia' },
        { key: 'docentes-nivel', label: 'Docentes por nivel' },
        { key: 'alumnos-deporte', label: 'Alumnos por deporte' },
      ]} />
      {tab === 'transporte' && <PadrónTransporte />}
      {tab === 'curso' && <PadrónCurso />}
      {tab === 'deportes' && <OcupacionDeportes />}
      {tab === 'comedor' && <Comedor />}
      {tab === 'alumno' && <Ficha360 />}
      {tab === 'por-alumno' && <PorAlumno />}
      {tab === 'docente' && <PorDocente />}
      {tab === 'materia' && <AlumnosPorMateria />}
      {tab === 'docentes-nivel' && <DocentesPorNivel />}
      {tab === 'alumnos-deporte' && <AlumnosPorDeporte />}
    </>
  );
}

const BotonPdf = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <Button variant="outline" icon={<FileDown size={18} />} onClick={onClick} disabled={disabled}>Descargar PDF</Button>
);

// HU-05: listado de pasajeros por recorrido.
function PadrónTransporte() {
  const recorridos = useData(() => api.recorridos());
  const [recorrido, setRecorrido] = useState('1');
  const { data, loading, error, reload } = useData(() => api.admin.padronTransporte(recorrido ? Number(recorrido) : undefined), [recorrido]);
  const nombre = recorridos.data?.find((r) => r.id === Number(recorrido))?.nombre ?? 'Todos los recorridos';

  return (
    <Card title={`Pasajeros: ${nombre}`} actions={
      <>
        <Select value={recorrido} onChange={(e) => setRecorrido(e.target.value)}>
          <option value="">Todos</option>
          {(recorridos.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </Select>
        <BotonPdf disabled={!data?.length} onClick={() => exportarPdf({
          titulo: `Padrón logistico de transporte - ${nombre}`,
          columnas: ['Recorrido', 'Alumno', 'DNI', 'Curso', 'Parada', 'Contacto'],
          filas: (data ?? []).map((f) => [f.recorrido, f.alumno, f.dni, f.curso, f.parada, f.contacto]),
          archivo: `padron-transporte-${recorrido || 'todos'}`,
        })} />
      </>
    }>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Table rows={data ?? []} rowKey={(f) => `${f.recorrido_id}-${f.alumno_id}`} empty="El recorrido no tiene pasajeros." columns={[
          { header: 'Recorrido', render: (f) => f.recorrido },
          { header: 'Alumno', render: (f) => f.alumno },
          { header: 'DNI', render: (f) => f.dni },
          { header: 'Curso', render: (f) => f.curso },
          { header: 'Parada', render: (f) => f.parada ?? '-' },
          { header: 'Contacto', render: (f) => f.contacto ?? '-' },
        ]} />
      </DataState>
    </Card>
  );
}

function PadrónCurso() {
  const cursos = useData(() => api.admin.cursos());
  const [curso, setCurso] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.padronCurso(curso ? Number(curso) : undefined), [curso]);
  const nombre = (() => {
    const c = cursos.data?.find((x) => x.id === Number(curso));
    return c ? `${c.nivel} - ${c.anio} ${c.division}` : 'Todos los cursos';
  })();

  return (
    <Card title={`Padrón: ${nombre}`} actions={
      <>
        <Select value={curso} onChange={(e) => setCurso(e.target.value)}>
          <option value="">Todos</option>
          {(cursos.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nivel} - {c.anio} {c.division}</option>)}
        </Select>
        <BotonPdf disabled={!data?.length} onClick={() => exportarPdf({
          titulo: `Padrón por curso - ${nombre}`,
          columnas: ['Nivel', 'Curso', 'Legajo', 'Apellido', 'Nombre', 'DNI'],
          filas: (data ?? []).map((f) => [f.nivel, f.curso, f.legajo, f.apellido, f.nombre, f.dni]),
          archivo: 'padron-curso',
        })} />
      </>
    }>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Table rows={data ?? []} rowKey={(f) => `${f.curso_id}-${f.alumno_id}`} empty="Sin alumnos matriculados." columns={[
          { header: 'Nivel', render: (f) => f.nivel },
          { header: 'Curso', render: (f) => f.curso },
          { header: 'Legajo', render: (f) => f.legajo },
          { header: 'Apellido', render: (f) => f.apellido },
          { header: 'Nombre', render: (f) => f.nombre },
          { header: 'DNI', render: (f) => f.dni },
        ]} />
      </DataState>
    </Card>
  );
}

function OcupacionDeportes() {
  const { data, loading, error, reload } = useData(() => api.admin.ocupacionDeportes());
  return (
    <Card title="Ocupación de comisiones deportivas" actions={
      <BotonPdf disabled={!data?.length} onClick={() => exportarPdf({
        titulo: 'Ocupación de deportes',
        columnas: ['Deporte', 'Comisión', 'Nivel', 'Inscriptos', 'Cupo', 'Ocupación'],
        filas: (data ?? []).map((f) => [f.deporte, f.comision, f.nivel, f.inscriptos, f.cupo, `${f.ocupacion}%`]),
        archivo: 'ocupacion-deportes',
      })} />
    }>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Table rows={data ?? []} rowKey={(f) => `${f.deporte}-${f.comision}`} columns={[
          { header: 'Deporte', render: (f) => f.deporte },
          { header: 'Comisión', render: (f) => f.comision },
          { header: 'Nivel', render: (f) => f.nivel },
          { header: 'Inscriptos', render: (f) => `${f.inscriptos} / ${f.cupo}` },
          { header: 'Ocupación', render: (f) => (
            <div className="bar-track inline"><div className="bar-fill" style={{ width: `${Math.min(f.ocupacion, 100)}%` }} /><span>{f.ocupacion}%</span></div>
          ) },
        ]} />
      </DataState>
    </Card>
  );
}

function Comedor() {
  const { data, loading, error, reload } = useData(() => api.admin.reporteComedor());
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="stack">
          <div className="grid grid-5">
            {[1, 2, 3, 4, 5].map((d) => (
              <div key={d} className="summary-card center">
                <span>{DIAS[d]}</span>
                <strong>{data.por_dia.find((x) => x.dia === d)?.raciones ?? 0}</strong>
                <small>raciones</small>
              </div>
            ))}
          </div>
          <Card title="Detalle de comensales" actions={
            <BotonPdf disabled={!data.detalle.length} onClick={() => exportarPdf({
              titulo: 'Comedor - comensales',
              columnas: ['Alumno', 'DNI', 'Modalidad', 'Días', 'Dieta especial', 'Alergias'],
              filas: data.detalle.map((f) => [f.alumno, f.dni, f.modalidad, dias(f.dias), f.dieta_especial, f.alergias]),
              archivo: 'comedor',
            })} />
          }>
            <Table rows={data.detalle} rowKey={(f) => f.dni} columns={[
              { header: 'Alumno', render: (f) => f.alumno },
              { header: 'Modalidad', render: (f) => f.modalidad },
              { header: 'Días', render: (f) => dias(f.dias) },
              { header: 'Dieta especial', render: (f) => f.dieta_especial ?? '-' },
              { header: 'Alergias', render: (f) => (f.alergias && f.alergias !== 'Ninguna' ? <Badge tone="danger">{f.alergias}</Badge> : '-') },
            ]} />
          </Card>
        </div>
      )}
    </DataState>
  );
}

// Reporte 360: toda la informacion del alumno en una sola ficha.
function Ficha360() {
  const { data, loading, error, reload } = useData(() => api.admin.reporteAlumnos());
  const [id, setId] = useState('');
  const alumno = data?.find((a) => a.alumno_id === Number(id));

  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <div className="stack">
        <Card>
          <Field label="Alumno">
            <Select value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Seleccionar alumno</option>
              {(data ?? []).map((a) => <option key={a.alumno_id} value={a.alumno_id}>{a.alumno} - DNI {a.dni}</option>)}
            </Select>
          </Field>
        </Card>
        {alumno && (
          <Card title={alumno.alumno} actions={
            <BotonPdf onClick={() => exportarPdf({
              titulo: `Ficha integral - ${alumno.alumno}`,
              columnas: ['Dato', 'Valor'],
              filas: [
                ['DNI', alumno.dni], ['Nacimiento', fecha(alumno.fecha_nacimiento)], ['Nivel', alumno.nivel], ['Curso', alumno.curso],
                ['Tutores', alumno.tutores], ['Deportes', alumno.deportes], ['Transporte', alumno.transporte], ['Comedor', alumno.comedor],
                ['Grupo sanguíneo', alumno.grupo_sanguineo], ['Alergias', alumno.alergias], ['Apto físico', `${alumno.estado_apto} (vence ${fecha(alumno.apto_fisico_vence)})`],
              ],
              archivo: `ficha-${alumno.dni}`,
            })} />
          }>
            <div className="info-list two-cols">
              <InfoRow label="DNI">{alumno.dni}</InfoRow>
              <InfoRow label="Nacimiento">{fecha(alumno.fecha_nacimiento)}</InfoRow>
              <InfoRow label="Nivel">{alumno.nivel}</InfoRow>
              <InfoRow label="Curso">{alumno.curso}</InfoRow>
              <InfoRow label="Tutores">{alumno.tutores}</InfoRow>
              <InfoRow label="Deportes">{alumno.deportes}</InfoRow>
              <InfoRow label="Transporte">{alumno.transporte}</InfoRow>
              <InfoRow label="Comedor">{alumno.comedor}</InfoRow>
              <InfoRow label="Grupo sanguíneo">{alumno.grupo_sanguineo}</InfoRow>
              <InfoRow label="Alergias">{alumno.alergias}</InfoRow>
              <InfoRow label="Apto físico"><Badge tone={tonoApto[alumno.estado_apto]}>{alumno.estado_apto}</Badge> vence {fecha(alumno.apto_fisico_vence)}</InfoRow>
            </div>
          </Card>
        )}
      </div>
    </DataState>
  );
}

// ----- Reportes de la Parte 2 del TP integrador -----

function Opciones({ label, value, onChange, opciones, todos = 'Todos' }: { label: string; value: string; onChange: (v: string) => void; opciones: { id: number; nombre: string }[]; todos?: string }) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{todos}</option>
        {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
      </Select>
    </Field>
  );
}

const nombreProfesor = (p: { id: number; apellido: string; nombre: string }) => ({ id: p.id, nombre: `${p.apellido}, ${p.nombre}` });

// Por alumno: curso, materias, profesores de cada materia, deportes con horarios, transporte y comedor.
function PorAlumno() {
  const alumnos = useData(() => api.admin.alumnos());
  const [id, setId] = useState('');
  const { data, loading, error } = useData(() => (id ? api.admin.reportePorAlumno(Number(id)) : Promise.resolve(null)), [id]);
  return (
    <div className="stack">
      <Card>
        <Opciones label="Alumno" value={id} onChange={setId} todos="Seleccionar alumno"
          opciones={(alumnos.data ?? []).map((a) => ({ id: a.id, nombre: `${a.apellido}, ${a.nombre} (${a.legajo ?? a.dni})` }))} />
      </Card>
      {id && (
        <DataState loading={loading} error={error}>
          {data && (
            <Card title={`${data.alumno} · Legajo ${data.legajo}`} actions={<BotonPdf onClick={() => exportarPdf({
              titulo: `Reporte por alumno - ${data.alumno}`, subtitulo: `Legajo ${data.legajo} · ${data.nivel ?? ''} ${data.curso ?? ''}`,
              columnas: ['Tipo', 'Detalle', 'Profesor', 'Horario'],
              filas: [
                ['Curso', `${data.nivel ?? ''} ${data.curso ?? 'Sin matrícula'}`, '', ''],
                ...data.materias.map((m) => ['Materia', m.materia, m.profesor, m.horario]),
                ...data.deportes.map((d) => ['Deporte', `${d.deporte} (${d.comision})`, d.profesor, d.horario]),
                ['Transporte', data.transporte ?? 'No usa', '', ''],
                ['Comedor', data.comedor ?? 'No usa', '', ''],
              ],
              archivo: `reporte-alumno-${data.legajo}`,
            })} />}>
              <div className="info-list two-cols">
                <InfoRow label="Curso">{`${data.nivel ?? ''} ${data.curso ?? 'Sin matrícula'}`}</InfoRow>
                <InfoRow label="Transporte">{data.transporte ?? 'No usa'}</InfoRow>
                <InfoRow label="Comedor">{data.comedor ?? 'No usa'}</InfoRow>
                <InfoRow label="DNI">{data.dni}</InfoRow>
              </div>
              <h3 className="grupo-titulo">Materias y profesores</h3>
              <Table rows={data.materias} rowKey={(m) => m.materia} empty="Sin matrícula." columns={[
                { header: 'Materia', render: (m) => m.materia },
                { header: 'Profesor', render: (m) => m.profesor },
                { header: 'Horario', render: (m) => m.horario },
              ]} />
              <h3 className="grupo-titulo">Deportes y horarios</h3>
              <Table rows={data.deportes} rowKey={(d) => d.comision + d.deporte} empty="No participa en deportes." columns={[
                { header: 'Deporte', render: (d) => `${d.deporte} (${d.comision})` },
                { header: 'Horario', render: (d) => d.horario },
                { header: 'Profesor', render: (d) => d.profesor },
              ]} />
            </Card>
          )}
        </DataState>
      )}
    </div>
  );
}

// Por docente: cursos a cargo por nivel y horarios de cada curso.
function PorDocente() {
  const profesores = useData(() => api.admin.profesores());
  const [id, setId] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.reporteDocentes(Number(id) || undefined), [id]);
  const filas = data ?? [];
  return (
    <Card title="Cursos a cargo por nivel y horarios" actions={<BotonPdf disabled={!filas.length} onClick={() => exportarPdf({
      titulo: 'Reporte por docente', columnas: ['Legajo', 'Profesor', 'Nivel', 'Curso', 'Materia', 'Horario'],
      filas: filas.map((f) => [f.legajo, f.profesor, f.nivel, f.curso, f.materia, f.horario]), archivo: 'reporte-docentes',
    })} />}>
      <div className="inline-form"><Opciones label="Docente" value={id} onChange={setId} opciones={(profesores.data ?? []).map(nombreProfesor)} /></div>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Table rows={filas} rowKey={(f) => `${f.profesor_id}-${f.curso}-${f.materia}`} empty="Sin cursos a cargo." columns={[
          { header: 'Profesor', render: (f) => `${f.profesor} (${f.legajo})` },
          { header: 'Nivel', render: (f) => f.nivel },
          { header: 'Curso', render: (f) => f.curso },
          { header: 'Materia', render: (f) => f.materia },
          { header: 'Horario', render: (f) => f.horario },
        ]} />
      </DataState>
    </Card>
  );
}

function AlumnosPorMateria() {
  const materias = useData(() => api.admin.materias());
  const cursos = useData(() => api.admin.cursos());
  const [materia, setMateria] = useState('');
  const [curso, setCurso] = useState('');
  const { data, loading, error, reload } = useData(
    () => api.admin.reporteAlumnosMateria({ materia_id: Number(materia) || undefined, curso_id: Number(curso) || undefined }),
    [materia, curso],
  );
  const filas = data ?? [];
  return (
    <Card title="Listado de alumnos por materia" actions={<BotonPdf disabled={!filas.length} onClick={() => exportarPdf({
      titulo: 'Alumnos por materia', columnas: ['Nivel', 'Curso', 'Materia', 'Profesor a cargo', 'Alumno', 'Legajo'],
      filas: filas.map((f) => [f.nivel, f.curso, f.materia, f.profesor, f.alumno, f.legajo]), archivo: 'alumnos-por-materia',
    })} />}>
      <div className="inline-form">
        <Opciones label="Materia" value={materia} onChange={setMateria} opciones={(materias.data ?? []).map((m) => ({ id: m.id, nombre: `${m.nombre} (${m.nivel})` }))} />
        <Opciones label="Curso" value={curso} onChange={setCurso} opciones={(cursos.data ?? []).map((c) => ({ id: c.id, nombre: `${c.nivel} - ${c.anio} ${c.division}` }))} />
      </div>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Table rows={filas} rowKey={(f) => `${f.curso}-${f.materia}-${f.legajo}`} empty="Sin alumnos." columns={[
          { header: 'Nivel', render: (f) => f.nivel },
          { header: 'Curso', render: (f) => f.curso },
          { header: 'Materia', render: (f) => f.materia },
          { header: 'Profesor a cargo', render: (f) => f.profesor },
          { header: 'Alumno', render: (f) => f.alumno },
          { header: 'Legajo', render: (f) => f.legajo },
        ]} />
      </DataState>
    </Card>
  );
}

function DocentesPorNivel() {
  const niveles = useData(() => api.niveles());
  const [nivel, setNivel] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.reporteDocentesNivel(Number(nivel) || undefined), [nivel]);
  const filas = data ?? [];
  return (
    <Card title="Listado de docentes por nivel educativo" actions={<BotonPdf disabled={!filas.length} onClick={() => exportarPdf({
      titulo: 'Docentes por nivel educativo', columnas: ['Nivel', 'Legajo', 'Profesor', 'Materias a cargo', 'Cursos'],
      filas: filas.map((f) => [f.nivel, f.legajo, f.profesor, f.materias, f.cursos]), archivo: 'docentes-por-nivel',
    })} />}>
      <div className="inline-form"><Opciones label="Nivel" value={nivel} onChange={setNivel} opciones={niveles.data ?? []} /></div>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Table rows={filas} rowKey={(f) => `${f.nivel}-${f.legajo}`} columns={[
          { header: 'Nivel', render: (f) => f.nivel },
          { header: 'Profesor', render: (f) => `${f.profesor} (${f.legajo})` },
          { header: 'Materias a cargo', render: (f) => f.materias },
          { header: 'Cursos', render: (f) => f.cursos },
        ]} />
      </DataState>
    </Card>
  );
}

// Cubre los listados por deporte; por deporte y nivel; y por deporte, nivel, horario y profesor.
function AlumnosPorDeporte() {
  const deportes = useData(() => api.admin.deportes());
  const niveles = useData(() => api.niveles());
  const profesores = useData(() => api.admin.profesores());
  const [deporte, setDeporte] = useState('');
  const [nivel, setNivel] = useState('');
  const [profesor, setProfesor] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.reporteAlumnosDeporte({
    deporte_id: Number(deporte) || undefined, nivel_id: Number(nivel) || undefined, profesor_id: Number(profesor) || undefined,
  }), [deporte, nivel, profesor]);
  const filas = data ?? [];
  return (
    <Card title="Listado de alumnos por deporte" actions={<BotonPdf disabled={!filas.length} onClick={() => exportarPdf({
      titulo: 'Alumnos por deporte, nivel, horario y profesor', columnas: ['Deporte', 'Nivel', 'Horario', 'Profesor', 'Alumno', 'Legajo', 'Curso'],
      filas: filas.map((f) => [f.deporte, f.nivel, f.horario, f.profesor, f.alumno, f.legajo, f.curso]), archivo: 'alumnos-por-deporte',
    })} />}>
      <div className="inline-form">
        <Opciones label="Deporte" value={deporte} onChange={setDeporte} opciones={deportes.data ?? []} />
        <Opciones label="Nivel" value={nivel} onChange={setNivel} opciones={niveles.data ?? []} />
        <Opciones label="Profesor a cargo" value={profesor} onChange={setProfesor} opciones={(profesores.data ?? []).map(nombreProfesor)} />
      </div>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Table rows={filas} rowKey={(f) => `${f.comision}-${f.deporte}-${f.legajo}`} empty="Sin alumnos inscriptos." columns={[
          { header: 'Deporte', render: (f) => `${f.deporte} (${f.comision})` },
          { header: 'Nivel', render: (f) => f.nivel },
          { header: 'Horario', render: (f) => f.horario },
          { header: 'Profesor', render: (f) => f.profesor },
          { header: 'Alumno', render: (f) => `${f.alumno} (${f.legajo})` },
          { header: 'Curso', render: (f) => f.curso },
        ]} />
      </DataState>
    </Card>
  );
}
