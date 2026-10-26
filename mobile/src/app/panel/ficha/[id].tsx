// Enfermeria: edicion de la ficha medica y apto fisico (igual que /panel/fichas/:id en la web).
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { fecha, tonoApto, urlCredencial } from '../../../../../shared/format';
import { colors } from '../../../../../shared/theme';
import type { FichaMedica } from '../../../../../shared/types';
import { Badge, Button, Card, DataState, Feedback, Field, Input, PageHeader, Screen, styles } from '../../../components/ui';
import { SITE_URL, api } from '../../../lib/api';
import { useAction, useData } from '../../../lib/useData';

const campos: { key: keyof FichaMedica; label: string; date?: boolean; area?: boolean }[] = [
  { key: 'grupo_sanguineo', label: 'Grupo sanguíneo' },
  { key: 'obra_social', label: 'Obra social' },
  { key: 'nro_afiliado', label: 'N.º de afiliado' },
  { key: 'contacto_emergencia', label: 'Contacto de emergencia' },
  { key: 'telefono_emergencia', label: 'Teléfono de emergencia' },
  { key: 'apto_fisico_emision', label: 'Apto físico: emisión', date: true },
  { key: 'apto_fisico_vence', label: 'Apto físico: vencimiento', date: true },
  { key: 'apto_fisico_archivo', label: 'Enlace al certificado (opcional)' },
  { key: 'alergias', label: 'Alergias', area: true },
  { key: 'enfermedades_cronicas', label: 'Enfermedades crónicas', area: true },
  { key: 'medicacion', label: 'Medicación', area: true },
  { key: 'observaciones', label: 'Observaciones', area: true },
];

export default function FichaEditor() {
  const alumnoId = Number(useLocalSearchParams<{ id: string }>().id);
  const { data, loading, error, reload, setData } = useData(() => api.salud.ficha(alumnoId), [alumnoId]);
  const [form, setForm] = useState<Record<string, string>>({});
  const { busy, message, run, setMessage } = useAction();

  useEffect(() => {
    if (data) setForm(Object.fromEntries(campos.map((c) => [c.key, (data[c.key] as string | null) ?? ''])));
  }, [data]);

  return (
    <Screen>
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <PageHeader title={`${data.apellido}, ${data.nombre}`} subtitle={`DNI ${data.dni} · ${data.nivel ?? ''} · Nacimiento ${fecha(data.fecha_nacimiento)}`} />
            <Card title="Credencial QR" right={<Badge tone={tonoApto[data.estado_apto]}>{data.estado_apto}</Badge>}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                {data.qr_token && <QRCode value={urlCredencial(SITE_URL, data.qr_token)} size={150} color={colors.primaryDark} />}
                <Text style={styles.small}>Vence: {fecha(data.apto_fisico_vence)}</Text>
                {data.estado_apto !== 'Vigente' && <Text style={styles.warning}>Con el apto vencido o ausente, el sistema bloquea la inscripción a deportes.</Text>}
              </View>
            </Card>
            <Card title="Ficha médica">
              <Feedback message={message} onClose={() => setMessage(null)} />
              {campos.map((c) => (
                <Field key={c.key} label={c.label} hint={c.date ? 'Formato AAAA-MM-DD' : undefined}>
                  <Input value={form[c.key] ?? ''} onChangeText={(v) => setForm({ ...form, [c.key]: v })} multiline={c.area} autoCapitalize={c.date ? 'none' : 'sentences'} />
                </Field>
              ))}
              <Button title="Guardar ficha" loading={busy} onPress={() => run(async () => setData(await api.salud.guardar(alumnoId, form)), 'Ficha médica actualizada.')} />
            </Card>
          </>
        )}
      </DataState>
    </Screen>
  );
}
