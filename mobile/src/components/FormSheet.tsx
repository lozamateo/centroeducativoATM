// Formulario generico para altas y modificaciones (equivalente a FormModal de la web).
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { colors } from '../../../shared/theme';
import { useAction } from '../lib/useData';
import { Button, Feedback, Field, Input, Select, Sheet } from './ui';
import type { Option } from './ui';

export interface FieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'date' | 'number' | 'tel' | 'password' | 'url' | 'textarea' | 'select' | 'checkbox' | 'time';
  options?: Option[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
}

type Values = Record<string, string | boolean>;

function toValues(fields: FieldConfig[], source?: object | null): Values {
  const record = (source ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    fields.map((f) => {
      const value = record[f.name];
      if (f.type === 'checkbox') return [f.name, value === undefined ? true : Boolean(value)];
      return [f.name, value === null || value === undefined ? '' : String(value)];
    }),
  );
}

function toPayload(fields: FieldConfig[], values: Values) {
  return Object.fromEntries(
    fields.map((f) => {
      const value = values[f.name];
      if (f.type === 'checkbox') return [f.name, Boolean(value)];
      if (value === '') return [f.name, null];
      if (f.type === 'number' || (f.type === 'select' && f.options?.every((o) => typeof o.value === 'number'))) return [f.name, Number(value)];
      return [f.name, value];
    }),
  );
}

const keyboard = { email: 'email-address', number: 'numeric', tel: 'phone-pad', url: 'url' } as const;

export function FormSheet({
  title, fields, initial, visible, onSubmit, onClose, submitLabel = 'Guardar',
}: {
  title: string;
  fields: FieldConfig[];
  initial?: object | null;
  visible: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Values>(() => toValues(fields, initial));
  const { busy, message, run, setMessage } = useAction();

  useEffect(() => {
    if (visible) {
      setValues(toValues(fields, initial));
      setMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initial]);

  const set = (name: string, value: string | boolean) => setValues((prev) => ({ ...prev, [name]: value }));

  async function submit() {
    const faltan = fields.filter((f) => f.required && f.type !== 'checkbox' && !values[f.name]);
    if (faltan.length) {
      setMessage({ tipo: 'error', texto: `Completá: ${faltan.map((f) => f.label).join(', ')}.` });
      return;
    }
    if (await run(() => onSubmit(toPayload(fields, values)))) onClose();
  }

  return (
    <Sheet title={title} visible={visible} onClose={onClose} footer={
      <>
        <Button title="Cancelar" variant="ghost" onPress={onClose} />
        <Button title={submitLabel} loading={busy} onPress={submit} />
      </>
    }>
      <Feedback message={message} onClose={() => setMessage(null)} />
      {fields.map((f) => {
        const value = values[f.name];
        if (f.type === 'checkbox') {
          return (
            <Pressable key={f.name} onPress={() => set(f.name, !value)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{f.label}</Text>
              <Switch value={Boolean(value)} onValueChange={(v) => set(f.name, v)} trackColor={{ true: colors.accent, false: colors.borderStrong }} />
            </Pressable>
          );
        }
        return (
          <Field key={f.name} label={f.label + (f.required ? ' *' : '')} hint={f.hint ?? (f.type === 'date' ? 'Formato AAAA-MM-DD' : f.type === 'time' ? 'Formato HH:MM' : undefined)}>
            {f.type === 'select' ? (
              <Select value={String(value)} options={f.options ?? []} onChange={(v) => set(f.name, v)} placeholder={f.label} />
            ) : (
              <Input
                value={String(value)}
                onChangeText={(v) => set(f.name, v)}
                placeholder={f.placeholder ?? (f.type === 'date' ? '2027-03-01' : undefined)}
                multiline={f.type === 'textarea'}
                secureTextEntry={f.type === 'password'}
                autoCapitalize={f.type === 'email' || f.type === 'password' || f.type === 'url' ? 'none' : 'sentences'}
                keyboardType={keyboard[f.type as keyof typeof keyboard] ?? 'default'}
              />
            )}
          </Field>
        );
      })}
      <View style={{ height: 8 }} />
    </Sheet>
  );
}
