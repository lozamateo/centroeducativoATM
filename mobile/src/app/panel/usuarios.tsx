// Usuarios y roles (RF-01).
import { useState } from 'react';
import { View } from 'react-native';
import { ROLES, fechaHora } from '../../../../shared/format';
import type { Rol, UsuarioListado } from '../../../../shared/types';
import { FormSheet } from '../../components/FormSheet';
import type { FieldConfig } from '../../components/FormSheet';
import { Badge, Button, Card, DataState, Empty, Feedback, ListItem, PageHeader, Row, Screen, Select } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction, useData } from '../../lib/useData';

const rolOptions = (Object.keys(ROLES) as Rol[]).map((rol) => ({ value: rol, label: ROLES[rol] }));

export default function Usuarios() {
  const { data, loading, error, reload } = useData(() => api.admin.usuarios());
  const [rolNuevo, setRolNuevo] = useState<Rol | ''>('');
  const [nuevo, setNuevo] = useState(false);
  const [editar, setEditar] = useState<UsuarioListado | null>(null);
  const accion = useAction();

  // Legajos disponibles para vincular segun el rol (igual que la web).
  const legajos = useData(async () => {
    if (rolNuevo === 'TUTOR') return (await api.admin.tutores()).filter((t) => !t.usuario_id).map((t) => ({ value: t.id, label: `${t.apellido}, ${t.nombre}` }));
    if (rolNuevo === 'ALUMNO') return (await api.admin.alumnos()).filter((a) => !a.usuario_id).map((a) => ({ value: a.id, label: `${a.apellido}, ${a.nombre}` }));
    if (rolNuevo === 'DOCENTE') return (await api.admin.profesores()).filter((p) => !p.usuario_id).map((p) => ({ value: p.id, label: `${p.apellido}, ${p.nombre}` }));
    return [];
  }, [rolNuevo]);

  const camposNuevo: FieldConfig[] = [
    { name: 'nombre', label: 'Nombre', required: true },
    { name: 'apellido', label: 'Apellido', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Contraseña inicial', type: 'password', required: true, hint: 'Mínimo 6 caracteres' },
    ...(rolNuevo === 'TUTOR' || rolNuevo === 'ALUMNO' || rolNuevo === 'DOCENTE'
      ? [{ name: 'vinculo_id', label: 'Vincular al legajo', type: 'select' as const, options: legajos.data ?? [], hint: 'Necesario para que vea sus datos en el portal' }]
      : []),
  ];

  return (
    <Screen>
      <PageHeader title="Usuarios y roles" subtitle="Cada usuario ve solo las funciones de su rol." />
      <Row style={{ flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}><Select value={rolNuevo} onChange={(v) => setRolNuevo(v as Rol)} placeholder="Rol del nuevo usuario" options={rolOptions} /></View>
        <Button title="Nuevo" icon="add" disabled={!rolNuevo} onPress={() => setNuevo(true)} />
      </Row>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((u) => (
            <View key={u.id}>
              <ListItem title={`${u.apellido}, ${u.nombre}`} subtitle={`${u.email}\n${u.vinculado_a ?? 'Sin legajo'} · Último acceso: ${fechaHora(u.ultimo_acceso)}`}
                right={<Badge tone="info">{ROLES[u.rol]}</Badge>} onPress={() => setEditar(u)} />
              <Row style={{ justifyContent: 'flex-end' }}>
                <Badge tone={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Bloqueado'}</Badge>
                <Button title={u.activo ? 'Bloquear' : 'Habilitar'} icon="key-outline" variant="ghost" small
                  onPress={() => accion.run(() => api.admin.actualizarUsuario(u.id, { activo: !u.activo }), u.activo ? 'Usuario bloqueado.' : 'Usuario habilitado.').then((ok) => { if (ok) reload(); })} />
              </Row>
            </View>
          )) : <Empty texto="No hay usuarios." />}
        </Card>
      </DataState>
      {rolNuevo !== '' && (
        <FormSheet title={`Nuevo usuario: ${ROLES[rolNuevo]}`} visible={nuevo} fields={camposNuevo} onClose={() => setNuevo(false)}
          onSubmit={async (payload) => { await api.admin.crearUsuario({ ...payload, rol: rolNuevo }); reload(); }} />
      )}
      <FormSheet title={`Editar ${editar?.email ?? ''}`} visible={editar !== null} initial={editar} onClose={() => setEditar(null)}
        fields={[
          { name: 'nombre', label: 'Nombre', required: true },
          { name: 'apellido', label: 'Apellido', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'rol', label: 'Rol', type: 'select', options: rolOptions, required: true },
          { name: 'password', label: 'Nueva contraseña', type: 'password', hint: 'Dejar vacío para mantener la actual' },
        ]}
        onSubmit={async (payload) => { if (editar) await api.admin.actualizarUsuario(editar.id, payload); reload(); }} />
    </Screen>
  );
}
