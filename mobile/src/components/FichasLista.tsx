import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { fecha, tonoApto } from '../../../shared/format';
import { api } from '../lib/api';
import { useData } from '../lib/useData';
import { Badge, Button, Card, DataState, Empty, Input, ListItem, PageHeader, Row, Screen, Select } from './ui';

// Enfermeria (y vista de solo lectura para administracion).
export function FichasLista({ soloLectura = false, saludo }: { soloLectura?: boolean; saludo?: ReactNode }) {
  const router = useRouter();
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState({ buscar: '', estado: '' });
  const { data, loading, error, reload } = useData(() => api.salud.fichas(filtro), [filtro.buscar, filtro.estado]);

  return (
    <Screen>
      {saludo}
      <PageHeader title={soloLectura ? 'Aptos físicos' : 'Fichas médicas'} subtitle="Buscá al alumno por DNI o apellido." />
      <Input value={buscar} onChangeText={setBuscar} placeholder="DNI o apellido" returnKeyType="search" onSubmitEditing={() => setFiltro({ ...filtro, buscar })} />
      <Row style={{ flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}>
          <Select value={filtro.estado} onChange={(estado) => setFiltro({ buscar, estado })} placeholder="Todos los estados"
            options={[{ value: '', label: 'Todos los estados' }, { value: 'Vigente', label: 'Vigente' }, { value: 'Vencido', label: 'Vencido' }, { value: 'Sin apto', label: 'Sin apto' }]} />
        </View>
        <Button title="Buscar" icon="search" variant="outline" onPress={() => setFiltro({ ...filtro, buscar })} />
      </Row>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((f) => (
            <ListItem key={f.alumno_id} title={f.alumno} subtitle={`DNI ${f.dni} · ${f.nivel ?? ''} · Vence ${fecha(f.apto_fisico_vence)}`}
              right={<Badge tone={tonoApto[f.estado_apto]}>{f.estado_apto}</Badge>}
              onPress={soloLectura ? undefined : () => router.push(`/panel/ficha/${f.alumno_id}`)} />
          )) : <Empty texto="No se encontraron alumnos." />}
        </Card>
      </DataState>
    </Screen>
  );
}

