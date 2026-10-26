# Educar para Transformar — Sistema de Gestión Integral

Proyecto del equipo **ATM** (Loza, Mateo) para **Metodología de Sistemas II**: ecosistema informático del Centro Educativo
"Educar para Transformar" (Resistencia, Chaco), que inicia actividades en marzo de 2027.

Incluye **sitio web**, **aplicación móvil** y **API**, todos conectados a la misma base de datos. La web y la app tienen las
mismas funciones y el mismo diseño, porque comparten el código de la carpeta `shared/`.

## Arquitectura

Arquitectura en capas (N-capas) sobre un estilo cliente/servidor, con una API RESTful *stateless* como conector central
(Plan de Trabajo, punto 1.5):

```
 Capa de presentación      Web (React + Vite)          App móvil (React Native + Expo)
                                  \                         /
                                   \---- HTTPS/JSON + JWT --/
 Capa de seguridad y ruteo       API Express: autenticación JWT + middleware RBAC
 Capa de lógica de negocio       AcademicoService · InscripcionService · SaludService · ReporteEngineService ...
 Capa de persistencia            pool de conexiones (pg) → PostgreSQL en Supabase
```

| Capa | Tecnología | Carpeta |
|---|---|---|
| Web (sitio público + panel) | React 19, TypeScript, Vite | `src/` |
| App móvil | React Native 0.88, Expo SDK 58, Expo Router | `mobile/` |
| Código compartido web + app | TypeScript: tipos, colores, formatos, cliente de la API | `shared/` |
| API RESTful | Node.js 22, Express 5, JWT, bcrypt | `server/` |
| Base de datos | PostgreSQL (Supabase), triggers, vistas y RLS | `supabase/` |

## Estructura

```
server/
  index.js              armado de la API y manejo de errores
  db.js                 capa de persistencia (pool + transacciones con auditoría)
  middleware/auth.js    autenticación JWT y control de acceso por roles (RBAC)
  routes/               publico, admin, salud, portal (familias, docentes, alumnos)
  services/             lógica de negocio por dominio
supabase/
  schema.sql            esquema completo + datos de prueba (instalación nueva)
  002_tildes.sql        actualización para bases creadas con la primera versión
shared/                 código común a la web y la app
src/                    web: sitio público, login, panel por rol
mobile/                 app móvil (Expo)
api/index.js            entrada de la API en Vercel
```

## 1. Base de datos (Supabase)

1. En Supabase, abrí **SQL Editor → Create a new snippet**.
2. Pegá todo `supabase/schema.sql` y tocá **Run**. Debe responder "Éxito".
3. Si la base ya se había creado con la primera versión del esquema, ejecutá también `supabase/002_tildes.sql` (corrige
   textos y mensajes; se puede correr más de una vez).

El esquema crea las tablas de los cuatro dominios del plan (Personas y Seguridad, Estructura Académica, Actividades
Deportivas, Servicios y Salud), las reglas de negocio como *triggers*, las vistas para los reportes, la tabla de auditoría
y activa **Row Level Security** en todas las tablas: con la clave pública de Supabase no se puede leer nada; solo la API
accede a los datos.

## 2. Variables de entorno

Copiá `.env.example` como `.env` (nunca lo subas a GitHub):

| Variable | Dónde se obtiene |
|---|---|
| `DATABASE_URL` | Supabase → **Conecta** → **Directo** → *Session pooler*, reemplazando `[YOUR-PASSWORD]` |
| `JWT_SECRET` | Cualquier texto largo y secreto (obligatorio en producción) |

Para la app, copiá `mobile/.env.example` como `mobile/.env`:

| Variable | Valor |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de la API publicada, por ejemplo `https://tu-proyecto.vercel.app/api` |
| `EXPO_PUBLIC_SITE_URL` | URL del sitio web (se usa en el QR de la credencial) |

## 3. Ejecutar en la computadora

```bash
npm install
npm run server      # API en http://localhost:3001/api (lee .env)
npm run dev         # web en http://localhost:5173
```

App móvil:

```bash
cd mobile
npm install
npx expo start      # escanear el QR con Expo Go en el celular
```

En el celular, `localhost` no apunta a la computadora: usá la URL de Vercel o la IP de la PC en la red local
(por ejemplo `http://192.168.0.10:3001/api`) en `EXPO_PUBLIC_API_URL`.

## 4. Publicar

**Web y API (Vercel):** importar el repositorio en Vercel y cargar `DATABASE_URL` y `JWT_SECRET` en
*Settings → Environment Variables*. El archivo `vercel.json` ya envía `/api/*` a la API y el resto a la web.

**App:** con Expo Go alcanza para la demostración. Para generar el instalable: `npx eas-cli@latest build -p android`.

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@educar.com | admin123 |
| Familia (tutora de Tomás y Sofía) | tutor@educar.com | tutor123 |
| Docente | docente@educar.com | docente123 |
| Alumno | alumno@educar.com | alumno123 |
| Enfermería | enfermeria@educar.com | enfermeria123 |

Sofía tiene el apto físico **vencido**: sirve para mostrar que el sistema bloquea su inscripción a deportes hasta que
enfermería lo renueve.

## Requerimientos funcionales

| Requerimiento | Dónde está (web y app) |
|---|---|
| RF-01 Autenticación y RBAC | Login; panel distinto por rol; `server/middleware/auth.js`; Usuarios |
| RF-02 a RF-06 Niveles, cursos, materias/idiomas, docentes | Cursos y materias, Docentes |
| RF-07 a RF-09 Legajos, vínculo familiar, matrícula | Alumnos (ficha + familia), Inscripciones, portal de familias |
| RF-10 y RF-11 Deportes con control de solapamiento (máx. 2) | Deportes (comisiones y horarios); inscripción desde familia o secretaría |
| RF-12 y RF-13 Transporte (4 recorridos) y comedor | Transporte y comedor en la ficha del alumno |
| RF-14 y RF-15 Autogestión de familias y docentes | Portal de familias, portal docente y portal del alumno |
| RF-16 a RF-21 Reportes MIS | Tablero, padrón por curso, padrón de transporte, ocupación de deportes, comedor, ficha 360 (PDF) |
| RF-22 Ficha médica, apto físico y credencial QR | Enfermería; credencial QR en el portal; verificación pública en `/credencial/:token` |

## Reglas de negocio

Se validan en la API (mensajes claros) y en la base de datos (triggers y restricciones), para que se cumplan aunque haya
inscripciones simultáneas:

- Máximo **2 deportes** activos por alumno y sin **superposición horaria**.
- La inscripción a deportes exige **apto físico vigente** y que la comisión sea del **nivel** del alumno.
- **Un único recorrido** de transporte activo por alumno, con control de capacidad.
- **Una matrícula** por alumno y ciclo lectivo, con control de vacantes; al matricular se asignan las materias del curso.
- Una inscripción activa al comedor por ciclo.
- Cada alta, modificación o baja queda en la **auditoría** con usuario y fecha.

## Endpoints principales

```
POST /api/auth/login                      GET  /api/auth/me
GET  /api/niveles | noticias | deportes | recorridos
POST /api/contacto | solicitudes          GET  /api/credencial/:token

/api/portal/familia/hijos[/:id[/opciones|/matricula|/deportes|/transporte|/comedor]]   (rol TUTOR)
/api/portal/docente                                                                      (rol DOCENTE)
/api/portal/alumno                                                                       (rol ALUMNO)
/api/salud/fichas[/:alumnoId]                                                            (rol ENFERMERIA)
/api/admin/{alumnos,tutores,profesores,cursos,materias,deportes,comisiones,
            matriculas,inscripciones-deporte,transporte,comedor,usuarios,
            noticias,mensajes,solicitudes,reportes/*}                                    (rol ADMIN)
```

## Validación

```bash
npm run build                 # web: tipos + compilación
cd mobile && npx tsc --noEmit # app: tipos
```

## Calidad y CI/CD

| Práctica | Herramienta | Dónde |
|---|---|---|
| Prueba estática (linter) | ESLint 9 (también en VS Code con la extensión recomendada) | `eslint.config.js`, `.vscode/` |
| Pre-commit hooks | Husky + lint-staged: bloquea el commit si el lint o las pruebas fallan | `.husky/pre-commit` |
| Pruebas unitarias y de regresión | Vitest + cobertura v8 (reglas de inscripción a deportes y validaciones) | `tests/unit/` |
| Pruebas dinámicas E2E | Cypress (simula a un usuario en el navegador) | `cypress/e2e/` |
| Pipeline CI | GitHub Actions: lint → pruebas → build → artefactos → SonarCloud → E2E | `.github/workflows/ci.yml` |
| Análisis de calidad | SonarCloud (requiere el secret `SONAR_TOKEN`) | `sonar-project.properties` |
| Política de Pull Requests | Plantilla de PR + CODEOWNERS (+ protección de la rama `main` en GitHub) | `.github/` |
| Despliegue continuo | Vercel despliega `main` automáticamente; cada PR obtiene una URL de vista previa | `vercel.json` |

```bash
npm run lint            # ESLint
npm test                # pruebas unitarias
npm run test:coverage   # con reporte de cobertura en coverage/
npm run build && npx vite preview --port 4173   # y en otra terminal:
npm run e2e             # Cypress
```
