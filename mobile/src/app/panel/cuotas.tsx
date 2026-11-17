// Cuotas: quién adeuda y desde qué mes (igual que /panel/cuotas en la web).
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { mesCorto, pesos } from '../../../../shared/format';
import { colors } from '../../../../shared/theme';
import { CuotasAlumnoVista, colorEstado } from '../../components/Cuotas';
import { Badge, Card, Chip, DataState, Empty, ListItem, PageHeader, Row, Screen, Select, Sheet, StatCard, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { useData } from '../../lib/useData';

export default function Cuotas() {
  const niveles = useData(() => api.niveles());
  const [nivel, setNivel] = useState('');
  const [soloDeudores, setSoloDeudores] = useState(false);
  const { data, loading, error, reload } = useData(
    () => api.admin.cuotas({ nivel_id: nivel ? Number(nivel) : undefined, solo_deudores: soloDeudores }),
    [nivel, soloDeudores],
  );
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  const fila = data?.filas.find((f) => f.alumno_id === alumnoId);

  return (
    <Screen>
      <PageHeader title="Cuotas" subtitle="$ 40.000 por mes ($ 30.000 por hijo con 2 o más hijos). Se paga del 1 al 15." />
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        {data && (
          <>
            <View style={s.grid}>
              <StatCard label="Alumnos al día" value={data.resumen.al_dia} icon="checkmark-circle-outline" tone="success" />
              <StatCard label="Alumnos con deuda" value={data.resumen.con_deuda} icon="alert-circle-outline" tone="danger" />
              <StatCard label="Total adeudado" value={pesos(data.resumen.total_adeudado)} icon="cash-outline" tone="warning" />
              <StatCard label="Cobrado este mes" value={pesos(data.resumen.cobrado_mes_actual)} icon="wallet-outline" />
            </View>
            <Card title="Filtros">
              <Select value={nivel} onChange={setNivel} placeholder="Todos los niveles"
                options={[{ value: '', label: 'Todos los niveles' }, ...(niveles.data ?? []).map((n) => ({ value: n.id, label: n.nombre }))]} />
              <Row><Chip label="Solo deudores" active={soloDeudores} onPress={() => setSoloDeudores(!soloDeudores)} /></Row>
              <View style={s.leyenda}>
                {Object.entries(colorEstado).map(([estado, color]) => (
                  <View key={estado} style={s.leyendaItem}><View style={[s.dot, { backgroundColor: color }]} /><Text style={styles.small}>{estado}</Text></View>
                ))}
              </View>
            </Card>
            <Card title={`Alumnos (${data.filas.length})`}>
              {data.filas.length ? data.filas.map((f) => (
                <View key={f.alumno_id} style={s.fila}>
                  <ListItem
                    title={f.alumno}
                    subtitle={`${f.curso ?? f.nivel ?? ''} · ${pesos(f.importe_mensual)}${f.total_adeudado ? ` · Debe ${pesos(f.total_adeudado)}` : ''}`}
                    right={f.adeuda_desde ? <Badge tone="danger">Desde {mesCorto(f.adeuda_desde)}</Badge> : <Badge tone="success">Al día</Badge>}
                    onPress={() => setAlumnoId(f.alumno_id)}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.meses}>
                    {f.meses.map((m) => (
                      <View key={m.periodo} style={s.mes} accessibilityLabel={`${mesCorto(m.periodo)}: ${m.estado}`}>
                        <View style={[s.dot, { backgroundColor: colorEstado[m.estado] }]} />
                        <Text style={s.mesTexto}>{mesCorto(m.periodo)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )) : <Empty texto="No hay alumnos con cuotas adeudadas." />}
            </Card>
          </>
        )}
      </DataState>
      <Sheet title={`Cuotas de ${fila?.alumno ?? 'alumno'}`} visible={alumnoId !== null} onClose={() => { setAlumnoId(null); reload(); }}>
        {alumnoId !== null && (
          <CuotasAlumnoVista key={alumnoId} config={{
            modo: 'admin',
            cargar: () => api.admin.cuotasAlumno(alumnoId),
            pagar: (periodo, metodo) => api.admin.pagarCuota(alumnoId, periodo, metodo),
          }} />
        )}
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  fila: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  meses: { gap: 10, paddingHorizontal: 4 },
  mes: { alignItems: 'center', gap: 3 },
  mesTexto: { fontSize: 10, color: colors.subtle },
});
