// Estructura academica: cursos, materias/idiomas y asignacion docente (RF-03 a RF-06).
import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Curso } from '../../../../shared/types';
import { confirmar } from '../../components/AlumnoVista';
import { FormSheet } from '../../components/FormSheet';
import { Badge, Button, Card, DataState, Empty, Feedback, ListItem, PageHeader, Row, Screen, Select, Sheet, Tabs, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { cursoFields, materiaFields, nivelOptions } from '../../lib/admin';
import { useAction, useData } from '../../lib/useData';

export default function Cursos() {
  const [tab, setTab] = useState<'cursos' | 'materias'>('cursos');
  return (
    <Screen>
      <PageHeader title="Cursos y materias" subtitle="Ciclo lectivo 2027." />
      <Tabs tabs={[{ key: 'cursos', label: 'Cursos' }, { key: 'materias', label: 'Materias e idiomas' }]} active={tab} onChange={setTab} />
      {tab === 'cursos' ? <ListaCursos /> : <ListaMaterias />}
    </Screen>
  );
}

function ListaCursos() {
  const [nivel, setNivel] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.cursos({ nivel_id: nivel ? Number(nivel) : undefined }), [nivel]);
  const [editar, setEditar] = useState<Curso | 'nuevo' | null>(null);
  const [materias, setMaterias] = useState<Curso | null>(null);
  const accion = useAction();

  return (
    <>
      <Row style={{ flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}>
          <Select value={nivel} onChange={setNivel} placeholder="Todos los niveles" options={[{ value: '', label: 'Todos los niveles' }, ...nivelOptions]} />
        </View>
        <Button title="Nuevo" icon="add" onPress={() => setEditar('nuevo')} />
      </Row>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((c) => (
            <View key={c.id}>
              <ListItem title={`${c.nivel} · ${c.anio} ${c.division}`} subtitle={c.turno}
                right={<Badge tone={c.inscriptos >= c.cupo ? 'danger' : 'success'}>{c.inscriptos} / {c.cupo}</Badge>} />
              <Row style={{ justifyContent: 'flex-end' }}>
                <Button title="Materias" icon="book-outline" variant="ghost" small onPress={() => setMaterias(c)} />
                <Button title="Editar" icon="create-outline" variant="ghost" small onPress={() => setEditar(c)} />
                <Button title="Eliminar" icon="trash-outline" variant="ghost" small
                  onPress={() => confirmar(`¿Eliminar ${c.anio} ${c.division}?`, () => accion.run(() => api.admin.eliminarCurso(c.id), 'Curso eliminado.').then((ok) => { if (ok) reload(); }))} />
              </Row>
            </View>
          )) : <Empty texto="No hay cursos." />}
        </Card>
      </DataState>
      <FormSheet title={editar === 'nuevo' ? 'Nuevo curso' : 'Editar curso'} visible={editar !== null}
        fields={editar === 'nuevo' ? cursoFields : cursoFields.slice(1)} initial={editar === 'nuevo' ? { cupo: 25, turno: 'Jornada extendida' } : editar}
        onClose={() => setEditar(null)}
        onSubmit={async (payload) => {
          if (editar === 'nuevo') await api.admin.crearCurso(payload);
          else if (editar) await api.admin.actualizarCurso(editar.id, payload);
          reload();
        }} />
      {materias && <MateriasCurso curso={materias} onClose={() => setMaterias(null)} />}
    </>
  );
}

function MateriasCurso({ curso, onClose }: { curso: Curso; onClose: () => void }) {
  const { data, reload } = useData(() => api.admin.materiasCurso(curso.id), [curso.id]);
  const profesores = useData(() => api.admin.profesores());
  const accion = useAction();
  const opciones = [{ value: '', label: 'A designar' }, ...(profesores.data ?? []).map((p) => ({ value: p.id, label: `${p.apellido}, ${p.nombre}` }))];

  return (
    <Sheet title={`Materias de ${curso.anio} ${curso.division}`} visible onClose={onClose}>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      {(data ?? []).map((m) => (
        <View key={m.id} style={{ gap: 6 }}>
          <Row><Text style={{ fontWeight: '700' }}>{m.nombre}</Text>{m.es_idioma && <Badge tone="info">Idioma</Badge>}<Text style={styles.small}>{m.carga_horaria_semanal ?? '-'} h</Text></Row>
          <Select value={m.profesor_id ?? ''} options={opciones} placeholder="Docente"
            onChange={(v) => accion.run(() => api.admin.asignarProfesor(m.id, v ? Number(v) : null), 'Docente asignado.').then(reload)} />
        </View>
      ))}
    </Sheet>
  );
}

function ListaMaterias() {
  const { data, loading, error, reload } = useData(() => api.admin.materias());
  const [nueva, setNueva] = useState(false);
  const accion = useAction();
  return (
    <>
      <Button title="Nueva materia" icon="add" onPress={() => setNueva(true)} />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((m) => (
            <ListItem key={m.id} title={m.nombre} subtitle={`${m.nivel} · ${m.carga_horaria_semanal ?? '-'} h semanales`}
              right={
                <Row>
                  {m.es_idioma && <Badge tone="info">Idioma</Badge>}
                  <Button title="" icon="trash-outline" variant="ghost" small
                    onPress={() => confirmar(`¿Eliminar ${m.nombre}?`, () => accion.run(() => api.admin.eliminarMateria(m.id), 'Materia eliminada.').then((ok) => { if (ok) reload(); }))} />
                </Row>
              } />
          )) : <Empty texto="No hay materias." />}
        </Card>
      </DataState>
      <FormSheet title="Nueva materia" visible={nueva} fields={materiaFields} initial={{ es_idioma: false }} onClose={() => setNueva(false)}
        onSubmit={async (payload) => { await api.admin.crearMateria(payload); reload(); }} />
    </>
  );
}
