import { FormEvent, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2, Users } from 'lucide-react';
import { Button } from './Button';
import { api } from '../services/api';
import type { Alumno, Curso } from '../types';

type AlumnoForm = {
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  domicilio: string;
  telefono: string;
  correo_electronico: string;
  nivel: string;
  curso: string;
  division: string;
  tutor_nombre: string;
  tutor_email: string;
  tutor_telefono: string;
};

const emptyForm: AlumnoForm = {
  legajo: '',
  nombre: '',
  apellido: '',
  dni: '',
  fecha_nacimiento: '',
  domicilio: '',
  telefono: '',
  correo_electronico: '',
  nivel: 'Inicial',
  curso: '',
  division: '',
  tutor_nombre: '',
  tutor_email: '',
  tutor_telefono: '',
};

const niveles = ['Inicial', 'Primario', 'Secundario'];

type Props = {
  alumnos: Alumno[];
  cursos: Curso[];
  onChange: () => void;
};

export function AlumnosManager({ alumnos, cursos, onChange }: Props) {
  const [form, setForm] = useState<AlumnoForm>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('activo');

  const cursosDelNivel = useMemo(() => cursos.filter((curso) => curso.nivel === form.nivel), [cursos, form.nivel]);

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return alumnos.filter((alumno) => {
      const coincideTexto =
        !texto ||
        [alumno.legajo, alumno.dni, alumno.nombre, alumno.apellido].some((campo) =>
          (campo ?? '').toLowerCase().includes(texto),
        );
      const coincideNivel = filtroNivel === 'todos' || alumno.nivel === filtroNivel;
      const coincideEstado = filtroEstado === 'todos' || alumno.estado === filtroEstado;
      return coincideTexto && coincideNivel && coincideEstado;
    });
  }, [alumnos, busqueda, filtroNivel, filtroEstado]);

  const porCurso = useMemo(() => {
    const grupos = new Map<string, Alumno[]>();
    for (const alumno of alumnos.filter((item) => item.estado === 'activo')) {
      const clave = `${alumno.nivel} · ${alumno.curso}${alumno.division ? ` ${alumno.division}` : ''}`;
      grupos.set(clave, [...(grupos.get(clave) ?? []), alumno]);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [alumnos]);

  function editar(alumno: Alumno) {
    setEditId(alumno.id);
    setForm({
      legajo: alumno.legajo,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      dni: alumno.dni,
      fecha_nacimiento: alumno.fecha_nacimiento,
      domicilio: alumno.domicilio,
      telefono: alumno.telefono,
      correo_electronico: alumno.correo_electronico,
      nivel: alumno.nivel,
      curso: alumno.curso,
      division: alumno.division,
      tutor_nombre: alumno.tutor_nombre,
      tutor_email: alumno.tutor_email,
      tutor_telefono: alumno.tutor_telefono,
    });
    setStatus('');
  }

  function cancelarEdicion() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(editId ? 'Guardando cambios...' : 'Creando alumno...');
    try {
      if (editId) {
        await api.actualizarAlumno(editId, form);
        setStatus('Alumno actualizado.');
      } else {
        await api.crearAlumno(form);
        setStatus('Alumno creado.');
      }
      cancelarEdicion();
      onChange();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar el alumno.');
    }
  }

  async function cambiarEstado(alumno: Alumno, estado: string) {
    await api.actualizarAlumno(alumno.id, { estado });
    onChange();
  }

  return (
    <section className="admin-section module-manager">
      <h2>
        <Users size={20} /> Módulo Alumnos
      </h2>

      <form className="form-card module-form" onSubmit={handleSubmit}>
        <h3>{editId ? 'Editar alumno' : 'Nuevo alumno'}</h3>
        <div className="form-grid">
          <label>
            Legajo
            <input required value={form.legajo} onChange={(event) => setForm({ ...form, legajo: event.target.value })} />
          </label>
          <label>
            DNI
            <input value={form.dni} onChange={(event) => setForm({ ...form, dni: event.target.value })} />
          </label>
          <label>
            Nombre
            <input required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
          </label>
          <label>
            Apellido
            <input required value={form.apellido} onChange={(event) => setForm({ ...form, apellido: event.target.value })} />
          </label>
          <label>
            Fecha de nacimiento
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(event) => setForm({ ...form, fecha_nacimiento: event.target.value })}
            />
          </label>
          <label>
            Domicilio
            <input value={form.domicilio} onChange={(event) => setForm({ ...form, domicilio: event.target.value })} />
          </label>
          <label>
            Teléfono
            <input value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} />
          </label>
          <label>
            Correo electrónico
            <input
              type="email"
              value={form.correo_electronico}
              onChange={(event) => setForm({ ...form, correo_electronico: event.target.value })}
            />
          </label>
          <label>
            Nivel educativo
            <select value={form.nivel} onChange={(event) => setForm({ ...form, nivel: event.target.value, curso: '' })}>
              {niveles.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </select>
          </label>
          <label>
            Curso
            <input
              list="cursos-disponibles"
              placeholder="Ej.: 4to"
              value={form.curso}
              onChange={(event) => setForm({ ...form, curso: event.target.value })}
            />
            <datalist id="cursos-disponibles">
              {cursosDelNivel.map((curso) => (
                <option key={curso.id} value={curso.anio} />
              ))}
            </datalist>
          </label>
          <label>
            División
            <input value={form.division} onChange={(event) => setForm({ ...form, division: event.target.value })} />
          </label>
          <label>
            Tutor / padre
            <input value={form.tutor_nombre} onChange={(event) => setForm({ ...form, tutor_nombre: event.target.value })} />
          </label>
          <label>
            Email del tutor
            <input
              type="email"
              value={form.tutor_email}
              onChange={(event) => setForm({ ...form, tutor_email: event.target.value })}
            />
          </label>
          <label>
            Teléfono del tutor
            <input
              value={form.tutor_telefono}
              onChange={(event) => setForm({ ...form, tutor_telefono: event.target.value })}
            />
          </label>
        </div>
        <div className="module-form-actions">
          <Button type="submit">
            <Plus size={17} /> {editId ? 'Guardar cambios' : 'Crear alumno'}
          </Button>
          {editId && (
            <Button type="button" variant="outline" onClick={cancelarEdicion}>
              Cancelar
            </Button>
          )}
        </div>
        {status && <span className="form-status">{status}</span>}
      </form>

      <div className="module-filters">
        <input
          placeholder="Buscar por legajo, DNI, nombre o apellido"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <select value={filtroNivel} onChange={(event) => setFiltroNivel(event.target.value)}>
          <option value="todos">Todos los niveles</option>
          {niveles.map((nivel) => (
            <option key={nivel} value={nivel}>
              {nivel}
            </option>
          ))}
        </select>
        <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)}>
          <option value="activo">Activos</option>
          <option value="inactivo">Dados de baja</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Alumno</th>
              <th>DNI</th>
              <th>Nivel / Curso</th>
              <th>Contacto</th>
              <th>Tutor</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.map((alumno) => (
              <tr key={alumno.id}>
                <td>{alumno.legajo || '—'}</td>
                <td>
                  {alumno.nombre} {alumno.apellido}
                </td>
                <td>{alumno.dni || '—'}</td>
                <td>
                  {alumno.nivel} {alumno.curso} {alumno.division}
                </td>
                <td>{alumno.telefono || alumno.correo_electronico || '—'}</td>
                <td>{alumno.tutor_nombre || '—'}</td>
                <td>
                  <span className={`estado-pill estado-${alumno.estado}`}>{alumno.estado}</span>
                </td>
                <td className="data-table-actions">
                  <button type="button" title="Editar" onClick={() => editar(alumno)}>
                    <Pencil size={16} />
                  </button>
                  {alumno.estado === 'activo' ? (
                    <button type="button" title="Dar de baja" onClick={() => cambiarEstado(alumno, 'inactivo')}>
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button type="button" title="Reactivar" onClick={() => cambiarEstado(alumno, 'activo')}>
                      <RotateCcw size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {alumnosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} className="data-table-empty">
                  No hay alumnos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="report-block">
        <h3>Reporte: listado de alumnos por curso</h3>
        <div className="report-grid">
          {porCurso.map(([curso, lista]) => (
            <article key={curso} className="report-card">
              <h4>{curso}</h4>
              <ul>
                {lista.map((alumno) => (
                  <li key={alumno.id}>
                    {alumno.legajo} · {alumno.apellido}, {alumno.nombre}
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {porCurso.length === 0 && <p className="empty-state">Todavía no hay alumnos activos cargados.</p>}
        </div>
      </div>
    </section>
  );
}
