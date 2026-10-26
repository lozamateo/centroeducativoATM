// Tablero de la direccion (RF-16).
import { Bus, ClipboardList, Dumbbell, GraduationCap, HeartPulse, Mail, UserCog, UtensilsCrossed } from 'lucide-react';
import { Card, DataState, PageHeader, StatCard } from '../../components/ui';
import { api } from '../../lib/api';
import { Link } from '../../lib/router';
import { useData } from '../../lib/useData';

export function Tablero() {
  const { data, loading, error, reload } = useData(() => api.admin.resumen());

  return (
    <>
      <PageHeader title="Tablero de gestión" subtitle="Indicadores del ciclo lectivo en tiempo real." />
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <div className="stack">
            <div className="grid grid-4">
              <StatCard label="Alumnos activos" value={data.alumnos} icon={<GraduationCap />} />
              <StatCard label="Matriculados en el ciclo" value={data.matriculados} icon={<ClipboardList />} tone="success" />
              <StatCard label="Docentes" value={data.profesores} icon={<UserCog />} />
              <StatCard label="Inscripciones a deportes" value={data.inscripciones_deporte} icon={<Dumbbell />} />
              <StatCard label="Usan transporte" value={data.usuarios_transporte} icon={<Bus />} />
              <StatCard label="Usan comedor" value={data.usuarios_comedor} icon={<UtensilsCrossed />} />
              <StatCard label="Aptos vencidos o ausentes" value={data.aptos_vencidos} icon={<HeartPulse />} tone={data.aptos_vencidos ? 'danger' : 'success'} />
              <StatCard label="Solicitudes pendientes" value={data.solicitudes_pendientes} icon={<Mail />} tone={data.solicitudes_pendientes ? 'warning' : 'info'} />
            </div>

            <div className="grid grid-2">
              <Card title="Ocupación por nivel">
                <div className="bars">
                  {data.por_nivel.map((n) => {
                    const pct = n.cupo ? Math.round((n.matriculados / n.cupo) * 100) : 0;
                    return (
                      <div key={n.nivel} className="bar-row">
                        <div className="bar-label"><span>{n.nivel}</span><strong>{n.matriculados} / {n.cupo}</strong></div>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card title="Accesos rápidos">
                <div className="quick-links">
                  <Link href="/panel/alumnos">Nuevo alumno</Link>
                  <Link href="/panel/inscripciones">Matricular e inscribir</Link>
                  <Link href="/panel/reportes">Padrón de transporte</Link>
                  <Link href="/panel/salud">Aptos vencidos</Link>
                  <Link href="/panel/contenido">Solicitudes y mensajes ({data.mensajes_sin_leer} sin leer)</Link>
                  <Link href="/panel/usuarios">Usuarios y roles</Link>
                </div>
              </Card>
            </div>
          </div>
        )}
      </DataState>
    </>
  );
}
