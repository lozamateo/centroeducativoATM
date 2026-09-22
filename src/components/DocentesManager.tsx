import { FormEvent, useMemo, useState } from 'react';
import { BookOpen, Pencil, Plus, RotateCcw, Trash2, UserCog } from 'lucide-react';
import { Button } from './Button';
import { api } from '../services/api';
import type { AsignacionDocente, Curso, Docente } from '../types';

type DocenteForm = {
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  especialidad: string;
};

const emptyForm: DocenteForm = {
  legajo: '',
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  telefono: '',
  especialidad: '',
};

type AsignacionForm = {
  docente_id: string;
  curso_id: string;
  materia: string;
  dia: string;
  horario: string;
};

const emptyAsignacion: AsignacionForm = { docente_id: '', curso_id: '', materia: '', dia: 'Lunes', horario: '' };

const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

type Props = {
  docentes: Docente[];
  cursos: Curso[];
  asignaciones: AsignacionDocente[];
  onChange: () => void;
};

export function DocentesManager({ docentes, cursos, asignaciones, onChange }: Props) {
  const [form, setForm] = useState<DocenteForm>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [asignacionForm, setAsignacionForm] = useState<AsignacionForm>(emptyAsignacion);
  const [asignacionStatus, setAsignacionStatus] = useState('');

  const docentesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return docentes.filter((docente) => {
      const coincideTexto =
        !texto ||
        [docente.legajo, docente.dni, docente.nombre, docente.apellido, docente.especialidad].some((campo) =>
          (campo ?? '').toLowerCase().includes(texto),
        );
      const coincideEstado = filtroEstado === 'todos' || docente.estado === filtroEstado;
      return coincideTexto && coincideEstado;
    });
  }, [docentes, busqueda, filtroEstado]);

  const cursoPorId = useMemo(() => new Map(cursos.map((curso) => [curso.id, curso])), [cursos]);
  const docentePorId = useMemo(() => new Map(docentes.map((docente) => [docente.id, docente])), [docentes]);

  const porNivel = useMemo(() => {
    const grupos = new Map<string, AsignacionDocente[]>();
    for (const asignacion of asignaciones) {
      const curso = cursoPorId.get(asignacion.curso_id);
      const nivel = curso?.nivel ?? 'Sin nivel asignado';
      grupos.set(nivel, [...(grupos.get(nivel) ?? []), asignacion]);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [asignaciones, cursoPorId]);

  function editar(docente: Docente) {
    setEditId(docente.id);
    setForm({
      legajo: docente.legajo,
      nombre: docente.nombre,
      apellido: docente.apellido,
      dni: docente.dni,
      email: docente.email,
      telefono: docente.telefono,
      especialidad: docente.especialidad,
    });
    setStatus('');
  }

  function cancelarEdicion() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(editId ? 'Guardando cambios...' : 'Creando docente...');
    try {
      if (editId) {
        await api.actualizarDocente(editId, form);
        setStatus('Docente actualizado.');
      } else {
        await api.crearDocente(form);
        setStatus('Docente creado.');
      }
      cancelarEdicion();
      onChange();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar el docente.');
    }
  }

  async function cambiarEstado(docente: Docente, estado: string) {
    await api.actualizarDocente(docente.id, { estado });
    onChange();
  }

  async function crearAsignacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asignacionForm.docente_id || !asignacionForm.curso_id || !asignacionForm.materia) {
      setAsignacionStatus('Elegí docente, curso y materia.');
      return;
    }
    setAsignacionStatus('Guardando asignación...');
    try {
      await api.crearAsignacion({
        docente_id: Number(asignacionForm.docente_id),
        curso_id: Number(asignacionForm.curso_id),
        materia: asignacionForm.materia,
        dia: asignacionForm.dia,
        horario: asignacionForm.horario,
      });
      setAsignacionForm(emptyAsignacion);
      setAsignacionStatus('Asignación creada.');
      onChange();
    } catch (error) {
      setAsignacionStatus(error instanceof Error ? error.message : 'No se pudo crear la asignación.');
    }
  }

  async function eliminarAsignacion(id: number) {
    await api.eliminarAsignacion(id);
    onChange();
  }

  return (
    <section className="admin-section module-manager">
      <h2>
        <UserCog size={20} /> Módulo Profesores
      </h2>

      <form className="form-card module-form" onSubmit={handleSubmit}>
        <h3>{editId ? 'Editar docente' : 'Nuevo docente'}</h3>
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
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Teléfono
            <input value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} />
          </label>
          <label>
            Especialidad
            <input
              required
              value={form.especialidad}
              onChange={(event) => setForm({ ...form, especialidad: event.target.value })}
            />
          </label>
        </div>
        <div className="module-form-actions">
          <Button type="submit">
            <Plus size={17} /> {editId ? 'Guardar cambios' : 'Crear docente'}
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
          placeholder="Buscar por legajo, DNI, nombre o especialidad"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
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
              <th>Docente</th>
              <th>Especialidad</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {docentesFiltrados.map((docente) => (
              <tr key={docente.id}>
                <td>{docente.legajo || '—'}</td>
                <td>
                  {docente.nombre} {docente.apellido}
                </td>
                <td>{docente.especialidad}</td>
                <td>
                  {docente.email}
                  {docente.telefono ? ` · ${docente.telefono}` : ''}
                </td>
                <td>
                  <span className={`estado-pill estado-${docente.estado}`}>{docente.estado}</span>
                </td>
                <td className="data-table-actions">
                  <button type="button" title="Editar" onClick={() => editar(docente)}>
                    <Pencil size={16} />
                  </button>
                  {docente.estado === 'activo' ? (
                    <button type="button" title="Dar de baja" onClick={() => cambiarEstado(docente, 'inactivo')}>
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button type="button" title="Reactivar" onClick={() => cambiarEstado(docente, 'activo')}>
                      <RotateCcw size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {docentesFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="data-table-empty">
                  No hay docentes que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="report-block">
        <h3>
          <BookOpen size={18} /> Materias y cursos a cargo
        </h3>
        <form className="inline-form" onSubmit={crearAsignacion}>
          <select
            value={asignacionForm.docente_id}
            onChange={(event) => setAsignacionForm({ ...asignacionForm, docente_id: event.target.value })}
          >
            <option value="">Docente</option>
            {docentes
              .filter((docente) => docente.estado === 'activo')
              .map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {docente.apellido}, {docente.nombre}
                </option>
              ))}
          </select>
          <select
            value={asignacionForm.curso_id}
            onChange={(event) => setAsignacionForm({ ...asignacionForm, curso_id: event.target.value })}
          >
            <option value="">Curso</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nivel} {curso.anio} {curso.division}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Materia"
            value={asignacionForm.materia}
            onChange={(event) => setAsignacionForm({ ...asignacionForm, materia: event.target.value })}
          />
          <select value={asignacionForm.dia} onChange={(event) => setAsignacionForm({ ...asignacionForm, dia: event.target.value })}>
            {dias.map((dia) => (
              <option key={dia} value={dia}>
                {dia}
              </option>
            ))}
          </select>
          <input
            placeholder="Horario (ej. 08:00 - 10:00)"
            value={asignacionForm.horario}
            onChange={(event) => setAsignacionForm({ ...asignacionForm, horario: event.target.value })}
          />
          <Button type="submit">
            <Plus size={16} /> Asignar
          </Button>
        </form>
        {asignacionStatus && <span className="form-status">{asignacionStatus}</span>}

        <div className="report-grid">
          {porNivel.map(([nivel, lista]) => (
            <article key={nivel} className="report-card">
              <h4>{nivel}</h4>
              <ul>
                {lista.map((asignacion) => {
                  const docente = docentePorId.get(asignacion.docente_id);
                  const curso = cursoPorId.get(asignacion.curso_id);
                  return (
                    <li key={asignacion.id} className="report-item">
                      <span>
                        {asignacion.materia} — {curso ? `${curso.nivel} ${curso.anio} ${curso.division}` : 'curso eliminado'} ·{' '}
                        {docente ? `${docente.apellido}, ${docente.nombre}` : 'docente eliminado'}
                        {asignacion.dia && ` · ${asignacion.dia}`} {asignacion.horario}
                      </span>
                      <button type="button" title="Quitar asignación" onClick={() => eliminarAsignacion(asignacion.id)}>
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
          {porNivel.length === 0 && <p className="empty-state">Todavía no hay materias asignadas.</p>}
        </div>
      </div>
    </section>
  );
}
