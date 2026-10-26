// Sitio web: pre-inscripciones, mensajes de contacto y noticias.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { fecha, fechaHora } from '../../../../shared/format';
import type { EstadoSolicitud, Noticia } from '../../../../shared/types';
import { confirmar } from '../../components/AlumnoVista';
import { FormSheet } from '../../components/FormSheet';
import { Badge, Button, Card, DataState, Empty, Feedback, ListItem, Row, Screen, Select, Tabs, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { noticiaFields } from '../../lib/admin';
import { useAction, useData } from '../../lib/useData';

export default function Contenido() {
  const [tab, setTab] = useState<'solicitudes' | 'mensajes' | 'noticias'>('solicitudes');
  return (
    <Screen>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'solicitudes', label: 'Pre-inscripciones' },
        { key: 'mensajes', label: 'Mensajes' },
        { key: 'noticias', label: 'Noticias' },
      ]} />
      {tab === 'solicitudes' && <Solicitudes />}
      {tab === 'mensajes' && <Mensajes />}
      {tab === 'noticias' && <Noticias />}
    </Screen>
  );
}

const estados: EstadoSolicitud[] = ['Pendiente', 'Contactada', 'Aceptada', 'Rechazada'];

function Solicitudes() {
  const { data, loading, error, reload } = useData(() => api.admin.solicitudes());
  const accion = useAction();
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      {data?.length ? data.map((s) => (
        <Card key={s.id} title={s.alumno_nombre} right={<Text style={styles.small}>{fecha(s.created_at)}</Text>}>
          <Text style={styles.muted}>{s.nivel} {s.anio_solicitado ?? ''}</Text>
          <Text>{s.tutor_nombre} · {s.tutor_telefono}</Text>
          <Text style={styles.small}>{s.tutor_email}</Text>
          {s.servicios.length > 0 && <Row>{s.servicios.map((sv) => <Badge key={sv} tone="info">{sv}</Badge>)}</Row>}
          {s.comentarios ? <Text style={styles.muted}>{s.comentarios}</Text> : null}
          <Select value={s.estado} options={estados.map((e) => ({ value: e, label: e }))} placeholder="Estado"
            onChange={(e) => accion.run(() => api.admin.estadoSolicitud(s.id, e as EstadoSolicitud), 'Estado actualizado.').then(reload)} />
        </Card>
      )) : <Empty texto="No hay solicitudes." />}
    </DataState>
  );
}

function Mensajes() {
  const { data, loading, error, reload } = useData(() => api.admin.mensajes());
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data?.length ? data.map((m) => (
        <Card key={m.id} title={m.asunto} right={m.leido ? <Badge>Leído</Badge> : <Badge tone="warning">Nuevo</Badge>}>
          <Text style={styles.small}>{m.nombre} · {m.email} {m.telefono ?? ''} · {fechaHora(m.created_at)}</Text>
          <Text>{m.mensaje}</Text>
          {!m.leido && <Button title="Marcar leído" icon="checkmark-done-outline" variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => api.admin.marcarLeido(m.id).then(reload)} />}
        </Card>
      )) : <Empty texto="No hay mensajes." />}
    </DataState>
  );
}

function Noticias() {
  const { data, loading, error, reload } = useData(() => api.admin.noticias());
  const [editar, setEditar] = useState<Noticia | 'nueva' | null>(null);
  const accion = useAction();
  return (
    <>
      <Button title="Nueva noticia" icon="add" onPress={() => setEditar('nueva')} />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      <DataState loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length ? data.map((n) => (
            <View key={n.id}>
              <ListItem title={n.titulo} subtitle={`${n.categoria} · ${fecha(n.fecha)}`}
                right={<Badge tone={n.publicada ? 'success' : 'neutral'}>{n.publicada ? 'Publicada' : 'Borrador'}</Badge>} onPress={() => setEditar(n)} />
              <Button title="Eliminar" icon="trash-outline" variant="ghost" small style={{ alignSelf: 'flex-end' }}
                onPress={() => confirmar(`¿Eliminar "${n.titulo}"?`, () => accion.run(() => api.admin.eliminarNoticia(n.id), 'Noticia eliminada.').then((ok) => { if (ok) reload(); }))} />
            </View>
          )) : <Empty texto="No hay noticias." />}
        </Card>
      </DataState>
      <FormSheet title={editar === 'nueva' ? 'Nueva noticia' : 'Editar noticia'} visible={editar !== null} fields={noticiaFields}
        initial={editar === 'nueva' ? { publicada: true, categoria: 'Institucional' } : editar} onClose={() => setEditar(null)}
        onSubmit={async (payload) => {
          if (editar === 'nueva') await api.admin.crearNoticia(payload);
          else if (editar) await api.admin.actualizarNoticia(editar.id, payload);
          reload();
        }} />
    </>
  );
}
