// Inicio del panel segun el rol (equivalente a /panel en la web).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ROLES, horarios, tonoApto } from '../../../../shared/format';
import { colors, radius } from '../../../../shared/theme';
import { AlumnoVista } from '../../components/AlumnoVista';
import { FichasLista } from '../../components/FichasLista';
import {
  Badge, Card, DataState, Empty, InfoRow, ListItem, PageHeader, Row, Screen, StatCard, styles,
} from '../../components/ui';
import type { IconName } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useData } from '../../lib/useData';

export default function PanelInicio() {
  const { usuario } = useAuth();
  if (!usuario) return null;
  switch (usuario.rol) {
    case 'ADMIN': return <AdminInicio />;
    case 'TUTOR': return <FamiliaInicio />;
    case 'DOCENTE': return <DocenteInicio />;
    case 'ALUMNO': return <AlumnoInicio />;
    case 'ENFERMERIA': return <FichasLista saludo={<Saludo />} />;
  }
}

function Saludo() {
  const { usuario } = useAuth();
  if (!usuario) return null;
  return (
    <View style={s.user}>
      <View style={s.avatar}><Text style={s.avatarText}>{usuario.nombre[0]}{usuario.apellido[0]}</Text></View>
      <View>
        <Text style={s.userName}>{usuario.nombre} {usuario.apellido}</Text>
        <Text style={styles.small}>{ROLES[usuario.rol]}</Text>
      </View>
    </View>
  );
}

// Mismas secciones que el menu lateral de la web.
const menuAdmin: { ruta: string; label: string; icon: IconName }[] = [
  { ruta: '/panel/alumnos', label: 'Alumnos', icon: 'school-outline' },
  { ruta: '/panel/tutores', label: 'Familias', icon: 'people-outline' },
  { ruta: '/panel/docentes', label: 'Docentes', icon: 'person-outline' },
  { ruta: '/panel/cursos', label: 'Cursos y materias', icon: 'book-outline' },
  { ruta: '/panel/deportes', label: 'Deportes', icon: 'football-outline' },
  { ruta: '/panel/inscripciones', label: 'Inscripciones', icon: 'clipboard-outline' },
  { ruta: '/panel/reportes', label: 'Reportes', icon: 'bar-chart-outline' },
  { ruta: '/panel/salud', label: 'Aptos físicos', icon: 'medkit-outline' },
  { ruta: '/panel/usuarios', label: 'Usuarios', icon: 'shield-checkmark-outline' },
  { ruta: '/panel/contenido', label: 'Sitio web', icon: 'newspaper-outline' },
  { ruta: '/panel/auditoria', label: 'Auditoría', icon: 'time-outline' },
];

function AdminInicio() {
  const router = useRouter();
  const { data, loading, error, reload } = useData(() => api.admin.resumen());
  return (
    <Screen>
      <Saludo />
      <PageHeader title="Tablero de gestión" subtitle="Indicadores del ciclo lectivo en tiempo real." />
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <View style={s.grid}>
              <StatCard label="Alumnos activos" value={data.alumnos} icon="school-outline" />
              <StatCard label="Matriculados" value={data.matriculados} icon="clipboard-outline" tone="success" />
              <StatCard label="Docentes" value={data.profesores} icon="person-outline" />
              <StatCard label="Inscripciones a deportes" value={data.inscripciones_deporte} icon="football-outline" />
              <StatCard label="Usan transporte" value={data.usuarios_transporte} icon="bus-outline" />
              <StatCard label="Usan comedor" value={data.usuarios_comedor} icon="restaurant-outline" />
              <StatCard label="Aptos vencidos o ausentes" value={data.aptos_vencidos} icon="medkit-outline" tone={data.aptos_vencidos ? 'danger' : 'success'} />
              <StatCard label="Solicitudes pendientes" value={data.solicitudes_pendientes} icon="mail-outline" tone={data.solicitudes_pendientes ? 'warning' : 'info'} />
            </View>
            <Card title="Ocupación por nivel">
              {data.por_nivel.map((n) => (
                <View key={n.nivel} style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}><Text>{n.nivel}</Text><Text style={{ fontWeight: '700' }}>{n.matriculados} / {n.cupo}</Text></Row>
                  <View style={s.track}><View style={[s.fill, { width: `${n.cupo ? Math.min((n.matriculados / n.cupo) * 100, 100) : 0}%` }]} /></View>
                </View>
              ))}
            </Card>
          </>
        )}
      </DataState>
      <Text style={styles.sectionTitle}>Gestión</Text>
      <View style={s.grid}>
        {menuAdmin.map((m) => (
          <Pressable key={m.ruta} style={({ pressed }) => [s.menuItem, pressed && { backgroundColor: colors.accentSoft }]} onPress={() => router.push(m.ruta as never)}>
            <Ionicons name={m.icon} size={24} color={colors.primary} />
            <Text style={s.menuText}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function FamiliaInicio() {
  const router = useRouter();
  const { data, loading, error, reload } = useData(() => api.familia.hijos());
  return (
    <Screen>
      <Saludo />
      <PageHeader title="Mis hijos" subtitle="Gestioná la matrícula, deportes, transporte y comedor de cada alumno." />
      <DataState loading={loading} error={error} onRetry={reload}>
        {data?.length ? (
          data.map((hijo) => (
            <Pressable key={hijo.alumno_id} onPress={() => router.push(`/panel/hijo/${hijo.alumno_id}`)} style={({ pressed }) => [s.child, pressed && { borderColor: colors.accent }]}>
              <View style={[s.avatar, { width: 50, height: 50 }]}><Text style={s.avatarText}>{hijo.alumno.split(', ')[1]?.[0]}{hijo.alumno[0]}</Text></View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.userName}>{hijo.alumno}</Text>
                <Text style={styles.muted}>{hijo.nivel} · {hijo.curso ?? 'Sin matrícula'}</Text>
                <Row>
                  <Badge tone={tonoApto[hijo.estado_apto]}>Apto {hijo.estado_apto.toLowerCase()}</Badge>
                  {hijo.transporte ? <Badge tone="info">Transporte</Badge> : null}
                  {hijo.comedor ? <Badge tone="info">Comedor</Badge> : null}
                </Row>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtle} />
            </Pressable>
          ))
        ) : (
          <Empty texto="No hay alumnos vinculados a tu cuenta. Comunicate con secretaría." />
        )}
      </DataState>
    </Screen>
  );
}

function AlumnoInicio() {
  const { data, loading, error, reload } = useData(() => api.portalAlumno());
  return (
    <Screen>
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <PageHeader title={`Hola, ${data.alumno.split(', ')[1] ?? data.alumno}`} subtitle={`${data.nivel ?? ''} · ${data.curso ?? 'Sin matrícula'}`} />
            <AlumnoVista alumno={data} />
          </>
        )}
      </DataState>
    </Screen>
  );
}

function DocenteInicio() {
  const { data, loading, error, reload } = useData(() => api.portalDocente());
  return (
    <Screen>
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <PageHeader title={`Prof. ${data.profesor.nombre} ${data.profesor.apellido}`} subtitle={data.profesor.especialidad ?? 'Docente'} />
            <Text style={styles.sectionTitle}>Materias a cargo</Text>
            {data.materias.length ? data.materias.map((m) => (
              <Card key={m.id} title={`${m.materia} · ${m.curso}`} right={<Badge tone="info">{m.alumnos.length} alumnos</Badge>}>
                {m.alumnos.length ? m.alumnos.map((a) => <InfoRow key={a.dni} label={a.alumno}>{a.dni}</InfoRow>) : <Empty texto="Sin alumnos matriculados." />}
              </Card>
            )) : <Empty texto="No tenés materias asignadas." />}
            <Text style={styles.sectionTitle}>Comisiones deportivas</Text>
            {data.comisiones.length ? data.comisiones.map((c) => (
              <Card key={c.id} title={`${c.deporte} · ${c.comision}`} right={<Badge tone="info">{c.alumnos.length}/{c.cupo}</Badge>}>
                <Text style={styles.small}>{horarios(c.horarios)}</Text>
                {c.alumnos.length ? c.alumnos.map((a) => (
                  <ListItem key={a.dni} title={a.alumno} subtitle={`DNI ${a.dni}${a.alergias && a.alergias !== 'Ninguna' ? ` · Alergias: ${a.alergias}` : ''}`}
                    right={<Badge tone={a.apto === 'Vigente' ? 'success' : 'danger'}>{a.apto}</Badge>} />
                )) : <Empty texto="Sin inscriptos." />}
              </Card>
            )) : <Empty texto="No tenés comisiones deportivas a cargo." />}
          </>
        )}
      </DataState>
    </Screen>
  );
}

const s = StyleSheet.create({
  user: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 25, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '800', color: colors.textStrong },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  track: { height: 10, borderRadius: 999, backgroundColor: colors.backgroundSoft, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },
  menuItem: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  menuText: { fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  child: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
