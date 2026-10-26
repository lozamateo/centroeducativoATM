// Disciplinas deportivas, comisiones y horarios (RF-10).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DIAS, horarios } from '../../../shared/format';
import type { Comision, Horario } from '../../../shared/types';
import { Badge, Button, Card, DataState, Feedback, Field, Input, Modal, PageHeader, Select, Table } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useData } from '../../lib/useData';
import { FormModal } from './FormModal';

export function DeportesPage() {
  const deportes = useData(() => api.admin.deportes());
  const comisiones = useData(() => api.admin.comisiones());
  const [nuevoDeporte, setNuevoDeporte] = useState(false);
  const [editar, setEditar] = useState<Comision | 'nueva' | null>(null);
  const accion = useAction();
  const recargar = () => { deportes.reload(); comisiones.reload(); };

  return (
    <>
      <PageHeader title="Deportes" subtitle="Disciplinas, comisiones por nivel, horarios, cupos y profesores." actions={
        <>
          <Button variant="outline" icon={<Plus size={18} />} onClick={() => setNuevoDeporte(true)}>Nuevo deporte</Button>
          <Button icon={<Plus size={18} />} onClick={() => setEditar('nueva')}>Nueva comisión</Button>
        </>
      } />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <div className="chips-row">
        {(deportes.data ?? []).map((d) => (
          <Badge key={d.id} tone={d.activo ? 'info' : 'neutral'}>{d.nombre} · {d.comisiones} comisiones</Badge>
        ))}
      </div>
      <DataState loading={comisiones.loading} error={comisiones.error} onRetry={comisiones.reload}>
        <Card>
          <Table rows={comisiones.data ?? []} rowKey={(c) => c.id} columns={[
            { header: 'Deporte', render: (c) => c.deporte },
            { header: 'Comisión', render: (c) => c.nombre },
            { header: 'Nivel', render: (c) => c.nivel },
            { header: 'Horarios', render: (c) => horarios(c.horarios) },
            { header: 'Profesor', render: (c) => c.profesor ?? '-' },
            { header: 'Inscriptos', render: (c) => <Badge tone={c.inscriptos >= c.cupo ? 'danger' : 'success'}>{c.inscriptos} / {c.cupo}</Badge> },
            { header: '', className: 'actions', render: (c) => (
              <div className="row-actions">
                <Button variant="ghost" size="sm" icon={<Pencil size={16} />} onClick={() => setEditar(c)} aria-label="Editar" />
                <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} aria-label="Eliminar"
                  onClick={() => window.confirm(`Eliminar la comisión ${c.deporte} ${c.nombre}?`) && accion.run(() => api.admin.eliminarComision(c.id), 'Comisión eliminada.').then((ok) => { if (ok) recargar(); })} />
              </div>
            ) },
          ]} />
        </Card>
      </DataState>
      {nuevoDeporte && (
        <FormModal title="Nuevo deporte" fields={[{ name: 'nombre', label: 'Nombre', required: true }, { name: 'descripcion', label: 'Descripción', type: 'textarea' }]}
          onClose={() => setNuevoDeporte(false)} onSubmit={async (payload) => { await api.admin.crearDeporte(payload); recargar(); }} />
      )}
      {editar && <ComisionModal comision={editar === 'nueva' ? null : editar} onClose={() => setEditar(null)} onSaved={recargar} />}
    </>
  );
}

function ComisionModal({ comision, onClose, onSaved }: { comision: Comision | null; onClose: () => void; onSaved: () => void }) {
  const deportes = useData(() => api.admin.deportes());
  const profesores = useData(() => api.admin.profesores());
  const [form, setForm] = useState({
    deporte_id: String(comision?.deporte_id ?? ''),
    nivel_id: String(comision?.nivel_id ?? ''),
    nombre: comision?.nombre ?? '',
    profesor_id: String(comision?.profesor_id ?? ''),
    cupo: String(comision?.cupo ?? 20),
  });
  const [lista, setLista] = useState<Horario[]>(
    comision?.horarios.map((h) => ({ ...h, hora_inicio: h.hora_inicio.slice(0, 5), hora_fin: h.hora_fin.slice(0, 5) })) ?? [{ dia_semana: 1, hora_inicio: '16:00', hora_fin: '17:00' }],
  );
  const { busy, message, run, setMessage } = useAction();

  const setHorario = (index: number, cambios: Partial<Horario>) => setLista(lista.map((h, i) => (i === index ? { ...h, ...cambios } : h)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      ...form,
      deporte_id: Number(form.deporte_id),
      nivel_id: Number(form.nivel_id),
      profesor_id: form.profesor_id ? Number(form.profesor_id) : null,
      cupo: Number(form.cupo),
      horarios: lista,
    };
    const ok = await run(() => (comision ? api.admin.actualizarComision(comision.id, payload) : api.admin.crearComision(payload)));
    if (ok) {
      onSaved();
      onClose();
    }
  }

  return (
    <Modal title={comision ? `Editar ${comision.deporte} - ${comision.nombre}` : 'Nueva comisión'} onClose={onClose} wide footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="comision-form" loading={busy}>Guardar</Button>
      </>
    }>
      <form id="comision-form" className="form-grid" onSubmit={submit}>
        <div className="field-full"><Feedback message={message} onClose={() => setMessage(null)} /></div>
        <Field label="Deporte *">
          <Select required disabled={Boolean(comision)} value={form.deporte_id} onChange={(e) => setForm({ ...form, deporte_id: e.target.value })}>
            <option value="">Seleccionar</option>
            {(deportes.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Nivel *">
          <Select required disabled={Boolean(comision)} value={form.nivel_id} onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}>
            <option value="">Seleccionar</option>
            <option value="1">Inicial</option>
            <option value="2">Primario</option>
            <option value="3">Secundario</option>
          </Select>
        </Field>
        <Field label="Nombre de la comisión *"><Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Primario A" /></Field>
        <Field label="Cupo *"><Input required type="number" min={1} value={form.cupo} onChange={(e) => setForm({ ...form, cupo: e.target.value })} /></Field>
        <Field label="Profesor" full>
          <Select value={form.profesor_id} onChange={(e) => setForm({ ...form, profesor_id: e.target.value })}>
            <option value="">A designar</option>
            {(profesores.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
          </Select>
        </Field>
        <div className="field-full">
          <span className="field-label">Horarios</span>
          {lista.map((h, index) => (
            <div key={index} className="schedule-row">
              <Select value={h.dia_semana} onChange={(e) => setHorario(index, { dia_semana: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{DIAS[d]}</option>)}
              </Select>
              <Input type="time" required value={h.hora_inicio} onChange={(e) => setHorario(index, { hora_inicio: e.target.value })} />
              <Input type="time" required value={h.hora_fin} onChange={(e) => setHorario(index, { hora_fin: e.target.value })} />
              <Button type="button" variant="ghost" size="sm" icon={<Trash2 size={16} />} disabled={lista.length === 1} onClick={() => setLista(lista.filter((_, i) => i !== index))} aria-label="Quitar horario" />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" icon={<Plus size={16} />} onClick={() => setLista([...lista, { dia_semana: 1, hora_inicio: '16:00', hora_fin: '17:00' }])}>
            Agregar horario
          </Button>
        </div>
      </form>
    </Modal>
  );
}
