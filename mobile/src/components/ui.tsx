// Componentes de interfaz de la app (mismo lenguaje visual que la web: shared/theme.ts).
import { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../../shared/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const tones: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: '#166534' },
  danger: { bg: colors.dangerSoft, fg: '#991b1b' },
  warning: { bg: colors.amberSoft, fg: '#92400e' },
  info: { bg: colors.accentSoft, fg: colors.primary },
  neutral: { bg: colors.backgroundSoft, fg: colors.muted },
};

export function Screen({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  if (!scroll) return <View style={[s.screen, style]}>{children}</View>;
  return (
    <ScrollView style={s.screenBg} contentContainerStyle={[s.screen, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';

export function Button({
  title, onPress, variant = 'primary', icon, loading, disabled, small, style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.button, small && s.buttonSmall, { backgroundColor: v.bg, borderColor: v.border }, (disabled || loading) && { opacity: 0.55 }, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Ionicons name={icon} size={small ? 15 : 18} color={v.fg} /> : null}
      <Text style={[s.buttonText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

const buttonVariants: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  accent: { bg: colors.amber, fg: colors.primaryDark, border: colors.amber },
  outline: { bg: colors.surface, fg: colors.primary, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
};

export function Card({ title, right, children, style }: { title?: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.card, style]}>
      {(title || right) && (
        <View style={s.cardHeader}>
          {title ? <Text style={s.cardTitle}>{title}</Text> : <View />}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <View style={[s.badge, { backgroundColor: tones[tone].bg }]}>
      <Text style={[s.badgeText, { color: tones[tone].fg }]}>{children}</Text>
    </View>
  );
}

export function Alert({ tipo, children, onClose }: { tipo: 'ok' | 'error' | 'info'; children: ReactNode; onClose?: () => void }) {
  const tone = tipo === 'ok' ? tones.success : tipo === 'error' ? tones.danger : tones.info;
  return (
    <View style={[s.alert, { backgroundColor: tone.bg }]} accessibilityRole="alert">
      <Ionicons name={tipo === 'ok' ? 'checkmark-circle' : 'alert-circle'} size={18} color={tone.fg} />
      <Text style={[s.alertText, { color: tone.fg }]}>{children}</Text>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={18} color={tone.fg} />
        </Pressable>
      )}
    </View>
  );
}

export function Feedback({ message, onClose }: { message: { tipo: 'ok' | 'error'; texto: string } | null; onClose?: () => void }) {
  return message ? <Alert tipo={message.tipo} onClose={onClose}>{message.texto}</Alert> : null;
}

export const Loading = ({ texto = 'Cargando...' }: { texto?: string }) => (
  <View style={s.center}>
    <ActivityIndicator color={colors.primary} />
    <Text style={s.muted}>{texto}</Text>
  </View>
);

export const Empty = ({ texto }: { texto: string }) => (
  <View style={s.center}>
    <Ionicons name="file-tray-outline" size={28} color={colors.subtle} />
    <Text style={[s.muted, { textAlign: 'center' }]}>{texto}</Text>
  </View>
);

export function DataState({ loading, error, onRetry, children }: { loading: boolean; error: string | null; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <Loading />;
  if (error)
    return (
      <View style={{ gap: 10 }}>
        <Alert tipo="error">{error}</Alert>
        {onRetry && <Button title="Reintentar" variant="outline" onPress={onRetry} />}
      </View>
    );
  return <>{children}</>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
      {hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.subtle} {...props} style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, props.style]} />;
}

export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Selector desplegable: abre una lista de opciones en una ventana modal.
export function Select({ value, options, onChange, placeholder = 'Seleccionar' }: { value: string | number | null | undefined; options: Option[]; onChange: (value: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const actual = options.find((o) => String(o.value) === String(value ?? ''));
  return (
    <>
      <Pressable style={[s.input, s.select]} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={{ color: actual ? colors.textStrong : colors.subtle, flex: 1 }} numberOfLines={1}>{actual?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.subtle} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{placeholder}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {options.map((o) => (
                <Pressable
                  key={String(o.value)}
                  disabled={o.disabled}
                  onPress={() => { onChange(String(o.value)); setOpen(false); }}
                  style={({ pressed }) => [s.option, pressed && { backgroundColor: colors.accentSoft }, o.disabled && { opacity: 0.4 }]}
                >
                  <Text style={[s.optionText, String(o.value) === String(value) && { color: colors.primary, fontWeight: '800' }]}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function Tabs<K extends string>({ tabs, active, onChange }: { tabs: { key: K; label: string }[]; active: K; onChange: (key: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={{ gap: 4 }}>
      {tabs.map((t) => (
        <Pressable key={t.key} onPress={() => onChange(t.key)} style={[s.tab, active === t.key && s.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: active === t.key }}>
          <Text style={[s.tabText, active === t.key && { color: colors.primary }]}>{t.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      {typeof children === 'string' || typeof children === 'number' || children == null ? (
        <Text style={s.infoValue}>{children || '-'}</Text>
      ) : (
        <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{children}</View>
      )}
    </View>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={s.pageHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.pageTitle}>{title}</Text>
        {subtitle && <Text style={s.muted}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function StatCard({ label, value, icon, tone = 'info' }: { label: string; value: ReactNode; icon: IconName; tone?: Tone }) {
  return (
    <View style={s.stat}>
      <View style={[s.statIcon, { backgroundColor: tones[tone].bg }]}>
        <Ionicons name={icon} size={20} color={tones[tone].fg} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// Fila de lista tocable (equivalente a una fila de tabla en la web).
export function ListItem({ title, subtitle, right, onPress, icon }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.listItem, pressed && { backgroundColor: colors.background }]}>
      {icon && (
        <View style={s.listIcon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.listTitle}>{title}</Text>
        {subtitle ? <Text style={s.listSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.subtle} />}
    </Pressable>
  );
}

export function Sheet({ title, visible, onClose, children, footer }: { title: string; visible: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, s.sheetLarge]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar"><Ionicons name="close" size={22} color={colors.primary} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          {footer && <View style={s.sheetFooter}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.row, style]}>{children}</View>;

export const styles = StyleSheet.create({
  muted: { color: colors.subtle, fontSize: 14 },
  small: { color: colors.subtle, fontSize: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textStrong, marginTop: 6 },
  warning: { backgroundColor: colors.amberSoft, color: '#92400e', padding: 10, borderRadius: radius.md, fontSize: 13 },
});

const s = StyleSheet.create({
  screenBg: { flex: 1, backgroundColor: colors.background },
  screen: { padding: 16, gap: 14, backgroundColor: colors.background, flexGrow: 1 },
  button: { minHeight: 46, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonSmall: { minHeight: 34, paddingHorizontal: 10 },
  buttonText: { fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textStrong, flexShrink: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: radius.md },
  alertText: { flex: 1, fontWeight: '600', fontSize: 14 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 28 },
  muted: { color: colors.subtle, fontSize: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.subtle },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, color: colors.textStrong, fontSize: 15 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(8, 23, 63, 0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, gap: 10, maxHeight: '85%' },
  sheetLarge: { maxHeight: '92%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.textStrong },
  sheetFooter: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  option: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { fontSize: 15, color: colors.text },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  tabs: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontWeight: '700', color: colors.subtle },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { color: colors.subtle, fontSize: 14 },
  infoValue: { color: colors.textStrong, fontWeight: '600', fontSize: 14, flexShrink: 1, textAlign: 'right' },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.textStrong },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.textStrong },
  statLabel: { fontSize: 12, color: colors.subtle },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  listIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontSize: 15, fontWeight: '700', color: colors.textStrong },
  listSubtitle: { fontSize: 13, color: colors.subtle },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
