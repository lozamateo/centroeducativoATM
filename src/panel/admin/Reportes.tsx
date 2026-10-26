// Motor de reportes gerenciales MIS con exportacion a PDF (RF-16 a RF-21).
import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { DIAS, dias, fecha, tonoApto } from '../../../shared/format';
import { Badge, Button, Card, DataState, Field, InfoRow, PageHeader, Select, Table, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { exportarPdf } from '../../lib/pdf';
import { useData } from '../../lib/useData';

type TabKey = 'transporte' | 'curso' | 'deportes' | 'comedor' | 'alumno';

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
      ]} />
      {tab === 'transporte' && <PadrónTransporte />}
      {tab === 'curso' && <PadrónCurso />}
      {tab === 'deportes' && <OcupacionDeportes />}
      {tab === 'comedor' && <Comedor />}
      {tab === 'alumno' && <Ficha360 />}
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
          columnas: ['Nivel', 'Curso', 'Alumno', 'DNI', 'Comprobante'],
          filas: (data ?? []).map((f) => [f.nivel, f.curso, f.alumno, f.dni, f.comprobante]),
          archivo: 'padron-curso',
        })} />
      </>
    }>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Table rows={data ?? []} rowKey={(f) => `${f.curso_id}-${f.alumno_id}`} empty="Sin alumnos matriculados." columns={[
          { header: 'Nivel', render: (f) => f.nivel },
          { header: 'Curso', render: (f) => f.curso },
          { header: 'Alumno', render: (f) => f.alumno },
          { header: 'DNI', render: (f) => f.dni },
          { header: 'Comprobante', render: (f) => f.comprobante },
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
