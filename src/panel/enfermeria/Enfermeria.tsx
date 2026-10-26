// Enfermeria: auditoria de fichas medicas y apto fisico (HU-06 / RF-22).
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { fecha, tonoApto, urlCredencial } from '../../../shared/format';
import type { FichaMedica } from '../../../shared/types';
import { QrCode } from '../../components/QrCode';
import { Badge, Button, Card, DataState, Feedback, Field, Input, PageHeader, Select, Table, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { Link } from '../../lib/router';
import { useAction, useData } from '../../lib/useData';

export function FichasLista({ soloLectura = false }: { soloLectura?: boolean }) {
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [filtro, setFiltro] = useState({ buscar: '', estado: '' });
  const { data, loading, error, reload } = useData(() => api.salud.fichas(filtro), [filtro.buscar, filtro.estado]);

  return (
    <>
      <PageHeader title={soloLectura ? 'Aptos físicos' : 'Fichas médicas'} subtitle="Busca al alumno por DNI o apellido para auditar su ficha y apto físico." />
      <form className="filters" onSubmit={(e) => { e.preventDefault(); setFiltro({ buscar, estado }); }}>
        <Input placeholder="DNI o apellido" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        <Select value={estado} onChange={(e) => { setEstado(e.target.value); setFiltro({ buscar, estado: e.target.value }); }}>
          <option value="">Todos los estados</option>
          <option>Vigente</option>
          <option>Vencido</option>
          <option>Sin apto</option>
        </Select>
        <Button type="submit" icon={<Search size={16} />}>Buscar</Button>
      </form>
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(f) => f.alumno_id} empty="No se encontraron alumnos." columns={[
            { header: 'Alumno', render: (f) => soloLectura ? f.alumno : <Link href={`/panel/fichas/${f.alumno_id}`} className="link">{f.alumno}</Link> },
            { header: 'DNI', render: (f) => f.dni },
            { header: 'Nivel', render: (f) => f.nivel },
            { header: 'Grupo', render: (f) => f.grupo_sanguineo ?? '-' },
            { header: 'Alergias', render: (f) => f.alergias ?? '-' },
            { header: 'Apto vence', render: (f) => fecha(f.apto_fisico_vence) },
            { header: 'Estado', render: (f) => <Badge tone={tonoApto[f.estado_apto]}>{f.estado_apto}</Badge> },
          ]} />
        </Card>
      </DataState>
    </>
  );
}

const campos: { key: keyof FichaMedica; label: string; type?: string; area?: boolean }[] = [
  { key: 'grupo_sanguineo', label: 'Grupo sanguíneo' },
  { key: 'obra_social', label: 'Obra social' },
  { key: 'nro_afiliado', label: 'N.o de afiliado' },
  { key: 'contacto_emergencia', label: 'Contacto de emergencia' },
  { key: 'telefono_emergencia', label: 'Teléfono de emergencia', type: 'tel' },
  { key: 'apto_fisico_emision', label: 'Apto físico: emisión', type: 'date' },
  { key: 'apto_fisico_vence', label: 'Apto físico: vencimiento', type: 'date' },
  { key: 'apto_fisico_archivo', label: 'Enlace al certificado (opcional)', type: 'url' },
  { key: 'alergias', label: 'Alergias', area: true },
  { key: 'enfermedades_cronicas', label: 'Enfermedades crónicas', area: true },
  { key: 'medicacion', label: 'Medicación', area: true },
  { key: 'observaciones', label: 'Observaciones', area: true },
];

export function FichaEditor({ alumnoId }: { alumnoId: number }) {
  const { data, loading, error, reload, setData } = useData(() => api.salud.ficha(alumnoId), [alumnoId]);
  const [form, setForm] = useState<Record<string, string>>({});
  const { busy, message, run, setMessage } = useAction();

  useEffect(() => {
    if (data) setForm(Object.fromEntries(campos.map((c) => [c.key, (data[c.key] as string | null) ?? ''])));
  }, [data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(async () => setData(await api.salud.guardar(alumnoId, form)), 'Ficha médica actualizada.');
  }

  return (
    <>
      <Link href="/panel" className="back-link"><ArrowLeft size={16} /> Fichas médicas</Link>
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <PageHeader title={`${data.apellido}, ${data.nombre}`} subtitle={`DNI ${data.dni} · ${data.nivel ?? ''} · Nacimiento ${fecha(data.fecha_nacimiento)}`} />
            <div className="grid grid-sidebar">
              <form className="card" onSubmit={submit}>
                <Feedback message={message} onClose={() => setMessage(null)} />
                <div className="form-grid">
                  {campos.map((c) => (
                    <Field key={c.key} label={c.label} full={c.area}>
                      {c.area ? (
                        <Textarea rows={2} value={form[c.key] ?? ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} />
                      ) : (
                        <Input type={c.type ?? 'text'} value={form[c.key] ?? ''} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} />
                      )}
                    </Field>
                  ))}
                </div>
                <Button type="submit" loading={busy}>Guardar ficha</Button>
              </form>
              <Card title="Credencial QR">
                <div className={`credential ${data.estado_apto === 'Vigente' ? 'ok' : 'blocked'}`}>
                  <div className="credential-head"><Badge tone={tonoApto[data.estado_apto]}>{data.estado_apto}</Badge></div>
                  {data.qr_token && <QrCode value={urlCredencial(window.location.origin, data.qr_token)} size={160} />}
                  <span>Vence: {fecha(data.apto_fisico_vence)}</span>
                  {data.estado_apto !== 'Vigente' && <small className="warning-text">Con el apto vencido o ausente, el sistema bloquea la inscripción a deportes.</small>}
                </div>
              </Card>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
