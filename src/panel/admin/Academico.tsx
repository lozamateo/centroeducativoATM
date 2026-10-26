// Estructura academica: cursos, materias/idiomas y asignacion docente (RF-03 a RF-06).
import { useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Curso } from '../../../shared/types';
import { Badge, Button, Card, DataState, Feedback, Modal, PageHeader, Select, Table, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useData } from '../../lib/useData';
import { FormModal } from './FormModal';
import type { FieldConfig } from './FormModal';

const niveles = [
  { value: 1, label: 'Inicial' },
  { value: 2, label: 'Primario' },
  { value: 3, label: 'Secundario' },
];

const cursoFields: FieldConfig[] = [
  { name: 'nivel_id', label: 'Nivel', type: 'select', options: niveles, required: true },
  { name: 'anio', label: 'Sala / grado / año', required: true, placeholder: 'Ej: 1.º grado' },
  { name: 'division', label: 'Division', required: true, placeholder: 'A' },
  { name: 'turno', label: 'Turno', type: 'select', options: ['Jornada extendida', 'Mañana', 'Tarde'].map((t) => ({ value: t, label: t })) },
  { name: 'cupo', label: 'Cupo', type: 'number', required: true },
];

const materiaFields: FieldConfig[] = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'nivel_id', label: 'Nivel', type: 'select', options: niveles, required: true },
  { name: 'carga_horaria_semanal', label: 'Horas semanales', type: 'number' },
  { name: 'es_idioma', label: 'Es un idioma extranjero', type: 'checkbox' },
];

export function CursosPage() {
  const [tab, setTab] = useState<'cursos' | 'materias'>('cursos');
  return (
    <>
      <PageHeader title="Cursos y materias" subtitle="Ciclo lectivo 2027: cursos por nivel, materias, idiomas y docentes a cargo." />
      <Tabs tabs={[{ key: 'cursos', label: 'Cursos' }, { key: 'materias', label: 'Materias e idiomas' }]} active={tab} onChange={setTab} />
      {tab === 'cursos' ? <Cursos /> : <Materias />}
    </>
  );
}

function Cursos() {
  const [nivel, setNivel] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.cursos({ nivel_id: nivel ? Number(nivel) : undefined }), [nivel]);
  const [editar, setEditar] = useState<Curso | 'nuevo' | null>(null);
  const [materias, setMaterias] = useState<Curso | null>(null);
  const accion = useAction();

  return (
    <div className="stack">
      <div className="filters">
        <Select value={nivel} onChange={(e) => setNivel(e.target.value)}>
          <option value="">Todos los niveles</option>
          {niveles.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
        </Select>
        <Button icon={<Plus size={18} />} onClick={() => setEditar('nuevo')}>Nuevo curso</Button>
      </div>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(c) => c.id} columns={[
            { header: 'Nivel', render: (c) => c.nivel },
            { header: 'Curso', render: (c) => `${c.anio} ${c.division}` },
            { header: 'Turno', render: (c) => c.turno },
            { header: 'Matriculados', render: (c) => <Badge tone={c.inscriptos >= c.cupo ? 'danger' : 'success'}>{c.inscriptos} / {c.cupo}</Badge> },
            { header: '', className: 'actions', render: (c) => (
              <div className="row-actions">
                <Button variant="ghost" size="sm" icon={<BookOpen size={16} />} onClick={() => setMaterias(c)}>Materias</Button>
                <Button variant="ghost" size="sm" icon={<Pencil size={16} />} onClick={() => setEditar(c)} aria-label="Editar" />
                <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} aria-label="Eliminar"
                  onClick={() => window.confirm(`Eliminar ${c.anio} ${c.division}?`) && accion.run(() => api.admin.eliminarCurso(c.id), 'Curso eliminado.').then((ok) => { if (ok) reload(); })} />
              </div>
            ) },
          ]} />
        </Card>
      </DataState>
      {editar && (
        <FormModal title={editar === 'nuevo' ? 'Nuevo curso' : 'Editar curso'} fields={editar === 'nuevo' ? cursoFields : cursoFields.slice(1)}
          initial={editar === 'nuevo' ? { cupo: 25, turno: 'Jornada extendida' } : editar} onClose={() => setEditar(null)}
          onSubmit={async (payload) => {
            if (editar === 'nuevo') await api.admin.crearCurso(payload);
            else await api.admin.actualizarCurso(editar.id, payload);
            reload();
          }} />
      )}
      {materias && <MateriasCurso curso={materias} onClose={() => setMaterias(null)} />}
    </div>
  );
}

function MateriasCurso({ curso, onClose }: { curso: Curso; onClose: () => void }) {
  const { data, reload } = useData(() => api.admin.materiasCurso(curso.id), [curso.id]);
  const profesores = useData(() => api.admin.profesores());
  const accion = useAction();

  return (
    <Modal title={`Materias de ${curso.nivel} - ${curso.anio} ${curso.division}`} onClose={onClose} wide>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <Table rows={data ?? []} rowKey={(m) => m.id} columns={[
        { header: 'Materia', render: (m) => <>{m.nombre} {m.es_idioma && <Badge tone="info">Idioma</Badge>}</> },
        { header: 'Horas', render: (m) => m.carga_horaria_semanal ?? '-' },
        { header: 'Docente', render: (m) => (
          <Select value={m.profesor_id ?? ''} onChange={(e) =>
            accion.run(() => api.admin.asignarProfesor(m.id, e.target.value ? Number(e.target.value) : null), 'Docente asignado.').then(reload)}>
            <option value="">A designar</option>
            {(profesores.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
          </Select>
        ) },
      ]} />
    </Modal>
  );
}

function Materias() {
  const { data, loading, error, reload } = useData(() => api.admin.materias());
  const [nueva, setNueva] = useState(false);
  const accion = useAction();

  return (
    <div className="stack">
      <div className="filters"><Button icon={<Plus size={18} />} onClick={() => setNueva(true)}>Nueva materia</Button></div>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(m) => m.id} columns={[
            { header: 'Materia', render: (m) => m.nombre },
            { header: 'Nivel', render: (m) => m.nivel },
            { header: 'Tipo', render: (m) => (m.es_idioma ? <Badge tone="info">Idioma</Badge> : 'Curricular') },
            { header: 'Horas semanales', render: (m) => m.carga_horaria_semanal ?? '-' },
            { header: '', className: 'actions', render: (m) => (
              <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} aria-label="Eliminar"
                onClick={() => window.confirm(`Eliminar ${m.nombre}?`) && accion.run(() => api.admin.eliminarMateria(m.id), 'Materia eliminada.').then((ok) => { if (ok) reload(); })} />
            ) },
          ]} />
        </Card>
      </DataState>
      {nueva && (
        <FormModal title="Nueva materia" fields={materiaFields} initial={{ es_idioma: false }} onClose={() => setNueva(false)}
          onSubmit={async (payload) => { await api.admin.crearMateria(payload); reload(); }} />
      )}
    </div>
  );
}
