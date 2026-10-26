// Legajos de alumnos (RF-07).
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { edad } from '../../../../shared/format';
import { FormSheet } from '../../components/FormSheet';
import { Badge, Button, Card, DataState, Empty, Input, ListItem, PageHeader, Row, Screen, Select } from '../../components/ui';
import { api } from '../../lib/api';
import { alumnoFields, nivelOptions } from '../../lib/admin';
import { useData } from '../../lib/useData';

export default function Alumnos() {
  const router = useRouter();
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState({ buscar: '', nivel_id: '' });
  const [nuevo, setNuevo] = useState(false);
  const { data, loading, error, reload } = useData(
    () => api.admin.alumnos({ buscar: filtro.buscar, nivel_id: filtro.nivel_id ? Number(filtro.nivel_id) : undefined }),
    [filtro.buscar, filtro.nivel_id],
  );

  return (
    <Screen>
      <PageHeader title="Alumnos" subtitle="Legajos y vínculo familiar." right={<Button title="Nuevo" icon="add" small onPress={() => setNuevo(true)} />} />
      <Input value={buscar} onChangeText={setBuscar} placeholder="Buscar por DNI o apellido" returnKeyType="search" onSubmitEditing={() => setFiltro({ ...filtro, buscar })} />
      <Row style={{ flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}>
          <Select value={filtro.nivel_id} onChange={(nivel_id) => setFiltro({ buscar, nivel_id })} placeholder="Todos los niveles"
            options={[{ value: '', label: 'Todos los niveles' }, ...nivelOptions]} />
        </View>
        <Button title="Buscar" icon="search" variant="outline" onPress={() => setFiltro({ ...filtro, buscar })} />
      </Row>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((a) => (
            <ListItem key={a.id} title={`${a.apellido}, ${a.nombre}`} subtitle={`DNI ${a.dni} · ${edad(a.fecha_nacimiento)} años · ${a.nivel ?? ''} · ${a.curso ?? 'Sin matrícula'}`}
              right={!a.activo ? <Badge>Inactivo</Badge> : !a.curso ? <Badge tone="warning">Sin matrícula</Badge> : undefined}
              onPress={() => router.push(`/panel/alumno/${a.id}`)} />
          )) : <Empty texto="No se encontraron alumnos." />}
        </Card>
      </DataState>
      <FormSheet title="Nuevo alumno" visible={nuevo} fields={alumnoFields} initial={{ activo: true }} onClose={() => setNuevo(false)}
        onSubmit={async (payload) => { await api.admin.crearAlumno(payload); reload(); }} />
    </Screen>
  );
}
