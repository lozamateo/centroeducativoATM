// Inicio publico: misma informacion institucional que el sitio web.
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fecha, hora, horarios } from '../../../shared/format';
import { colors, institucion, radius } from '../../../shared/theme';
import type { Comision } from '../../../shared/types';
import { Logo } from '../components/Logo';
import { Button, Card, Row, styles } from '../components/ui';
import type { IconName } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/useData';

const pilares: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: 'time-outline', titulo: 'Jornada extendida', texto: 'Más tiempo de aprendizaje, talleres y acompañamiento dentro de la escuela.' },
  { icon: 'globe-outline', titulo: 'Formación plurilingüe', texto: 'Inglés desde el Nivel Inicial y Portugués desde el Primario.' },
  { icon: 'trophy-outline', titulo: 'Deporte propio', texto: 'Seis disciplinas con profesores del centro y control de apto físico.' },
  { icon: 'medkit-outline', titulo: 'Bienestar integral', texto: 'Enfermería, comedor y transporte para toda la jornada.' },
];

export default function Inicio() {
  const router = useRouter();
  const { usuario } = useAuth();
  const niveles = useData(() => api.niveles());
  const deportes = useData(() => api.deportesPublicos());
  const recorridos = useData(() => api.recorridos());
  const noticias = useData(() => api.noticias());

  const porDeporte = (deportes.data ?? []).reduce<Record<string, Comision[]>>((acc, c) => {
    (acc[c.deporte] ??= []).push(c);
    return acc;
  }, {});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={s.header}>
        <Logo height={40} />
        <Button title={usuario ? 'Mi panel' : 'Ingresar'} icon="log-in-outline" small onPress={() => router.push(usuario ? '/panel' : '/login')} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.hero}>
          <View style={s.heroBadge}><Ionicons name="sparkles" size={14} color="#fff" /><Text style={s.heroBadgeText}>Apertura {institucion.apertura}</Text></View>
          <Text style={s.heroTitle}>{institucion.lema}</Text>
          <Text style={s.heroText}>Nivel Inicial, Primario y Secundario con jornada extendida, formación plurilingüe, deporte propio y servicios integrales en {institucion.ciudad}.</Text>
          <View style={{ gap: 10, marginTop: 6 }}>
            <Button title="Solicitar inscripción" variant="accent" icon="arrow-forward" onPress={() => router.push('/preinscripcion')} />
            <Button title="Contacto" variant="outline" icon="mail-outline" onPress={() => router.push('/contacto')} />
          </View>
          <Row style={{ marginTop: 18, gap: 22 }}>
            {[['3', 'niveles'], ['2', 'idiomas'], ['6', 'deportes']].map(([n, t]) => (
              <View key={t}><Text style={s.heroStat}>{n}</Text><Text style={s.heroStatLabel}>{t}</Text></View>
            ))}
          </Row>
        </View>

        <View style={s.section}>
          <Text style={s.eyebrow}>NUESTRA PROPUESTA</Text>
          <Text style={s.sectionTitle}>Una escuela pensada para transformar</Text>
          {pilares.map((p) => (
            <Card key={p.titulo}>
              <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 12 }}>
                <View style={s.icon}><Ionicons name={p.icon} size={22} color={colors.primary} /></View>
                <View style={{ flex: 1 }}><Text style={s.cardTitle}>{p.titulo}</Text><Text style={styles.muted}>{p.texto}</Text></View>
              </Row>
            </Card>
          ))}
        </View>

        <View style={[s.section, s.soft]}>
          <Text style={s.eyebrow}>NIVELES EDUCATIVOS</Text>
          <Text style={s.sectionTitle}>Desde los 3 hasta los 17 años</Text>
          {(niveles.data ?? []).map((n) => (
            <Card key={n.id}>
              <Text style={s.cardTitle}>Nivel {n.nombre}</Text>
              <Text style={s.age}>{n.edad_desde} a {n.edad_hasta} años</Text>
              <Text style={styles.muted}>{n.descripcion}</Text>
            </Card>
          ))}
        </View>

        <View style={[s.section, s.blue]}>
          <Text style={[s.eyebrow, { color: '#fff' }]}>ACTIVIDADES DEPORTIVAS</Text>
          <Text style={[s.sectionTitle, { color: '#fff' }]}>Deporte propio, con cupos y horarios claros</Text>
          <Text style={{ color: '#dbeafe' }}>Hasta 2 deportes por alumno, sin superposición horaria y con apto físico vigente.</Text>
          {Object.entries(porDeporte).map(([deporte, comisiones]) => (
            <View key={deporte} style={s.sport}>
              <Text style={s.sportTitle}>{deporte}</Text>
              {comisiones.map((c) => <Text key={c.id} style={{ color: '#dbeafe' }}><Text style={{ fontWeight: '800', color: '#fff' }}>{c.nivel}: </Text>{horarios(c.horarios)}</Text>)}
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.eyebrow}>SERVICIOS</Text>
          <Text style={s.sectionTitle}>Acompañamos toda la jornada</Text>
          <Card title="Transporte escolar">
            <Text style={styles.muted}>Cuatro recorridos oficiales con paradas fijas.</Text>
            {(recorridos.data ?? []).map((r) => (
              <View key={r.id} style={s.route}>
                <Text style={{ fontWeight: '700', color: colors.textStrong }}>{r.nombre}</Text>
                <Text style={styles.small}>{r.zona} · Ida {hora(r.horario_ida)} · Vuelta {hora(r.horario_vuelta)}</Text>
              </View>
            ))}
          </Card>
          <Card title="Comedor"><Text style={styles.muted}>Almuerzo o almuerzo y merienda, con menús para dietas especiales y control de alergias.</Text></Card>
          <Card title="Enfermería y credencial QR"><Text style={styles.muted}>Ficha médica y control del apto físico. La credencial QR habilita la participación deportiva.</Text></Card>
        </View>

        {!!noticias.data?.length && (
          <View style={[s.section, s.soft]}>
            <Text style={s.eyebrow}>NOVEDADES</Text>
            <Text style={s.sectionTitle}>Noticias del centro</Text>
            {noticias.data.slice(0, 5).map((n) => (
              <Card key={n.id}>
                {n.imagen_url ? <Image source={{ uri: n.imagen_url }} style={s.newsImage} /> : null}
                <Text style={s.newsMeta}>{n.categoria.toUpperCase()} · {fecha(n.fecha)}</Text>
                <Text style={s.cardTitle}>{n.titulo}</Text>
                <Text style={styles.muted}>{n.resumen}</Text>
              </Card>
            ))}
          </View>
        )}

        <View style={[s.section, s.footer]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{institucion.nombre}</Text>
          <Text style={s.footerText}><Ionicons name="location-outline" /> {institucion.direccion}</Text>
          <Text style={s.footerText}><Ionicons name="call-outline" /> {institucion.telefono}</Text>
          <Text style={s.footerText}><Ionicons name="mail-outline" /> {institucion.email}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  hero: { backgroundColor: colors.primary, padding: 22, paddingVertical: 34, gap: 12 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  heroBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '900', lineHeight: 38 },
  heroText: { color: '#eff6ff', fontSize: 16, lineHeight: 23 },
  heroStat: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroStatLabel: { color: '#dbeafe', fontSize: 12 },
  section: { padding: 18, gap: 12 },
  soft: { backgroundColor: colors.background },
  blue: { backgroundColor: colors.accent },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: colors.textStrong, marginBottom: 4 },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textStrong, marginBottom: 2 },
  age: { alignSelf: 'flex-start', backgroundColor: colors.amberSoft, color: '#92400e', fontWeight: '700', fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  sport: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.lg, padding: 14, gap: 4 },
  sportTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  route: { backgroundColor: colors.background, borderRadius: radius.md, padding: 10 },
  newsImage: { width: '100%', height: 150, borderRadius: radius.md },
  newsMeta: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  footer: { backgroundColor: colors.primaryDark, gap: 6 },
  footerText: { color: '#cbd5e1' },
});
