// Pagos en la app (igual que en la web): facturas y comprobantes por período, historial de deuda por ítem
// y pago por transferencia eligiendo ítems y adjuntando el comprobante. Simulación para el trabajo práctico.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { DATOS_TRANSFERENCIA, fecha, fechaHora, nombreMes, pesos, tonoFactura } from '../../../shared/format';
import { colors, radius } from '../../../shared/theme';
import type { CuentaAlumno, Factura, PagoRegistrado } from '../../../shared/types';
import { useAction, useData } from '../lib/useData';
import { Alert, Badge, Button, Card, DataState, Empty, Feedback, Field, InfoRow, Input, Select, Sheet, Tabs, styles } from './ui';

export interface PagosConfig {
  cargar: (rango: { desde?: string; hasta?: string }) => Promise<CuentaAlumno>;
  // Sin "pagar" la vista es de consulta (alumno y administración).
  pagar?: (facturaId: number, data: Record<string, unknown>) => Promise<PagoRegistrado>;
}

const TIPOS = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_BYTES = 2 * 1024 * 1024;
const hoyAr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// Meses para filtrar: desde agosto 2026 hasta el mes próximo.
function meses() {
  const lista: string[] = [];
  const fin = new Date();
  fin.setMonth(fin.getMonth() + 1);
  const limite = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}`;
  let [a, m] = [2026, 8];
  for (;;) {
    const p = `${a}-${String(m).padStart(2, '0')}`;
    lista.push(p);
    if (p >= limite) break;
    m += 1;
    if (m > 12) { m = 1; a += 1; }
  }
  return lista;
}

// Lee el archivo elegido y lo devuelve en base64 (funciona en Android, iOS y web).
async function aBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(blob);
  });
}

export function PagosAlumnoVista({ config }: { config: PagosConfig }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [vista, setVista] = useState<'facturas' | 'deuda'>('facturas');
  const { data, loading, error, reload } = useData(() => config.cargar({ desde: desde || undefined, hasta: hasta || undefined }), [desde, hasta]);
  const [aPagar, setAPagar] = useState<{ factura: Factura; itemIds: number[] } | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const opciones = [{ value: '', label: 'Todos' }, ...meses().map((p) => ({ value: p, label: nombreMes(p) }))];

  return (
    <DataState loading={loading && !data} error={error} onRetry={reload}>
      {data && (
        <View style={{ gap: 14 }}>
          <View style={s.grid}>
            <Resumido titulo="Deuda vencida" valor={pesos(data.deuda.total_adeudado)} alerta={data.deuda.total_adeudado > 0}
              detalle={data.deuda.adeuda_desde ? `Desde ${nombreMes(data.deuda.adeuda_desde)}` : 'Sin deuda vencida'} />
            <Resumido titulo="A vencer" valor={pesos(data.deuda.a_vencer)} detalle="Del 1 al 15 de cada mes" />
            <Resumido titulo="Cuota" valor={data.descuento_hermanos ? 'Con descuento' : 'Tarifa general'}
              detalle={data.descuento_hermanos ? `${data.hijos_en_el_colegio} hijos en el centro` : 'Un hijo en el centro'} />
            <Resumido titulo="Forma de pago" valor="Transferencia" detalle="Sin pagos en efectivo" />
          </View>
          {ultimo && <Alert tipo="ok" onClose={() => setUltimo(null)}>{ultimo}</Alert>}
          <Tabs active={vista} onChange={setVista} tabs={[{ key: 'facturas', label: 'Facturas y comprobantes' }, { key: 'deuda', label: 'Historial de deuda' }]} />

          {vista === 'facturas' ? (
            <>
              <Card title="Período">
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Field label="Desde"><Select value={desde} onChange={setDesde} options={opciones} placeholder="Desde" /></Field></View>
                  <View style={{ flex: 1 }}><Field label="Hasta"><Select value={hasta} onChange={setHasta} options={opciones} placeholder="Hasta" /></Field></View>
                </View>
              </Card>
              {data.facturas.length ? data.facturas.map((f) => (
                <FacturaCard key={f.id} factura={f} puedePagar={!!config.pagar} onPagar={(itemIds) => setAPagar({ factura: f, itemIds })} />
              )) : <Empty texto="No hay facturas en el período elegido." />}
            </>
          ) : (
            <HistorialDeuda cuenta={data} />
          )}

          {config.pagar && (
            <PagoSheet
              pedido={aPagar}
              onClose={() => setAPagar(null)}
              onPagar={async (body) => {
                const pago = await config.pagar!(aPagar!.factura.id, body);
                setUltimo(`Pago registrado. Comprobante de pago ${pago.recibo} por ${pesos(pago.importe)} (factura ${pago.factura}).`);
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

function FacturaCard({ factura: f, puedePagar, onPagar }: { factura: Factura; puedePagar: boolean; onPagar: (ids: number[]) => void }) {
  const pendientes = f.items.filter((i) => !i.pago_id);
  const [sel, setSel] = useState<number[]>(() => pendientes.map((i) => i.id));
  const total = f.items.filter((i) => sel.includes(i.id)).reduce((t, i) => t + i.importe, 0);
  const alternar = (id: number) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  return (
    <Card title={`${f.mes} · ${f.numero}`} right={<Badge tone={tonoFactura[f.estado]}>{f.estado}</Badge>}>
      <Text style={styles.small}>Vence el {fecha(f.vence)} · Total {pesos(f.total)} · Pagado {pesos(f.pagado)} · Saldo {pesos(f.saldo)}</Text>
      {f.items.map((i) => {
        const elegible = puedePagar && !i.pago_id;
        const marcado = sel.includes(i.id);
        return (
          <Pressable key={i.id} disabled={!elegible} onPress={() => alternar(i.id)} accessibilityRole={elegible ? 'checkbox' : undefined}
            accessibilityState={elegible ? { checked: marcado } : undefined} style={s.item}>
            {elegible && <Ionicons name={marcado ? 'checkbox' : 'square-outline'} size={22} color={colors.accent} />}
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitulo}>{i.descripcion}</Text>
              <Text style={styles.small}>{i.tipo} · {pesos(i.importe)}</Text>
            </View>
            <Badge tone={i.pago_id ? 'success' : 'neutral'}>{i.pago_id ? 'Pagado' : 'Pendiente'}</Badge>
          </Pressable>
        );
      })}
      {puedePagar && pendientes.length > 0 && (
        <Button title={`Pagar seleccionados (${pesos(total)})`} icon="card-outline" disabled={!sel.length} onPress={() => onPagar(sel)} />
      )}
      {!!f.pagos?.length && (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Text style={s.label}>Pagos y comprobantes</Text>
          {f.pagos.map((p) => (
            <View key={p.id} style={s.pago}>
              <Text style={s.itemTitulo}>{p.numero} · {pesos(p.importe)}</Text>
              <Text style={styles.small}>Transferencia del {fecha(p.fecha_transferencia)} · Op. {p.numero_operacion}</Text>
              <Text style={styles.small}>{p.items.join(', ')}</Text>
              {p.comprobantes.map((c) => (
                <Text key={c.id} style={[styles.small, { color: colors.accent }]}><Ionicons name="attach" /> {c.nombre_archivo} · {fechaHora(c.created_at)}</Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function PagoSheet({ pedido, onClose, onPagar }: {
  pedido: { factura: Factura; itemIds: number[] } | null;
  onClose: () => void;
  onPagar: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [operacion, setOperacion] = useState('');
  const [fechaTr, setFechaTr] = useState(hoyAr());
  const [archivo, setArchivo] = useState<{ nombre: string; tipo: string; contenido: string } | null>(null);
  const accion = useAction();
  const items = pedido ? pedido.factura.items.filter((i) => pedido.itemIds.includes(i.id)) : [];
  const total = items.reduce((t, i) => t + i.importe, 0);

  const elegir = async () => {
    accion.setMessage(null);
    const r = await DocumentPicker.getDocumentAsync({ type: TIPOS, copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    const tipo = a.mimeType ?? (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : a.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    if (!TIPOS.includes(tipo)) return accion.setMessage({ tipo: 'error', texto: 'El comprobante debe ser PDF, PNG o JPG.' });
    if (a.size && a.size > MAX_BYTES) return accion.setMessage({ tipo: 'error', texto: 'El comprobante no puede superar los 2 MB.' });
    await accion.run(async () => setArchivo({ nombre: a.name, tipo, contenido: await aBase64(a.uri) }));
  };

  const cerrar = () => { setOperacion(''); setArchivo(null); accion.setMessage(null); onClose(); };

  return (
    <Sheet title={pedido ? `Pagar factura ${pedido.factura.numero}` : 'Pagar'} visible={!!pedido} onClose={cerrar}
      footer={pedido && (
        <Button title={`Confirmar pago de ${pesos(total)}`} icon="checkmark-circle-outline" loading={accion.busy} disabled={!archivo || !operacion}
          onPress={() => accion.run(async () => {
            await onPagar({ item_ids: pedido.itemIds, numero_operacion: operacion.trim(), fecha_transferencia: fechaTr.trim(), comprobante: archivo });
            setOperacion(''); setArchivo(null);
          })} />
      )}>
      {pedido && (
        <>
          <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
          {items.map((i) => <InfoRow key={i.id} label={i.descripcion}>{pesos(i.importe)}</InfoRow>)}
          <InfoRow label="Total a pagar">{pesos(total)}</InfoRow>
          <View style={s.detalle}>
            <Text style={s.itemTitulo}>Transferí a esta cuenta (datos ficticios)</Text>
            <Text style={styles.muted}>Alias: {DATOS_TRANSFERENCIA.alias}</Text>
            <Text style={styles.muted}>CBU: {DATOS_TRANSFERENCIA.cbu}</Text>
          </View>
          <Field label="N.º de operación"><Input value={operacion} onChangeText={setOperacion} placeholder="Ej: 0045879123" maxLength={30} autoCapitalize="characters" /></Field>
          <Field label="Fecha de la transferencia (AAAA-MM-DD)"><Input value={fechaTr} onChangeText={setFechaTr} maxLength={10} /></Field>
          <Field label="Comprobante de la transferencia" hint="PDF, PNG o JPG de hasta 2 MB.">
            <Button title={archivo ? archivo.nombre : 'Adjuntar comprobante'} variant="outline" icon="attach-outline" onPress={elegir} />
          </Field>
          <Text style={styles.small}>Simulación para el trabajo práctico: no se realiza ningún movimiento de dinero real. Al confirmar, el sistema emite el comprobante de pago.</Text>
        </>
      )}
    </Sheet>
  );
}

function HistorialDeuda({ cuenta }: { cuenta: CuentaAlumno }) {
  const { deuda } = cuenta;
  if (!deuda.items.length) return <Card><Text style={styles.muted}>No hay ítems pendientes de pago.</Text></Card>;
  return (
    <View style={{ gap: 12 }}>
      {deuda.por_tipo.length > 0 && (
        <View style={s.grid}>{deuda.por_tipo.map((t) => <Resumido key={t.tipo} titulo={t.tipo} valor={pesos(t.total)} detalle="Deuda vencida" alerta />)}</View>
      )}
      <Card title="Ítems pendientes de pago">
        {deuda.items.map((i) => (
          <View key={i.id} style={s.item}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitulo}>{i.descripcion}</Text>
              <Text style={styles.small}>{i.mes} · {i.factura} · {i.tipo} · {pesos(i.importe)}</Text>
            </View>
            <Badge tone={i.vencido ? 'danger' : 'info'}>{i.vencido ? 'Vencido' : 'A vencer'}</Badge>
          </View>
        ))}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resumen: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 3 },
  resumenLabel: { color: colors.subtle, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  resumenValor: { color: colors.textStrong, fontSize: 15, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTitulo: { fontSize: 15, fontWeight: '700', color: colors.textStrong },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  pago: { backgroundColor: colors.backgroundSoft, borderRadius: radius.md, padding: 10, gap: 2 },
  detalle: { backgroundColor: colors.backgroundSoft, borderRadius: radius.md, padding: 12, gap: 4 },
});
