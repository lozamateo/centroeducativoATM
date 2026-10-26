// Formulario generico en ventana modal para altas y modificaciones.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Feedback, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { useAction } from '../../lib/useData';

export interface FieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'date' | 'number' | 'tel' | 'password' | 'url' | 'textarea' | 'select' | 'checkbox' | 'time';
  options?: { value: string | number; label: string }[];
  required?: boolean;
  full?: boolean;
  hint?: string;
  placeholder?: string;
}

export type FormValues = Record<string, string | boolean>;

export function toFormValues(fields: FieldConfig[], source?: object | null): FormValues {
  const record = (source ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    fields.map((f) => {
      const value = record[f.name];
      if (f.type === 'checkbox') return [f.name, value === undefined ? true : Boolean(value)];
      return [f.name, value === null || value === undefined ? '' : String(value)];
    }),
  );
}

// Convierte los valores del formulario al cuerpo que espera la API.
export function toPayload(fields: FieldConfig[], values: FormValues) {
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

export function FormModal({
  title,
  fields,
  initial,
  onSubmit,
  onClose,
  submitLabel = 'Guardar',
}: {
  title: string;
  fields: FieldConfig[];
  initial?: object | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(fields, initial));
  const { busy, message, run, setMessage } = useAction();
  const set = (name: string, value: string | boolean) => setValues((prev) => ({ ...prev, [name]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await run(() => onSubmit(toPayload(fields, values)))) onClose();
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-modal" loading={busy}>{submitLabel}</Button>
        </>
      }
    >
      <form id="form-modal" className="form-grid" onSubmit={submit}>
        <div className="field-full"><Feedback message={message} onClose={() => setMessage(null)} /></div>
        {fields.map((f) => {
          const value = values[f.name];
          if (f.type === 'checkbox') {
            return (
              <label key={f.name} className="checkbox field-full">
                <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(f.name, e.target.checked)} /> {f.label}
              </label>
            );
          }
          return (
            <Field key={f.name} label={f.label + (f.required ? ' *' : '')} full={f.full || f.type === 'textarea'} hint={f.hint}>
              {f.type === 'select' ? (
                <Select required={f.required} value={String(value)} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="">Seleccionar</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : f.type === 'textarea' ? (
                <Textarea required={f.required} rows={3} value={String(value)} onChange={(e) => set(f.name, e.target.value)} />
              ) : (
                <Input type={f.type ?? 'text'} required={f.required} placeholder={f.placeholder} value={String(value)} onChange={(e) => set(f.name, e.target.value)} />
              )}
            </Field>
          );
        })}
      </form>
    </Modal>
  );
}
