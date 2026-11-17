// Inicio publico: misma informacion institucional que el sitio web.
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CONTACTO, fecha, hora, horarios } from '../../../shared/format';
import { colors, institucion, radius } from '../../../shared/theme';
import type { Comision } from '../../../shared/types';
import { Logo } from '../components/Logo';
import { Alert, Button, Card, Chip, Field, Input, Row, Select, styles } from '../components/ui';
import type { IconName } from '../components/ui';
import { SITE_URL, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAction, useData } from '../lib/useData';

const pilares: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: 'time-outline', titulo: 'Jornada extendida', texto: 'Más tiempo de aprendizaje, talleres y acompañamiento dentro de la escuela.' },
  { icon: 'globe-outline', titulo: 'Formación plurilingüe', texto: 'Inglés desde el Nivel Inicial; Portugués y Francés desde el Primario.' },
  { icon: 'trophy-outline', titulo: 'Deporte propio', texto: 'Pileta, canchas, pista de atletismo y gimnasio cubierto, con profesores del centro.' },
  { icon: 'medkit-outline', titulo: 'Bienestar integral', texto: 'Apoyo estudiantil, enfermería, comedor y transporte para toda la jornada.' },
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
            {[['3', 'niveles'], ['3', 'idiomas'], ['9', 'deportes']].map(([n, t]) => (
              <View key={t}><Text style={s.heroStat}>{n}</Text><Text style={s.heroStatLabel}>{t}</Text></View>
            ))}
          </Row>
        </View>

        <View style={s.section}>
          <Text style={s.eyebrow}>QUIÉNES SOMOS</Text>
          <Text style={s.sectionTitle}>Una escuela pensada para transformar</Text>
          <Text style={styles.muted}>Institución de gestión privada de alta calidad educativa, en las afueras de Resistencia. Inicia sus actividades en marzo de 2027.</Text>
          <Text style={s.mision}>Inspiramos, desafiamos y empoderamos a todos nuestros alumnos a ser miembros comprometidos y éticos de una comunidad global, para que se conviertan en agentes de cambio conscientes de sí mismos, seguros, innovadores y colaborativos.</Text>
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
          <Text style={s.eyebrow}>BIENESTAR ESTUDIANTIL</Text>
          <Text style={s.sectionTitle}>Acompañamos toda la jornada</Text>
          <Card title="Apoyo estudiantil"><Text style={styles.muted}>Gabinete psicopedagógico, tutorías, clases de apoyo y orientación vocacional.</Text></Card>
          <Card title="Laboratorios"><Text style={styles.muted}>Computación, física y química, equipados para el trabajo práctico.</Text></Card>
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

        <Galeria />
        <Opiniones />
        <Empleo />

        <View style={[s.section, s.soft]}>
          <Text style={s.eyebrow}>CONTACTO</Text>
          <Text style={s.sectionTitle}>Estamos para ayudarte</Text>
          <Button title={`WhatsApp ${CONTACTO.whatsappTexto}`} icon="logo-whatsapp" style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }} onPress={() => Linking.openURL(`https://wa.me/${CONTACTO.whatsapp}`)} />
          <Row>
            <Button title="Instagram" variant="outline" icon="logo-instagram" small onPress={() => Linking.openURL(CONTACTO.instagram)} />
            <Button title="Facebook" variant="outline" icon="logo-facebook" small onPress={() => Linking.openURL(CONTACTO.facebook)} />
            <Button title="Formulario" variant="outline" icon="mail-outline" small onPress={() => router.push('/contacto')} />
          </Row>
        </View>

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

const fotos = [
  { archivo: 'edificio.jpg', titulo: 'Edificio principal' },
  { archivo: 'pileta.svg', titulo: 'Pileta de natación' },
  { archivo: 'cancha.svg', titulo: 'Canchas de fútbol' },
  { archivo: 'gimnasio.svg', titulo: 'Gimnasio cubierto' },
  { archivo: 'laboratorio.svg', titulo: 'Laboratorios' },
  { archivo: 'comedor.svg', titulo: 'Comedor' },
];

// Las imágenes se toman del sitio web publicado (carpeta /galeria).
function Galeria() {
  return (
    <View style={s.section}>
      <Text style={s.eyebrow}>GALERÍA</Text>
      <Text style={s.sectionTitle}>Conocé nuestras instalaciones</Text>
      <Text style={styles.small}>Algunas imágenes son ilustraciones del proyecto.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {fotos.map((f) => {
          const uri = `${SITE_URL}/galeria/${f.archivo}`;
          return (
            <View key={f.archivo} style={s.foto}>
              {f.archivo.endsWith('.svg') ? <SvgUri uri={uri} width={240} height={136} /> : <Image source={{ uri }} style={{ width: 240, height: 136 }} />}
              <Text style={s.fotoTitulo}>{f.titulo}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Cualquier visitante puede opinar sin iniciar sesión.
function Opiniones() {
  const { data, reload } = useData(() => api.opiniones());
  const [form, setForm] = useState({ nombre: '', relacion: 'Familia', comentario: '', puntaje: 5 });
  const accion = useAction();
  return (
    <View style={[s.section, s.soft]}>
      <Text style={s.eyebrow}>OPINIONES</Text>
      <Text style={s.sectionTitle}>Lo que dice nuestra comunidad</Text>
      {(data ?? []).slice(0, 4).map((o) => (
        <Card key={o.id}>
          <Text style={s.estrellas}>{'★'.repeat(o.puntaje)}{'☆'.repeat(5 - o.puntaje)}</Text>
          <Text style={{ color: colors.text }}>{o.comentario}</Text>
          <Text style={styles.small}>{o.nombre} · {o.relacion}</Text>
        </Card>
      ))}
      <Card title="Dejá tu opinión (sin registrarte)">
        {accion.message && <Alert tipo={accion.message.tipo} onClose={() => accion.setMessage(null)}>{accion.message.texto}</Alert>}
        <Field label="Nombre"><Input value={form.nombre} onChangeText={(nombre) => setForm({ ...form, nombre })} maxLength={80} /></Field>
        <Field label="Soy">
          <Select value={form.relacion} onChange={(relacion) => setForm({ ...form, relacion })} options={['Familia', 'Alumno', 'Ex alumno', 'Docente', 'Visitante'].map((r) => ({ value: r, label: r }))} />
        </Field>
        <Row>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setForm({ ...form, puntaje: n })} accessibilityRole="radio" accessibilityLabel={`${n} estrellas`} accessibilityState={{ checked: form.puntaje === n }}>
              <Ionicons name={n <= form.puntaje ? 'star' : 'star-outline'} size={30} color={colors.amber} />
            </Pressable>
          ))}
        </Row>
        <Field label="Tu opinión"><Input value={form.comentario} onChangeText={(comentario) => setForm({ ...form, comentario })} multiline maxLength={600} style={{ minHeight: 80 }} /></Field>
        <Button title="Publicar opinión" loading={accion.busy} disabled={!form.nombre || form.comentario.length < 5} onPress={() => accion.run(async () => {
          await api.enviarOpinion(form);
          setForm({ nombre: '', relacion: 'Familia', comentario: '', puntaje: 5 });
          reload();
        }, '¡Gracias por tu opinión!')} />
      </Card>
    </View>
  );
}

function Empleo() {
  const { data } = useData(() => api.empleos());
  const [busqueda, setBusqueda] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', mensaje: '' });
  const accion = useAction();
  const puesto = data?.find((b) => b.id === busqueda)?.puesto;
  return (
    <View style={s.section}>
      <Text style={s.eyebrow}>EMPLEO</Text>
      <Text style={s.sectionTitle}>Sumate a nuestro equipo</Text>
      <Row>{(data ?? []).map((b) => <Chip key={b.id} label={b.puesto} active={busqueda === b.id} onPress={() => setBusqueda(b.id)} />)}</Row>
      {(data ?? []).filter((b) => b.id === busqueda).map((b) => <Text key={b.id} style={styles.muted}>{b.area} · {b.modalidad}. {b.descripcion}</Text>)}
      {busqueda && (
        <Card title={`Postularme: ${puesto}`}>
          {accion.message && <Alert tipo={accion.message.tipo} onClose={() => accion.setMessage(null)}>{accion.message.texto}</Alert>}
          <Field label="Nombre y apellido"><Input value={form.nombre} onChangeText={(nombre) => setForm({ ...form, nombre })} /></Field>
          <Field label="Email"><Input value={form.email} onChangeText={(email) => setForm({ ...form, email })} autoCapitalize="none" keyboardType="email-address" /></Field>
          <Field label="Teléfono"><Input value={form.telefono} onChangeText={(telefono) => setForm({ ...form, telefono })} keyboardType="phone-pad" /></Field>
          <Field label="Mensaje"><Input value={form.mensaje} onChangeText={(mensaje) => setForm({ ...form, mensaje })} multiline /></Field>
          <Button title="Enviar postulación" icon="briefcase-outline" loading={accion.busy} disabled={!form.nombre || !form.email} onPress={() => accion.run(async () => {
            await api.postular({ ...form, busqueda_id: busqueda, puesto });
            setForm({ nombre: '', email: '', telefono: '', mensaje: '' });
          }, 'Recibimos tu postulación. ¡Gracias!')} />
        </Card>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  mision: { backgroundColor: colors.amberSoft, borderLeftWidth: 4, borderLeftColor: colors.amber, padding: 12, borderRadius: radius.md, fontStyle: 'italic', color: colors.textStrong },
  foto: { width: 240, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  fotoTitulo: { padding: 10, fontWeight: '700', color: colors.textStrong },
  estrellas: { color: colors.amber, fontSize: 16, letterSpacing: 2 },
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
