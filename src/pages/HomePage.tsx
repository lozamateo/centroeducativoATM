// Portal publico institucional.
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight, BookOpen, Briefcase, Bus, CalendarDays, Clock, Dumbbell, Facebook, Globe2, GraduationCap, HandHeart, HeartPulse,
  Instagram, LifeBuoy, LogIn, Mail, MapPin, Menu, MessageCircle, Phone, QrCode, Smartphone, Sparkles, Star, Trophy, Users,
  UtensilsCrossed, X,
} from 'lucide-react';
import type { Comision, Nivel } from '../../shared/types';
import { CONTACTO, horarios, hora, fecha } from '../../shared/format';
import { institucion } from '../../shared/theme';
import { Logo } from '../components/Logo';
import { Alert, Button, Field, Input, Select, Textarea } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Link } from '../lib/router';
import { useAction, useData } from '../lib/useData';

const nav = [
  { href: '#propuesta', label: 'Nosotros' },
  { href: '#niveles', label: 'Niveles' },
  { href: '#servicios', label: 'Bienestar' },
  { href: '#galeria', label: 'Galería' },
  { href: '#noticias', label: 'Noticias' },
  { href: '#opiniones', label: 'Opiniones' },
  { href: '#empleo', label: 'Empleo' },
  { href: '#contacto', label: 'Contacto' },
];

const nivelesRespaldo: Nivel[] = [
  { id: 1, nombre: 'Inicial', descripcion: 'Salas de 3, 4 y 5 años con jornada extendida y juego en inglés.', edad_desde: 3, edad_hasta: 5 },
  { id: 2, nombre: 'Primario', descripcion: 'De 1.º a 6.º grado con formación plurilingüe y deporte diario.', edad_desde: 6, edad_hasta: 11 },
  { id: 3, nombre: 'Secundario', descripcion: 'De 1.º a 6.º año con orientación en ciencias, idiomas y tecnología.', edad_desde: 12, edad_hasta: 17 },
];

const pilares = [
  { icon: <Clock />, titulo: 'Jornada extendida', texto: 'Más tiempo de aprendizaje, talleres y acompañamiento dentro de la escuela.' },
  { icon: <Globe2 />, titulo: 'Formación plurilingüe', texto: 'Inglés desde el Nivel Inicial; Portugués y Francés desde el Primario.' },
  { icon: <Trophy />, titulo: 'Deporte propio', texto: 'Pileta, canchas, pista de atletismo y gimnasio cubierto, con profesores del centro.' },
  { icon: <HeartPulse />, titulo: 'Bienestar integral', texto: 'Apoyo estudiantil, enfermería, comedor y transporte para toda la jornada.' },
];

export function HomePage() {
  return (
    <div className="site">
      <SiteHeader />
      <main>
        <Hero />
        <Propuesta />
        <Niveles />
        <Deportes />
        <Servicios />
        <Comunidad />
        <Galeria />
        <Noticias />
        <Opiniones />
        <Preinscripcion />
        <Empleo />
        <Contacto />
      </main>
      <SiteFooter />
      <a className="whatsapp-flotante" href={`https://wa.me/${CONTACTO.whatsapp}`} target="_blank" rel="noreferrer" aria-label="Escribinos por WhatsApp">
        <MessageCircle size={28} />
      </a>
    </div>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { usuario } = useAuth();
  const acceso = usuario ? (
    <Link className="btn btn-primary" href="/panel"><LogIn size={18} /> Mi panel</Link>
  ) : (
    <Link className="btn btn-primary" href="/login"><LogIn size={18} /> Ingresar</Link>
  );

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="#inicio" aria-label={institucion.nombre}><Logo /></a>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="header-actions">
          <a className="btn btn-outline desktop-only" href="#inscripcion">Pre-inscripción</a>
          {acceso}
          <button className="icon-button mobile-only" onClick={() => setOpen(!open)} aria-label="Abrir menú">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="Navegación móvil">
          {[...nav, { href: '#inscripcion', label: 'Pre-inscripción' }].map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="inicio" className="hero">
      <div className="container hero-layout">
        <div className="hero-content">
          <span className="hero-badge"><Sparkles size={18} /> Apertura {institucion.apertura}</span>
          <h1>{institucion.lema}</h1>
          <p>Nivel Inicial, Primario y Secundario con jornada extendida, formación plurilingüe, deporte propio y servicios integrales en {institucion.ciudad}.</p>
          <div className="hero-actions">
            <a className="btn btn-accent" href="#inscripcion">Solicitar inscripción <ArrowRight size={18} /></a>
            <a className="btn btn-outline-light" href="#propuesta">Conocer la propuesta</a>
          </div>
          <div className="hero-stats">
            <div><strong>3</strong><span>niveles educativos</span></div>
            <div><strong>3</strong><span>idiomas extranjeros</span></div>
            <div><strong>9</strong><span>deportes propios</span></div>
          </div>
        </div>
        <aside className="hero-card">
          <div className="hero-card-icon"><GraduationCap size={30} /></div>
          <h2>Todo en un solo lugar</h2>
          <p>Las familias gestionan matrícula, deportes, transporte y comedor desde la web o la aplicación móvil.</p>
          <ul>
            <li><MapPin size={17} /> {institucion.direccion}</li>
            <li><CalendarDays size={17} /> Ciclo lectivo 2027</li>
            <li><Smartphone size={17} /> Web y app para familias</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, text, light }: { eyebrow: string; title: string; text?: string; light?: boolean }) {
  return (
    <div className={`section-header ${light ? 'section-header-light' : ''}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

function Propuesta() {
  return (
    <section id="propuesta" className="section">
      <div className="container">
        <SectionHeader eyebrow="Quiénes somos" title="Una escuela pensada para transformar" text="Somos una institución de gestión privada de alta calidad educativa, ubicada en las afueras de Resistencia, que inicia sus actividades en marzo de 2027." />
        <blockquote className="mision">Inspiramos, desafiamos y empoderamos a todos nuestros alumnos a ser miembros comprometidos y éticos de una comunidad global, para que se conviertan en agentes de cambio conscientes de sí mismos, seguros, innovadores y colaborativos.</blockquote>
        <div className="grid grid-4">
          {pilares.map((pilar) => (
            <article key={pilar.titulo} className="feature-card">
              <div className="feature-icon">{pilar.icon}</div>
              <h3>{pilar.titulo}</h3>
              <p>{pilar.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Niveles() {
  const { data } = useData(() => api.niveles());
  const niveles = data?.length ? data : nivelesRespaldo;
  const iconos = [<Sparkles key="i" />, <BookOpen key="p" />, <GraduationCap key="s" />];

  return (
    <section id="niveles" className="section section-soft">
      <div className="container">
        <SectionHeader eyebrow="Niveles educativos" title="Desde los 3 hasta los 17 años" />
        <div className="grid grid-3">
          {niveles.map((nivel, index) => (
            <article key={nivel.id} className="level-card">
              <div className="level-icon">{iconos[index % 3]}</div>
              <h3>Nivel {nivel.nombre}</h3>
              <span className="level-age">{nivel.edad_desde} a {nivel.edad_hasta} años</span>
              <p>{nivel.descripcion}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Deportes() {
  const { data, error } = useData(() => api.deportesPublicos());
  const porDeporte = (data ?? []).reduce<Record<string, Comision[]>>((acc, comision) => {
    (acc[comision.deporte] ??= []).push(comision);
    return acc;
  }, {});

  return (
    <section id="deportes" className="section section-blue">
      <div className="container">
        <SectionHeader light eyebrow="Actividades deportivas" title="Deporte propio, con cupos y horarios claros" text="Cada alumno puede elegir hasta 2 deportes sin superposicion horaria, con apto físico vigente." />
        {error && <Alert tipo="info">Los horarios se publicaran próximamente.</Alert>}
        <div className="grid grid-3">
          {Object.entries(porDeporte).map(([deporte, comisiones]) => (
            <article key={deporte} className="sport-card">
              <h3><Dumbbell size={20} /> {deporte}</h3>
              {comisiones.map((comision) => (
                <div key={comision.id} className="sport-row">
                  <strong>{comision.nivel}</strong>
                  <span>{horarios(comision.horarios)}</span>
                </div>
              ))}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Servicios() {
  const { data: recorridos } = useData(() => api.recorridos());

  return (
    <section id="servicios" className="section">
      <div className="container">
        <SectionHeader eyebrow="Bienestar estudiantil" title="Acompañamos toda la jornada" text="Servicio de apoyo estudiantil, enfermería, comedor, transporte y laboratorios de computación, física y química." />
        <div className="grid grid-3 bienestar-extra">
          <article className="service-card">
            <div className="feature-icon"><LifeBuoy /></div>
            <h3>Apoyo estudiantil</h3>
            <p>Gabinete psicopedagógico, tutorías y clases de apoyo para acompañar las trayectorias de cada alumno.</p>
          </article>
          <article className="service-card">
            <div className="feature-icon"><HandHeart /></div>
            <h3>Convivencia y orientación</h3>
            <p>Talleres de convivencia, educación emocional y orientación vocacional en el Secundario.</p>
          </article>
          <article className="service-card">
            <div className="feature-icon"><BookOpen /></div>
            <h3>Laboratorios</h3>
            <p>Laboratorios de computación, física y química equipados para el trabajo práctico en todos los niveles.</p>
          </article>
        </div>
        <div className="grid grid-3">
          <article className="service-card">
            <div className="feature-icon"><Bus /></div>
            <h3>Transporte escolar</h3>
            <p>Cuatro recorridos oficiales con paradas fijas. Cada alumno se adhiere a un recorrido por ciclo lectivo.</p>
            <ul className="route-list">
              {(recorridos ?? []).map((recorrido) => (
                <li key={recorrido.id}>
                  <strong>{recorrido.nombre}</strong>
                  <span>{recorrido.zona} · Ida {hora(recorrido.horario_ida)} · Vuelta {hora(recorrido.horario_vuelta)}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="service-card">
            <div className="feature-icon"><UtensilsCrossed /></div>
            <h3>Comedor</h3>
            <p>Almuerzo o almuerzo y merienda, con menús para dietas especiales y control de alergias informado por enfermería.</p>
            <ul className="check-list">
              <li>Inscripción online por días de la semana</li>
              <li>Opción de vianda propia</li>
              <li>Menú adaptado por alergias</li>
            </ul>
          </article>
          <article className="service-card">
            <div className="feature-icon"><QrCode /></div>
            <h3>Enfermería y credencial QR</h3>
            <p>Ficha médica de cada alumno y control del apto físico. La credencial QR habilita la participacion deportiva.</p>
            <ul className="check-list">
              <li>Enfermería durante toda la jornada</li>
              <li>Aviso de apto físico vencido</li>
              <li>Credencial digital en la app</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function Comunidad() {
  const perfiles = [
    { icon: <Users />, titulo: 'Familias', texto: 'Matrícula online, deportes, transporte, comedor y credencial de sus hijos.' },
    { icon: <BookOpen />, titulo: 'Docentes', texto: 'Cursos, materias y comisiones a cargo con sus listados de alumnos.' },
    { icon: <GraduationCap />, titulo: 'Alumnos', texto: 'Su curso, materias, horarios de deportes y credencial QR.' },
  ];
  return (
    <section className="section section-soft">
      <div className="container community">
        <div>
          <span className="eyebrow">Comunidad educativa</span>
          <h2>Autogestión desde la web y la app</h2>
          <p>Con el mismo usuario se ingresa desde la computadora o desde el celular. Cada perfil ve solamente la información que le corresponde.</p>
          <Link className="btn btn-primary" href="/login"><LogIn size={18} /> Ingresar al sistema</Link>
        </div>
        <div className="community-list">
          {perfiles.map((perfil) => (
            <article key={perfil.titulo} className="community-item">
              <div className="feature-icon">{perfil.icon}</div>
              <div><h3>{perfil.titulo}</h3><p>{perfil.texto}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Noticias() {
  const { data } = useData(() => api.noticias());
  if (!data?.length) return null;
  return (
    <section id="noticias" className="section section-soft">
      <div className="container">
        <SectionHeader eyebrow="Novedades" title="Noticias del centro" />
        <div className="grid grid-3">
          {data.slice(0, 6).map((noticia) => (
            <article key={noticia.id} className="news-card">
              {noticia.imagen_url && <img src={noticia.imagen_url} alt="" loading="lazy" />}
              <div className="news-body">
                <span className="news-meta">{noticia.categoria} · {fecha(noticia.fecha)}</span>
                <h3>{noticia.titulo}</h3>
                <p>{noticia.resumen}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const solicitudInicial = {
  tutor_nombre: '', tutor_email: '', tutor_telefono: '', alumno_nombre: '', alumno_fecha_nac: '', nivel_id: '', anio_solicitado: '', comentarios: '',
};
const serviciosOpciones = ['Transporte', 'Comedor', 'Deportes'];

function Preinscripcion() {
  const { data: niveles } = useData(() => api.niveles());
  const [form, setForm] = useState(solicitudInicial);
  const [servicios, setServicios] = useState<string[]>([]);
  const { busy, message, run, setMessage } = useAction();
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [field]: e.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    let respuesta = '';
    const ok = await run(async () => {
      respuesta = (await api.enviarSolicitud({ ...form, nivel_id: Number(form.nivel_id), servicios })).mensaje;
    });
    if (ok) {
      setMessage({ tipo: 'ok', texto: respuesta });
      setForm(solicitudInicial);
      setServicios([]);
    }
  }

  return (
    <section id="inscripcion" className="section section-soft">
      <div className="container form-section">
        <div>
          <span className="eyebrow">Inscripciones 2027</span>
          <h2>Solicitud de pre-inscripción</h2>
          <p>Completa el formulario y secretaría se comunicará para coordinar una entrevista y completar la matrícula del ciclo lectivo.</p>
          <ul className="check-list">
            <li>Vacantes limitadas por curso</li>
            <li>Matrícula final online desde el portal de familias</li>
            <li>Sin costo de reserva</li>
          </ul>
        </div>
        <form className="card form-card" onSubmit={submit}>
          {message && <Alert tipo={message.tipo} onClose={() => setMessage(null)}>{message.texto}</Alert>}
          <div className="form-grid">
            <Field label="Nombre del padre, madre o tutor"><Input required value={form.tutor_nombre} onChange={set('tutor_nombre')} /></Field>
            <Field label="Teléfono"><Input required type="tel" value={form.tutor_telefono} onChange={set('tutor_telefono')} /></Field>
            <Field label="Email" full><Input required type="email" value={form.tutor_email} onChange={set('tutor_email')} /></Field>
            <Field label="Nombre del alumno"><Input required value={form.alumno_nombre} onChange={set('alumno_nombre')} /></Field>
            <Field label="Fecha de nacimiento"><Input type="date" value={form.alumno_fecha_nac} onChange={set('alumno_fecha_nac')} /></Field>
            <Field label="Nivel">
              <Select required value={form.nivel_id} onChange={set('nivel_id')}>
                <option value="">Seleccionar</option>
                {(niveles ?? nivelesRespaldo).map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Sala / grado / año"><Input placeholder="Ej: 3.º grado" value={form.anio_solicitado} onChange={set('anio_solicitado')} /></Field>
            <fieldset className="field field-full chips">
              <legend className="field-label">Servicios de interes</legend>
              {serviciosOpciones.map((servicio) => (
                <label key={servicio} className={`chip ${servicios.includes(servicio) ? 'chip-active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={servicios.includes(servicio)}
                    onChange={() => setServicios(servicios.includes(servicio) ? servicios.filter((s) => s !== servicio) : [...servicios, servicio])}
                  />
                  {servicio}
                </label>
              ))}
            </fieldset>
            <Field label="Comentarios" full><Textarea value={form.comentarios} onChange={set('comentarios')} /></Field>
          </div>
          <Button type="submit" loading={busy}>Enviar solicitud</Button>
        </form>
      </div>
    </section>
  );
}

function Contacto() {
  const inicial = { nombre: '', email: '', telefono: '', asunto: '', mensaje: '' };
  const [form, setForm] = useState(inicial);
  const { busy, message, run, setMessage } = useAction();
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [field]: e.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await run(() => api.enviarContacto(form), 'Gracias por escribirnos. Te responderemos a la brevedad.')) setForm(inicial);
  }

  return (
    <section id="contacto" className="section section-soft">
      <div className="container form-section">
        <div>
          <span className="eyebrow">Contacto</span>
          <h2>Estamos para ayudarte</h2>
          <ul className="contact-list">
            <li><MapPin size={20} /> {institucion.direccion}</li>
            <li><Phone size={20} /> {institucion.telefono}</li>
            <li><Mail size={20} /> {institucion.email}</li>
          </ul>
          <div className="redes">
            <a className="whatsapp" href={`https://wa.me/${CONTACTO.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp {CONTACTO.whatsappTexto}</a>
            <a href={CONTACTO.instagram} target="_blank" rel="noreferrer"><Instagram size={18} /> Instagram</a>
            <a href={CONTACTO.facebook} target="_blank" rel="noreferrer"><Facebook size={18} /> Facebook</a>
          </div>
        </div>
        <form className="card form-card" onSubmit={submit}>
          {message && <Alert tipo={message.tipo} onClose={() => setMessage(null)}>{message.texto}</Alert>}
          <div className="form-grid">
            <Field label="Nombre"><Input required value={form.nombre} onChange={set('nombre')} /></Field>
            <Field label="Email"><Input required type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label="Teléfono"><Input type="tel" value={form.telefono} onChange={set('telefono')} /></Field>
            <Field label="Asunto"><Input required value={form.asunto} onChange={set('asunto')} /></Field>
            <Field label="Mensaje" full><Textarea required maxLength={2000} value={form.mensaje} onChange={set('mensaje')} /></Field>
          </div>
          <Button type="submit" loading={busy}>Enviar mensaje</Button>
        </form>
      </div>
    </section>
  );
}

const fotos = [
  { src: '/galeria/edificio.jpg', titulo: 'Edificio principal' },
  { src: '/galeria/pileta.svg', titulo: 'Pileta de natación' },
  { src: '/galeria/cancha.svg', titulo: 'Canchas de fútbol' },
  { src: '/galeria/gimnasio.svg', titulo: 'Gimnasio cubierto' },
  { src: '/galeria/laboratorio.svg', titulo: 'Laboratorios' },
  { src: '/galeria/comedor.svg', titulo: 'Comedor' },
];

function Galeria() {
  return (
    <section id="galeria" className="section">
      <div className="container">
        <SectionHeader eyebrow="Galería" title="Conocé nuestras instalaciones" text="Pileta de natación, canchas de fútbol, pista de atletismo, gimnasio cubierto, laboratorios y comedor. Algunas imágenes son ilustraciones del proyecto." />
        <div className="galeria">
          {fotos.map((f) => (
            <figure key={f.src}>
              <img src={f.src} alt={f.titulo} loading="lazy" />
              <figcaption>{f.titulo}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// Si la API no responde una lista (por ejemplo, sin conexión), la sección queda vacía en lugar de romper la página.
const lista = <T,>(datos: T[] | null | undefined): T[] => (Array.isArray(datos) ? datos : []);

const estrellas = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

// Cualquier visitante puede dejar su opinión sin iniciar sesión.
function Opiniones() {
  const { data, reload } = useData(() => api.opiniones());
  const [form, setForm] = useState({ nombre: '', relacion: 'Familia', comentario: '', puntaje: 5 });
  const { busy, message, setMessage, run } = useAction();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => api.enviarOpinion(form), '¡Gracias por tu opinión!')) {
      setForm({ nombre: '', relacion: 'Familia', comentario: '', puntaje: 5 });
      reload();
    }
  };

  return (
    <section id="opiniones" className="section">
      <div className="container">
        <SectionHeader eyebrow="Opiniones" title="Lo que dice nuestra comunidad" text="Dejanos tu opinión: no hace falta registrarse." />
        <div className="grid grid-2">
          <div className="stack">
            {lista(data).slice(0, 6).map((o) => (
              <article key={o.id} className="card opinion">
                <span className="estrellas" aria-label={`${o.puntaje} de 5 estrellas`}>{estrellas(o.puntaje)}</span>
                <p>{o.comentario}</p>
                <small className="muted">{o.nombre} · {o.relacion}</small>
              </article>
            ))}
          </div>
          <form className="card form-card" onSubmit={submit}>
            {message && <Alert tipo={message.tipo} onClose={() => setMessage(null)}>{message.texto}</Alert>}
            <div className="form-grid">
              <Field label="Nombre"><Input required maxLength={80} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
              <Field label="Soy">
                <Select value={form.relacion} onChange={(e) => setForm({ ...form, relacion: e.target.value })}>
                  {['Familia', 'Alumno', 'Ex alumno', 'Docente', 'Visitante'].map((r) => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Puntaje" full>
                <div className="estrellas-input" role="radiogroup" aria-label="Puntaje">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={form.puntaje === n} aria-label={`${n} estrellas`}
                      className={n <= form.puntaje ? 'activa' : ''} onClick={() => setForm({ ...form, puntaje: n })}><Star size={26} fill="currentColor" /></button>
                  ))}
                </div>
              </Field>
              <Field label="Tu opinión" full><Textarea required minLength={5} maxLength={600} value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} /></Field>
            </div>
            <Button type="submit" loading={busy}>Publicar opinión</Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Empleo() {
  const { data } = useData(() => api.empleos());
  const [form, setForm] = useState({ busqueda_id: '', puesto: '', nombre: '', email: '', telefono: '', cv_url: '', mensaje: '' });
  const { busy, message, setMessage, run } = useAction();
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const puesto = lista(data).find((b) => b.id === Number(form.busqueda_id))?.puesto ?? form.puesto;
    if (await run(() => api.postular({ ...form, puesto }), 'Recibimos tu postulación. ¡Gracias!')) {
      setForm({ busqueda_id: '', puesto: '', nombre: '', email: '', telefono: '', cv_url: '', mensaje: '' });
    }
  };

  return (
    <section id="empleo" className="section">
      <div className="container form-section">
        <div>
          <span className="eyebrow">Empleo</span>
          <h2>Sumate a nuestro equipo</h2>
          <p>Buscamos docentes, profesionales y personal de apoyo comprometidos con la educación.</p>
          <ul className="route-list">
            {lista(data).map((b) => (
              <li key={b.id}><strong><Briefcase size={16} /> {b.puesto}</strong><span>{b.area} · {b.modalidad}. {b.descripcion}</span></li>
            ))}
          </ul>
        </div>
        <form className="card form-card" onSubmit={submit}>
          {message && <Alert tipo={message.tipo} onClose={() => setMessage(null)}>{message.texto}</Alert>}
          <div className="form-grid">
            <Field label="Búsqueda" full>
              <Select value={form.busqueda_id} onChange={set('busqueda_id')}>
                <option value="">Postulación espontánea</option>
                {lista(data).map((b) => <option key={b.id} value={b.id}>{b.puesto}</option>)}
              </Select>
            </Field>
            {!form.busqueda_id && <Field label="Puesto de interés" full><Input required value={form.puesto} onChange={set('puesto')} /></Field>}
            <Field label="Nombre y apellido"><Input required value={form.nombre} onChange={set('nombre')} /></Field>
            <Field label="Email"><Input required type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label="Teléfono"><Input type="tel" value={form.telefono} onChange={set('telefono')} /></Field>
            <Field label="Enlace a tu CV"><Input type="url" placeholder="https://..." value={form.cv_url} onChange={set('cv_url')} /></Field>
            <Field label="Mensaje" full><Textarea maxLength={2000} value={form.mensaje} onChange={set('mensaje')} /></Field>
          </div>
          <Button type="submit" loading={busy}>Enviar postulación</Button>
        </form>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-logo-box"><Logo /></div>
          <p>Institución de gestión privada. Apertura {institucion.apertura}.</p>
        </div>
        <div>
          <h3>Contacto</h3>
          <ul className="footer-list">
            <li><MapPin size={16} /> {institucion.direccion}</li>
            <li><Phone size={16} /> {institucion.telefono}</li>
            <li><Mail size={16} /> {institucion.email}</li>
          </ul>
        </div>
        <div>
          <h3>Enlaces</h3>
          <ul className="footer-list">
            {nav.map((item) => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}
            <li><Link href="/login">Ingresar al sistema</Link></li>
            <li><a href={`https://wa.me/${CONTACTO.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a></li>
            <li><Link href="/calidad">Calidad y CI/CD</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">© 2027 {institucion.nombre}. Todos los derechos reservados.</div>
    </footer>
  );
}
