// Auditoria: trazabilidad de altas, modificaciones y bajas.
import { fechaHora } from '../../../../shared/format';
import { Badge, Card, DataState, Empty, ListItem, PageHeader, Screen } from '../../components/ui';
import type { Tone } from '../../components/ui';
import { api } from '../../lib/api';
import { useData } from '../../lib/useData';

const tonos: Record<string, Tone> = { INSERT: 'success', UPDATE: 'info', DELETE: 'danger' };

export default function Auditoria() {
  const { data, loading, error, reload } = useData(() => api.admin.auditoria());
  return (
    <Screen>
      <PageHeader title="Auditoría" subtitle="Cada operación queda registrada con usuario y fecha." />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((a) => (
            <ListItem key={a.id} title={`${a.tabla.replace(/_/g, ' ')} #${a.registro_id ?? '-'}`} subtitle={`${a.usuario} · ${fechaHora(a.fecha)}`}
              right={<Badge tone={tonos[a.operacion]}>{a.operacion}</Badge>} />
          )) : <Empty texto="Sin registros." />}
        </Card>
      </DataState>
    </Screen>
  );
}
