// Pagos (administración): deudores y facturas del mes, y valores de cada servicio (igual que /panel/pagos en la web).
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { nombreMes, pesos, tonoFactura } from '../../../../shared/format';
import { PagosAlumnoVista } from '../../components/Pagos';
import { Badge, Button, Card, DataState, Empty, Feedback, Input, ListItem, PageHeader, Screen, Select, Sheet, StatCard, Tabs, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useData } from '../../lib/useData';

export default function Pagos() {
  const [tab, setTab] = useState<'facturacion' | 'tarifas'>('facturacion');
  return (
    <Screen>
      <PageHeader title="Pagos" subtitle="Las familias pagan por transferencia y adjuntan el comprobante. Los reportes completos están en la web." />
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'facturacion', label: 'Facturación y deudores' }, { key: 'tarifas', label: 'Tarifas' }]} />
      {tab === 'facturacion' ? <Facturacion /> : <Tarifas />}
    </Screen>
  );
}

function Facturacion() {
  const [periodo, setPeriodo] = useState('');
  const { data, loading, error, reload } = useData(() => api.admin.facturacion({ periodo: periodo || undefined }), [periodo]);
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  return (
    <DataState loading={loading && !data} error={error} onRetry={reload}>
      {data && (
        <>
          <View style={s.grid}>
            <StatCard label={`Facturado ${nombreMes(data.periodo)}`} value={pesos(data.resumen.facturado)} icon="receipt-outline" />
            <StatCard label="Cobrado del período" value={pesos(data.resumen.cobrado)} icon="cash-outline" tone="success" />
            <StatCard label="Pagadas / incompletas / impagas" value={`${data.resumen.pagadas} / ${data.resumen.incompletas} / ${data.resumen.impagas}`} icon="checkmark-circle-outline" />
            <StatCard label="Deuda vencida total" value={pesos(data.resumen.deuda_vencida)} icon="alert-circle-outline" tone="danger" />
          </View>
          <Card title="Deudores (adeudan desde)">
            {data.deudores.length ? data.deudores.map((d) => (
              <ListItem key={d.alumno_id} title={d.alumno} subtitle={`${d.legajo} · ${d.facturas} factura(s) · ${pesos(d.total_adeudado)}`}
                right={<Badge tone="danger">{d.adeuda_desde_mes}</Badge>} onPress={() => setAlumnoId(d.alumno_id)} />
            )) : <Empty texto="No hay deuda vencida." />}
          </Card>
          <Card title={`Facturas de ${nombreMes(data.periodo)}`}>
            <Select value={data.periodo} onChange={setPeriodo} placeholder="Mes"
              options={[...new Set([...data.periodos, data.periodo])].sort().map((p) => ({ value: p, label: nombreMes(p) }))} />
            {data.facturas.map((f) => (
              <ListItem key={f.id} title={f.alumno} subtitle={`${f.numero} · Total ${pesos(f.total)} · Saldo ${pesos(f.saldo)}`}
                right={<Badge tone={tonoFactura[f.estado]}>{f.estado}</Badge>} onPress={() => setAlumnoId(f.alumno_id)} />
            ))}
          </Card>
        </>
      )}
      <Sheet title="Estado de cuenta" visible={alumnoId !== null} onClose={() => setAlumnoId(null)}>
        {alumnoId !== null && <PagosAlumnoVista key={alumnoId} config={{ cargar: (rango) => api.admin.cuentaAlumno(alumnoId, rango) }} />}
      </Sheet>
    </DataState>
  );
}

function Tarifas() {
  const { data, loading, error, reload, setData } = useData(() => api.admin.tarifas());
  const [valores, setValores] = useState<Record<string, string>>({});
  const accion = useAction();
  const fila = (tipo: 'general' | 'deporte' | 'recorrido', clave: string | number, nombre: string, actual: number) => {
    const k = `${tipo}-${clave}`;
    const valor = valores[k] ?? String(actual);
    return (
      <View key={k} style={s.fila}>
        <Text style={s.nombre}>{nombre}</Text>
        <View style={s.editor}>
          <View style={{ flex: 1 }}><Input value={valor} keyboardType="number-pad" onChangeText={(v) => setValores({ ...valores, [k]: v.replace(/\D/g, '') })} /></View>
          <Button title="Guardar" small disabled={Number(valor) === actual || !valor} loading={accion.busy} onPress={() => accion.run(async () => {
            setData(await api.admin.actualizarTarifa(tipo, clave, Number(valor)));
            setValores((v) => { const c = { ...v }; delete c[k]; return c; });
          }, 'Valor actualizado. Se aplica a las próximas facturas.')} />
        </View>
      </View>
    );
  };
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <Text style={styles.muted}>El administrador solo define los valores; los cambios se aplican a las próximas facturas.</Text>
      {data && (
        <>
          <Card title="Cuota y comedor">{data.generales.map((t) => fila('general', t.clave, t.descripcion, t.importe))}</Card>
          <Card title="Deportes">{data.deportes.map((d) => fila('deporte', d.id, d.nombre, d.precio_mensual))}</Card>
          <Card title="Transporte">{data.recorridos.map((r) => fila('recorrido', r.id, r.nombre, r.precio_mensual))}</Card>
        </>
      )}
    </DataState>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fila: { gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  nombre: { fontWeight: '700', color: '#111827' },
  editor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
