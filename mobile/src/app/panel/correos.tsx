// Correos que el sistema envió a la familia: recordatorio del último día hábil y aviso de deuda del día 20 (simulados).
import { useState } from 'react';
import { Text } from 'react-native';
import { fechaHora, pesos } from '../../../../shared/format';
import type { Notificacion } from '../../../../shared/types';
import { Badge, Card, DataState, Empty, ListItem, PageHeader, Screen, Sheet, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { useData } from '../../lib/useData';

export default function Correos() {
  const { data, loading, error, reload } = useData(() => api.familia.correos());
  const [abierto, setAbierto] = useState<Notificacion | null>(null);
  return (
    <Screen>
      <PageHeader title="Correos recibidos" subtitle="Correos simulados del sistema: no se envían mails reales." />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((n) => (
            <ListItem key={n.id} title={n.asunto} subtitle={`${n.tipo} · ${fechaHora(n.enviado_en)}`} icon="mail-outline"
              right={n.total ? <Badge tone={n.tipo === 'Aviso de deuda' ? 'danger' : 'info'}>{pesos(n.total)}</Badge> : undefined}
              onPress={() => setAbierto(n)} />
          )) : <Empty texto="Todavía no recibiste correos." />}
        </Card>
      </DataState>
      <Sheet title={abierto?.asunto ?? ''} visible={!!abierto} onClose={() => setAbierto(null)}>
        {abierto && (
          <>
            <Text style={styles.small}>{abierto.tipo} · {fechaHora(abierto.enviado_en)}</Text>
            <Text style={{ fontSize: 15, lineHeight: 22 }}>{abierto.cuerpo}</Text>
            {abierto.factura_ids.length > 0 && (
              <Text style={styles.small}>Adjuntos: {abierto.factura_ids.map((id) => `Factura FC-${String(id).padStart(6, '0')}.pdf`).join(', ')} (se descargan desde la web).</Text>
            )}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
