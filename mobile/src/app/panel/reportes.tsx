// Motor de reportes gerenciales MIS con exportacion a PDF (RF-16 a RF-21).
import { useState } from 'react';
import { Text, View } from 'react-native';
import { DIAS, dias, fecha, tonoApto } from '../../../../shared/format';
import { colors } from '../../../../shared/theme';
import { Badge, Button, Card, DataState, Empty, InfoRow, ListItem, Row, Screen, Select, Tabs, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { exportarPdf } from '../../lib/pdf';
import { useData } from '../../lib/useData';

type TabKey = 'transporte' | 'curso' | 'deportes' | 'comedor' | 'alumno';

export default function Reportes() {
  const [tab, setTab] = useState<TabKey>('transporte');
  return (
    <Screen>
      <Text style={styles.muted}>Información consolidada para la toma de decisiones. Todos los reportes se exportan en PDF.</Text>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'transporte', label: 'Padrón de transporte' },
        { key: 'curso', label: 'Padrón por curso' },
        { key: 'deportes', label: 'Deportes' },
        { key: 'comedor', label: 'Comedor' },
        { key: 'alumno', label: 'Ficha 360' },
      ]} />
      {tab === 'transporte' && <PadronTransporte />}
      {tab === 'curso' && <PadronCurso />}
      {tab === 'deportes' && <OcupacionDeportes />}
      {tab === 'comedor' && <Comedor />}
      {tab === 'alumno' && <Ficha360 />}
    </Screen>
  );
}

const BotonPdf = ({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) => (
  <Button title="Exportar PDF" icon="document-outline" variant="outline" small onPress={onPress} disabled={disabled} />
);

function PadronTransporte() {
  const recorridos = useData(() => api.recorridos());
  const [recorrido, setRecorrido] = useState('1');
  const { data, loading, error, reload } = useData(() => api.admin.padronTransporte(recorrido ? Number(recorrido) : undefined), [recorrido]);
  const nombre = recorridos.data?.find((r) => r.id === Number(recorrido))?.nombre ?? 'Todos los recorridos';
  return (
    <>
      <Select value={recorrido} onChange={setRecorrido} options={[{ value: '', label: 'Todos' }, ...(recorridos.data ?? []).map((r) => ({ value: r.id, label: r.nombre }))]} />
      <Card title={`Pasajeros: ${nombre}`} right={<BotonPdf disabled={!data?.length} onPress={() => exportarPdf({
        titulo: `Padrón logístico de transporte - ${nombre}`,
        columnas: ['Recorrido', 'Alumno', 'DNI', 'Curso', 'Parada', 'Contacto'],
        filas: (data ?? []).map((f) => [f.recorrido, f.alumno, f.dni, f.curso, f.parada, f.contacto]),
      })} />}>
        <DataState loading={loading} error={error} onRetry={reload}>
          {data?.length ? data.map((f) => (
            <ListItem key={`${f.recorrido_id}-${f.alumno_id}`} title={f.alumno} subtitle={`${f.curso} · Parada: ${f.parada ?? '-'}\n${f.contacto ?? ''}`} />
          )) : <Empty texto="El recorrido no tiene pasajeros." />}
        </DataState>
      </Card>
    </>
  );
}

function PadronCurso() {
  const cursos = useData(() => api.admin.cursos());
  const [curso, setCurso] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.padronCurso(curso ? Number(curso) : undefined), [curso]);
  return (
    <>
      <Select value={curso} onChange={setCurso} placeholder="Todos los cursos"
        options={[{ value: '', label: 'Todos los cursos' }, ...(cursos.data ?? []).map((c) => ({ value: c.id, label: `${c.nivel} - ${c.anio} ${c.division}` }))]} />
      <Card title="Padrón por curso" right={<BotonPdf disabled={!data?.length} onPress={() => exportarPdf({
        titulo: 'Padrón por curso',
        columnas: ['Nivel', 'Curso', 'Alumno', 'DNI', 'Comprobante'],
        filas: (data ?? []).map((f) => [f.nivel, f.curso, f.alumno, f.dni, f.comprobante]),
      })} />}>
        <DataState loading={loading} error={error} onRetry={reload}>
          {data?.length ? data.map((f) => (
            <ListItem key={`${f.curso_id}-${f.alumno_id}`} title={f.alumno} subtitle={`${f.nivel} · ${f.curso} · DNI ${f.dni}`} />
          )) : <Empty texto="Sin alumnos matriculados." />}
        </DataState>
      </Card>
    </>
  );
}

function OcupacionDeportes() {
  const { data, loading, error, reload } = useData(() => api.admin.ocupacionDeportes());
  return (
    <Card title="Ocupación de comisiones" right={<BotonPdf disabled={!data?.length} onPress={() => exportarPdf({
      titulo: 'Ocupación de deportes',
      columnas: ['Deporte', 'Comisión', 'Nivel', 'Inscriptos', 'Cupo', 'Ocupación'],
      filas: (data ?? []).map((f) => [f.deporte, f.comision, f.nivel, f.inscriptos, f.cupo, `${f.ocupacion}%`]),
    })} />}>
      <DataState loading={loading} error={error} onRetry={reload}>
        {(data ?? []).map((f) => (
          <View key={`${f.deporte}-${f.comision}`} style={{ gap: 4, paddingVertical: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700' }}>{f.deporte} · {f.nivel}</Text>
              <Text style={styles.small}>{f.inscriptos} / {f.cupo}</Text>
            </Row>
            <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.backgroundSoft, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(f.ocupacion, 100)}%`, height: '100%', backgroundColor: colors.accent }} />
            </View>
          </View>
        ))}
      </DataState>
    </Card>
  );
}

function Comedor() {
  const { data, loading, error, reload } = useData(() => api.admin.reporteComedor());
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <>
          <Card title="Raciones por día">
            {[1, 2, 3, 4, 5].map((d) => <InfoRow key={d} label={DIAS[d]}>{String(data.por_dia.find((x) => x.dia === d)?.raciones ?? 0)}</InfoRow>)}
          </Card>
          <Card title="Comensales" right={<BotonPdf disabled={!data.detalle.length} onPress={() => exportarPdf({
            titulo: 'Comedor - comensales',
            columnas: ['Alumno', 'DNI', 'Modalidad', 'Días', 'Dieta especial', 'Alergias'],
            filas: data.detalle.map((f) => [f.alumno, f.dni, f.modalidad, dias(f.dias), f.dieta_especial, f.alergias]),
          })} />}>
            {data.detalle.map((f) => (
              <ListItem key={f.dni} title={f.alumno} subtitle={`${f.modalidad} · ${dias(f.dias)}${f.dieta_especial ? ` · ${f.dieta_especial}` : ''}`}
                right={f.alergias && f.alergias !== 'Ninguna' ? <Badge tone="danger">{f.alergias}</Badge> : undefined} />
            ))}
          </Card>
        </>
      )}
    </DataState>
  );
}

function Ficha360() {
  const { data, loading, error, reload } = useData(() => api.admin.reporteAlumnos());
  const [id, setId] = useState('');
  const a = data?.find((x) => x.alumno_id === Number(id));
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Select value={id} onChange={setId} placeholder="Seleccionar alumno" options={(data ?? []).map((x) => ({ value: x.alumno_id, label: `${x.alumno} - DNI ${x.dni}` }))} />
      {a && (
        <Card title={a.alumno} right={<BotonPdf onPress={() => exportarPdf({
          titulo: `Ficha integral - ${a.alumno}`,
          columnas: ['Dato', 'Valor'],
          filas: [
            ['DNI', a.dni], ['Nacimiento', fecha(a.fecha_nacimiento)], ['Nivel', a.nivel], ['Curso', a.curso], ['Tutores', a.tutores],
            ['Deportes', a.deportes], ['Transporte', a.transporte], ['Comedor', a.comedor], ['Grupo sanguíneo', a.grupo_sanguineo],
            ['Alergias', a.alergias], ['Apto físico', `${a.estado_apto} (vence ${fecha(a.apto_fisico_vence)})`],
          ],
        })} />}>
          <InfoRow label="DNI">{a.dni}</InfoRow>
          <InfoRow label="Nacimiento">{fecha(a.fecha_nacimiento)}</InfoRow>
          <InfoRow label="Nivel">{a.nivel}</InfoRow>
          <InfoRow label="Curso">{a.curso}</InfoRow>
          <InfoRow label="Tutores">{a.tutores}</InfoRow>
          <InfoRow label="Deportes">{a.deportes}</InfoRow>
          <InfoRow label="Transporte">{a.transporte}</InfoRow>
          <InfoRow label="Comedor">{a.comedor}</InfoRow>
          <InfoRow label="Grupo sanguíneo">{a.grupo_sanguineo}</InfoRow>
          <InfoRow label="Alergias">{a.alergias}</InfoRow>
          <InfoRow label="Apto físico"><Badge tone={tonoApto[a.estado_apto]}>{a.estado_apto}</Badge></InfoRow>
        </Card>
      )}
    </DataState>
  );
}
