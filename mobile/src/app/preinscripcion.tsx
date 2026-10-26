import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Chip, Feedback, Field, Input, Row, Screen, Select, styles } from '../components/ui';
import { api } from '../lib/api';
import { useAction, useData } from '../lib/useData';

const inicial = { tutor_nombre: '', tutor_email: '', tutor_telefono: '', alumno_nombre: '', alumno_fecha_nac: '', nivel_id: '', anio_solicitado: '', comentarios: '' };
const opcionesServicios = ['Transporte', 'Comedor', 'Deportes'];

export default function Preinscripcion() {
  const niveles = useData(() => api.niveles());
  const [form, setForm] = useState(inicial);
  const [servicios, setServicios] = useState<string[]>([]);
  const { busy, message, run, setMessage } = useAction();
  const set = (field: keyof typeof inicial) => (value: string) => setForm({ ...form, [field]: value });

  async function submit() {
    let respuesta = '';
    const ok = await run(async () => {
      respuesta = (await api.enviarSolicitud({ ...form, nivel_id: Number(form.nivel_id) || null, servicios })).mensaje;
    });
    if (ok) {
      setMessage({ tipo: 'ok', texto: respuesta });
      setForm(inicial);
      setServicios([]);
    }
  }

  return (
    <Screen>
      <Text style={styles.muted}>Completá el formulario y secretaría se comunicará para coordinar una entrevista y completar la matrícula.</Text>
      <Card>
        <Feedback message={message} onClose={() => setMessage(null)} />
        <Field label="Nombre del padre, madre o tutor *"><Input value={form.tutor_nombre} onChangeText={set('tutor_nombre')} /></Field>
        <Field label="Teléfono *"><Input value={form.tutor_telefono} onChangeText={set('tutor_telefono')} keyboardType="phone-pad" /></Field>
        <Field label="Email *"><Input value={form.tutor_email} onChangeText={set('tutor_email')} keyboardType="email-address" autoCapitalize="none" /></Field>
        <Field label="Nombre del alumno *"><Input value={form.alumno_nombre} onChangeText={set('alumno_nombre')} /></Field>
        <Field label="Fecha de nacimiento" hint="Formato AAAA-MM-DD"><Input value={form.alumno_fecha_nac} onChangeText={set('alumno_fecha_nac')} placeholder="2018-05-20" /></Field>
        <Field label="Nivel *">
          <Select value={form.nivel_id} onChange={set('nivel_id')} options={(niveles.data ?? []).map((n) => ({ value: n.id, label: n.nombre }))} />
        </Field>
        <Field label="Sala / grado / año"><Input value={form.anio_solicitado} onChangeText={set('anio_solicitado')} placeholder="Ej: 3.º grado" /></Field>
        <Field label="Servicios de interés">
          <Row>
            {opcionesServicios.map((sv) => (
              <Chip key={sv} label={sv} active={servicios.includes(sv)} onPress={() => setServicios(servicios.includes(sv) ? servicios.filter((x) => x !== sv) : [...servicios, sv])} />
            ))}
          </Row>
        </Field>
        <Field label="Comentarios"><Input value={form.comentarios} onChangeText={set('comentarios')} multiline /></Field>
        <Button title="Enviar solicitud" loading={busy} onPress={submit}
          disabled={!form.tutor_nombre || !form.tutor_email || !form.tutor_telefono || !form.alumno_nombre || !form.nivel_id} />
      </Card>
    </Screen>
  );
}
