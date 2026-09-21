import { FormEvent, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Database, PlusCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button';
import { api } from '../services/api';
import type {
  Alumno,
  Curso,
  Docente,
  Instalacion,
  Noticia,
  Opinion,
  PostulacionEmpleo,
  Servicio,
  SolicitudInscripcion,
  UsuarioAcceso,
} from '../types';

type AdminData = {
  solicitudes: SolicitudInscripcion[];
  opiniones: Opinion[];
  postulaciones: PostulacionEmpleo[];
  alumnos: Alumno[];
  docentes: Docente[];
  cursos: Curso[];
  servicios: Servicio[];
  instalaciones: Instalacion[];
  noticias: Noticia[];
  usuarios: UsuarioAcceso[];
};

const emptyData: AdminData = {
  solicitudes: [],
  opiniones: [],
  postulaciones: [],
  alumnos: [],
  docentes: [],
  cursos: [],
  servicios: [],
  instalaciones: [],
  noticias: [],
  usuarios: [],
};

export function AdminPanel() {
  const [data, setData] = useState<AdminData>(emptyData);
  const [status, setStatus] = useState('Cargando datos...');
  const [alumno, setAlumno] = useState({ nombre: '', apellido: '', nivel: 'Inicial', curso: 'Sala de 5', division: 'A' });
  const [docente, setDocente] = useState({ nombre: '', apellido: '', email: '', especialidad: '' });
  const [curso, setCurso] = useState({ nivel: 'Primario', anio: '', division: 'A', turno: 'Manana', descripcion: '' });
  const [noticia, setNoticia] = useState({ titulo: '', descripcion: '', tipo: 'Institucional' });
  const [servicio, setServicio] = useState({ nombre: '', descripcion: '', tipo: 'general', icono: 'school' });
  const [instalacion, setInstalacion] = useState({ nombre: '', descripcion: '', tipo: 'educativa', imagen_url: '' });

  async function loadData() {
    setStatus('Cargando datos...');
    try {
      const [solicitudes, opiniones, postulaciones, alumnos, docentes, cursos, servicios, instalaciones, noticias, usuarios] = await Promise.all([
        api.getSolicitudes(),
        api.getOpiniones(true),
        api.getPostulaciones(),
        api.getAlumnos(),
        api.getDocentes(),
        api.getCursos(),
        api.getServicios(),
        api.getInstalaciones(),
        api.getNoticias(true),
        api.getUsuarios(),
      ]);
      setData({ solicitudes, opiniones, postulaciones, alumnos, docentes, cursos, servicios, instalaciones, noticias, usuarios });
      setStatus('Datos actualizados.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function submitAndReload(event: FormEvent<HTMLFormElement>, action: () => Promise<unknown>, message: string) {
    event.preventDefault();
    setStatus(message);
    await action();
    await loadData();
  }

  return (
    <div className="internal-page admin-page">
      <header className="internal-header">
        <a href="/" className="text-button"><ArrowLeft size={17} /> Volver al sitio</a>
        <strong>Panel de gestion</strong>
      </header>

      <main className="admin-shell">
        <div className="admin-hero">
          <Database size={38} />
          <div>
            <span className="eyebrow">Administracion demo</span>
            <h1>Panel de gestion institucional</h1>
            <p>Vista simple para administrar los modulos principales del Proyecto Integrador.</p>
          </div>
          <Button onClick={loadData} type="button"><RefreshCw size={18} /> Actualizar</Button>
        </div>

        <div className="admin-stats">
          <Stat label="Solicitudes" value={data.solicitudes.length} />
          <Stat label="Opiniones" value={data.opiniones.length} />
          <Stat label="Postulaciones" value={data.postulaciones.length} />
          <Stat label="Alumnos" value={data.alumnos.length} />
          <Stat label="Docentes" value={data.docentes.length} />
          <Stat label="Cursos" value={data.cursos.length} />
        </div>

        <span className="admin-status">{status}</span>

        <section className="admin-section">
          <h2>Acciones rapidas</h2>
          <div className="quick-forms">
            <form onSubmit={(event) => submitAndReload(event, () => api.crearAlumno(alumno), 'Creando alumno...')}>
              <h3><PlusCircle size={17} /> Crear alumno</h3>
              <input required placeholder="Nombre" value={alumno.nombre} onChange={(event) => setAlumno({ ...alumno, nombre: event.target.value })} />
              <input required placeholder="Apellido" value={alumno.apellido} onChange={(event) => setAlumno({ ...alumno, apellido: event.target.value })} />
              <input required placeholder="Nivel" value={alumno.nivel} onChange={(event) => setAlumno({ ...alumno, nivel: event.target.value })} />
              <Button type="submit">Guardar</Button>
            </form>

            <form onSubmit={(event) => submitAndReload(event, () => api.crearDocente(docente), 'Creando docente...')}>
              <h3><PlusCircle size={17} /> Crear docente</h3>
              <input required placeholder="Nombre" value={docente.nombre} onChange={(event) => setDocente({ ...docente, nombre: event.target.value })} />
              <input required placeholder="Apellido" value={docente.apellido} onChange={(event) => setDocente({ ...docente, apellido: event.target.value })} />
              <input required type="email" placeholder="Email" value={docente.email} onChange={(event) => setDocente({ ...docente, email: event.target.value })} />
              <input required placeholder="Especialidad" value={docente.especialidad} onChange={(event) => setDocente({ ...docente, especialidad: event.target.value })} />
              <Button type="submit">Guardar</Button>
            </form>

            <form onSubmit={(event) => submitAndReload(event, () => api.crearCurso(curso), 'Creando curso...')}>
              <h3><PlusCircle size={17} /> Crear curso</h3>
              <input required placeholder="Nivel" value={curso.nivel} onChange={(event) => setCurso({ ...curso, nivel: event.target.value })} />
              <input required placeholder="Anio" value={curso.anio} onChange={(event) => setCurso({ ...curso, anio: event.target.value })} />
              <input required placeholder="Turno" value={curso.turno} onChange={(event) => setCurso({ ...curso, turno: event.target.value })} />
              <Button type="submit">Guardar</Button>
            </form>

            <form onSubmit={(event) => submitAndReload(event, () => api.crearNoticia(noticia), 'Creando noticia...')}>
              <h3><PlusCircle size={17} /> Crear noticia</h3>
              <input required placeholder="Titulo" value={noticia.titulo} onChange={(event) => setNoticia({ ...noticia, titulo: event.target.value })} />
              <input required placeholder="Tipo" value={noticia.tipo} onChange={(event) => setNoticia({ ...noticia, tipo: event.target.value })} />
              <textarea required placeholder="Descripcion" rows={3} value={noticia.descripcion} onChange={(event) => setNoticia({ ...noticia, descripcion: event.target.value })} />
              <Button type="submit">Guardar</Button>
            </form>

            <form onSubmit={(event) => submitAndReload(event, () => api.crearServicio(servicio), 'Creando servicio...')}>
              <h3><PlusCircle size={17} /> Crear servicio</h3>
              <input required placeholder="Nombre" value={servicio.nombre} onChange={(event) => setServicio({ ...servicio, nombre: event.target.value })} />
              <input required placeholder="Tipo" value={servicio.tipo} onChange={(event) => setServicio({ ...servicio, tipo: event.target.value })} />
              <textarea required placeholder="Descripcion" rows={3} value={servicio.descripcion} onChange={(event) => setServicio({ ...servicio, descripcion: event.target.value })} />
              <Button type="submit">Guardar</Button>
            </form>

            <form onSubmit={(event) => submitAndReload(event, () => api.crearInstalacion(instalacion), 'Creando instalacion...')}>
              <h3><PlusCircle size={17} /> Crear instalacion</h3>
              <input required placeholder="Nombre" value={instalacion.nombre} onChange={(event) => setInstalacion({ ...instalacion, nombre: event.target.value })} />
              <input required placeholder="Tipo" value={instalacion.tipo} onChange={(event) => setInstalacion({ ...instalacion, tipo: event.target.value })} />
              <textarea required placeholder="Descripcion" rows={3} value={instalacion.descripcion} onChange={(event) => setInstalacion({ ...instalacion, descripcion: event.target.value })} />
              <Button type="submit">Guardar</Button>
            </form>
          </div>
        </section>

        <section className="admin-grid">
          <AdminList title="Solicitudes de inscripcion">
            {data.solicitudes.map((item) => (
              <AdminItem key={item.id} title={item.nombre_aspirante} subtitle={`${item.nivel_solicitado} - ${item.estado_tramite ?? 'recibida'}`}>
                <button onClick={() => api.cambiarEstadoSolicitud(item.id!, 'en revision').then(loadData)}>En revision</button>
                <button onClick={() => api.cambiarEstadoSolicitud(item.id!, 'aprobada').then(loadData)}>Aprobar</button>
              </AdminItem>
            ))}
          </AdminList>

          <AdminList title="Opiniones web">
            {data.opiniones.map((item) => (
              <AdminItem key={item.id} title={item.autor_anonimo} subtitle={item.estado_moderacion}>
                <button onClick={() => api.moderarOpinion(item.id, 'visible').then(loadData)}>Publicar</button>
                <button onClick={() => api.moderarOpinion(item.id, 'oculta').then(loadData)}>Ocultar</button>
              </AdminItem>
            ))}
          </AdminList>

          <AdminList title="Postulaciones">
            {data.postulaciones.map((item) => (
              <AdminItem key={item.id} title={item.nombre_candidato} subtitle={`${item.puesto_interes} - ${item.estado ?? 'recibida'}`}>
                <button onClick={() => api.cambiarEstadoPostulacion(item.id!, 'en revision').then(loadData)}>En revision</button>
                <button onClick={() => api.cambiarEstadoPostulacion(item.id!, 'contactar').then(loadData)}>Contactar</button>
              </AdminItem>
            ))}
          </AdminList>

          <AdminList title="Alumnos">
            {data.alumnos.map((item) => <AdminItem key={item.id} title={`${item.nombre} ${item.apellido}`} subtitle={`${item.nivel} ${item.curso} ${item.division}`} />)}
          </AdminList>

          <AdminList title="Docentes">
            {data.docentes.map((item) => <AdminItem key={item.id} title={`${item.nombre} ${item.apellido}`} subtitle={item.especialidad} />)}
          </AdminList>

          <AdminList title="Cursos">
            {data.cursos.map((item) => <AdminItem key={item.id} title={`${item.nivel} ${item.anio} ${item.division}`} subtitle={item.turno} />)}
          </AdminList>

          <AdminList title="Servicios">
            {data.servicios.map((item) => <AdminItem key={item.id} title={item.nombre} subtitle={item.tipo} />)}
          </AdminList>

          <AdminList title="Instalaciones">
            {data.instalaciones.map((item) => <AdminItem key={item.id} title={item.nombre} subtitle={item.tipo} />)}
          </AdminList>

          <AdminList title="Noticias">
            {data.noticias.map((item) => <AdminItem key={item.id} title={item.titulo} subtitle={`${item.tipo} - ${item.visible ? 'visible' : 'oculta'}`} />)}
          </AdminList>

          <AdminList title="Usuarios demo">
            {data.usuarios.map((item) => <AdminItem key={item.id} title={item.email} subtitle={`${item.rol} - ${item.estado}`} />)}
          </AdminList>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AdminList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="admin-list">
      <h2>{title}</h2>
      <div>{children}</div>
    </article>
  );
}

function AdminItem({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="admin-item">
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {children && <div className="admin-actions">{children}</div>}
    </div>
  );
}
