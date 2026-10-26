// Cuerpo docente (RF-06).
import { useState } from 'react';
import { View } from 'react-native';
import type { Profesor } from '../../../../shared/types';
import { confirmar } from '../../components/AlumnoVista';
import { FormSheet } from '../../components/FormSheet';
import { Badge, Button, Card, DataState, Empty, Feedback, ListItem, PageHeader, Row, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { profesorFields } from '../../lib/admin';
import { useAction, useData } from '../../lib/useData';

export default function Docentes() {
  const { data, loading, error, reload } = useData(() => api.admin.profesores());
  const [editar, setEditar] = useState<Profesor | 'nuevo' | null>(null);
  const accion = useAction();

  return (
    <Screen>
      <PageHeader title="Cuerpo docente" subtitle="Materias desde Cursos; comisiones desde Deportes." right={<Button title="Nuevo" icon="add" small onPress={() => setEditar('nuevo')} />} />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((p) => (
            <View key={p.id}>
              <ListItem title={`${p.apellido}, ${p.nombre}`} subtitle={`${p.especialidad ?? 'Sin especialidad'} · ${p.materias_asignadas} materias · ${p.comisiones_a_cargo} comisiones`}
                right={<Badge tone={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>} onPress={() => setEditar(p)} />
              <Row style={{ justifyContent: 'flex-end' }}>
                <Button title="Eliminar" icon="trash-outline" variant="ghost" small
                  onPress={() => confirmar(`¿Eliminar a ${p.nombre} ${p.apellido}?`, () => accion.run(() => api.admin.eliminarProfesor(p.id), 'Docente eliminado.').then((ok) => { if (ok) reload(); }))} />
              </Row>
            </View>
          )) : <Empty texto="No hay docentes cargados." />}
        </Card>
      </DataState>
      <FormSheet title={editar === 'nuevo' ? 'Nuevo docente' : 'Editar docente'} visible={editar !== null} fields={profesorFields}
        initial={editar === 'nuevo' ? { activo: true } : editar} onClose={() => setEditar(null)}
        onSubmit={async (payload) => {
          if (editar === 'nuevo') await api.admin.crearProfesor(payload);
          else if (editar) await api.admin.actualizarProfesor(editar.id, payload);
          reload();
        }} />
    </Screen>
  );
}
