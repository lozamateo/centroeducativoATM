import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { api } from '../services/api';
import type { ActividadEscolar, AsignacionDocente, Curso, Instalacion, Noticia, Servicio, UsuarioAcceso } from '../types';

const demoUsers = [
  ['admin@educar.com', 'admin123', 'admin'],
  ['docente@educar.com', 'docente123', 'docente'],
  ['padre@educar.com', 'padre123', 'padre'],
  ['alumno@educar.com', 'alumno123', 'alumno'],
  ['personal@educar.com', 'personal123', 'personal'],
];

const roleDescriptions = {
  admin: 'Acceso general a la gestión institucional y sus módulos administrativos.',
  docente: 'Acceso a cursos, materias y horarios asignados.',
  padre: 'Acceso a avisos institucionales y actividades para las familias.',
  alumno: 'Acceso a novedades y actividades escolares.',
  personal: 'Acceso a servicios e instalaciones de la institución.',
};

type RoleData = {
  noticias?: Noticia[];
  actividades?: ActividadEscolar[];
  cursos?: Curso[];
  asignaciones?: AsignacionDocente[];
  servicios?: Servicio[];
  instalaciones?: Instalacion[];
};

export function LoginDemoPage() {
  const [email, setEmail] = useState('admin@educar.com');
  const [password, setPassword] = useState('admin123');
  const [usuario, setUsuario] = useState<UsuarioAcceso | null>(null);
  const [roleData, setRoleData] = useState<RoleData>({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!usuario) return;

    async function loadRoleData() {
      const [noticias, actividades, cursos, asignaciones, servicios, instalaciones] = await Promise.all([
        api.getNoticias(),
        api.getActividades(),
        api.getCursos(),
        api.getAsignaciones(),
        api.getServicios(),
        api.getInstalaciones(),
      ]);
      setRoleData({ noticias, actividades, cursos, asignaciones, servicios, instalaciones });
    }

    loadRoleData().catch(() => setStatus('No se pudieron cargar todos los datos del rol.'));
  }, [usuario]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Validando credenciales demo...');
    try {
      const response = await api.loginDemo(email, password);
      setUsuario(response.usuario);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo iniciar sesion.');
    }
  }

  return (
    <div className="internal-page">
      <header className="internal-header">
        <a href="/" className="text-button"><ArrowLeft size={17} /> Volver al sitio</a>
        <strong>Educar para Transformar</strong>
      </header>

      {!usuario ? (
        <main className="login-layout">
          <section>
            <span className="eyebrow">Acceso demo</span>
            <h1>Ingreso por roles</h1>
            <p>
              Este login es solo demostrativo para el TP. Permite mostrar vistas basicas para admin,
              docente, padre, alumno y personal sin implementar seguridad avanzada.
            </p>
            <div className="demo-credentials">
              {demoUsers.map(([userEmail, userPassword, role]) => (
                <button
                  type="button"
                  key={userEmail}
                  onClick={() => {
                    setEmail(userEmail);
                    setPassword(userPassword);
                  }}
                >
                  <span>{role}</span>
                  <strong>{userEmail}</strong>
                  <small>{userPassword}</small>
                </button>
              ))}
            </div>
          </section>

          <form className="form-card login-card" onSubmit={handleSubmit}>
            <KeyRound size={32} />
            <h2>Iniciar sesion</h2>
            <label>
              Email
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password demo
              <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <Button type="submit">Ingresar</Button>
            {status && <span className="form-status">{status}</span>}
          </form>
        </main>
      ) : (
        <main className="role-dashboard">
          <div className="role-hero">
            <ShieldCheck size={36} />
            <div>
              <span className="eyebrow">Rol {usuario.rol}</span>
              <h1>Bienvenido/a, {usuario.nombre || usuario.email}</h1>
              <p>{roleDescriptions[usuario.rol]}</p>
            </div>
            <div className="role-actions">
              {usuario.rol === 'admin' && <a className="btn btn-primary" href="/admin">Abrir panel general</a>}
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setUsuario(null);
                  setRoleData({});
                  setStatus('');
                }}
              >
                <LogOut size={18} /> Cambiar usuario
              </Button>
            </div>
          </div>
          <RoleContent usuario={usuario} data={roleData} />
        </main>
      )}
    </div>
  );
}

function RoleContent({ usuario, data }: { usuario: UsuarioAcceso; data: RoleData }) {
  if (usuario.rol === 'admin') {
    return (
      <div className="role-grid">
        <RoleCard title="Resumen institucional" items={[
          `${(data.noticias ?? []).length} noticias cargadas`,
          `${(data.actividades ?? []).length} actividades cargadas`,
          `${(data.cursos ?? []).length} cursos registrados`,
        ]} />
        <RoleCard title="Gestión disponible" items={['Solicitudes de inscripción', 'Opiniones y moderación', 'Postulaciones de empleo', 'Alumnos, docentes y cursos']} />
      </div>
    );
  }

  if (usuario.rol === 'docente') {
    return (
      <div className="role-grid">
        <RoleCard title="Cursos asignados" items={(data.cursos ?? []).map((curso) => `${curso.nivel} ${curso.anio} ${curso.division}`)} />
        <RoleCard title="Asignaciones" items={(data.asignaciones ?? []).map((item) => `${item.materia} - ${item.dia} ${item.horario}`)} />
      </div>
    );
  }

  if (usuario.rol === 'personal') {
    return (
      <div className="role-grid">
        <RoleCard title="Servicios" items={(data.servicios ?? []).map((servicio) => `${servicio.nombre}: ${servicio.tipo}`)} />
        <RoleCard title="Instalaciones" items={(data.instalaciones ?? []).map((item) => `${item.nombre}: ${item.disponible ? 'disponible' : 'no disponible'}`)} />
      </div>
    );
  }

  if (usuario.rol === 'padre') {
    return (
      <div className="role-grid">
        <RoleCard title="Avisos institucionales" items={(data.noticias ?? []).map((noticia) => noticia.titulo)} />
        <RoleCard title="Actividades" items={(data.actividades ?? []).map((actividad) => `${actividad.titulo} - ${actividad.nivel}`)} />
      </div>
    );
  }

  if (usuario.rol === 'alumno') {
    return (
      <div className="role-grid">
        <RoleCard title="Novedades para estudiantes" items={(data.noticias ?? []).map((noticia) => noticia.titulo)} />
        <RoleCard title="Agenda escolar" items={(data.actividades ?? []).map((actividad) => `${actividad.titulo} - ${actividad.fecha}`)} />
      </div>
    );
  }

  return null;
}

function RoleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="role-card">
      <BookOpen size={24} />
      <h2>{title}</h2>
      <ul>
        {items.length > 0 ? items.slice(0, 6).map((item) => <li key={item}><CalendarDays size={15} /> {item}</li>) : <li>No hay datos cargados.</li>}
      </ul>
    </article>
  );
}
