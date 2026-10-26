// Listados de inscripciones con bajas (para inscribir: ficha del alumno > Inscripciones).
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { dias, fecha } from '../../../../shared/format';
import { confirmar } from '../../components/AlumnoVista';
import { Badge, Button, Card, DataState, Empty, Feedback, ListItem, Screen, Select, Tabs, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useData } from '../../lib/useData';

type TabKey = 'matriculas' | 'deportes' | 'transporte' | 'comedor';

export default function Inscripciones() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('matriculas');
  const alumnos = useData(() => api.admin.alumnos());

  return (
    <Screen>
      <Card title="Inscribir alumno">
        <Text style={styles.muted}>Matrícula, deportes, transporte y comedor con validación automática de reglas.</Text>
        <Select value="" placeholder="Seleccionar alumno" onChange={(id) => router.push(`/panel/alumno/${id}`)}
          options={(alumnos.data ?? []).filter((a) => a.activo).map((a) => ({ value: a.id, label: `${a.apellido}, ${a.nombre} - ${a.nivel}` }))} />
      </Card>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'matriculas', label: 'Matrículas' },
        { key: 'deportes', label: 'Deportes' },
        { key: 'transporte', label: 'Transporte' },
        { key: 'comedor', label: 'Comedor' },
      ]} />
      {tab === 'matriculas' && <Matriculas />}
      {tab === 'deportes' && <Lista cargar={api.admin.inscripcionesDeporte} baja={api.admin.bajaDeporte}
        fila={(i) => ({ titulo: i.alumno, detalle: `${i.deporte} · ${i.comision} · desde ${fecha(i.created_at)}` })} />}
      {tab === 'transporte' && <Lista cargar={api.admin.transporte} baja={api.admin.bajaTransporte}
        fila={(t) => ({ titulo: t.alumno, detalle: `${t.recorrido} · ${t.parada ?? 'sin parada'} · ${t.comprobante}` })} />}
      {tab === 'comedor' && <Lista cargar={api.admin.comedor} baja={api.admin.bajaComedor}
        fila={(c) => ({ titulo: c.alumno, detalle: `${c.modalidad} · ${dias(c.dias)}${c.dieta_especial ? ` · ${c.dieta_especial}` : ''}` })} />}
    </Screen>
  );
}

function Matriculas() {
  const cursos = useData(() => api.admin.cursos());
  const [curso, setCurso] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.matriculas({ curso_id: curso ? Number(curso) : undefined }), [curso]);
  const accion = useAction();
  return (
    <>
      <Select value={curso} onChange={setCurso} placeholder="Todos los cursos"
        options={[{ value: '', label: 'Todos los cursos' }, ...(cursos.data ?? []).map((c) => ({ value: c.id, label: `${c.nivel} - ${c.anio} ${c.division}` }))]} />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((m) => (
            <View key={m.id}>
              <ListItem title={m.alumno} subtitle={`${m.curso} · ${m.comprobante} · ${fecha(m.created_at)}`}
                right={<Badge tone={m.estado === 'Activa' ? 'success' : 'neutral'}>{m.estado}</Badge>} />
              {m.estado !== 'Baja' && (
                <Button title="Dar de baja" variant="ghost" small icon="trash-outline" style={{ alignSelf: 'flex-end' }}
                  onPress={() => confirmar(`¿Dar de baja la matrícula de ${m.alumno}?`, () => accion.run(() => api.admin.bajaMatricula(m.id), 'Matrícula dada de baja.').then((ok) => { if (ok) reload(); }))} />
              )}
            </View>
          )) : <Empty texto="No hay matrículas." />}
        </Card>
      </DataState>
    </>
  );
}

function Lista<T extends { id: number; alumno: string }>({ cargar, baja, fila }: { cargar: () => Promise<T[]>; baja: (id: number) => Promise<unknown>; fila: (item: T) => { titulo: string; detalle: string } }) {
  const { data, loading, error, reload } = useData(cargar);
  const accion = useAction();
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <Card>
        {data?.length ? data.map((item) => {
          const f = fila(item);
          return (
            <ListItem key={item.id} title={f.titulo} subtitle={f.detalle}
              right={<Button title="Baja" variant="ghost" small icon="trash-outline"
                onPress={() => confirmar(`¿Dar de baja a ${item.alumno}?`, () => accion.run(() => baja(item.id), 'Baja registrada.').then((ok) => { if (ok) reload(); }))} />} />
          );
        }) : <Empty texto="No hay inscripciones." />}
      </Card>
    </DataState>
  );
}
