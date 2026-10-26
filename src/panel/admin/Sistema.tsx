// Usuarios y roles (RF-01), contenido del sitio publico y auditoria.
import { useState } from 'react';
import { CheckCheck, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { ROLES, fecha, fechaHora } from '../../../shared/format';
import type { EstadoSolicitud, Noticia, Rol, UsuarioListado } from '../../../shared/types';
import { Badge, Button, Card, DataState, Feedback, PageHeader, Select, Table, Tabs } from '../../components/ui';
import type { Tone } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useData } from '../../lib/useData';
import { FormModal } from './FormModal';
import type { FieldConfig } from './FormModal';

const rolOptions = (Object.keys(ROLES) as Rol[]).map((rol) => ({ value: rol, label: ROLES[rol] }));

export function UsuariosPage() {
  const { data, loading, error, reload } = useData(() => api.admin.usuarios());
  const [nuevo, setNuevo] = useState(false);
  const [editar, setEditar] = useState<UsuarioListado | null>(null);
  const [rolNuevo, setRolNuevo] = useState<Rol | ''>('');
  const accion = useAction();

  // Legajos disponibles para vincular segun el rol elegido.
  const legajos = useData(async () => {
    if (rolNuevo === 'TUTOR') return (await api.admin.tutores()).filter((t) => !t.usuario_id).map((t) => ({ value: t.id, label: `${t.apellido}, ${t.nombre} (DNI ${t.dni})` }));
    if (rolNuevo === 'ALUMNO') return (await api.admin.alumnos()).filter((a) => !a.usuario_id).map((a) => ({ value: a.id, label: `${a.apellido}, ${a.nombre} (DNI ${a.dni})` }));
    if (rolNuevo === 'DOCENTE') return (await api.admin.profesores()).filter((p) => !p.usuario_id).map((p) => ({ value: p.id, label: `${p.apellido}, ${p.nombre} (DNI ${p.dni})` }));
    return [];
  }, [rolNuevo]);

  const camposNuevo: FieldConfig[] = [
    { name: 'nombre', label: 'Nombre', required: true },
    { name: 'apellido', label: 'Apellido', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Contraseña inicial', type: 'password', required: true, hint: 'Mínimo 6 caracteres' },
    ...(rolNuevo && rolNuevo !== 'ADMIN' && rolNuevo !== 'ENFERMERIA'
      ? [{ name: 'vinculo_id', label: 'Vincular al legajo', type: 'select' as const, options: legajos.data ?? [], full: true, hint: 'Necesario para que vea sus datos en el portal' }]
      : []),
  ];

  return (
    <>
      <PageHeader title="Usuarios y roles" subtitle="Control de acceso: cada usuario ve solo las funciones de su rol." actions={
        <>
          <Select value={rolNuevo} onChange={(e) => setRolNuevo(e.target.value as Rol)}>
            <option value="">Rol del nuevo usuario</option>
            {rolOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Button icon={<Plus size={18} />} disabled={!rolNuevo} onClick={() => setNuevo(true)}>Nuevo usuario</Button>
        </>
      } />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(u) => u.id} columns={[
            { header: 'Usuario', render: (u) => `${u.apellido}, ${u.nombre}` },
            { header: 'Email', render: (u) => u.email },
            { header: 'Rol', render: (u) => <Badge tone="info">{ROLES[u.rol]}</Badge> },
            { header: 'Vinculado a', render: (u) => u.vinculado_a ?? '-' },
            { header: 'Último acceso', render: (u) => fechaHora(u.ultimo_acceso) },
            { header: 'Estado', render: (u) => <Badge tone={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Bloqueado'}</Badge> },
            { header: '', className: 'actions', render: (u) => (
              <div className="row-actions">
                <Button variant="ghost" size="sm" icon={<Pencil size={16} />} onClick={() => setEditar(u)} aria-label="Editar" />
                <Button variant="ghost" size="sm" icon={<KeyRound size={16} />}
                  onClick={() => accion.run(() => api.admin.actualizarUsuario(u.id, { activo: !u.activo }), u.activo ? 'Usuario bloqueado.' : 'Usuario habilitado.').then((ok) => { if (ok) reload(); })}>
                  {u.activo ? 'Bloquear' : 'Habilitar'}
                </Button>
              </div>
            ) },
          ]} />
        </Card>
      </DataState>
      {nuevo && rolNuevo && (
        <FormModal title={`Nuevo usuario: ${ROLES[rolNuevo]}`} fields={camposNuevo} onClose={() => setNuevo(false)}
          onSubmit={async (payload) => { await api.admin.crearUsuario({ ...payload, rol: rolNuevo }); reload(); }} />
      )}
      {editar && (
        <FormModal title={`Editar ${editar.email}`} onClose={() => setEditar(null)} initial={editar}
          fields={[
            { name: 'nombre', label: 'Nombre', required: true },
            { name: 'apellido', label: 'Apellido', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'rol', label: 'Rol', type: 'select', options: rolOptions, required: true },
            { name: 'password', label: 'Nueva contraseña', type: 'password', hint: 'Dejar vacío para mantener la actual', full: true },
          ]}
          onSubmit={async (payload) => { await api.admin.actualizarUsuario(editar.id, payload); reload(); }} />
      )}
    </>
  );
}

const tonoSolicitud: Record<EstadoSolicitud, Tone> = { Pendiente: 'warning', Contactada: 'info', Aceptada: 'success', Rechazada: 'neutral' };

const noticiaFields: FieldConfig[] = [
  { name: 'titulo', label: 'Título', required: true, full: true },
  { name: 'categoria', label: 'Categoría', type: 'select', options: ['Institucional', 'Inscripciones', 'Deportes', 'Eventos'].map((c) => ({ value: c, label: c })) },
  { name: 'imagen_url', label: 'URL de imagen', type: 'url' },
  { name: 'resumen', label: 'Resumen', type: 'textarea', required: true },
  { name: 'contenido', label: 'Contenido', type: 'textarea' },
  { name: 'publicada', label: 'Publicada en el sitio', type: 'checkbox' },
];

export function ContenidoPage() {
  const [tab, setTab] = useState<'solicitudes' | 'mensajes' | 'noticias'>('solicitudes');
  return (
    <>
      <PageHeader title="Sitio web" subtitle="Pre-inscripciones, mensajes de contacto y noticias del portal público." />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'solicitudes', label: 'Pre-inscripciones' },
        { key: 'mensajes', label: 'Mensajes' },
        { key: 'noticias', label: 'Noticias' },
      ]} />
      {tab === 'solicitudes' && <Solicitudes />}
      {tab === 'mensajes' && <Mensajes />}
      {tab === 'noticias' && <Noticias />}
    </>
  );
}

function Solicitudes() {
  const { data, loading, error, reload } = useData(() => api.admin.solicitudes());
  const accion = useAction();
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <Card>
        <Table rows={data ?? []} rowKey={(s) => s.id} empty="No hay solicitudes." columns={[
          { header: 'Fecha', render: (s) => fecha(s.created_at) },
          { header: 'Alumno', render: (s) => <>{s.alumno_nombre}<small className="block muted">{s.nivel} {s.anio_solicitado}</small></> },
          { header: 'Tutor', render: (s) => <>{s.tutor_nombre}<small className="block muted">{s.tutor_telefono} · {s.tutor_email}</small></> },
          { header: 'Servicios', render: (s) => s.servicios.join(', ') || '-' },
          { header: 'Comentarios', render: (s) => s.comentarios ?? '-' },
          { header: 'Estado', render: (s) => (
            <Select value={s.estado} onChange={(e) => accion.run(() => api.admin.estadoSolicitud(s.id, e.target.value as EstadoSolicitud), 'Estado actualizado.').then(reload)}>
              {(Object.keys(tonoSolicitud) as EstadoSolicitud[]).map((estado) => <option key={estado}>{estado}</option>)}
            </Select>
          ) },
        ]} />
      </Card>
    </DataState>
  );
}

function Mensajes() {
  const { data, loading, error, reload } = useData(() => api.admin.mensajes());
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Card>
        <Table rows={data ?? []} rowKey={(m) => m.id} empty="No hay mensajes." columns={[
          { header: 'Fecha', render: (m) => fechaHora(m.created_at) },
          { header: 'De', render: (m) => <>{m.nombre}<small className="block muted">{m.email} {m.telefono}</small></> },
          { header: 'Asunto', render: (m) => <strong>{m.asunto}</strong> },
          { header: 'Mensaje', render: (m) => m.mensaje },
          { header: '', className: 'actions', render: (m) => m.leido ? <Badge>Leido</Badge> : (
            <Button variant="ghost" size="sm" icon={<CheckCheck size={16} />} onClick={() => api.admin.marcarLeido(m.id).then(reload)}>Marcar leido</Button>
          ) },
        ]} />
      </Card>
    </DataState>
  );
}

function Noticias() {
  const { data, loading, error, reload } = useData(() => api.admin.noticias());
  const [editar, setEditar] = useState<Noticia | 'nueva' | null>(null);
  const accion = useAction();
  return (
    <div className="stack">
      <div className="filters"><Button icon={<Plus size={18} />} onClick={() => setEditar('nueva')}>Nueva noticia</Button></div>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(n) => n.id} columns={[
            { header: 'Fecha', render: (n) => fecha(n.fecha) },
            { header: 'Título', render: (n) => n.titulo },
            { header: 'Categoría', render: (n) => n.categoria },
            { header: 'Estado', render: (n) => <Badge tone={n.publicada ? 'success' : 'neutral'}>{n.publicada ? 'Publicada' : 'Borrador'}</Badge> },
            { header: '', className: 'actions', render: (n) => (
              <div className="row-actions">
                <Button variant="ghost" size="sm" icon={<Pencil size={16} />} onClick={() => setEditar(n)} aria-label="Editar" />
                <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} aria-label="Eliminar"
                  onClick={() => window.confirm(`Eliminar "${n.titulo}"?`) && accion.run(() => api.admin.eliminarNoticia(n.id), 'Noticia eliminada.').then((ok) => { if (ok) reload(); })} />
              </div>
            ) },
          ]} />
        </Card>
      </DataState>
      {editar && (
        <FormModal title={editar === 'nueva' ? 'Nueva noticia' : 'Editar noticia'} fields={noticiaFields} initial={editar === 'nueva' ? { publicada: true, categoria: 'Institucional' } : editar}
          onClose={() => setEditar(null)}
          onSubmit={async (payload) => {
            if (editar === 'nueva') await api.admin.crearNoticia(payload);
            else await api.admin.actualizarNoticia(editar.id, payload);
            reload();
          }} />
      )}
    </div>
  );
}

const operaciones: Record<string, Tone> = { INSERT: 'success', UPDATE: 'info', DELETE: 'danger' };

export function AuditoriaPage() {
  const { data, loading, error, reload } = useData(() => api.admin.auditoria());
  return (
    <>
      <PageHeader title="Auditoría" subtitle="Trazabilidad: cada alta, modificación o baja queda registrada con usuario y fecha." />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          <Table rows={data ?? []} rowKey={(a) => a.id} columns={[
            { header: 'Fecha', render: (a) => fechaHora(a.fecha) },
            { header: 'Usuario', render: (a) => a.usuario },
            { header: 'Operación', render: (a) => <Badge tone={operaciones[a.operacion]}>{a.operacion}</Badge> },
            { header: 'Tabla', render: (a) => a.tabla.replace(/_/g, ' ') },
            { header: 'Registro', render: (a) => `#${a.registro_id ?? '-'}` },
          ]} />
        </Card>
      </DataState>
    </>
  );
}
