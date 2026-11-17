-- =====================================================================
-- TP Integrador (versión 3): lo que pide el enunciado y faltaba.
--   Parte 1 (web): opiniones sin iniciar sesión, búsquedas laborales y
--                  postulaciones.
--   Parte 2 (gestión): legajo, teléfono y email del alumno; legajo del
--                  profesor; profesor responsable de cada deporte; horarios
--                  de cursado; idioma Francés y los deportes que faltaban.
--   Parte 3 (app y pagos): tarifas que define el administrador, facturas
--                  mensuales por alumno con sus ítems, pagos solo por
--                  transferencia con comprobantes adjuntos, correos
--                  (simulados) y recupero de contraseña.
--
-- Como usarlo: Supabase -> SQL Editor -> New snippet -> pegar TODO -> Run.
-- Requiere schema.sql y 003_datos_demo.sql. Se puede ejecutar más de una vez.
-- Reemplaza a 004_cuotas.sql (si se había ejecutado, borra su tabla).
-- Los pagos son una simulación para el trabajo práctico: no hay dinero real.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- PARTE 1: opiniones y empleo
-- ---------------------------------------------------------------------

create table if not exists opiniones (
  id          bigint generated always as identity primary key,
  nombre      text        not null check (length(nombre) between 2 and 80),
  relacion    text        not null default 'Visitante'
                check (relacion in ('Familia', 'Alumno', 'Ex alumno', 'Docente', 'Visitante')),
  comentario  text        not null check (length(comentario) between 5 and 600),
  puntaje     smallint    not null check (puntaje between 1 and 5),
  visible     boolean     not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists busquedas_laborales (
  id          bigint generated always as identity primary key,
  puesto      text    not null unique,
  area        text    not null,
  descripcion text    not null,
  modalidad   text    not null default 'Jornada completa',
  activa      boolean not null default true
);

create table if not exists postulaciones (
  id          bigint generated always as identity primary key,
  busqueda_id bigint      references busquedas_laborales (id) on delete set null,
  nombre      text        not null,
  email       text        not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono    text,
  puesto      text        not null,
  mensaje     text,
  cv_url      text,
  estado      text        not null default 'Nueva' check (estado in ('Nueva', 'Revisada', 'Entrevista', 'Descartada')),
  created_at  timestamptz not null default now()
);

insert into opiniones (nombre, relacion, comentario, puntaje)
select x.nombre, x.relacion, x.comentario, x.puntaje
from (values
  ('Carolina B.', 'Familia',   'Nos encantó la propuesta de jornada extendida y que los deportes estén dentro del mismo predio.', 5),
  ('Martín G.',   'Familia',   'La inscripción por la web fue muy simple y pudimos sumar el transporte en el mismo momento.', 5),
  ('Julieta M.',  'Alumno',    'La pileta y la pista de atletismo son increíbles. ¡Quiero empezar ya!', 4),
  ('Ana P.',      'Visitante', 'Fui a la jornada de puertas abiertas: instalaciones nuevas y un equipo muy cálido.', 5)
) as x (nombre, relacion, comentario, puntaje)
where not exists (select 1 from opiniones o where o.nombre = x.nombre);

insert into busquedas_laborales (puesto, area, descripcion, modalidad) values
  ('Docente de Francés',            'Idiomas',    'Profesorado o traductorado en Francés. Primario y Secundario.',                 'Media jornada'),
  ('Profesor/a de Artes Marciales', 'Deportes',   'Instructor/a con certificación para grupos de Primario y Secundario.',          'Por horas'),
  ('Enfermero/a',                   'Enfermería', 'Matrícula habilitante. Experiencia en ámbitos escolares (deseable).',            'Jornada completa'),
  ('Chofer de transporte escolar',  'Servicios',  'Licencia profesional D1 y antecedentes. Recorridos de Resistencia y Barranqueras.', 'Jornada completa')
on conflict (puesto) do nothing;

-- ---------------------------------------------------------------------
-- PARTE 2: datos que pide el enunciado para alumnos, profesores y deportes
-- ---------------------------------------------------------------------

alter table alumnos    add column if not exists telefono text;
alter table alumnos    add column if not exists email text;
alter table alumnos    add column if not exists legajo text generated always as ('A-' || lpad(id::text, 5, '0')) stored;
alter table profesores add column if not exists legajo text generated always as ('D-' || lpad(id::text, 4, '0')) stored;

alter table deportes add column if not exists profesor_responsable_id bigint references profesores (id) on delete set null;
alter table deportes add column if not exists precio_mensual integer not null default 12000 check (precio_mensual >= 0);
alter table recorridos_transporte add column if not exists precio_mensual integer not null default 20000 check (precio_mensual >= 0);

update alumnos a set
  telefono = coalesce(a.telefono, (select t.telefono from alumnos_tutores at join tutores t on t.id = at.tutor_id
                                    where at.alumno_id = a.id order by at.es_responsable desc limit 1)),
  email    = coalesce(a.email, lower(translate(a.nombre || '.' || a.apellido, 'áéíóúÁÉÍÓÚñÑ ', 'aeiouAEIOUnN')) || '@alumnos.educar.com');

-- Docente de Francés (el enunciado pide Inglés, Portugués y Francés).
insert into profesores (dni, nombre, apellido, email, telefono, especialidad, fecha_ingreso)
values ('35111777', 'Camille', 'Durand', 'cdurand@educar.com', '3624-410077', 'Francés', '2027-02-01')
on conflict (dni) do nothing;

insert into materias (nombre, nivel_id, es_idioma, carga_horaria_semanal)
select 'Francés', n.id, true, 2 from niveles_educativos n where n.nombre in ('Primario', 'Secundario')
on conflict (nombre, nivel_id) do nothing;

insert into cursos_materias (curso_id, materia_id, profesor_id)
select c.id, m.id, (select id from profesores where dni = '35111777')
from cursos c join materias m on m.nivel_id = c.nivel_id and m.nombre = 'Francés'
on conflict (curso_id, materia_id) do nothing;

-- Deportes del enunciado que faltaban, con sus comisiones y horarios.
insert into deportes (nombre, descripcion) values
  ('Artes Marciales', 'Taekwondo y defensa personal por categorías.'),
  ('Danza',           'Danza contemporánea y folclore.'),
  ('Ajedrez',         'Taller de ajedrez con torneos internos.')
on conflict (nombre) do nothing;

insert into comisiones (deporte_id, nivel_id, ciclo_id, nombre, cupo, profesor_id)
select d.id, n.id, c.id, x.comision, x.cupo, (select id from profesores where dni = '30999666')
from (values
  ('Artes Marciales', 'Primario',   'Primario A',   18),
  ('Danza',           'Primario',   'Primario A',   20),
  ('Ajedrez',         'Primario',   'Primario A',   16),
  ('Artes Marciales', 'Secundario', 'Secundario A', 18),
  ('Danza',           'Secundario', 'Secundario A', 20),
  ('Ajedrez',         'Secundario', 'Secundario A', 16)
) as x (deporte, nivel, comision, cupo)
join deportes d           on d.nombre = x.deporte
join niveles_educativos n on n.nombre = x.nivel
cross join ciclos_lectivos c
where c.anio = 2027
on conflict (deporte_id, ciclo_id, nombre) do nothing;

insert into horarios (comision_id, dia_semana, hora_inicio, hora_fin)
select co.id, x.dia, x.inicio::time, x.fin::time
from (values
  ('Artes Marciales', 'Primario A',   2, '17:15', '18:15'),
  ('Danza',           'Primario A',   3, '17:15', '18:15'),
  ('Ajedrez',         'Primario A',   6, '10:00', '11:30'),
  ('Artes Marciales', 'Secundario A', 3, '18:45', '19:45'),
  ('Danza',           'Secundario A', 4, '18:45', '19:45'),
  ('Ajedrez',         'Secundario A', 6, '11:30', '13:00')
) as x (deporte, comision, dia, inicio, fin)
join deportes d    on d.nombre = x.deporte
join comisiones co on co.deporte_id = d.id and co.nombre = x.comision
where not exists (select 1 from horarios h where h.comision_id = co.id);

-- Cada deporte tiene un profesor responsable y un valor mensual diferenciado.
update deportes d set
  profesor_responsable_id = coalesce(d.profesor_responsable_id,
    (select co.profesor_id from comisiones co where co.deporte_id = d.id and co.profesor_id is not null order by co.id limit 1),
    (select id from profesores where dni = '30999666')),
  precio_mensual = case d.nombre
    when 'Fútbol' then 12000 when 'Hockey' then 14000 when 'Natación' then 18000 when 'Básquet' then 12000
    when 'Vóley' then 11000 when 'Atletismo' then 10000 when 'Artes Marciales' then 15000
    when 'Danza' then 13000 when 'Ajedrez' then 8000 else d.precio_mensual end
where d.profesor_responsable_id is null or d.precio_mensual = 12000;

-- Cada recorrido tiene un valor diferenciado.
update recorridos_transporte set precio_mensual = case id when 1 then 22000 when 2 then 25000 when 3 then 20000 else 24000 end
where precio_mensual = 20000;

-- Horarios de cursado de cada materia en cada curso (reporte por docente).
create table if not exists horarios_materia (
  id               bigint generated always as identity primary key,
  curso_materia_id bigint   not null references cursos_materias (id) on delete cascade,
  dia_semana       smallint not null check (dia_semana between 1 and 5),
  hora_inicio      time     not null,
  hora_fin         time     not null,
  check (hora_fin > hora_inicio),
  unique (curso_materia_id, dia_semana, hora_inicio)
);

-- Distribuye las materias de cada curso en bloques de 80 minutos, de lunes a viernes.
insert into horarios_materia (curso_materia_id, dia_semana, hora_inicio, hora_fin)
select x.id,
       1 + ((x.orden * 2 + s.n) % 5),
       (time '08:00' + make_interval(mins => 80 * ((x.orden + s.n) % 4)))::time,
       (time '09:20' + make_interval(mins => 80 * ((x.orden + s.n) % 4)))::time
from (select cm.id, (row_number() over (partition by cm.curso_id order by cm.id) - 1)::int as orden
      from cursos_materias cm) x
cross join (values (0), (1)) as s (n)
where not exists (select 1 from horarios_materia h where h.curso_materia_id = x.id);

-- ---------------------------------------------------------------------
-- PARTE 3: tarifas, facturas, pagos por transferencia y comprobantes
-- ---------------------------------------------------------------------

drop table if exists pagos_cuotas;

-- El administrador solo define los valores: cuota, comedor, cada deporte y cada recorrido.
create table if not exists tarifas (
  clave       text primary key,
  descripcion text        not null,
  importe     integer     not null check (importe >= 0),
  updated_at  timestamptz not null default now()
);

insert into tarifas (clave, descripcion, importe) values
  ('cuota_mensual',            'Cuota mensual por alumno',                                  40000),
  ('cuota_hermanos',           'Cuota mensual por alumno con 2 o más hermanos en el centro', 30000),
  ('comedor_almuerzo',         'Comedor: almuerzo',                                         25000),
  ('comedor_almuerzo_merienda','Comedor: almuerzo y merienda',                              32000),
  ('comedor_vianda',           'Comedor: vianda propia (uso del espacio)',                   8000)
on conflict (clave) do nothing;

create table if not exists facturas (
  id             bigint generated always as identity primary key,
  numero         text generated always as ('FC-' || lpad(id::text, 6, '0')) stored,
  alumno_id      bigint      not null references alumnos (id) on delete cascade,
  periodo        text        not null check (periodo ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  fecha_emision  date        not null default current_date,
  vence          date        not null,
  total          integer     not null default 0 check (total >= 0),
  created_at     timestamptz not null default now(),
  unique (alumno_id, periodo)
);

-- Un pago es una transferencia que cubre uno o más ítems de una factura.
-- No se aceptan pagos en efectivo.
create table if not exists pagos (
  id                  bigint generated always as identity primary key,
  numero              text generated always as ('RC-' || lpad(id::text, 6, '0')) stored,
  factura_id          bigint      not null references facturas (id) on delete cascade,
  alumno_id           bigint      not null references alumnos (id) on delete cascade,
  importe             integer     not null check (importe > 0),
  metodo              text        not null default 'Transferencia' check (metodo = 'Transferencia'),
  numero_operacion    text        not null,
  fecha_transferencia date        not null,
  registrado_por      bigint      references usuarios (id),
  fecha               timestamptz not null default now()
);

create table if not exists factura_items (
  id            bigint generated always as identity primary key,
  factura_id    bigint  not null references facturas (id) on delete cascade,
  tipo          text    not null check (tipo in ('Cuota', 'Deporte', 'Transporte', 'Comedor')),
  descripcion   text    not null,
  comision_id   bigint  references comisiones (id) on delete set null,
  recorrido_id  smallint references recorridos_transporte (id) on delete set null,
  importe       integer not null check (importe >= 0),
  pago_id       bigint  references pagos (id) on delete set null
);

-- Comprobantes de transferencia que suben los padres. Una factura puede tener varios.
create table if not exists comprobantes_transferencia (
  id             bigint generated always as identity primary key,
  pago_id        bigint      not null references pagos (id) on delete cascade,
  factura_id     bigint      not null references facturas (id) on delete cascade,
  nombre_archivo text        not null,
  tipo_mime      text        not null check (tipo_mime in ('application/pdf', 'image/png', 'image/jpeg', 'text/plain')),
  tamano         integer     not null check (tamano between 1 and 2100000),
  contenido      text        not null,
  created_at     timestamptz not null default now()
);

create index if not exists factura_items_factura on factura_items (factura_id);
create index if not exists pagos_factura on pagos (factura_id);
create index if not exists facturas_periodo on facturas (periodo);

-- Correos enviados por el sistema. Es una bandeja simulada: no se envían mails reales.
create table if not exists notificaciones (
  id                  bigint generated always as identity primary key,
  tipo                text        not null check (tipo in ('Recordatorio de pago', 'Aviso de deuda', 'Recuperar contraseña')),
  periodo             text,
  tutor_id            bigint      references tutores (id) on delete cascade,
  usuario_id          bigint      references usuarios (id) on delete cascade,
  destinatario_nombre text        not null,
  destinatario_email  text        not null,
  asunto              text        not null,
  cuerpo              text        not null,
  factura_ids         bigint[]    not null default '{}',
  total               integer,
  enviado_en          timestamptz not null default now()
);

create unique index if not exists notificaciones_una_por_periodo
  on notificaciones (tipo, tutor_id, periodo) where tipo <> 'Recuperar contraseña';

create table if not exists recuperaciones_password (
  id          bigint generated always as identity primary key,
  usuario_id  bigint      not null references usuarios (id) on delete cascade,
  codigo_hash text        not null,
  expira      timestamptz not null,
  usado       boolean     not null default false,
  intentos    smallint    not null default 0,
  created_at  timestamptz not null default now()
);

-- Último día hábil (lunes a viernes) de un mes.
create or replace function ultimo_dia_habil(p_periodo text) returns date
language sql immutable as $$
  select max(d)::date
  from generate_series(
         (p_periodo || '-01')::date,
         ((p_periodo || '-01')::date + interval '1 month - 1 day'),
         interval '1 day') d
  where extract(isodow from d) < 6;
$$;

-- Genera la factura del mes de cada alumno activo con los servicios que tiene en ese momento.
-- El transporte y el comedor son opcionales: si el alumno se da de baja, deja de facturarse.
create or replace function generar_facturas(p_periodo text, p_emision date default null) returns integer
language plpgsql as $$
declare
  v_alumno   record;
  v_factura  bigint;
  v_hermanos integer;
  v_creadas  integer := 0;
  v_emision  date := coalesce(p_emision,
                       ultimo_dia_habil(to_char((p_periodo || '-01')::date - interval '1 month', 'YYYY-MM')));
begin
  if p_periodo !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'El período debe tener formato AAAA-MM.' using errcode = 'P0001';
  end if;

  for v_alumno in
    select a.id from alumnos a
    where a.activo and not exists (select 1 from facturas f where f.alumno_id = a.id and f.periodo = p_periodo)
    order by a.id
  loop
    select count(distinct a2.id) into v_hermanos
    from alumnos_tutores t1
    join alumnos_tutores t2 on t2.tutor_id = t1.tutor_id
    join alumnos a2 on a2.id = t2.alumno_id and a2.activo
    where t1.alumno_id = v_alumno.id;

    insert into facturas (alumno_id, periodo, fecha_emision, vence)
    values (v_alumno.id, p_periodo, v_emision, (p_periodo || '-15')::date)
    returning id into v_factura;

    insert into factura_items (factura_id, tipo, descripcion, importe)
    select v_factura, 'Cuota',
           case when v_hermanos >= 2 then 'Cuota mensual (grupo familiar con ' || v_hermanos || ' hijos)' else 'Cuota mensual' end,
           t.importe
    from tarifas t where t.clave = case when v_hermanos >= 2 then 'cuota_hermanos' else 'cuota_mensual' end;

    insert into factura_items (factura_id, tipo, descripcion, comision_id, importe)
    select v_factura, 'Deporte', 'Deporte: ' || d.nombre || ' (' || co.nombre || ')', co.id, d.precio_mensual
    from inscripciones_deporte i
    join comisiones co on co.id = i.comision_id
    join deportes d on d.id = co.deporte_id
    where i.alumno_id = v_alumno.id and i.activa;

    insert into factura_items (factura_id, tipo, descripcion, recorrido_id, importe)
    select v_factura, 'Transporte', 'Transporte: ' || r.nombre, r.id, r.precio_mensual
    from inscripciones_transporte t join recorridos_transporte r on r.id = t.recorrido_id
    where t.alumno_id = v_alumno.id and t.activa;

    insert into factura_items (factura_id, tipo, descripcion, importe)
    select v_factura, 'Comedor', 'Comedor: ' || lower(c.modalidad), t.importe
    from inscripciones_comedor c
    join tarifas t on t.clave = case c.modalidad
      when 'Almuerzo' then 'comedor_almuerzo'
      when 'Almuerzo y merienda' then 'comedor_almuerzo_merienda'
      else 'comedor_vianda' end
    where c.alumno_id = v_alumno.id and c.activa;

    update facturas set total = (select coalesce(sum(importe), 0) from factura_items where factura_id = v_factura)
    where id = v_factura;
    v_creadas := v_creadas + 1;
  end loop;

  return v_creadas;
end;
$$;

-- Auditoría y RLS para las tablas nuevas.
do $$
declare
  t text;
begin
  foreach t in array array['opiniones', 'busquedas_laborales', 'postulaciones', 'horarios_materia', 'tarifas',
                           'facturas', 'factura_items', 'pagos', 'comprobantes_transferencia', 'notificaciones',
                           'recuperaciones_password']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  foreach t in array array['tarifas', 'facturas', 'pagos', 'comprobantes_transferencia', 'postulaciones', 'opiniones']
  loop
    execute format('create or replace trigger %I after insert or update or delete on public.%I
                    for each row execute function registrar_auditoria()', t || '_auditoria', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Datos de ejemplo: facturas de agosto a noviembre de 2026 y pagos
-- ---------------------------------------------------------------------

select generar_facturas(p) from unnest(array['2026-08', '2026-09', '2026-10', '2026-11']) as p;

-- Registra un pago de ejemplo con su comprobante (un texto en lugar de un PDF real).
create or replace function pago_demo(p_dni text, p_periodo text, p_solo_cuota boolean, p_fecha date) returns void
language plpgsql as $$
declare
  v_factura facturas%rowtype;
  v_pago    bigint;
  v_importe integer;
begin
  select f.* into v_factura from facturas f join alumnos a on a.id = f.alumno_id
  where a.dni = p_dni and f.periodo = p_periodo;
  if not found then return; end if;

  select coalesce(sum(importe), 0) into v_importe from factura_items
  where factura_id = v_factura.id and pago_id is null and (not p_solo_cuota or tipo = 'Cuota');
  if v_importe = 0 then return; end if;

  insert into pagos (factura_id, alumno_id, importe, numero_operacion, fecha_transferencia, fecha)
  values (v_factura.id, v_factura.alumno_id, v_importe, upper(substr(md5(p_dni || p_periodo || p_solo_cuota::text), 1, 12)),
          p_fecha, p_fecha + time '10:30')
  returning id into v_pago;

  update factura_items set pago_id = v_pago
  where factura_id = v_factura.id and pago_id is null and (not p_solo_cuota or tipo = 'Cuota');

  insert into comprobantes_transferencia (pago_id, factura_id, nombre_archivo, tipo_mime, tamano, contenido)
  values (v_pago, v_factura.id, 'transferencia-' || p_periodo || '.txt', 'text/plain', 60,
          encode(convert_to('Comprobante de transferencia de ejemplo (simulado) ' || p_periodo, 'UTF8'), 'base64'));
end;
$$;

do $$
declare
  v_dni text;
begin
  if exists (select 1 from pagos) then return; end if;

  -- Familias al día de agosto a noviembre.
  foreach v_dni in array array['53100003', '54100002', '55100001', '51100008', '49100007', '43100013', '47100014', '45100011', '47100009', '50100005']
  loop
    perform pago_demo(v_dni, '2026-08', false, date '2026-08-05');
    perform pago_demo(v_dni, '2026-09', false, date '2026-09-07');
    perform pago_demo(v_dni, '2026-10', false, date '2026-10-06');
    if v_dni <> '50100005' then
      perform pago_demo(v_dni, '2026-11', false, date '2026-11-09');
    end if;
  end loop;

  -- Benítez (Tomás y Sofía): al día hasta octubre; en noviembre solo pagaron la cuota de Tomás.
  perform pago_demo('50111222', '2026-08', false, date '2026-08-10');
  perform pago_demo('50111222', '2026-09', false, date '2026-09-10');
  perform pago_demo('50111222', '2026-10', false, date '2026-10-09');
  perform pago_demo('50111222', '2026-11', true,  date '2026-11-12');
  perform pago_demo('52111333', '2026-08', false, date '2026-08-10');
  perform pago_demo('52111333', '2026-09', false, date '2026-09-10');

  -- Fernández (Thiago y Abril): en octubre pagaron solo las cuotas (pago incompleto).
  perform pago_demo('51100004', '2026-08', false, date '2026-08-12');
  perform pago_demo('51100004', '2026-09', false, date '2026-09-14');
  perform pago_demo('51100004', '2026-10', true,  date '2026-10-15');
  perform pago_demo('46100010', '2026-08', false, date '2026-08-12');
  perform pago_demo('46100010', '2026-09', false, date '2026-09-14');
  perform pago_demo('46100010', '2026-10', true,  date '2026-10-15');

  -- Morales (Joaquín y Julieta): pagaron solo agosto.
  perform pago_demo('50100006', '2026-08', false, date '2026-08-14');
  perform pago_demo('44100012', '2026-08', false, date '2026-08-14');

  -- López (Lucas) no registra pagos.
end;
$$;

drop function pago_demo(text, text, boolean, date);

commit;
