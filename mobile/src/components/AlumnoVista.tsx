// Vista del alumno compartida por familias, alumnos y secretaria (igual que en la web).
// Si se reciben las acciones, permite inscribir y dar de baja.
import { useState } from 'react';
import { Alert as NativeAlert, Platform, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { DIAS_CORTOS, MODALIDADES_COMEDOR, dias, fecha, hora, horarios, tonoApto, urlCredencial } from '../../../shared/format';
import { colors, radius } from '../../../shared/theme';
import type { DetalleAlumno, ModalidadComedor, OpcionesInscripcion } from '../../../shared/types';
import { SITE_URL } from '../lib/api';
import { useAction } from '../lib/useData';
import { Badge, Button, Card, Chip, Empty, Feedback, Field, InfoRow, Input, Row, Select, Tabs, styles } from './ui';

export interface Acciones {
  opciones: OpcionesInscripcion | null;
  matricular: (cursoId: number) => Promise<unknown>;
  inscribirDeporte: (comisionId: number) => Promise<unknown>;
  bajaDeporte: (inscripcionId: number) => Promise<unknown>;
  inscribirTransporte: (recorridoId: number, parada: string) => Promise<unknown>;
  bajaTransporte: (inscripcionId: number) => Promise<unknown>;
  inscribirComedor: (data: { modalidad: ModalidadComedor; dias: number[]; dieta_especial: string }) => Promise<unknown>;
  bajaComedor: (inscripcionId: number) => Promise<unknown>;
}

type TabKey = 'resumen' | 'academico' | 'deportes' | 'servicios' | 'salud';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'academico', label: 'Matrícula' },
  { key: 'deportes', label: 'Deportes' },
  { key: 'servicios', label: 'Transporte y comedor' },
  { key: 'salud', label: 'Salud y credencial' },
];

// Confirmacion antes de una baja (en la web del navegador se usa window.confirm).
export function confirmar(mensaje: string, accion: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(mensaje)) accion();
    return;
  }
  NativeAlert.alert('Confirmar', mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Confirmar', style: 'destructive', onPress: accion },
  ]);
}

export function AlumnoVista({ alumno, acciones, onCambio }: { alumno: DetalleAlumno; acciones?: Acciones; onCambio?: () => void }) {
  const [tab, setTab] = useState<TabKey>('resumen');
  const accion = useAction();
  const ejecutar = async (fn: () => Promise<unknown>, ok: string) => {
    if (await accion.run(fn, ok)) onCambio?.();
  };
  const props = { alumno, acciones, ejecutar, busy: accion.busy };

  return (
    <View style={{ gap: 14 }}>
      <Tabs tabs={tabs} active={tab} onChange={(k) => { setTab(k); accion.setMessage(null); }} />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      {tab === 'resumen' && <Resumen alumno={alumno} />}
      {tab === 'academico' && <Academico {...props} />}
      {tab === 'deportes' && <Deportes {...props} />}
      {tab === 'servicios' && <Servicios {...props} />}
      {tab === 'salud' && <Salud alumno={alumno} />}
    </View>
  );
}

interface SeccionProps {
  alumno: DetalleAlumno;
  acciones?: Acciones;
  ejecutar: (fn: () => Promise<unknown>, ok: string) => Promise<void>;
  busy: boolean;
}

function Resumen({ alumno }: { alumno: DetalleAlumno }) {
  const bloques = alumno.deportes.flatMap((d) => d.horarios.map((h) => ({ ...h, deporte: d.deporte })));
  return (
    <View style={{ gap: 14 }}>
      <View style={s.summaryGrid}>
        <Resumido titulo="Curso" valor={alumno.matricula?.curso ?? 'Sin matrícula'} detalle={alumno.matricula ? `Comprobante ${alumno.matricula.comprobante}` : 'Pendiente de matricular'} />
        <Resumido titulo="Deportes" valor={alumno.deportes.length ? alumno.deportes.map((d) => d.deporte).join(', ') : 'Sin deportes'} detalle={`${alumno.deportes.length} de 2 permitidos`} />
        <Resumido titulo="Transporte" valor={alumno.transporte?.recorrido ?? 'Sin transporte'} detalle={alumno.transporte?.parada ?? undefined} />
        <Resumido titulo="Comedor" valor={alumno.comedor?.modalidad ?? 'Sin comedor'} detalle={alumno.comedor ? dias(alumno.comedor.dias) : undefined} />
      </View>
      <Card title="Datos personales">
        <InfoRow label="Alumno">{alumno.alumno}</InfoRow>
        <InfoRow label="DNI">{alumno.dni}</InfoRow>
        <InfoRow label="Nacimiento">{fecha(alumno.fecha_nacimiento)}</InfoRow>
        <InfoRow label="Nivel">{alumno.nivel}</InfoRow>
        <InfoRow label="Tutores">{alumno.tutores}</InfoRow>
        <InfoRow label="Apto físico"><Badge tone={tonoApto[alumno.estado_apto]}>{alumno.estado_apto}</Badge></InfoRow>
      </Card>
      {bloques.length > 0 && (
        <Card title="Agenda semanal de deportes">
          {[1, 2, 3, 4, 5, 6].filter((d) => bloques.some((b) => b.dia_semana === d)).map((d) => (
            <InfoRow key={d} label={DIAS_CORTOS[d]}>
              {bloques.filter((b) => b.dia_semana === d).map((b) => `${b.deporte} ${hora(b.hora_inicio)}-${hora(b.hora_fin)}`).join(' · ')}
            </InfoRow>
          ))}
        </Card>
      )}
    </View>
  );
}

const Resumido = ({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) => (
  <View style={s.summary}>
    <Text style={s.summaryLabel}>{titulo}</Text>
    <Text style={s.summaryValue}>{valor}</Text>
    {detalle ? <Text style={styles.small}>{detalle}</Text> : null}
  </View>
);

function Academico({ alumno, acciones, ejecutar, busy }: SeccionProps) {
  const [cursoId, setCursoId] = useState('');
  const cursos = acciones?.opciones?.cursos ?? [];
  return (
    <View style={{ gap: 14 }}>
      {alumno.matricula ? (
        <Card title="Matrícula del ciclo lectivo" right={<Badge tone="success">{alumno.matricula.estado}</Badge>}>
          <InfoRow label="Curso">{alumno.matricula.curso}</InfoRow>
          <InfoRow label="Turno">{alumno.matricula.turno}</InfoRow>
          <InfoRow label="Comprobante">{alumno.matricula.comprobante}</InfoRow>
          <InfoRow label="Fecha">{fecha(alumno.matricula.created_at)}</InfoRow>
        </Card>
      ) : acciones ? (
        <Card title="Matricular al ciclo lectivo">
          <Text style={styles.muted}>Elegí el curso. Las materias se asignan automáticamente y se emite un comprobante.</Text>
          <Field label="Curso">
            <Select value={cursoId} onChange={setCursoId} placeholder="Seleccionar curso"
              options={cursos.map((c) => ({ value: c.id, label: `${c.anio} ${c.division} - ${c.turno} (${c.cupo - c.inscriptos} vacantes)`, disabled: c.inscriptos >= c.cupo }))} />
          </Field>
          <Button title="Confirmar matrícula" disabled={!cursoId} loading={busy} onPress={() => ejecutar(() => acciones.matricular(Number(cursoId)), 'Matrícula registrada correctamente.')} />
        </Card>
      ) : (
        <Empty texto="Todavía no tiene matrícula en el ciclo lectivo." />
      )}
      <Card title="Materias e idiomas">
        {alumno.materias.length ? (
          alumno.materias.map((m) => (
            <View key={m.nombre} style={s.line}>
              <Row><Text style={s.lineTitle}>{m.nombre}</Text>{m.es_idioma && <Badge tone="info">Idioma</Badge>}</Row>
              <Text style={styles.small}>{m.profesor ?? 'Docente a designar'}</Text>
            </View>
          ))
        ) : (
          <Empty texto="Las materias se muestran al completar la matrícula." />
        )}
      </Card>
    </View>
  );
}

function Deportes({ alumno, acciones, ejecutar, busy }: SeccionProps) {
  const comisiones = acciones?.opciones?.comisiones ?? [];
  return (
    <View style={{ gap: 14 }}>
      <Card title={`Deportes inscriptos (${alumno.deportes.length} de 2)`}>
        {alumno.deportes.length ? (
          alumno.deportes.map((d) => (
            <View key={d.id} style={s.line}>
              <Text style={s.lineTitle}>{d.deporte}</Text>
              <Text style={styles.small}>{d.comision} · {horarios(d.horarios)}</Text>
              {acciones && (
                <Button title="Dar de baja" variant="ghost" small icon="trash-outline" loading={busy} style={{ alignSelf: 'flex-start' }}
                  onPress={() => confirmar(`¿Dar de baja ${d.deporte}?`, () => ejecutar(() => acciones.bajaDeporte(d.id), 'Baja registrada.'))} />
              )}
            </View>
          ))
        ) : (
          <Empty texto="Sin deportes inscriptos." />
        )}
      </Card>
      {acciones && (
        <Card title="Inscribir a un deporte">
          {alumno.estado_apto !== 'Vigente' && (
            <Text style={styles.warning}>El apto físico está {alumno.estado_apto.toLowerCase()}. Presentalo en enfermería para habilitar la inscripción.</Text>
          )}
          {comisiones.map((c) => (
            <View key={c.id} style={[s.option, !c.disponible && { backgroundColor: colors.background }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.lineTitle, !c.disponible && { color: colors.subtle }]}>{c.deporte}</Text>
                <Text style={styles.small}>{horarios(c.horarios)}</Text>
                <Text style={styles.small}>{c.profesor ?? 'Profesor a designar'} · {c.cupo - c.inscriptos} lugares</Text>
              </View>
              {c.disponible ? (
                <Button title="Inscribir" small loading={busy} onPress={() => ejecutar(() => acciones.inscribirDeporte(c.id), `Inscripción a ${c.deporte} confirmada.`)} />
              ) : (
                <View style={{ maxWidth: '45%' }}><Badge>{c.motivo}</Badge></View>
              )}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function Servicios({ alumno, acciones, ejecutar, busy }: SeccionProps) {
  const [recorrido, setRecorrido] = useState('');
  const [parada, setParada] = useState('');
  const [modalidad, setModalidad] = useState<ModalidadComedor>('Almuerzo');
  const [diasSel, setDiasSel] = useState([1, 2, 3, 4, 5]);
  const [dieta, setDieta] = useState('');
  const recorridos = acciones?.opciones?.recorridos ?? [];
  const transporte = alumno.transporte;
  const comedor = alumno.comedor;

  return (
    <View style={{ gap: 14 }}>
      <Card title="Transporte escolar">
        {transporte ? (
          <>
            <InfoRow label="Recorrido">{transporte.recorrido}</InfoRow>
            <InfoRow label="Parada">{transporte.parada}</InfoRow>
            <InfoRow label="Horarios">{`Ida ${hora(transporte.horario_ida)} · Vuelta ${hora(transporte.horario_vuelta)}`}</InfoRow>
            <InfoRow label="Comprobante">{transporte.comprobante}</InfoRow>
            {acciones && (
              <Button title="Dar de baja" variant="outline" loading={busy}
                onPress={() => confirmar('¿Dar de baja el transporte?', () => ejecutar(() => acciones.bajaTransporte(transporte.id), 'Transporte dado de baja.'))} />
            )}
          </>
        ) : acciones ? (
          <>
            <Field label="Recorrido">
              <Select value={recorrido} onChange={setRecorrido} placeholder="Seleccionar uno de los 4 recorridos"
                options={recorridos.map((r) => ({ value: r.id, label: `${r.nombre} - ${r.zona}`, disabled: r.inscriptos >= r.capacidad }))} />
            </Field>
            {recorrido ? <Text style={styles.small}>Paradas: {recorridos.find((r) => r.id === Number(recorrido))?.paradas}</Text> : null}
            <Field label="Parada"><Input value={parada} onChangeText={setParada} placeholder="Ej: Av. Alvear 1500" /></Field>
            <Button title="Adherir al transporte" disabled={!recorrido} loading={busy} onPress={() => ejecutar(() => acciones.inscribirTransporte(Number(recorrido), parada), 'Adhesión al transporte registrada.')} />
          </>
        ) : (
          <Empty texto="No usa transporte escolar." />
        )}
      </Card>

      <Card title="Comedor">
        {comedor ? (
          <>
            <InfoRow label="Modalidad">{comedor.modalidad}</InfoRow>
            <InfoRow label="Días">{dias(comedor.dias)}</InfoRow>
            <InfoRow label="Dieta especial">{comedor.dieta_especial}</InfoRow>
            {acciones && (
              <Button title="Dar de baja" variant="outline" loading={busy}
                onPress={() => confirmar('¿Dar de baja el comedor?', () => ejecutar(() => acciones.bajaComedor(comedor.id), 'Comedor dado de baja.'))} />
            )}
          </>
        ) : acciones ? (
          <>
            <Field label="Modalidad">
              <Select value={modalidad} onChange={(v) => setModalidad(v as ModalidadComedor)} options={MODALIDADES_COMEDOR.map((m) => ({ value: m, label: m }))} />
            </Field>
            <Field label="Días">
              <Row>
                {[1, 2, 3, 4, 5].map((d) => (
                  <Chip key={d} label={DIAS_CORTOS[d]} active={diasSel.includes(d)} onPress={() => setDiasSel(diasSel.includes(d) ? diasSel.filter((x) => x !== d) : [...diasSel, d].sort())} />
                ))}
              </Row>
            </Field>
            <Field label="Dieta especial (opcional)"><Input value={dieta} onChangeText={setDieta} multiline /></Field>
            <Button title="Inscribir al comedor" disabled={!diasSel.length} loading={busy}
              onPress={() => ejecutar(() => acciones.inscribirComedor({ modalidad, dias: diasSel, dieta_especial: dieta }), 'Inscripción al comedor registrada.')} />
          </>
        ) : (
          <Empty texto="No está inscripto al comedor." />
        )}
      </Card>
    </View>
  );
}

function Salud({ alumno }: { alumno: DetalleAlumno }) {
  const ficha = alumno.ficha;
  const habilitado = alumno.estado_apto === 'Vigente';
  return (
    <View style={{ gap: 14 }}>
      <Card title="Credencial deportiva">
        <View style={[s.credential, { borderColor: habilitado ? colors.success : colors.danger, backgroundColor: habilitado ? colors.successSoft : colors.dangerSoft }]}>
          <Text style={[s.credentialHead, { color: habilitado ? '#166534' : '#991b1b' }]}>{habilitado ? 'Habilitado para deportes' : 'No habilitado'}</Text>
          {ficha?.qr_token && (
            <View style={s.qr}>
              <QRCode value={urlCredencial(SITE_URL, ficha.qr_token)} size={170} color={colors.primaryDark} backgroundColor="#ffffff" />
            </View>
          )}
          <Text style={s.lineTitle}>{alumno.alumno}</Text>
          <Text style={styles.small}>DNI {alumno.dni} · {alumno.nivel}</Text>
          <Text style={styles.small}>Apto vence: {fecha(alumno.apto_fisico_vence)}</Text>
        </View>
      </Card>
      <Card title="Ficha médica">
        {ficha ? (
          <>
            <InfoRow label="Grupo sanguíneo">{ficha.grupo_sanguineo}</InfoRow>
            <InfoRow label="Alergias">{ficha.alergias}</InfoRow>
            <InfoRow label="Medicación">{ficha.medicacion}</InfoRow>
            <InfoRow label="Obra social">{ficha.obra_social}</InfoRow>
            <InfoRow label="Contacto de emergencia">{[ficha.contacto_emergencia, ficha.telefono_emergencia].filter(Boolean).join(' ')}</InfoRow>
            <InfoRow label="Apto físico"><Badge tone={tonoApto[alumno.estado_apto]}>{alumno.estado_apto}</Badge></InfoRow>
          </>
        ) : (
          <Empty texto="Enfermería todavía no cargó la ficha médica." />
        )}
        <Text style={styles.small}>Para actualizar estos datos o el apto físico, acercate a enfermería.</Text>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summary: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 3 },
  summaryLabel: { color: colors.subtle, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { color: colors.textStrong, fontSize: 15, fontWeight: '700' },
  line: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 3 },
  lineTitle: { fontSize: 15, fontWeight: '700', color: colors.textStrong },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  credential: { alignItems: 'center', gap: 6, padding: 18, borderRadius: radius.lg, borderWidth: 2 },
  credentialHead: { fontWeight: '800', fontSize: 15 },
  qr: { padding: 8, backgroundColor: '#fff', borderRadius: 8, marginVertical: 6 },
});
