// Legajos: alumnos (con vinculo familiar), familias/tutores y docentes.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link2, Pencil, Plus, Search, Trash2, Unlink } from 'lucide-react';
import { edad, fecha } from '../../../shared/format';
import type { Alumno, Profesor, Tutor } from '../../../shared/types';
import { Badge, Button, Card, DataState, Feedback, Field, InfoRow, Input, Modal, PageHeader, Select, Table } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useData } from '../../lib/useData';
import { FormModal } from './FormModal';
import type { FieldConfig } from './FormModal';

const nivelOptions = [
  { value: 1, label: 'Inicial' },
  { value: 2, label: 'Primario' },
  { value: 3, label: 'Secundario' },
];

const alumnoFields: FieldConfig[] = [
  { name: 'dni', label: 'DNI', required: true, hint: 'Solo números' },
  { name: 'nivel_id', label: 'Nivel', type: 'select', options: nivelOptions, required: true },
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'apellido', label: 'Apellido', required: true },
  { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
  { name: 'genero', label: 'Genero', type: 'select', options: ['Femenino', 'Masculino', 'Otro'].map((g) => ({ value: g, label: g })) },
  { name: 'direccion', label: 'Dirección', full: true },
  { name: 'activo', label: 'Alumno activo', type: 'checkbox' },
];

function Buscador({ onBuscar, children }: { onBuscar: (texto: string) => void; children?: ReactNode }) {
  const [texto, setTexto] = useState('');
  return (
    <form className="filters" onSubmit={(e) => { e.preventDefault(); onBuscar(texto); }}>
      <Input placeholder="Buscar por DNI o apellido" value={texto} onChange={(e) => setTexto(e.target.value)} />
      {children}
      <Button type="submit" variant="outline" icon={<Search size={16} />}>Buscar</Button>
    </form>
  );
}

export function AlumnosPage() {
  const [filtro, setFiltro] = useState({ buscar: '', nivel_id: '' });
  const { data, loading, error, reload } = useData(
    () => api.admin.alumnos({ buscar: filtro.buscar, nivel_id: filtro.nivel_id ? Number(filtro.nivel_id) : undefined }),
    [filtro.buscar, filtro.nivel_id],
  );
  const [editar, setEditar] = useState<Alumno | 'nuevo' | null>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  const accion = useAction();

  return (
    <>
      <PageHeader title="Alumnos" subtitle="Legajos de alumnos y vinculo familiar." actions={<Button icon={<Plus size={18} />} onClick={() => setEditar('nuevo')}>Nuevo alumno</Button>} />
      <Buscador onBuscar={(buscar) => setFiltro({ ...filtro, buscar })}>
        <Select value={filtro.nivel_id} onChange={(e) => setFiltro({ ...filtro, nivel_id: e.target.value })}>
          <option value="">Todos los niveles</option>
          {nivelOptions.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
        </Select>
      </Buscador>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(a) => a.id} columns={[
            { header: 'Alumno', render: (a) => <button className="link" onClick={() => setDetalle(a.id)}>{a.apellido}, {a.nombre}</button> },
            { header: 'DNI', render: (a) => a.dni },
            { header: 'Edad', render: (a) => `${edad(a.fecha_nacimiento)} años` },
            { header: 'Nivel', render: (a) => a.nivel },
            { header: 'Curso', render: (a) => a.curso ?? <Badge tone="warning">Sin matrícula</Badge> },
            { header: 'Estado', render: (a) => <Badge tone={a.activo ? 'success' : 'neutral'}>{a.activo ? 'Activo' : 'Inactivo'}</Badge> },
            { header: '', className: 'actions', render: (a) => (
              <div className="row-actions">
                <Button variant="ghost" size="sm" icon={<Link2 size={16} />} onClick={() => setDetalle(a.id)}>Familia</Button>
                <Button variant="ghost" size="sm" icon={<Pencil size={16} />} onClick={() => setEditar(a)} aria-label="Editar" />
                <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} aria-label="Eliminar"
                  onClick={() => window.confirm(`Eliminar el legajo de ${a.nombre} ${a.apellido}? Se borran también sus inscripciones.`) &&
                    accion.run(() => api.admin.eliminarAlumno(a.id), 'Alumno eliminado.').then((ok) => { if (ok) reload(); })} />
              </div>
            ) },
          ]} />
        </Card>
      </DataState>
      {editar && (
        <FormModal
          title={editar === 'nuevo' ? 'Nuevo alumno' : 'Editar alumno'}
          fields={alumnoFields}
          initial={editar === 'nuevo' ? { activo: true } : editar}
          onClose={() => setEditar(null)}
          onSubmit={async (payload) => {
            if (editar === 'nuevo') await api.admin.crearAlumno(payload);
            else await api.admin.actualizarAlumno(editar.id, payload);
            reload();
          }}
        />
      )}
      {detalle && <AlumnoFamilia id={detalle} onClose={() => { setDetalle(null); reload(); }} />}
    </>
  );
}

// Detalle del alumno con su vinculo familiar (RF-08).
function AlumnoFamilia({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, reload } = useData(() => api.admin.alumno(id), [id]);
  const tutores = useData(() => api.admin.tutores());
  const [vinculo, setVinculo] = useState({ tutor_id: '', parentesco: 'Madre', es_responsable: true });
  const accion = useAction();

  return (
    <Modal title={data ? `${data.apellido}, ${data.nombre}` : 'Alumno'} onClose={onClose} wide>
      {data && (
        <div className="stack">
          <div className="info-list two-cols">
            <InfoRow label="DNI">{data.dni}</InfoRow>
            <InfoRow label="Nacimiento">{fecha(data.fecha_nacimiento)}</InfoRow>
            <InfoRow label="Nivel">{data.nivel}</InfoRow>
            <InfoRow label="Dirección">{data.direccion}</InfoRow>
          </div>
          <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
          <h4>Tutores vinculados</h4>
          <Table rows={data.tutores ?? []} rowKey={(t) => t.id} empty="Sin tutores vinculados." columns={[
            { header: 'Tutor', render: (t) => `${t.apellido}, ${t.nombre}` },
            { header: 'Parentesco', render: (t) => t.parentesco },
            { header: 'Teléfono', render: (t) => t.telefono },
            { header: 'Responsable', render: (t) => (t.es_responsable ? <Badge tone="info">Si</Badge> : 'No') },
            { header: '', className: 'actions', render: (t) => (
              <Button variant="ghost" size="sm" icon={<Unlink size={16} />}
                onClick={() => accion.run(() => api.admin.desvincularTutor(id, t.id), 'Vinculo eliminado.').then((ok) => { if (ok) reload(); })}>
                Desvincular
              </Button>
            ) },
          ]} />
          <div className="inline-form">
            <Field label="Tutor">
              <Select value={vinculo.tutor_id} onChange={(e) => setVinculo({ ...vinculo, tutor_id: e.target.value })}>
                <option value="">Seleccionar tutor</option>
                {(tutores.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre} (DNI {t.dni})</option>)}
              </Select>
            </Field>
            <Field label="Parentesco">
              <Select value={vinculo.parentesco} onChange={(e) => setVinculo({ ...vinculo, parentesco: e.target.value })}>
                {['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tia', 'Tio', 'Tutor legal'].map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
            <label className="checkbox">
              <input type="checkbox" checked={vinculo.es_responsable} onChange={(e) => setVinculo({ ...vinculo, es_responsable: e.target.checked })} /> Responsable
            </label>
            <Button disabled={!vinculo.tutor_id} loading={accion.busy} icon={<Link2 size={16} />}
              onClick={() => accion.run(() => api.admin.vincularTutor(id, { ...vinculo, tutor_id: Number(vinculo.tutor_id) }), 'Tutor vinculado.').then((ok) => { if (ok) reload(); })}>
              Vincular
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const tutorFields: FieldConfig[] = [
  { name: 'dni', label: 'DNI', required: true },
  { name: 'telefono', label: 'Teléfono', type: 'tel', required: true },
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'apellido', label: 'Apellido', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'ocupacion', label: 'Ocupación' },
  { name: 'direccion', label: 'Dirección', full: true },
];

export function TutoresPage() {
  const [buscar, setBuscar] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.tutores({ buscar }), [buscar]);
  const [editar, setEditar] = useState<Tutor | 'nuevo' | null>(null);
  const accion = useAction();

  return (
    <>
      <PageHeader title="Familias" subtitle="Padres, madres y tutores. Vincularlos a sus hijos desde la ficha del alumno." actions={<Button icon={<Plus size={18} />} onClick={() => setEditar('nuevo')}>Nuevo tutor</Button>} />
      <Buscador onBuscar={setBuscar} />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(t) => t.id} columns={[
            { header: 'Tutor', render: (t) => `${t.apellido}, ${t.nombre}` },
            { header: 'DNI', render: (t) => t.dni },
            { header: 'Teléfono', render: (t) => t.telefono },
            { header: 'Email', render: (t) => t.email ?? '-' },
            { header: 'Hijos', render: (t) => t.hijos ?? <Badge tone="warning">Sin vincular</Badge> },
            { header: 'Usuario', render: (t) => (t.usuario_id ? <Badge tone="success">Con acceso</Badge> : <Badge>Sin acceso</Badge>) },
            { header: '', className: 'actions', render: (t) => (
              <div className="row-actions">
                <Button variant="ghost" size="sm" icon={<Pencil size={16} />} onClick={() => setEditar(t)} aria-label="Editar" />
                <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} aria-label="Eliminar"
                  onClick={() => window.confirm(`Eliminar a ${t.nombre} ${t.apellido}?`) && accion.run(() => api.admin.eliminarTutor(t.id), 'Tutor eliminado.').then((ok) => { if (ok) reload(); })} />
              </div>
            ) },
          ]} />
        </Card>
      </DataState>
      {editar && (
        <FormModal title={editar === 'nuevo' ? 'Nuevo tutor' : 'Editar tutor'} fields={tutorFields} initial={editar === 'nuevo' ? null : editar} onClose={() => setEditar(null)}
          onSubmit={async (payload) => {
            if (editar === 'nuevo') await api.admin.crearTutor(payload);
            else await api.admin.actualizarTutor(editar.id, payload);
            reload();
          }} />
      )}
    </>
  );
}

const profesorFields: FieldConfig[] = [
  { name: 'dni', label: 'DNI', required: true },
  { name: 'especialidad', label: 'Especialidad' },
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'apellido', label: 'Apellido', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'telefono', label: 'Teléfono', type: 'tel' },
  { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
  { name: 'activo', label: 'Docente activo', type: 'checkbox' },
];

export function DocentesPage() {
  const { data, loading, error, reload } = useData(() => api.admin.profesores());
  const [editar, setEditar] = useState<Profesor | 'nuevo' | null>(null);
  const accion = useAction();

  return (
    <>
      <PageHeader title="Cuerpo docente" subtitle="Las materias se asignan desde Cursos y las comisiones desde Deportes." actions={<Button icon={<Plus size={18} />} onClick={() => setEditar('nuevo')}>Nuevo docente</Button>} />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(p) => p.id} columns={[
            { header: 'Docente', render: (p) => `${p.apellido}, ${p.nombre}` },
            { header: 'DNI', render: (p) => p.dni },
            { header: 'Especialidad', render: (p) => p.especialidad ?? '-' },
            { header: 'Contacto', render: (p) => p.email ?? p.telefono ?? '-' },
            { header: 'Materias', render: (p) => p.materias_asignadas },
            { header: 'Comisiones', render: (p) => p.comisiones_a_cargo },
            { header: 'Estado', render: (p) => <Badge tone={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge> },
            { header: '', className: 'actions', render: (p) => (
              <div className="row-actions">
                <Button variant="ghost" size="sm" icon={<Pencil size={16} />} onClick={() => setEditar(p)} aria-label="Editar" />
                <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} aria-label="Eliminar"
                  onClick={() => window.confirm(`Eliminar a ${p.nombre} ${p.apellido}?`) && accion.run(() => api.admin.eliminarProfesor(p.id), 'Docente eliminado.').then((ok) => { if (ok) reload(); })} />
              </div>
            ) },
          ]} />
        </Card>
      </DataState>
      {editar && (
        <FormModal title={editar === 'nuevo' ? 'Nuevo docente' : 'Editar docente'} fields={profesorFields} initial={editar === 'nuevo' ? { activo: true } : editar} onClose={() => setEditar(null)}
          onSubmit={async (payload) => {
            if (editar === 'nuevo') await api.admin.crearProfesor(payload);
            else await api.admin.actualizarProfesor(editar.id, payload);
            reload();
          }} />
      )}
    </>
  );
}
