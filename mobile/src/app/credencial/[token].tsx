// Verificacion de la credencial deportiva (lo mismo que muestra la web al escanear el QR).
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fecha } from '../../../../shared/format';
import { colors, radius } from '../../../../shared/theme';
import { Card, DataState, InfoRow, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { useData } from '../../lib/useData';

export default function Credencial() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data, loading, error } = useData(() => api.credencial(String(token)), [token]);

  return (
    <Screen>
      <DataState loading={loading} error={error}>
        {data && (
          <Card>
            <View style={{ alignItems: 'center', gap: 4, padding: 20, borderRadius: radius.lg, backgroundColor: data.habilitado ? colors.successSoft : colors.dangerSoft }}>
              <Ionicons name={data.habilitado ? 'checkmark-circle' : 'close-circle'} size={48} color={data.habilitado ? colors.success : colors.danger} />
              <Text style={{ fontSize: 22, fontWeight: '900', color: data.habilitado ? '#166534' : '#991b1b' }}>{data.habilitado ? 'HABILITADO' : 'NO HABILITADO'}</Text>
              <Text style={{ color: data.habilitado ? '#166534' : '#991b1b' }}>{data.habilitado ? 'Apto físico vigente' : 'Apto físico vencido o ausente'}</Text>
            </View>
            <InfoRow label="Alumno">{data.alumno}</InfoRow>
            <InfoRow label="Nivel">{data.nivel}</InfoRow>
            <InfoRow label="Apto vence">{fecha(data.apto_fisico_vence)}</InfoRow>
            <InfoRow label="Deportes">{data.deportes || 'Sin inscripciones'}</InfoRow>
          </Card>
        )}
      </DataState>
    </Screen>
  );
}
