// Vista del alumno compartida por el portal de familias y el portal del alumno.
// Si se reciben las acciones (familia), permite inscribir y dar de baja.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bus, Dumbbell, GraduationCap, HeartPulse, Trash2, UtensilsCrossed } from 'lucide-react';
import { DIAS_CORTOS, MODALIDADES_COMEDOR, dias, fecha, hora, horarios, tonoApto, urlCredencial } from '../../../shared/format';
import type { DetalleAlumno, ModalidadComedor, OpcionesInscripcion } from '../../../shared/types';
import { QrCode } from '../../components/QrCode';
import { Badge, Button, Card, Empty, Feedback, Field, InfoRow, Input, Select, Tabs, Textarea } from '../../components/ui';
import { useAction } from '../../lib/useData';

export interface AccionesFamilia {
  opciones: OpcionesInscripcion | null;
  matricular: (cursoId: number) => Promise<unknown>;
  inscribirDeporte: (comisionId: number) => Promise<unknown>;
  bajaDeporte: (inscripcionId: number) => Promise<unknown>;
  inscribirTransporte: (recorridoId: number, parada: string) => Promise<unknown>;
  bajaTransporte: (inscripcionId: number) => Promise<unknown>;
  inscribirComedor: (data: { modalidad: ModalidadComedor; dias: number[]; dieta_especial: string }) => Promise<unknown>;
  bajaComedor: (inscripcionId: number) => Promise<unknown>;
}

type TabKey = 'resumen' | 'academico' | 'deportes' | 'servicios' | 'salud';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'academico', label: 'Matrícula' },
  { key: 'deportes', label: 'Deportes' },
  { key: 'servicios', label: 'Transporte y comedor' },
  { key: 'salud', label: 'Salud y credencial' },
];

export function AlumnoVista({ alumno, acciones, onCambio }: { alumno: DetalleAlumno; acciones?: AccionesFamilia; onCambio?: () => void }) {
  const [tab, setTab] = useState<TabKey>('resumen');
  const accion = useAction();

  // Ejecuta la accion y refresca los datos del alumno.
  const ejecutar = async (fn: () => Promise<unknown>, ok: string) => {
    if (await accion.run(fn, ok)) onCambio?.();
  };

  return (
    <div className="stack">
      <Tabs tabs={tabs} active={tab} onChange={(key) => { setTab(key); accion.setMessage(null); }} />
      <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
      {tab === 'resumen' && <Resumen alumno={alumno} />}
      {tab === 'academico' && <Academico alumno={alumno} acciones={acciones} ejecutar={ejecutar} busy={accion.busy} />}
      {tab === 'deportes' && <Deportes alumno={alumno} acciones={acciones} ejecutar={ejecutar} busy={accion.busy} />}
      {tab === 'servicios' && <Servicios alumno={alumno} acciones={acciones} ejecutar={ejecutar} busy={accion.busy} />}
      {tab === 'salud' && <Salud alumno={alumno} />}
    </div>
  );
}

interface SeccionProps {
  alumno: DetalleAlumno;
  acciones?: AccionesFamilia;
  ejecutar: (fn: () => Promise<unknown>, ok: string) => Promise<void>;
  busy: boolean;
}

function Resumen({ alumno }: { alumno: DetalleAlumno }) {
  const tarjetas: { icon: ReactNode; titulo: string; valor: string; detalle?: string }[] = [
    { icon: <GraduationCap />, titulo: 'Curso', valor: alumno.matricula?.curso ?? 'Sin matrícula', detalle: alumno.matricula ? `Comprobante ${alumno.matricula.comprobante}` : 'Pendiente de matricular' },
    { icon: <Dumbbell />, titulo: 'Deportes', valor: alumno.deportes.length ? alumno.deportes.map((d) => d.deporte).join(', ') : 'Sin deportes', detalle: `${alumno.deportes.length} de 2 permitidos` },
    { icon: <Bus />, titulo: 'Transporte', valor: alumno.transporte?.recorrido ?? 'Sin transporte', detalle: alumno.transporte?.parada ?? undefined },
    { icon: <UtensilsCrossed />, titulo: 'Comedor', valor: alumno.comedor?.modalidad ?? 'Sin comedor', detalle: alumno.comedor ? dias(alumno.comedor.dias) : undefined },
  ];

  return (
    <div className="stack">
      <div className="grid grid-4">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="summary-card">
            <div className="feature-icon small">{t.icon}</div>
            <span>{t.titulo}</span>
            <strong>{t.valor}</strong>
            {t.detalle && <small>{t.detalle}</small>}
          </div>
        ))}
      </div>
      <Card title="Datos personales">
        <div className="info-list two-cols">
          <InfoRow label="Alumno">{alumno.alumno}</InfoRow>
          <InfoRow label="DNI">{alumno.dni}</InfoRow>
          <InfoRow label="Nacimiento">{fecha(alumno.fecha_nacimiento)}</InfoRow>
          <InfoRow label="Nivel">{alumno.nivel}</InfoRow>
          <InfoRow label="Tutores">{alumno.tutores}</InfoRow>
          <InfoRow label="Apto físico"><Badge tone={tonoApto[alumno.estado_apto]}>{alumno.estado_apto}</Badge></InfoRow>
        </div>
      </Card>
      <Agenda alumno={alumno} />
    </div>
  );
}

// Agenda semanal de deportes del alumno.
function Agenda({ alumno }: { alumno: DetalleAlumno }) {
  const bloques = alumno.deportes.flatMap((d) => d.horarios.map((h) => ({ ...h, deporte: d.deporte })));
  if (!bloques.length) return null;
  return (
    <Card title="Agenda semanal de deportes">
      <div className="week">
        {[1, 2, 3, 4, 5, 6].map((dia) => (
          <div key={dia} className="week-day">
            <strong>{DIAS_CORTOS[dia]}</strong>
            {bloques.filter((b) => b.dia_semana === dia).map((b) => (
              <span key={`${b.deporte}-${b.hora_inicio}`} className="week-block">{b.deporte}<small>{hora(b.hora_inicio)}-{hora(b.hora_fin)}</small></span>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Academico({ alumno, acciones, ejecutar, busy }: SeccionProps) {
  const [cursoId, setCursoId] = useState('');
  const cursos = acciones?.opciones?.cursos ?? [];

  return (
    <div className="stack">
      {alumno.matricula ? (
        <Card title="Matrícula del ciclo lectivo" actions={<Badge tone="success">{alumno.matricula.estado}</Badge>}>
          <div className="info-list two-cols">
            <InfoRow label="Curso">{alumno.matricula.curso}</InfoRow>
            <InfoRow label="Turno">{alumno.matricula.turno}</InfoRow>
            <InfoRow label="Comprobante">{alumno.matricula.comprobante}</InfoRow>
            <InfoRow label="Fecha">{fecha(alumno.matricula.created_at)}</InfoRow>
          </div>
        </Card>
      ) : acciones ? (
        <Card title="Matricular al ciclo lectivo">
          <p className="muted">Elegí el curso. Las materias se asignan automáticamente y se emite un comprobante.</p>
          <div className="inline-form">
            <Field label="Curso">
              <Select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
                <option value="">Seleccionar curso</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.inscriptos >= c.cupo}>
                    {c.anio} {c.division} - {c.turno} ({c.cupo - c.inscriptos} vacantes)
                  </option>
                ))}
              </Select>
            </Field>
            <Button disabled={!cursoId} loading={busy} onClick={() => ejecutar(() => acciones.matricular(Number(cursoId)), 'Matrícula registrada correctamente.')}>
              Confirmar matrícula
            </Button>
          </div>
        </Card>
      ) : (
        <Empty texto="Todavia no tiene matrícula en el ciclo lectivo." />
      )}
      <Card title="Materias e idiomas">
        {alumno.materias.length ? (
          <ul className="subject-list">
            {alumno.materias.map((m) => (
              <li key={m.nombre}>
                <span>{m.nombre} {m.es_idioma && <Badge tone="info">Idioma</Badge>}</span>
                <small>{m.profesor ?? 'Docente a designar'}</small>
              </li>
            ))}
          </ul>
        ) : (
          <Empty texto="Las materias se muestran al completar la matrícula." />
        )}
      </Card>
    </div>
  );
}

function Deportes({ alumno, acciones, ejecutar, busy }: SeccionProps) {
  const comisiones = acciones?.opciones?.comisiones ?? [];
  return (
    <div className="stack">
      <Card title={`Deportes inscriptos (${alumno.deportes.length} de 2)`}>
        {alumno.deportes.length ? (
          <ul className="item-list">
            {alumno.deportes.map((d) => (
              <li key={d.id}>
                <div><strong>{d.deporte}</strong><small>{d.comision} · {horarios(d.horarios)}</small></div>
                {acciones && (
                  <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} loading={busy}
                    onClick={() => window.confirm(`Dar de baja ${d.deporte}?`) && ejecutar(() => acciones.bajaDeporte(d.id), 'Baja registrada.')}>
                    Dar de baja
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty texto="Sin deportes inscriptos." />
        )}
      </Card>
      {acciones && (
        <Card title="Inscribir a un deporte">
          {alumno.estado_apto !== 'Vigente' && (
            <p className="warning-text">El apto físico está {alumno.estado_apto.toLowerCase()}. Presentalo en enfermería para habilitar la inscripción.</p>
          )}
          <div className="sport-options">
            {comisiones.map((c) => (
              <div key={c.id} className={`sport-option ${c.disponible ? '' : 'disabled'}`}>
                <div>
                  <strong>{c.deporte}</strong>
                  <small>{horarios(c.horarios)}</small>
                  <small>{c.profesor ?? 'Profesor a designar'} · {c.cupo - c.inscriptos} lugares</small>
                </div>
                {c.disponible ? (
                  <Button size="sm" loading={busy} onClick={() => ejecutar(() => acciones.inscribirDeporte(c.id), `Inscripción a ${c.deporte} confirmada.`)}>Inscribir</Button>
                ) : (
                  <Badge tone="neutral">{c.motivo}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Servicios({ alumno, acciones, ejecutar, busy }: SeccionProps) {
  const [recorrido, setRecorrido] = useState('');
  const [parada, setParada] = useState('');
  const [modalidad, setModalidad] = useState<ModalidadComedor>('Almuerzo');
  const [diasSel, setDiasSel] = useState([1, 2, 3, 4, 5]);
  const [dieta, setDieta] = useState('');
  const recorridos = acciones?.opciones?.recorridos ?? [];

  return (
    <div className="grid grid-2">
      <Card title="Transporte escolar">
        {alumno.transporte ? (
          <div className="stack">
            <div className="info-list">
              <InfoRow label="Recorrido">{alumno.transporte.recorrido}</InfoRow>
              <InfoRow label="Parada">{alumno.transporte.parada}</InfoRow>
              <InfoRow label="Horarios">Ida {hora(alumno.transporte.horario_ida)} · Vuelta {hora(alumno.transporte.horario_vuelta)}</InfoRow>
              <InfoRow label="Comprobante">{alumno.transporte.comprobante}</InfoRow>
            </div>
            {acciones && (
              <Button variant="outline" loading={busy} onClick={() => window.confirm('Dar de baja el transporte?') && ejecutar(() => acciones.bajaTransporte(alumno.transporte!.id), 'Transporte dado de baja.')}>
                Dar de baja
              </Button>
            )}
          </div>
        ) : acciones ? (
          <div className="stack">
            <Field label="Recorrido">
              <Select value={recorrido} onChange={(e) => setRecorrido(e.target.value)}>
                <option value="">Seleccionar uno de los 4 recorridos</option>
                {recorridos.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.inscriptos >= r.capacidad}>{r.nombre} - {r.zona}</option>
                ))}
              </Select>
            </Field>
            {recorrido && <p className="muted small">Paradas: {recorridos.find((r) => r.id === Number(recorrido))?.paradas}</p>}
            <Field label="Parada"><Input value={parada} onChange={(e) => setParada(e.target.value)} placeholder="Ej: Av. Alvear 1500" /></Field>
            <Button disabled={!recorrido} loading={busy} onClick={() => ejecutar(() => acciones.inscribirTransporte(Number(recorrido), parada), 'Adhesión al transporte registrada.')}>
              Adherir al transporte
            </Button>
          </div>
        ) : (
          <Empty texto="No usa transporte escolar." />
        )}
      </Card>

      <Card title="Comedor">
        {alumno.comedor ? (
          <div className="stack">
            <div className="info-list">
              <InfoRow label="Modalidad">{alumno.comedor.modalidad}</InfoRow>
              <InfoRow label="Días">{dias(alumno.comedor.dias)}</InfoRow>
              <InfoRow label="Dieta especial">{alumno.comedor.dieta_especial}</InfoRow>
            </div>
            {acciones && (
              <Button variant="outline" loading={busy} onClick={() => window.confirm('Dar de baja el comedor?') && ejecutar(() => acciones.bajaComedor(alumno.comedor!.id), 'Comedor dado de baja.')}>
                Dar de baja
              </Button>
            )}
          </div>
        ) : acciones ? (
          <div className="stack">
            <Field label="Modalidad">
              <Select value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadComedor)}>
                {MODALIDADES_COMEDOR.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <fieldset className="field chips">
              <legend className="field-label">Días</legend>
              {[1, 2, 3, 4, 5].map((d) => (
                <label key={d} className={`chip ${diasSel.includes(d) ? 'chip-active' : ''}`}>
                  <input type="checkbox" checked={diasSel.includes(d)} onChange={() => setDiasSel(diasSel.includes(d) ? diasSel.filter((x) => x !== d) : [...diasSel, d].sort())} />
                  {DIAS_CORTOS[d]}
                </label>
              ))}
            </fieldset>
            <Field label="Dieta especial (opcional)"><Textarea rows={2} value={dieta} onChange={(e) => setDieta(e.target.value)} /></Field>
            <Button disabled={!diasSel.length} loading={busy} onClick={() => ejecutar(() => acciones.inscribirComedor({ modalidad, dias: diasSel, dieta_especial: dieta }), 'Inscripción al comedor registrada.')}>
              Inscribir al comedor
            </Button>
          </div>
        ) : (
          <Empty texto="No está inscripto al comedor." />
        )}
      </Card>
    </div>
  );
}

function Salud({ alumno }: { alumno: DetalleAlumno }) {
  const ficha = alumno.ficha;
  const habilitado = alumno.estado_apto === 'Vigente';
  return (
    <div className="grid grid-2">
      <Card title="Credencial deportiva">
        <div className={`credential ${habilitado ? 'ok' : 'blocked'}`}>
          <div className="credential-head">
            <HeartPulse size={18} /> {habilitado ? 'Habilitado para deportes' : 'No habilitado'}
          </div>
          {ficha?.qr_token && <QrCode value={urlCredencial(window.location.origin, ficha.qr_token)} />}
          <strong>{alumno.alumno}</strong>
          <span>DNI {alumno.dni} · {alumno.nivel}</span>
          <span>Apto vence: {fecha(alumno.apto_fisico_vence)}</span>
        </div>
      </Card>
      <Card title="Ficha médica">
        {ficha ? (
          <div className="info-list">
            <InfoRow label="Grupo sanguíneo">{ficha.grupo_sanguineo}</InfoRow>
            <InfoRow label="Alergias">{ficha.alergias}</InfoRow>
            <InfoRow label="Medicación">{ficha.medicacion}</InfoRow>
            <InfoRow label="Obra social">{ficha.obra_social}</InfoRow>
            <InfoRow label="Contacto de emergencia">{ficha.contacto_emergencia} {ficha.telefono_emergencia}</InfoRow>
            <InfoRow label="Apto físico"><Badge tone={tonoApto[alumno.estado_apto]}>{alumno.estado_apto}</Badge></InfoRow>
          </div>
        ) : (
          <Empty texto="Enfermería todavia no cargo la ficha médica." />
        )}
        <p className="muted small">Para actualizar estos datos o el apto físico, acercate a enfermería.</p>
      </Card>
    </div>
  );
}
