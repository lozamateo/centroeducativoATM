// Reglas de inscripción a deportes (RF-11 / RF-22) sin acceso a la base,
// para poder probarlas con pruebas unitarias. La base las vuelve a validar con triggers.

export const MAX_DEPORTES = 2;

// Dos franjas se superponen si son el mismo día y una empieza antes de que termine la otra.
export function seSuperponen(a, b) {
  return a.dia_semana === b.dia_semana && a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin;
}

export function aptoVigente(vence, hoy = new Date().toISOString().slice(0, 10)) {
  return Boolean(vence) && vence >= hoy;
}

// Devuelve por qué el alumno no puede inscribirse a la comisión, o null si puede.
// `actuales` son las filas inscripción × horario de sus deportes activos.
export function motivoNoDisponible(comision, actuales, { apto, cantidadActual }) {
  if (actuales.some((row) => row.comision_id === comision.id)) return 'Ya inscripto';
  if (!apto) return 'Apto físico vencido o ausente';
  if (actuales.some((row) => row.deporte_id === comision.deporte_id)) return 'Ya inscripto en este deporte';
  if (cantidadActual >= MAX_DEPORTES) return `Máximo de ${MAX_DEPORTES} deportes alcanzado`;
  if (comision.inscriptos >= comision.cupo) return 'Sin cupo';
  if (comision.horarios.some((h) => actuales.some((a) => seSuperponen(a, h)))) {
    return 'Se superpone con otro deporte';
  }
  return null;
}
