// Disciplinas deportivas, comisiones y horarios (RF-10).
import { useState } from 'react';
import { Text, View } from 'react-native';
import { DIAS, horarios } from '../../../../shared/format';
import type { Comision, Horario } from '../../../../shared/types';
import { confirmar } from '../../components/AlumnoVista';
import { FormSheet } from '../../components/FormSheet';
import { Badge, Button, Card, DataState, Empty, Feedback, Field, Input, ListItem, PageHeader, Row, Screen, Select, Sheet, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { nivelOptions } from '../../lib/admin';
import { useAction, useData } from '../../lib/useData';

export default function Deportes() {
  const deportes = useData(() => api.admin.deportes());
  const comisiones = useData(() => api.admin.comisiones());
  const [nuevoDeporte, setNuevoDeporte] = useState(false);
  const [editar, setEditar] = useState<Comision | 'nueva' | null>(null);
  const accion = useAction();
  const recargar = () => { deportes.reload(); comisiones.reload(); };

  return (
    <Screen>
      <PageHeader title="Deportes" subtitle="Comisiones por nivel, horarios, cupos y profesores." />
      <Row>
        <Button title="Nuevo deporte" icon="add" variant="outline" small onPress={() => setNuevoDeporte(true)} />
        <Button title="Nueva comisión" icon="add" small onPress={() => setEditar('nueva')} />
      </Row>
      <Row>{(deportes.data ?? []).map((d) => <Badge key={d.id} tone={d.activo ? 'info' : 'neutral'}>{d.nombre} · {d.comisiones}</Badge>)}</Row>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={comisiones.loading} error={comisiones.error} onRetry={comisiones.reload}>
        <Card>
          {comisiones.data?.length ? comisiones.data.map((c) => (
            <View key={c.id}>
              <ListItem title={`${c.deporte} · ${c.nombre}`} subtitle={`${c.nivel} · ${horarios(c.horarios)}\n${c.profesor ?? 'Profesor a designar'}`}
                right={<Badge tone={c.inscriptos >= c.cupo ? 'danger' : 'success'}>{c.inscriptos} / {c.cupo}</Badge>} onPress={() => setEditar(c)} />
              <Row style={{ justifyContent: 'flex-end' }}>
                <Button title="Eliminar" icon="trash-outline" variant="ghost" small
                  onPress={() => confirmar(`¿Eliminar la comisión ${c.deporte} ${c.nombre}?`, () => accion.run(() => api.admin.eliminarComision(c.id), 'Comisión eliminada.').then((ok) => { if (ok) recargar(); }))} />
              </Row>
            </View>
          )) : <Empty texto="No hay comisiones." />}
        </Card>
      </DataState>
      <FormSheet title="Nuevo deporte" visible={nuevoDeporte} onClose={() => setNuevoDeporte(false)}
        fields={[{ name: 'nombre', label: 'Nombre', required: true }, { name: 'descripcion', label: 'Descripción', type: 'textarea' }]}
        onSubmit={async (payload) => { await api.admin.crearDeporte(payload); recargar(); }} />
      {editar && <ComisionSheet comision={editar === 'nueva' ? null : editar} onClose={() => setEditar(null)} onSaved={recargar} />}
    </Screen>
  );
}

function ComisionSheet({ comision, onClose, onSaved }: { comision: Comision | null; onClose: () => void; onSaved: () => void }) {
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
  const setHorario = (i: number, cambios: Partial<Horario>) => setLista(lista.map((h, j) => (j === i ? { ...h, ...cambios } : h)));

  async function guardar() {
    const payload = {
      ...form,
      deporte_id: Number(form.deporte_id),
      nivel_id: Number(form.nivel_id),
      profesor_id: form.profesor_id ? Number(form.profesor_id) : null,
      cupo: Number(form.cupo),
      horarios: lista,
    };
    const ok = await run(() => (comision ? api.admin.actualizarComision(comision.id, payload) : api.admin.crearComision(payload)));
    if (ok) { onSaved(); onClose(); }
  }

  return (
    <Sheet title={comision ? `${comision.deporte} - ${comision.nombre}` : 'Nueva comisión'} visible onClose={onClose}
      footer={<><Button title="Cancelar" variant="ghost" onPress={onClose} /><Button title="Guardar" loading={busy} onPress={guardar} /></>}>
      <Feedback message={message} onClose={() => setMessage(null)} />
      {!comision && (
        <>
          <Field label="Deporte *">
            <Select value={form.deporte_id} onChange={(v) => setForm({ ...form, deporte_id: v })} options={(deportes.data ?? []).map((d) => ({ value: d.id, label: d.nombre }))} />
          </Field>
          <Field label="Nivel *"><Select value={form.nivel_id} onChange={(v) => setForm({ ...form, nivel_id: v })} options={nivelOptions} /></Field>
        </>
      )}
      <Field label="Nombre de la comisión *"><Input value={form.nombre} onChangeText={(v) => setForm({ ...form, nombre: v })} placeholder="Ej: Primario A" /></Field>
      <Field label="Cupo *"><Input value={form.cupo} onChangeText={(v) => setForm({ ...form, cupo: v })} keyboardType="numeric" /></Field>
      <Field label="Profesor">
        <Select value={form.profesor_id} onChange={(v) => setForm({ ...form, profesor_id: v })}
          options={[{ value: '', label: 'A designar' }, ...(profesores.data ?? []).map((p) => ({ value: p.id, label: `${p.apellido}, ${p.nombre}` }))]} />
      </Field>
      <Text style={styles.sectionTitle}>Horarios</Text>
      {lista.map((h, i) => (
        <View key={i} style={{ gap: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <Select value={h.dia_semana} onChange={(v) => setHorario(i, { dia_semana: Number(v) })} options={[1, 2, 3, 4, 5, 6].map((d) => ({ value: d, label: DIAS[d] }))} />
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}><Input value={h.hora_inicio} onChangeText={(v) => setHorario(i, { hora_inicio: v })} placeholder="16:00" /></View>
            <View style={{ flex: 1 }}><Input value={h.hora_fin} onChangeText={(v) => setHorario(i, { hora_fin: v })} placeholder="17:00" /></View>
            <Button title="" icon="trash-outline" variant="ghost" small disabled={lista.length === 1} onPress={() => setLista(lista.filter((_, j) => j !== i))} />
          </Row>
        </View>
      ))}
      <Button title="Agregar horario" icon="add" variant="outline" small onPress={() => setLista([...lista, { dia_semana: 1, hora_inicio: '16:00', hora_fin: '17:00' }])} />
    </Sheet>
  );
}
