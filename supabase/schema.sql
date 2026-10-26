-- =====================================================================
-- Centro Educativo "Educar para Transformar" - Sistema de Gestion Integral
-- Esquema de base de datos para Supabase (PostgreSQL)
--
-- Como usarlo: Supabase -> SQL Editor -> New query -> pegar TODO -> Run.
-- Ejecutarlo UNA sola vez sobre un proyecto vacio.
--
-- Dominios (Plan de Trabajo, 1.4):
--   1. Personas y Seguridad: roles, usuarios, alumnos, profesores, tutores
--   2. Estructura Academica: niveles, cursos, materias, matriculas
--   3. Actividades Deportivas: deportes, comisiones, horarios, inscripciones
--   4. Servicios y Salud: transporte, comedor, ficha medica
--
-- Las reglas de negocio se validan en la API (Node.js) y ademas aqui, con
-- triggers y restricciones, para garantizar consistencia (ACID).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Utilidades: updated_at automatico y auditoria
-- ---------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- La API ejecuta: select set_config('app.usuario_id', '<id>', true)
-- dentro de cada transaccion para que la auditoria registre al usuario.
create table auditoria (
  id          bigint generated always as identity primary key,
  tabla       text        not null,
  operacion   text        not null check (operacion in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id bigint,
  usuario_id  bigint,
  datos       jsonb,
  fecha       timestamptz not null default now()
);

create or replace function registrar_auditoria() returns trigger
language plpgsql as $$
declare
  fila jsonb;
begin
  fila := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into auditoria (tabla, operacion, registro_id, usuario_id, datos)
  values (
    tg_table_name,
    tg_op,
    (fila ->> 'id')::bigint,
    nullif(current_setting('app.usuario_id', true), '')::bigint,
    fila
  );
  return null;
end;
$$;

-- =====================================================================
-- 1. PERSONAS Y SEGURIDAD
-- =====================================================================

create table roles (
  id          smallint generated always as identity primary key,
  codigo      text not null unique,
  nombre      text not null,
  descripcion text
);

create table permisos (
  id          smallint generated always as identity primary key,
  codigo      text not null unique,
  descripcion text
);

create table roles_permisos (
  rol_id     smallint not null references roles (id) on delete cascade,
  permiso_id smallint not null references permisos (id) on delete cascade,
  primary key (rol_id, permiso_id)
);

create table usuarios (
  id            bigint generated always as identity primary key,
  email         text        not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash text        not null,
  nombre        text        not null,
  apellido      text        not null,
  rol_id        smallint    not null references roles (id),
  activo        boolean     not null default true,
  ultimo_acceso timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table profesores (
  id             bigint generated always as identity primary key,
  usuario_id     bigint unique references usuarios (id) on delete set null,
  dni            text        not null unique,
  nombre         text        not null,
  apellido       text        not null,
  email          text,
  telefono       text,
  especialidad   text,
  fecha_ingreso  date,
  activo         boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table tutores (
  id          bigint generated always as identity primary key,
  usuario_id  bigint unique references usuarios (id) on delete set null,
  dni         text        not null unique,
  nombre      text        not null,
  apellido    text        not null,
  email       text,
  telefono    text,
  direccion   text,
  ocupacion   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =====================================================================
-- 2. ESTRUCTURA ACADEMICA
-- =====================================================================

create table niveles_educativos (
  id          smallint generated always as identity primary key,
  nombre      text not null unique check (nombre in ('Inicial', 'Primario', 'Secundario')),
  descripcion text,
  edad_desde  smallint,
  edad_hasta  smallint
);

create table alumnos (
  id               bigint generated always as identity primary key,
  usuario_id       bigint unique references usuarios (id) on delete set null,
  dni              text        not null unique,
  nombre           text        not null,
  apellido         text        not null,
  fecha_nacimiento date        not null,
  genero           text,
  direccion        text,
  nivel_id         smallint    references niveles_educativos (id),
  activo           boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Vinculo familiar (RF-08): un alumno puede tener varios tutores y viceversa.
create table alumnos_tutores (
  alumno_id         bigint  not null references alumnos (id) on delete cascade,
  tutor_id          bigint  not null references tutores (id) on delete cascade,
  parentesco        text    not null,
  es_responsable    boolean not null default false,
  autorizado_retiro boolean not null default true,
  primary key (alumno_id, tutor_id)
);

create table ciclos_lectivos (
  id           smallint generated always as identity primary key,
  anio         smallint not null unique,
  fecha_inicio date     not null,
  fecha_fin    date     not null,
  activo       boolean  not null default false,
  check (fecha_fin > fecha_inicio)
);

create unique index ciclos_un_solo_activo on ciclos_lectivos (activo) where activo;

create table cursos (
  id          bigint generated always as identity primary key,
  nivel_id    smallint    not null references niveles_educativos (id),
  ciclo_id    smallint    not null references ciclos_lectivos (id),
  anio        text        not null,
  division    text        not null,
  turno       text        not null default 'Jornada extendida'
                check (turno in ('Mañana', 'Tarde', 'Jornada extendida')),
  cupo        smallint    not null default 30 check (cupo > 0),
  created_at  timestamptz not null default now(),
  unique (nivel_id, ciclo_id, anio, division)
);

create table materias (
  id          bigint generated always as identity primary key,
  nombre      text    not null,
  nivel_id    smallint not null references niveles_educativos (id),
  es_idioma   boolean not null default false,
  carga_horaria_semanal smallint,
  unique (nombre, nivel_id)
);

-- Materias dictadas en cada curso, con su docente (RF-05 / RF-06).
create table cursos_materias (
  id          bigint generated always as identity primary key,
  curso_id    bigint not null references cursos (id) on delete cascade,
  materia_id  bigint not null references materias (id),
  profesor_id bigint references profesores (id) on delete set null,
  unique (curso_id, materia_id)
);

-- Inscripcion a curso / matricula (RF-09). Un unico curso por alumno y ciclo.
create table matriculas (
  id              bigint generated always as identity primary key,
  alumno_id       bigint      not null references alumnos (id) on delete cascade,
  curso_id        bigint      not null references cursos (id),
  ciclo_id        smallint    not null references ciclos_lectivos (id),
  estado          text        not null default 'Activa'
                    check (estado in ('Pendiente', 'Activa', 'Baja')),
  comprobante     text        not null default upper(substr(md5(random()::text), 1, 10)),
  registrado_por  bigint      references usuarios (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index matriculas_una_por_ciclo on matriculas (alumno_id, ciclo_id) where estado <> 'Baja';

-- El ciclo de la matricula se toma del curso y se controla el cupo.
create or replace function validar_matricula() returns trigger
language plpgsql as $$
declare
  v_ciclo smallint;
  v_cupo  smallint;
  v_ocupados integer;
begin
  select ciclo_id, cupo into v_ciclo, v_cupo from cursos where id = new.curso_id for update;
  new.ciclo_id := v_ciclo;

  if new.estado <> 'Baja' then
    select count(*) into v_ocupados
    from matriculas
    where curso_id = new.curso_id and estado <> 'Baja' and id is distinct from new.id;

    if v_ocupados >= v_cupo then
      raise exception 'El curso no tiene vacantes disponibles (cupo %).', v_cupo
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger matriculas_validar
before insert or update of curso_id, estado on matriculas
for each row execute function validar_matricula();

-- =====================================================================
-- 4. SERVICIOS Y SALUD (la ficha medica se define antes que deportes
--    porque la inscripcion deportiva valida el apto fisico)
-- =====================================================================

-- Ficha medica, apto fisico y credencial QR (RF-22).
create table fichas_medicas (
  id                   bigint generated always as identity primary key,
  alumno_id            bigint      not null unique references alumnos (id) on delete cascade,
  grupo_sanguineo      text,
  alergias             text,
  enfermedades_cronicas text,
  medicacion           text,
  obra_social          text,
  nro_afiliado         text,
  contacto_emergencia  text,
  telefono_emergencia  text,
  apto_fisico_emision  date,
  apto_fisico_vence    date,
  apto_fisico_archivo  text,
  qr_token             uuid        not null unique default gen_random_uuid(),
  observaciones        text,
  actualizado_por      bigint      references usuarios (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (apto_fisico_vence is null or apto_fisico_emision is null or apto_fisico_vence > apto_fisico_emision)
);

-- Transporte escolar: exactamente 4 recorridos oficiales (RF-12).
create table recorridos_transporte (
  id            smallint primary key check (id between 1 and 4),
  nombre        text     not null unique,
  zona          text     not null,
  paradas       text,
  horario_ida   time     not null,
  horario_vuelta time    not null,
  capacidad     smallint not null default 40 check (capacidad > 0)
);

create table inscripciones_transporte (
  id             bigint generated always as identity primary key,
  alumno_id      bigint      not null references alumnos (id) on delete cascade,
  recorrido_id   smallint    not null references recorridos_transporte (id),
  ciclo_id       smallint    not null references ciclos_lectivos (id),
  parada         text,
  activa         boolean     not null default true,
  comprobante    text        not null default upper(substr(md5(random()::text), 1, 10)),
  registrado_por bigint      references usuarios (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Un unico recorrido activo por alumno.
create unique index transporte_un_recorrido_activo on inscripciones_transporte (alumno_id) where activa;

create or replace function validar_transporte() returns trigger
language plpgsql as $$
declare
  v_capacidad smallint;
  v_ocupados  integer;
begin
  if new.activa then
    select capacidad into v_capacidad from recorridos_transporte where id = new.recorrido_id for update;
    select count(*) into v_ocupados
    from inscripciones_transporte
    where recorrido_id = new.recorrido_id and activa and id is distinct from new.id;

    if v_ocupados >= v_capacidad then
      raise exception 'El recorrido no tiene asientos disponibles.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger transporte_validar
before insert or update of recorrido_id, activa on inscripciones_transporte
for each row execute function validar_transporte();

-- Comedor (RF-13).
create table inscripciones_comedor (
  id             bigint generated always as identity primary key,
  alumno_id      bigint      not null references alumnos (id) on delete cascade,
  ciclo_id       smallint    not null references ciclos_lectivos (id),
  modalidad      text        not null default 'Almuerzo'
                   check (modalidad in ('Almuerzo', 'Almuerzo y merienda', 'Vianda propia')),
  dias           smallint[]  not null default '{1,2,3,4,5}',
  dieta_especial text,
  activa         boolean     not null default true,
  registrado_por bigint      references usuarios (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (dias <@ array[1,2,3,4,5]::smallint[] and cardinality(dias) > 0)
);

create unique index comedor_una_inscripcion_activa on inscripciones_comedor (alumno_id, ciclo_id) where activa;

-- =====================================================================
-- 3. ACTIVIDADES DEPORTIVAS
-- =====================================================================

create table deportes (
  id          bigint generated always as identity primary key,
  nombre      text not null unique,
  descripcion text,
  activo      boolean not null default true
);

-- Comision: un grupo de un deporte para un nivel, con profesor y cupo (RF-10).
create table comisiones (
  id          bigint generated always as identity primary key,
  deporte_id  bigint   not null references deportes (id) on delete cascade,
  nivel_id    smallint not null references niveles_educativos (id),
  ciclo_id    smallint not null references ciclos_lectivos (id),
  nombre      text     not null,
  profesor_id bigint   references profesores (id) on delete set null,
  cupo        smallint not null default 20 check (cupo > 0),
  unique (deporte_id, ciclo_id, nombre)
);

-- dia_semana: 1 = lunes ... 6 = sabado
create table horarios (
  id          bigint generated always as identity primary key,
  comision_id bigint   not null references comisiones (id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 1 and 6),
  hora_inicio time     not null,
  hora_fin    time     not null,
  check (hora_fin > hora_inicio)
);

create table inscripciones_deporte (
  id             bigint generated always as identity primary key,
  alumno_id      bigint      not null references alumnos (id) on delete cascade,
  comision_id    bigint      not null references comisiones (id),
  activa         boolean     not null default true,
  registrado_por bigint      references usuarios (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index deporte_sin_duplicados on inscripciones_deporte (alumno_id, comision_id) where activa;

-- Reglas RF-11 / RF-22: maximo 2 deportes, sin solapes, mismo nivel,
-- con cupo y con apto fisico vigente.
create or replace function validar_inscripcion_deporte() returns trigger
language plpgsql as $$
declare
  v_comision   comisiones%rowtype;
  v_nivel      smallint;
  v_vence      date;
  v_activas    integer;
  v_ocupados   integer;
  v_choque     text;
begin
  if not new.activa then
    return new;
  end if;

  select * into v_comision from comisiones where id = new.comision_id for update;

  -- Bloquea al alumno para serializar inscripciones concurrentes.
  select nivel_id into v_nivel from alumnos where id = new.alumno_id for update;

  if v_nivel is distinct from v_comision.nivel_id then
    raise exception 'La comisión no corresponde al nivel educativo del alumno.' using errcode = 'P0001';
  end if;

  select apto_fisico_vence into v_vence from fichas_medicas where alumno_id = new.alumno_id;
  if v_vence is null or v_vence < current_date then
    raise exception 'El alumno no tiene apto físico vigente. Debe actualizarlo en enfermería.' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from inscripciones_deporte i
    join comisiones c on c.id = i.comision_id
    where i.alumno_id = new.alumno_id and i.activa and i.id is distinct from new.id
      and c.deporte_id = v_comision.deporte_id and c.ciclo_id = v_comision.ciclo_id
  ) then
    raise exception 'El alumno ya esta inscripto en este deporte.' using errcode = 'P0001';
  end if;

  select count(*) into v_activas
  from inscripciones_deporte i
  join comisiones c on c.id = i.comision_id
  where i.alumno_id = new.alumno_id and i.activa and i.id is distinct from new.id
    and c.ciclo_id = v_comision.ciclo_id;

  if v_activas >= 2 then
    raise exception 'El alumno ya tiene 2 deportes activos (máximo permitido).' using errcode = 'P0001';
  end if;

  select d.nombre into v_choque
  from inscripciones_deporte i
  join comisiones c on c.id = i.comision_id
  join deportes d on d.id = c.deporte_id
  join horarios h_actual on h_actual.comision_id = i.comision_id
  join horarios h_nuevo on h_nuevo.comision_id = new.comision_id
  where i.alumno_id = new.alumno_id and i.activa and i.id is distinct from new.id
    and h_actual.dia_semana = h_nuevo.dia_semana
    and h_actual.hora_inicio < h_nuevo.hora_fin
    and h_nuevo.hora_inicio < h_actual.hora_fin
  limit 1;

  if v_choque is not null then
    raise exception 'El horario se superpone con %.', v_choque using errcode = 'P0001';
  end if;

  select count(*) into v_ocupados
  from inscripciones_deporte
  where comision_id = new.comision_id and activa and id is distinct from new.id;

  if v_ocupados >= v_comision.cupo then
    raise exception 'La comisión no tiene cupo disponible.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger deporte_validar
before insert or update of comision_id, activa on inscripciones_deporte
for each row execute function validar_inscripcion_deporte();

-- =====================================================================
-- PORTAL PUBLICO (sitio institucional)
-- =====================================================================

create table noticias (
  id          bigint generated always as identity primary key,
  titulo      text        not null,
  resumen     text        not null,
  contenido   text,
  imagen_url  text,
  categoria   text        not null default 'Institucional',
  publicada   boolean     not null default true,
  autor_id    bigint      references usuarios (id) on delete set null,
  fecha       timestamptz not null default now()
);

create table mensajes_contacto (
  id         bigint generated always as identity primary key,
  nombre     text        not null,
  email      text        not null,
  telefono   text,
  asunto     text        not null,
  mensaje    text        not null,
  leido      boolean     not null default false,
  created_at timestamptz not null default now()
);

-- Pre-inscripcion de familias interesadas, desde el sitio publico.
create table solicitudes_inscripcion (
  id               bigint generated always as identity primary key,
  tutor_nombre     text        not null,
  tutor_email      text        not null,
  tutor_telefono   text        not null,
  alumno_nombre    text        not null,
  alumno_fecha_nac date,
  nivel_id         smallint    references niveles_educativos (id),
  anio_solicitado  text,
  servicios        text[]      not null default '{}',
  comentarios      text,
  estado           text        not null default 'Pendiente'
                     check (estado in ('Pendiente', 'Contactada', 'Aceptada', 'Rechazada')),
  created_at       timestamptz not null default now()
);

-- =====================================================================
-- TRIGGERS COMUNES (updated_at y auditoria)
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'usuarios', 'profesores', 'tutores', 'alumnos', 'matriculas', 'fichas_medicas',
    'inscripciones_transporte', 'inscripciones_comedor', 'inscripciones_deporte'
  ] loop
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;

  foreach t in array array[
    'usuarios', 'alumnos', 'alumnos_tutores', 'matriculas', 'fichas_medicas',
    'inscripciones_transporte', 'inscripciones_comedor', 'inscripciones_deporte'
  ] loop
    execute format('create trigger %I_auditoria after insert or update or delete on %I for each row execute function registrar_auditoria()', t, t);
  end loop;
end;
$$;

-- =====================================================================
-- VISTAS PARA REPORTES MIS (RF-16 a RF-21)
-- security_invoker: las vistas respetan los permisos de quien consulta.
-- =====================================================================

-- Padron por curso.
create view v_padron_curso with (security_invoker = true) as
select
  c.id                                  as curso_id,
  n.nombre                              as nivel,
  c.anio || ' ' || c.division           as curso,
  cl.anio                               as ciclo,
  a.id                                  as alumno_id,
  a.apellido || ', ' || a.nombre        as alumno,
  a.dni,
  m.estado,
  m.comprobante
from matriculas m
join cursos c             on c.id = m.curso_id
join niveles_educativos n on n.id = c.nivel_id
join ciclos_lectivos cl   on cl.id = c.ciclo_id
join alumnos a            on a.id = m.alumno_id
where m.estado <> 'Baja';

-- Padron logistico de transporte (HU-05).
create view v_padron_transporte with (security_invoker = true) as
select
  r.id                                  as recorrido_id,
  r.nombre                              as recorrido,
  r.zona,
  t.parada,
  a.id                                  as alumno_id,
  a.apellido || ', ' || a.nombre        as alumno,
  a.dni,
  coalesce(n.nombre || ' - ' || c.anio || ' ' || c.division, 'Sin matricula') as curso,
  (
    select tu.apellido || ', ' || tu.nombre || ' (' || coalesce(tu.telefono, 's/tel') || ')'
    from alumnos_tutores at2
    join tutores tu on tu.id = at2.tutor_id
    where at2.alumno_id = a.id
    order by at2.es_responsable desc
    limit 1
  )                                     as contacto
from inscripciones_transporte t
join recorridos_transporte r on r.id = t.recorrido_id
join alumnos a               on a.id = t.alumno_id
left join matriculas m       on m.alumno_id = a.id and m.ciclo_id = t.ciclo_id and m.estado <> 'Baja'
left join cursos c           on c.id = m.curso_id
left join niveles_educativos n on n.id = c.nivel_id
where t.activa;

-- Ficha integral del alumno (reporte 360).
create view v_alumno_360 with (security_invoker = true) as
select
  a.id                                  as alumno_id,
  a.apellido || ', ' || a.nombre        as alumno,
  a.dni,
  a.fecha_nacimiento,
  n.nombre                              as nivel,
  (select c.anio || ' ' || c.division
     from matriculas m join cursos c on c.id = m.curso_id
    where m.alumno_id = a.id and m.estado <> 'Baja'
    order by m.ciclo_id desc limit 1)   as curso,
  (select string_agg(tu.apellido || ', ' || tu.nombre || ' (' || at2.parentesco || ')', '; ')
     from alumnos_tutores at2 join tutores tu on tu.id = at2.tutor_id
    where at2.alumno_id = a.id)         as tutores,
  (select string_agg(d.nombre || ' - ' || co.nombre, '; ')
     from inscripciones_deporte i
     join comisiones co on co.id = i.comision_id
     join deportes d on d.id = co.deporte_id
    where i.alumno_id = a.id and i.activa) as deportes,
  (select r.nombre
     from inscripciones_transporte t join recorridos_transporte r on r.id = t.recorrido_id
    where t.alumno_id = a.id and t.activa) as transporte,
  (select ic.modalidad from inscripciones_comedor ic
    where ic.alumno_id = a.id and ic.activa
    order by ic.ciclo_id desc limit 1)  as comedor,
  f.grupo_sanguineo,
  f.alergias,
  f.apto_fisico_vence,
  case
    when f.apto_fisico_vence is null then 'Sin apto'
    when f.apto_fisico_vence < current_date then 'Vencido'
    else 'Vigente'
  end                                   as estado_apto
from alumnos a
left join niveles_educativos n on n.id = a.nivel_id
left join fichas_medicas f     on f.alumno_id = a.id;

-- =====================================================================
-- SEGURIDAD: Row Level Security
-- Todas las tablas quedan cerradas para las claves publicas (anon /
-- publishable). Solo la API Node.js, conectada con DATABASE_URL, accede a
-- los datos y aplica el control por roles (RBAC).
-- =====================================================================

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- =====================================================================
-- DATOS INICIALES
-- =====================================================================

insert into roles (codigo, nombre, descripcion) values
  ('ADMIN',      'Administrador', 'Dirección y secretaría: acceso total'),
  ('DOCENTE',    'Docente',       'Profesores: cursos, materias y comisiones a cargo'),
  ('TUTOR',      'Tutor',         'Familias: autogestión de sus hijos'),
  ('ALUMNO',     'Alumno',        'Consulta de su información'),
  ('ENFERMERIA', 'Enfermería',    'Ficha médica y apto físico');

insert into permisos (codigo, descripcion) values
  ('usuarios.gestionar',     'Alta, baja y modificación de usuarios'),
  ('academico.gestionar',    'Niveles, cursos, materias y docentes'),
  ('alumnos.gestionar',      'Legajos de alumnos y vinculo familiar'),
  ('matriculas.gestionar',   'Matricular alumnos'),
  ('deportes.gestionar',     'Deportes, comisiones y horarios'),
  ('servicios.gestionar',    'Transporte y comedor'),
  ('reportes.ver',           'Reportes gerenciales MIS'),
  ('salud.gestionar',        'Ficha médica y apto físico'),
  ('portal.familia',         'Autogestión de la familia'),
  ('portal.docente',         'Autogestión del docente'),
  ('portal.alumno',          'Consulta del alumno'),
  ('contenido.gestionar',    'Noticias y mensajes del sitio');

insert into roles_permisos (rol_id, permiso_id)
select r.id, p.id
from roles r
join permisos p on
     r.codigo = 'ADMIN' and p.codigo not in ('portal.familia', 'portal.docente', 'portal.alumno', 'salud.gestionar')
  or r.codigo = 'DOCENTE'    and p.codigo in ('portal.docente')
  or r.codigo = 'TUTOR'      and p.codigo in ('portal.familia')
  or r.codigo = 'ALUMNO'     and p.codigo in ('portal.alumno')
  or r.codigo = 'ENFERMERIA' and p.codigo in ('salud.gestionar');

insert into niveles_educativos (nombre, descripcion, edad_desde, edad_hasta) values
  ('Inicial',    'Salas de 3, 4 y 5 años con jornada extendida y juego en inglés.', 3, 5),
  ('Primario',   'De 1.º a 6.º grado con formación plurilingüe y deporte diario.', 6, 11),
  ('Secundario', 'De 1.º a 6.º año con orientación en ciencias, idiomas y tecnología.', 12, 17);

insert into ciclos_lectivos (anio, fecha_inicio, fecha_fin, activo) values
  (2027, '2027-03-01', '2027-12-15', true);

-- Cursos: Inicial (salas), Primario (1.º a 6.º) y Secundario (1.º a 6.º), división A.
insert into cursos (nivel_id, ciclo_id, anio, division, cupo)
select n.id, c.id, x.anio, 'A', 25
from (values
  ('Inicial', 'Sala de 3'), ('Inicial', 'Sala de 4'), ('Inicial', 'Sala de 5'),
  ('Primario', '1.º grado'), ('Primario', '2.º grado'), ('Primario', '3.º grado'),
  ('Primario', '4.º grado'), ('Primario', '5.º grado'), ('Primario', '6.º grado'),
  ('Secundario', '1.º año'), ('Secundario', '2.º año'), ('Secundario', '3.º año'),
  ('Secundario', '4.º año'), ('Secundario', '5.º año'), ('Secundario', '6.º año')
) as x (nivel, anio)
join niveles_educativos n on n.nombre = x.nivel
cross join ciclos_lectivos c
where c.anio = 2027;

insert into materias (nombre, nivel_id, es_idioma, carga_horaria_semanal)
select x.nombre, n.id, x.idioma, x.horas
from (values
  ('Inicial',    'Juego y expresión',       false, 10),
  ('Inicial',    'Inglés',                  true,   5),
  ('Inicial',    'Educación física',        false,  3),
  ('Primario',   'Prácticas del lenguaje',  false,  6),
  ('Primario',   'Matemática',              false,  6),
  ('Primario',   'Ciencias naturales',      false,  3),
  ('Primario',   'Ciencias sociales',       false,  3),
  ('Primario',   'Inglés',                  true,   5),
  ('Primario',   'Portugués',               true,   2),
  ('Primario',   'Educación física',        false,  3),
  ('Secundario', 'Lengua y literatura',     false,  5),
  ('Secundario', 'Matemática',              false,  5),
  ('Secundario', 'Biología',                false,  3),
  ('Secundario', 'Historia',                false,  3),
  ('Secundario', 'Inglés',                  true,   4),
  ('Secundario', 'Portugués',               true,   3),
  ('Secundario', 'Tecnología',              false,  3),
  ('Secundario', 'Educación física',        false,  3)
) as x (nivel, nombre, idioma, horas)
join niveles_educativos n on n.nombre = x.nivel;

-- Cada curso dicta todas las materias de su nivel.
insert into cursos_materias (curso_id, materia_id)
select c.id, m.id
from cursos c
join materias m on m.nivel_id = c.nivel_id;

insert into recorridos_transporte (id, nombre, zona, paradas, horario_ida, horario_vuelta, capacidad) values
  (1, 'Recorrido 1 - Norte', 'Barrio Villa Prosperidad / Av. Alvear',      'Plaza 25 de Mayo, Av. Alvear 1500, Villa Prosperidad', '07:00', '17:30', 40),
  (2, 'Recorrido 2 - Sur',   'Barranqueras / Av. San Martín',             'Av. San Martín 2000, Barranqueras centro',              '07:00', '17:30', 40),
  (3, 'Recorrido 3 - Este',  'Centro / Av. 25 de Mayo',                   'Casa de Gobierno, Av. 25 de Mayo 1200, Parque 2 de Febrero', '07:10', '17:40', 40),
  (4, 'Recorrido 4 - Oeste', 'Villa Libertad / Av. Sarmiento',            'Av. Sarmiento 3000, Villa Libertad, Rotonda Ruta 11',   '07:10', '17:40', 40);

insert into deportes (nombre, descripcion) values
  ('Fútbol',     'Fútbol infantil y juvenil, mixto por categorías.'),
  ('Hockey',     'Hockey sobre cesped.'),
  ('Natación',   'Natación en el natatorio climatizado del centro.'),
  ('Básquet',    'Minibásquet y básquet juvenil.'),
  ('Vóley',      'Vóley para Primario y Secundario.'),
  ('Atletismo',  'Pista y campo.');

-- Comisiones de ejemplo con sus horarios (dia 1 = lunes).
insert into comisiones (deporte_id, nivel_id, ciclo_id, nombre, cupo)
select d.id, n.id, c.id, x.comision, x.cupo
from (values
  ('Fútbol',    'Primario',   'Primario A',   22),
  ('Natación',  'Primario',   'Primario A',   15),
  ('Hockey',    'Primario',   'Primario A',   20),
  ('Básquet',   'Primario',   'Primario A',   20),
  ('Fútbol',    'Secundario', 'Secundario A', 22),
  ('Vóley',     'Secundario', 'Secundario A', 18),
  ('Natación',  'Secundario', 'Secundario A', 15),
  ('Atletismo', 'Secundario', 'Secundario A', 25)
) as x (deporte, nivel, comision, cupo)
join deportes d           on d.nombre = x.deporte
join niveles_educativos n on n.nombre = x.nivel
cross join ciclos_lectivos c
where c.anio = 2027;

insert into horarios (comision_id, dia_semana, hora_inicio, hora_fin)
select co.id, x.dia, x.inicio::time, x.fin::time
from (values
  ('Fútbol',    'Primario A',   1, '16:00', '17:00'),
  ('Fútbol',    'Primario A',   3, '16:00', '17:00'),
  ('Natación',  'Primario A',   1, '16:30', '17:30'),
  ('Natación',  'Primario A',   4, '16:00', '17:00'),
  ('Hockey',    'Primario A',   2, '16:00', '17:00'),
  ('Hockey',    'Primario A',   4, '16:00', '17:00'),
  ('Básquet',   'Primario A',   5, '16:00', '17:30'),
  ('Fútbol',    'Secundario A', 2, '17:00', '18:30'),
  ('Fútbol',    'Secundario A', 4, '17:00', '18:30'),
  ('Vóley',     'Secundario A', 1, '17:00', '18:30'),
  ('Vóley',     'Secundario A', 3, '17:00', '18:30'),
  ('Natación',  'Secundario A', 2, '17:30', '18:30'),
  ('Atletismo', 'Secundario A', 5, '16:30', '18:00')
) as x (deporte, comision, dia, inicio, fin)
join deportes d    on d.nombre = x.deporte
join comisiones co on co.deporte_id = d.id and co.nombre = x.comision;

-- Usuarios demo. Contrasenas cifradas con bcrypt (compatible con bcryptjs).
insert into usuarios (email, password_hash, nombre, apellido, rol_id)
select x.email, extensions.crypt(x.clave, extensions.gen_salt('bf', 10)), x.nombre, x.apellido, r.id
from (values
  ('admin@educar.com',      'admin123',      'Laura',   'Giménez',  'ADMIN'),
  ('docente@educar.com',    'docente123',    'Martín',  'Acosta',   'DOCENTE'),
  ('tutor@educar.com',      'tutor123',      'Carolina','Benítez',  'TUTOR'),
  ('alumno@educar.com',     'alumno123',     'Tomás',   'Benítez',  'ALUMNO'),
  ('enfermeria@educar.com', 'enfermeria123', 'Silvia',  'Romero',   'ENFERMERIA')
) as x (email, clave, nombre, apellido, rol)
join roles r on r.codigo = x.rol;

insert into profesores (usuario_id, dni, nombre, apellido, email, telefono, especialidad, fecha_ingreso)
values
  ((select id from usuarios where email = 'docente@educar.com'), '28111222', 'Martín', 'Acosta', 'docente@educar.com', '3624-401122', 'Educación física', '2027-02-01'),
  (null, '30222333', 'Paula',  'Fernández', 'pfernandez@educar.com', '3624-402233', 'Inglés',     '2027-02-01'),
  (null, '27333444', 'Diego',  'Ramírez',   'dramirez@educar.com',   '3624-403344', 'Matemática', '2027-02-01');

update comisiones set profesor_id = (select id from profesores where dni = '28111222');

insert into tutores (usuario_id, dni, nombre, apellido, email, telefono, direccion, ocupacion)
values
  ((select id from usuarios where email = 'tutor@educar.com'), '25444555', 'Carolina', 'Benítez', 'tutor@educar.com', '3624-555001', 'Av. Alvear 1450, Resistencia', 'Contadora'),
  (null, '26555666', 'Javier', 'López', 'jlopez@mail.com', '3624-555002', 'Av. Sarmiento 2900, Resistencia', 'Comerciante');

insert into alumnos (usuario_id, dni, nombre, apellido, fecha_nacimiento, genero, direccion, nivel_id)
select u.id, x.dni, x.nombre, x.apellido, x.nac::date, x.genero, x.dir, n.id
from (values
  ('alumno@educar.com', '50111222', 'Tomás',  'Benítez', '2015-04-12', 'Masculino', 'Av. Alvear 1450, Resistencia',   'Primario'),
  (null,                '52111333', 'Sofía',  'Benítez', '2018-09-03', 'Femenino',  'Av. Alvear 1450, Resistencia',   'Primario'),
  (null,                '48111444', 'Lucas',  'López',   '2013-01-20', 'Masculino', 'Av. Sarmiento 2900, Resistencia', 'Secundario')
) as x (email, dni, nombre, apellido, nac, genero, dir, nivel)
join niveles_educativos n on n.nombre = x.nivel
left join usuarios u on u.email = x.email;

insert into alumnos_tutores (alumno_id, tutor_id, parentesco, es_responsable)
select a.id, t.id, x.parentesco, true
from (values
  ('50111222', '25444555', 'Madre'),
  ('52111333', '25444555', 'Madre'),
  ('48111444', '26555666', 'Padre')
) as x (alumno, tutor, parentesco)
join alumnos a on a.dni = x.alumno
join tutores t on t.dni = x.tutor;

insert into matriculas (alumno_id, curso_id, ciclo_id)
select a.id, c.id, c.ciclo_id
from (values
  ('50111222', '6.º grado'),
  ('52111333', '3.º grado'),
  ('48111444', '2.º año')
) as x (alumno, anio)
join alumnos a on a.dni = x.alumno
join cursos c  on c.anio = x.anio and c.division = 'A';

insert into fichas_medicas (alumno_id, grupo_sanguineo, alergias, obra_social, contacto_emergencia, telefono_emergencia, apto_fisico_emision, apto_fisico_vence)
select a.id, x.grupo, x.alergias, x.os, x.contacto, x.tel, x.emision::date, x.vence::date
from (values
  ('50111222', 'A+', 'Ninguna',    'OSDE',     'Carolina Benítez', '3624-555001', '2027-02-10', '2028-02-10'),
  ('52111333', '0+', 'Penicilina', 'OSDE',     'Carolina Benítez', '3624-555001', '2025-02-10', '2026-02-10'),
  ('48111444', 'B+', 'Ninguna',    'Swiss Medical', 'Javier López', '3624-555002', '2027-02-15', '2028-02-15')
) as x (alumno, grupo, alergias, os, contacto, tel, emision, vence)
join alumnos a on a.dni = x.alumno;

insert into inscripciones_transporte (alumno_id, recorrido_id, ciclo_id, parada)
select a.id, x.recorrido, c.id, x.parada
from (values
  ('50111222', 1, 'Av. Alvear 1500'),
  ('48111444', 4, 'Av. Sarmiento 3000')
) as x (alumno, recorrido, parada)
join alumnos a on a.dni = x.alumno
cross join ciclos_lectivos c
where c.anio = 2027;

insert into inscripciones_comedor (alumno_id, ciclo_id, modalidad)
select a.id, c.id, 'Almuerzo y merienda'
from alumnos a cross join ciclos_lectivos c
where c.anio = 2027 and a.dni in ('50111222', '52111333');

insert into noticias (titulo, resumen, categoria) values
  ('Abrimos la pre-inscripción 2027',
   'Las familias ya pueden completar la solicitud online para Inicial, Primario y Secundario.',
   'Inscripciones'),
  ('Jornada de puertas abiertas',
   'Recorre las instalaciones, conoce al equipo docente y la propuesta plurilingüe.',
   'Institucional'),
  ('Deportes propios desde el primer año',
   'Fútbol, hockey, natación, básquet, vóley y atletismo dentro del predio.',
   'Deportes');
