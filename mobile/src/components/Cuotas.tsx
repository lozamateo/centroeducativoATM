// Cuotas mensuales en la app (igual que en la web). El pago es una simulación para el trabajo práctico.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DATOS_TRANSFERENCIA, fecha, fechaHora, mesCorto, pesos, tonoCuota } from '../../../shared/format';
import { colors, radius } from '../../../shared/theme';
import type { Cuota, CuotasAlumno, EstadoCuota, MetodoPago } from '../../../shared/types';
import { useAction, useData } from '../lib/useData';
import { Alert, Badge, Button, Card, DataState, Feedback, InfoRow, Sheet, styles } from './ui';

export interface CuotasConfig {
  cargar: () => Promise<CuotasAlumno>;
  pagar?: (periodo: string, metodo: MetodoPago) => Promise<unknown>;
  modo: 'familia' | 'admin' | 'lectura';
}

export const colorEstado: Record<EstadoCuota, string> = {
  Pagada: colors.success,
  Vencida: colors.danger,
  'En término': colors.accent,
  'Próxima': colors.borderStrong,
};

export function CuotasAlumnoVista({ config }: { config: CuotasConfig }) {
  const { data, loading, error, reload } = useData(config.cargar);
  const [aPagar, setAPagar] = useState<Cuota | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);

  return (
    <DataState loading={loading && !data} error={error} onRetry={reload}>
      {data && (
        <View style={{ gap: 14 }}>
          <View style={s.grid}>
            <Resumido titulo="Cuota mensual" valor={pesos(data.importe_mensual)}
              detalle={data.descuento_hermanos ? `Grupo familiar con ${data.hijos_en_el_colegio} hijos` : 'Tarifa general'} />
            <Resumido titulo="Estado" valor={data.adeuda_desde ? `Adeuda desde ${mesCorto(data.adeuda_desde)}` : 'Al día'}
              detalle={`${data.cuotas_vencidas} cuota(s) vencida(s)`} alerta={!!data.adeuda_desde} />
            <Resumido titulo="Total adeudado" valor={pesos(data.total_adeudado)} detalle="Se paga del 1 al 15 de cada mes" />
            <Resumido titulo="Cuotas pagadas" valor={`${data.pagadas} de ${data.cuotas.length}`} detalle="$ 40.000 · $ 30.000 c/u con 2+ hijos" />
          </View>

          {ultimo && <Alert tipo="ok" onClose={() => setUltimo(null)}>{ultimo}</Alert>}

          <Card title="Cuotas del período">
            <Text style={styles.small}>Pago simulado (trabajo académico).</Text>
            {data.cuotas.map((c) => (
              <View key={c.periodo} style={[s.linea, c.estado === 'Vencida' && s.vencida]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.titulo}>{c.mes} · {pesos(c.importe)}</Text>
                  <Text style={styles.small}>
                    {c.pago ? `Pagada el ${fechaHora(c.pago.fecha)} · ${c.pago.metodo} · ${c.pago.comprobante}` : `Vence el ${fecha(c.vence)}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge tone={tonoCuota[c.estado]}>{c.estado}</Badge>
                  {config.pagar && c.se_puede_pagar && (
                    <Button small title={config.modo === 'admin' ? 'Registrar pago' : 'Pagar'} onPress={() => setAPagar(c)} />
                  )}
                </View>
              </View>
            ))}
          </Card>

          {config.pagar && (
            <PagoSheet
              cuota={aPagar}
              alumno={data.alumno}
              modo={config.modo}
              onClose={() => setAPagar(null)}
              onPagar={async (metodo) => {
                const cuota = aPagar!;
                const res = (await config.pagar!(cuota.periodo, metodo)) as { comprobante?: string };
                setUltimo(`Pago registrado: ${cuota.mes} · ${pesos(cuota.importe)} · ${metodo}. Comprobante ${res?.comprobante ?? ''}.`);
                setAPagar(null);
                reload();
              }}
            />
          )}
        </View>
      )}
    </DataState>
  );
}

function Resumido({ titulo, valor, detalle, alerta }: { titulo: string; valor: string; detalle?: string; alerta?: boolean }) {
  return (
    <View style={[s.resumen, alerta && { borderColor: colors.danger }]}>
      <Text style={s.resumenLabel}>{titulo}</Text>
      <Text style={[s.resumenValor, alerta && { color: colors.danger }]}>{valor}</Text>
      {detalle ? <Text style={styles.small}>{detalle}</Text> : null}
    </View>
  );
}

function PagoSheet({ cuota, alumno, modo, onClose, onPagar }: {
  cuota: Cuota | null;
  alumno: string;
  modo: CuotasConfig['modo'];
  onClose: () => void;
  onPagar: (metodo: MetodoPago) => Promise<void>;
}) {
  const [metodo, setMetodo] = useState<MetodoPago>('Transferencia');
  const accion = useAction();

  return (
    <Sheet title={cuota ? `Pagar cuota de ${cuota.mes}` : 'Pagar cuota'} visible={!!cuota} onClose={() => { accion.setMessage(null); onClose(); }}
      footer={cuota && (
        <Button title={`Pagar ${pesos(cuota.importe)}`} icon="card-outline" loading={accion.busy} onPress={() => accion.run(() => onPagar(metodo))} />
      )}>
      {cuota && (
        <>
          <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
          <InfoRow label="Alumno">{alumno}</InfoRow>
          <InfoRow label="Cuota">{cuota.mes}</InfoRow>
          <InfoRow label="Vencimiento">{fecha(cuota.vence)}</InfoRow>
          <InfoRow label="Importe a pagar">{pesos(cuota.importe)}</InfoRow>
          <Text style={s.label}>Forma de pago</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['Transferencia', 'Efectivo'] as MetodoPago[]).map((m) => (
              <Pressable key={m} onPress={() => setMetodo(m)} accessibilityRole="radio" accessibilityState={{ checked: metodo === m }}
                style={[s.metodo, metodo === m && s.metodoActivo]}>
                <Ionicons name={m === 'Transferencia' ? 'business-outline' : 'cash-outline'} size={20} color={metodo === m ? colors.primary : colors.muted} />
                <Text style={[s.metodoTexto, metodo === m && { color: colors.primary }]}>{m}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.detalle}>
            {metodo === 'Transferencia' ? (
              <>
                <Text style={s.titulo}>Datos para transferir (ficticios)</Text>
                <Text style={styles.muted}>Alias: {DATOS_TRANSFERENCIA.alias}</Text>
                <Text style={styles.muted}>CBU: {DATOS_TRANSFERENCIA.cbu}</Text>
                <Text style={styles.muted}>Titular: {DATOS_TRANSFERENCIA.titular}</Text>
              </>
            ) : (
              <>
                <Text style={s.titulo}>Pago en efectivo</Text>
                <Text style={styles.muted}>
                  {modo === 'admin' ? 'Registrá el efectivo recibido en secretaría.' : 'Se abona en secretaría de lunes a viernes de 7:30 a 12:30.'}
                </Text>
              </>
            )}
          </View>
          <Text style={styles.small}>Este pago es una simulación para el trabajo práctico: no se realiza ningún movimiento de dinero real.</Text>
        </>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resumen: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 3 },
  resumenLabel: { color: colors.subtle, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  resumenValor: { color: colors.textStrong, fontSize: 15, fontWeight: '800' },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  vencida: { borderLeftWidth: 3, borderLeftColor: colors.danger, paddingLeft: 8 },
  titulo: { fontSize: 15, fontWeight: '700', color: colors.textStrong },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  metodo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border },
  metodoActivo: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  metodoTexto: { fontWeight: '700', color: colors.muted },
  detalle: { backgroundColor: colors.backgroundSoft, borderRadius: radius.md, padding: 12, gap: 4 },
});
