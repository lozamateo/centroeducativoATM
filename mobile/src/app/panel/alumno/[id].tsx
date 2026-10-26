// Ficha del alumno para secretaria: datos, vinculo familiar (RF-08) e inscripciones (RF-09 a RF-13).
import { useState } from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fecha } from '../../../../../shared/format';
import { AlumnoVista, confirmar } from '../../../components/AlumnoVista';
import type { Acciones } from '../../../components/AlumnoVista';
import { FormSheet } from '../../../components/FormSheet';
import { Badge, Button, Card, DataState, Empty, Feedback, Field, InfoRow, ListItem, PageHeader, Row, Screen, Select, Tabs, styles } from '../../../components/ui';
import { api } from '../../../lib/api';
import { alumnoFields, parentescos } from '../../../lib/admin';
import { useAction, useData } from '../../../lib/useData';

export default function AlumnoAdmin() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const router = useRouter();
  const [tab, setTab] = useState<'datos' | 'inscripciones'>('datos');
  const alumno = useData(() => api.admin.alumno(id), [id]);
  const detalle = useData(() => api.admin.detalleAlumno(id), [id]);
  const opciones = useData(() => api.admin.opcionesAlumno(id), [id]);
  const tutores = useData(() => api.admin.tutores());
  const [editar, setEditar] = useState(false);
  const [vinculo, setVinculo] = useState({ tutor_id: '', parentesco: 'Madre' });
  const accion = useAction();
  const recargar = () => { alumno.reload(); detalle.reload(); opciones.reload(); };

  const acciones: Acciones = {
    opciones: opciones.data,
    matricular: (cursoId) => api.admin.matricular(id, cursoId),
    inscribirDeporte: (comisionId) => api.admin.inscribirDeporte(id, comisionId),
    bajaDeporte: (inscripcionId) => api.admin.bajaDeporte(inscripcionId),
    inscribirTransporte: (recorridoId, parada) => api.admin.inscribirTransporte(id, recorridoId, parada),
    bajaTransporte: (inscripcionId) => api.admin.bajaTransporte(inscripcionId),
    inscribirComedor: (data) => api.admin.inscribirComedor({ alumno_id: id, ...data }),
    bajaComedor: (inscripcionId) => api.admin.bajaComedor(inscripcionId),
  };

  const a = alumno.data;
  return (
    <Screen>
      <Stack.Screen options={{ title: a ? `${a.nombre} ${a.apellido}` : 'Alumno' }} />
      <DataState loading={alumno.loading && !a} error={alumno.error} onRetry={alumno.reload}>
        {a && (
          <>
            <PageHeader title={`${a.apellido}, ${a.nombre}`} subtitle={`DNI ${a.dni} · ${a.nivel ?? ''}`} />
            <Tabs tabs={[{ key: 'datos', label: 'Datos y familia' }, { key: 'inscripciones', label: 'Inscripciones' }]} active={tab} onChange={setTab} />
            <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
            {tab === 'datos' ? (
              <>
                <Card title="Datos personales" right={<Badge tone={a.activo ? 'success' : 'neutral'}>{a.activo ? 'Activo' : 'Inactivo'}</Badge>}>
                  <InfoRow label="Nacimiento">{fecha(a.fecha_nacimiento)}</InfoRow>
                  <InfoRow label="Género">{a.genero}</InfoRow>
                  <InfoRow label="Dirección">{a.direccion}</InfoRow>
                  <Row>
                    <Button title="Editar" icon="create-outline" variant="outline" small onPress={() => setEditar(true)} />
                    <Button title="Eliminar" icon="trash-outline" variant="ghost" small
                      onPress={() => confirmar(`¿Eliminar el legajo de ${a.nombre} ${a.apellido}? Se borran también sus inscripciones.`,
                        () => accion.run(() => api.admin.eliminarAlumno(id)).then((ok) => { if (ok) router.back(); }))} />
                  </Row>
                </Card>
                <Card title="Tutores vinculados">
                  {a.tutores?.length ? a.tutores.map((t) => (
                    <ListItem key={t.id} title={`${t.apellido}, ${t.nombre}`} subtitle={`${t.parentesco} · ${t.telefono ?? ''}`}
                      right={<Button title="Desvincular" variant="ghost" small onPress={() => accion.run(() => api.admin.desvincularTutor(id, t.id), 'Vínculo eliminado.').then((ok) => { if (ok) recargar(); })} />} />
                  )) : <Empty texto="Sin tutores vinculados." />}
                  <Text style={styles.sectionTitle}>Vincular tutor</Text>
                  <Field label="Tutor">
                    <Select value={vinculo.tutor_id} onChange={(tutor_id) => setVinculo({ ...vinculo, tutor_id })} placeholder="Seleccionar tutor"
                      options={(tutores.data ?? []).map((t) => ({ value: t.id, label: `${t.apellido}, ${t.nombre} (DNI ${t.dni})` }))} />
                  </Field>
                  <Field label="Parentesco">
                    <Select value={vinculo.parentesco} onChange={(parentesco) => setVinculo({ ...vinculo, parentesco })} options={parentescos} />
                  </Field>
                  <Button title="Vincular" icon="link-outline" disabled={!vinculo.tutor_id} loading={accion.busy}
                    onPress={() => accion.run(() => api.admin.vincularTutor(id, { tutor_id: Number(vinculo.tutor_id), parentesco: vinculo.parentesco, es_responsable: true }), 'Tutor vinculado.')
                      .then((ok) => { if (ok) recargar(); })} />
                </Card>
              </>
            ) : (
              <DataState loading={detalle.loading && !detalle.data} error={detalle.error} onRetry={detalle.reload}>
                {detalle.data && <AlumnoVista alumno={detalle.data} acciones={acciones} onCambio={recargar} />}
              </DataState>
            )}
            <FormSheet title="Editar alumno" visible={editar} fields={alumnoFields} initial={a} onClose={() => setEditar(false)}
              onSubmit={async (payload) => { await api.admin.actualizarAlumno(id, payload); recargar(); }} />
          </>
        )}
      </DataState>
    </Screen>
  );
}
