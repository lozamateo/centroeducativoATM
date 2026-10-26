// Portal de familias: detalle e inscripciones de un hijo (igual que /panel/hijos/:id en la web).
import { Stack, useLocalSearchParams } from 'expo-router';
import { AlumnoVista } from '../../../components/AlumnoVista';
import type { Acciones } from '../../../components/AlumnoVista';
import { DataState, PageHeader, Screen } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useData } from '../../../lib/useData';

export default function Hijo() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const detalle = useData(() => api.familia.hijo(id), [id]);
  const opciones = useData(() => api.familia.opciones(id), [id]);
  const recargar = () => { detalle.reload(); opciones.reload(); };

  const acciones: Acciones = {
    opciones: opciones.data,
    matricular: (cursoId) => api.familia.matricular(id, cursoId),
    inscribirDeporte: (comisionId) => api.familia.inscribirDeporte(id, comisionId),
    bajaDeporte: (inscripcionId) => api.familia.bajaDeporte(id, inscripcionId),
    inscribirTransporte: (recorridoId, parada) => api.familia.inscribirTransporte(id, recorridoId, parada),
    bajaTransporte: (inscripcionId) => api.familia.bajaTransporte(id, inscripcionId),
    inscribirComedor: (data) => api.familia.inscribirComedor(id, data),
    bajaComedor: (inscripcionId) => api.familia.bajaComedor(id, inscripcionId),
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: detalle.data?.alumno.split(', ')[1] ?? 'Alumno' }} />
      <DataState loading={detalle.loading && !detalle.data} error={detalle.error} onRetry={detalle.reload}>
        {detalle.data && (
          <>
            <PageHeader title={detalle.data.alumno} subtitle={`${detalle.data.nivel ?? ''} · ${detalle.data.curso ?? 'Sin matrícula'}`} />
            <AlumnoVista alumno={detalle.data} acciones={acciones} onCambio={recargar} />
          </>
        )}
      </DataState>
    </Screen>
  );
}
