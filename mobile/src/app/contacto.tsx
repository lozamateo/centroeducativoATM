import { useState } from 'react';
import { Linking } from 'react-native';
import { institucion } from '../../../shared/theme';
import { Button, Card, Feedback, Field, Input, InfoRow, Screen } from '../components/ui';
import { api } from '../lib/api';
import { useAction } from '../lib/useData';

const inicial = { nombre: '', email: '', telefono: '', asunto: '', mensaje: '' };

export default function Contacto() {
  const [form, setForm] = useState(inicial);
  const { busy, message, run, setMessage } = useAction();
  const set = (field: keyof typeof inicial) => (value: string) => setForm({ ...form, [field]: value });

  async function submit() {
    if (await run(() => api.enviarContacto(form), 'Gracias por escribirnos. Te responderemos a la brevedad.')) setForm(inicial);
  }

  return (
    <Screen>
      <Card title="Datos del centro">
        <InfoRow label="Dirección">{institucion.direccion}</InfoRow>
        <InfoRow label="Teléfono">{institucion.telefono}</InfoRow>
        <InfoRow label="Email">{institucion.email}</InfoRow>
        <Button title="Llamar" variant="outline" icon="call-outline" onPress={() => Linking.openURL(`tel:${institucion.telefono.replace(/\D/g, '')}`)} />
      </Card>
      <Card title="Envianos un mensaje">
        <Feedback message={message} onClose={() => setMessage(null)} />
        <Field label="Nombre *"><Input value={form.nombre} onChangeText={set('nombre')} /></Field>
        <Field label="Email *"><Input value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" /></Field>
        <Field label="Teléfono"><Input value={form.telefono} onChangeText={set('telefono')} keyboardType="phone-pad" /></Field>
        <Field label="Asunto *"><Input value={form.asunto} onChangeText={set('asunto')} /></Field>
        <Field label="Mensaje *"><Input value={form.mensaje} onChangeText={set('mensaje')} multiline maxLength={2000} /></Field>
        <Button title="Enviar mensaje" loading={busy} onPress={submit} disabled={!form.nombre || !form.email || !form.asunto || !form.mensaje} />
      </Card>
    </Screen>
  );
}
