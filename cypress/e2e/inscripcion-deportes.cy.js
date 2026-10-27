// Prueba E2E de la funcionalidad evaluada: inscripción a deportes desde el portal de familias (RF-10 / RF-11).
// La familia ve qué comisiones puede elegir, el motivo de las bloqueadas, e inscribe a su hijo.

const tutor = {
  id: 2, email: 'tutor@educar.com', nombre: 'Laura', apellido: 'Gómez', rol: 'TUTOR', rol_nombre: 'Familia',
  alumno_id: null, tutor_id: 1, profesor_id: null, permisos: [],
};

const detalle = (overrides = {}) => ({
  alumno_id: 1, alumno: 'Gómez, Tomás', dni: '50123456', fecha_nacimiento: '2016-05-10', nivel: 'Primario',
  curso: 'Primario - 5 A', tutores: 'Gómez, Laura', grupo_sanguineo: 'A+', alergias: null,
  apto_fisico_vence: '2099-12-31', estado_apto: 'Vigente',
  matricula: null, materias: [], transporte: null, comedor: null, ficha: null,
  deportes: [{ id: 7, deporte: 'Básquet', comision: 'Básquet Primario', horarios: [{ dia_semana: 2, hora_inicio: '14:00', hora_fin: '15:30' }] }],
  ...overrides,
});

const comision = (id, deporte, horario, disponible, motivo = null) => ({
  id, nombre: `${deporte} Primario`, deporte_id: id, deporte, profesor: 'Pérez, Juan', cupo: 20, inscriptos: 5,
  horarios: [horario], disponible, motivo,
});

const opciones = (comisiones) => ({ cursos: [], recorridos: [], comisiones });

function abrirFicha(alumno, comisiones) {
  cy.intercept('GET', '**/api/auth/me', { body: tutor });
  cy.intercept('GET', '**/api/portal/familia/hijos/1', { body: alumno }).as('detalle');
  cy.intercept('GET', '**/api/portal/familia/hijos/1/opciones', { body: opciones(comisiones) });
  cy.visit('/panel/hijos/1', { onBeforeLoad: (win) => win.localStorage.setItem('educar_token', 'token-de-prueba') });
  cy.wait('@detalle');
  cy.contains('button', 'Deportes').click();
}

describe('Inscripción a deportes desde el portal de familias', () => {
  it('muestra el motivo de las comisiones bloqueadas e inscribe en una disponible', () => {
    abrirFicha(detalle(), [
      comision(1, 'Fútbol', { dia_semana: 4, hora_inicio: '14:00', hora_fin: '15:30' }, true),
      comision(2, 'Natación', { dia_semana: 2, hora_inicio: '15:00', hora_fin: '16:00' }, false, 'Se superpone con otro deporte'),
    ]);

    cy.contains('Básquet');
    cy.contains('.sport-option', 'Natación').should('have.class', 'disabled').and('contain', 'Se superpone con otro deporte');

    cy.intercept('POST', '**/api/portal/familia/hijos/1/deportes', { statusCode: 201, body: { id: 8 } }).as('inscribir');
    cy.contains('.sport-option', 'Fútbol').contains('button', 'Inscribir').click();
    cy.wait('@inscribir').its('request.body').should('deep.equal', { comision_id: 1 });
    cy.contains('Inscripción a Fútbol confirmada.');
  });

  it('con el apto físico vencido avisa y no permite inscribir', () => {
    abrirFicha(detalle({ alumno: 'Gómez, Sofía', estado_apto: 'Vencido', apto_fisico_vence: '2025-01-01', deportes: [] }), [
      comision(1, 'Fútbol', { dia_semana: 4, hora_inicio: '14:00', hora_fin: '15:30' }, false, 'Apto físico vencido o ausente'),
    ]);

    cy.contains('El apto físico está vencido. Presentalo en enfermería');
    cy.contains('.sport-option', 'Fútbol').should('contain', 'Apto físico vencido o ausente');
    cy.get('.sport-option button').should('not.exist');
  });
});
