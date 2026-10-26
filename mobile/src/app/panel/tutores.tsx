// Familias: padres, madres y tutores.
import { useState } from 'react';
import { View } from 'react-native';
import type { Tutor } from '../../../../shared/types';
import { confirmar } from '../../components/AlumnoVista';
import { FormSheet } from '../../components/FormSheet';
import { Badge, Button, Card, DataState, Empty, Feedback, Input, ListItem, PageHeader, Row, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { tutorFields } from '../../lib/admin';
import { useAction, useData } from '../../lib/useData';

export default function Tutores() {
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.tutores({ buscar: filtro }), [filtro]);
  const [editar, setEditar] = useState<Tutor | 'nuevo' | null>(null);
  const accion = useAction();

  return (
    <Screen>
      <PageHeader title="Familias" subtitle="Vinculalos a sus hijos desde la ficha del alumno." right={<Button title="Nuevo" icon="add" small onPress={() => setEditar('nuevo')} />} />
      <Row style={{ flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}><Input value={buscar} onChangeText={setBuscar} placeholder="DNI o apellido" onSubmitEditing={() => setFiltro(buscar)} /></View>
        <Button title="Buscar" icon="search" variant="outline" onPress={() => setFiltro(buscar)} />
      </Row>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((t) => (
            <View key={t.id}>
              <ListItem title={`${t.apellido}, ${t.nombre}`} subtitle={`DNI ${t.dni} · ${t.telefono ?? ''}\nHijos: ${t.hijos ?? 'sin vincular'}`}
                right={<Badge tone={t.usuario_id ? 'success' : 'neutral'}>{t.usuario_id ? 'Con acceso' : 'Sin acceso'}</Badge>} onPress={() => setEditar(t)} />
              <Row style={{ justifyContent: 'flex-end' }}>
                <Button title="Eliminar" icon="trash-outline" variant="ghost" small
                  onPress={() => confirmar(`¿Eliminar a ${t.nombre} ${t.apellido}?`, () => accion.run(() => api.admin.eliminarTutor(t.id), 'Tutor eliminado.').then((ok) => { if (ok) reload(); }))} />
              </Row>
            </View>
          )) : <Empty texto="No hay tutores cargados." />}
        </Card>
      </DataState>
      <FormSheet title={editar === 'nuevo' ? 'Nuevo tutor' : 'Editar tutor'} visible={editar !== null} fields={tutorFields}
        initial={editar === 'nuevo' ? null : editar} onClose={() => setEditar(null)}
        onSubmit={async (payload) => {
          if (editar === 'nuevo') await api.admin.crearTutor(payload);
          else if (editar) await api.admin.actualizarTutor(editar.id, payload);
          reload();
        }} />
    </Screen>
  );
}
