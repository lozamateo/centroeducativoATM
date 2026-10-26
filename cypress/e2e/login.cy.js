// Pruebas dinámicas (QA): simulan a un usuario real en el navegador.
// La API se reemplaza con cy.intercept para no depender de la base de datos.

describe('Sitio público', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: { error: 'Sin sesión.' } });
    cy.intercept('GET', '**/api/deportes', {
      body: [
        { id: 1, deporte: 'Fútbol', nivel: 'Primario', horarios: [{ dia_semana: 2, hora_inicio: '14:00', hora_fin: '15:30' }] },
      ],
    });
    cy.intercept('GET', '**/api/{niveles,noticias,recorridos}', { body: [] });
  });

  it('muestra los deportes publicados y lleva al login', () => {
    cy.visit('/');
    cy.get('#deportes').should('contain', 'Fútbol').and('contain', 'Primario');
    cy.contains('a', 'Ingresar').first().click();
    cy.location('pathname').should('eq', '/login');
    cy.contains('h1', 'Ingresar al sistema');
  });
});

describe('Login', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: { error: 'Sin sesión.' } });
    cy.visit('/login');
  });

  it('no envía el formulario con campos vacíos', () => {
    cy.intercept('POST', '**/api/auth/login').as('login');
    cy.contains('button', 'Ingresar').click();
    cy.get('input[type=email]').then(($input) => expect($input[0].checkValidity()).to.equal(false));
    cy.get('@login.all').should('have.length', 0);
  });

  it('muestra el error de la API con credenciales incorrectas', () => {
    cy.intercept('POST', '**/api/auth/login', { statusCode: 401, body: { error: 'Email o contraseña incorrectos.' } }).as('login');
    cy.get('input[type=email]').type('admin@educar.com');
    cy.get('input[type=password]').type('mala');
    cy.contains('button', 'Ingresar').click();
    cy.wait('@login').its('request.body').should('deep.equal', { email: 'admin@educar.com', password: 'mala' });
    cy.contains('Email o contraseña incorrectos.');
    cy.location('pathname').should('eq', '/login');
  });

  it('los usuarios de demostración completan el formulario', () => {
    cy.contains('button.chip', 'Enfermería').click();
    cy.get('input[type=email]').should('have.value', 'enfermeria@educar.com');
    cy.get('input[type=password]').should('have.value', 'enfermeria123');
  });
});
