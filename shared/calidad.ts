// Optimización del ciclo de desarrollo (Unidades 4 y 5): datos que muestra la página "Calidad y CI/CD".

export const REPOSITORIO = 'https://github.com/lozamateo/centroeducativoATM';

export const etapasPipeline = [
  { nombre: 'Commit', detalle: 'Husky bloquea el commit si fallan el lint o las pruebas' },
  { nombre: 'Pull Request', detalle: 'Rama feature/... con plantilla y checklist' },
  { nombre: 'Lint', detalle: 'ESLint sobre la API y la web' },
  { nombre: 'Test', detalle: 'Vitest: pruebas unitarias y de regresión con cobertura' },
  { nombre: 'Build', detalle: 'tsc + vite build → dist/' },
  { nombre: 'Artefacto', detalle: 'build-<commit> con dist/ y cobertura' },
  { nombre: 'Análisis', detalle: 'SonarCloud: bugs, code smells, duplicación' },
  { nombre: 'E2E', detalle: 'Cypress simula a un usuario real' },
  { nombre: 'Deploy', detalle: 'Vercel publica main en producción' },
];

export const herramientas = [
  { practica: 'Integración continua', herramienta: 'GitHub Actions', archivo: '.github/workflows/ci.yml' },
  { practica: 'Despliegue continuo', herramienta: 'Vercel (producción en main, vista previa por PR)', archivo: 'vercel.json' },
  { practica: 'Prueba estática', herramienta: 'ESLint 9 en VS Code y en el pipeline', archivo: 'eslint.config.js' },
  { practica: 'Pre-commit hooks', herramienta: 'Husky + lint-staged', archivo: '.husky/pre-commit' },
  { practica: 'Pruebas unitarias y de regresión', herramienta: 'Vitest + cobertura v8', archivo: 'tests/unit/' },
  { practica: 'Pruebas dinámicas (E2E)', herramienta: 'Cypress', archivo: 'cypress/e2e/' },
  { practica: 'Orquestador de calidad', herramienta: 'SonarCloud', archivo: 'sonar-project.properties' },
  { practica: 'Política de Pull Requests', herramienta: 'Plantilla de PR + protección de main', archivo: '.github/pull_request_template.md' },
  { practica: 'Variables de entorno', herramienta: '.env / Vercel / GitHub Secrets', archivo: '.env.example' },
  { practica: 'Gestión del proyecto', herramienta: 'GitHub Issues + tablero Kanban (Projects)', archivo: 'Issues' },
];

export const pruebas = [
  { nombre: 'Reglas de inscripción a deportes', tipo: 'Unitarias + regresión', cantidad: 13 },
  { nombre: 'Validaciones y errores de la API', tipo: 'Unitarias', cantidad: 8 },
  { nombre: 'Sitio público, login y esta página', tipo: 'E2E (Cypress)', cantidad: 5 },
  { nombre: 'Inscripción a deportes desde el portal de familias', tipo: 'E2E (Cypress)', cantidad: 2 },
];

export const metricas = [
  { indicador: 'Pruebas automatizadas', antes: '0', despues: '21 unitarias + 7 E2E' },
  { indicador: 'Cobertura de las reglas de negocio', antes: '0 %', despues: '100 % (server/rules/deportes.js)' },
  { indicador: 'Verificación de un cambio', antes: '15–20 min manual', despues: 'Automática: lint 1,8 s · pruebas 0,3 s · build 8 s' },
  { indicador: 'Revisión antes de integrar', antes: 'Push directo a main', despues: 'Pull Request con CI obligatorio' },
  { indicador: 'Tamaño promedio de un cambio', antes: '≈ 2.900 líneas por commit', despues: 'PR chicos asociados a una Issue' },
  { indicador: 'Deployment Frequency', antes: '≈ 3 entregas en 5 semanas', despues: 'Un despliegue automático por merge a main' },
  { indicador: 'Lead Time', antes: '≈ 34 días', despues: 'Objetivo: menos de 1 día' },
];

export const enlaces = [
  { titulo: 'Ejecuciones del pipeline', url: `${REPOSITORIO}/actions` },
  { titulo: 'Issues', url: `${REPOSITORIO}/issues` },
  { titulo: 'Pull Requests', url: `${REPOSITORIO}/pulls` },
  { titulo: 'Tablero Kanban', url: `${REPOSITORIO}/projects` },
];
