-- =====================================================================
-- Actualizacion 002: textos con tildes y enies.
-- Solo para bases creadas con la version anterior de schema.sql.
-- Como usarlo: Supabase -> SQL Editor -> New snippet -> pegar TODO -> Run.
-- Se puede ejecutar mas de una vez sin problemas.
-- =====================================================================

begin;

-- Mensajes de las reglas de negocio.
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

-- Turno "Mañana".
alter table cursos drop constraint if exists cursos_turno_check;
update cursos set turno = 'Mañana' where turno = 'Manana';
alter table cursos add constraint cursos_turno_check check (turno in ('Mañana', 'Tarde', 'Jornada extendida'));

-- Datos iniciales: nombres de materias, deportes, cursos y personas de prueba.
do $$
declare
  pares text[][] := array[

    ['1.o ano', '1.º año'],
    ['1.o grado', '1.º grado'],
    ['2.o ano', '2.º año'],
    ['2.o grado', '2.º grado'],
    ['3.o ano', '3.º año'],
    ['3.o grado', '3.º grado'],
    ['4.o ano', '4.º año'],
    ['4.o grado', '4.º grado'],
    ['5.o ano', '5.º año'],
    ['5.o grado', '5.º grado'],
    ['6.o ano', '6.º año'],
    ['6.o grado', '6.º grado'],
    ['Abrimos la pre-inscripcion 2027', 'Abrimos la pre-inscripción 2027'],
    ['Alta, baja y modificacion de usuarios', 'Alta, baja y modificación de usuarios'],
    ['Autogestion de la familia', 'Autogestión de la familia'],
    ['Autogestion del docente', 'Autogestión del docente'],
    ['Av. San Martin 2000, Barranqueras centro', 'Av. San Martín 2000, Barranqueras centro'],
    ['Barranqueras / Av. San Martin', 'Barranqueras / Av. San Martín'],
    ['Basquet', 'Básquet'],
    ['Benitez', 'Benítez'],
    ['Biologia', 'Biología'],
    ['Carolina Benitez', 'Carolina Benítez'],
    ['Consulta de su informacion', 'Consulta de su información'],
    ['De 1.o a 6.o ano con orientacion en ciencias, idiomas y tecnologia.', 'De 1.º a 6.º año con orientación en ciencias, idiomas y tecnología.'],
    ['De 1.o a 6.o grado con formacion plurilingue y deporte diario.', 'De 1.º a 6.º grado con formación plurilingüe y deporte diario.'],
    ['Deportes propios desde el primer ano', 'Deportes propios desde el primer año'],
    ['Direccion y secretaria: acceso total', 'Dirección y secretaría: acceso total'],
    ['Educacion fisica', 'Educación física'],
    ['Enfermeria', 'Enfermería'],
    ['Familias: autogestion de sus hijos', 'Familias: autogestión de sus hijos'],
    ['Fernandez', 'Fernández'],
    ['Ficha medica y apto fisico', 'Ficha médica y apto físico'],
    ['Futbol', 'Fútbol'],
    ['Futbol infantil y juvenil, mixto por categorias.', 'Fútbol infantil y juvenil, mixto por categorías.'],
    ['Futbol, hockey, natacion, basquet, voley y atletismo dentro del predio.', 'Fútbol, hockey, natación, básquet, vóley y atletismo dentro del predio.'],
    ['Gimenez', 'Giménez'],
    ['Ingles', 'Inglés'],
    ['Javier Lopez', 'Javier López'],
    ['Lopez', 'López'],
    ['Martin', 'Martín'],
    ['Matematica', 'Matemática'],
    ['Minibasquet y basquet juvenil.', 'Minibásquet y básquet juvenil.'],
    ['Natacion', 'Natación'],
    ['Natacion en el natatorio climatizado del centro.', 'Natación en el natatorio climatizado del centro.'],
    ['Portugues', 'Portugués'],
    ['Practicas del lenguaje', 'Prácticas del lenguaje'],
    ['Ramirez', 'Ramírez'],
    ['Recorre las instalaciones, conoce al equipo docente y la propuesta plurilingue.', 'Recorre las instalaciones, conoce al equipo docente y la propuesta plurilingüe.'],
    ['Salas de 3, 4 y 5 anos con jornada extendida y juego en ingles.', 'Salas de 3, 4 y 5 años con jornada extendida y juego en inglés.'],
    ['Sofia', 'Sofía'],
    ['Tecnologia', 'Tecnología'],
    ['Tomas', 'Tomás'],
    ['Voley', 'Vóley'],
    ['Voley para Primario y Secundario.', 'Vóley para Primario y Secundario.']
  ];
  columnas text[] := array['roles.nombre', 'roles.descripcion', 'permisos.descripcion', 'niveles_educativos.descripcion', 'cursos.anio', 'materias.nombre', 'recorridos_transporte.nombre', 'recorridos_transporte.zona', 'recorridos_transporte.paradas', 'deportes.nombre', 'deportes.descripcion', 'usuarios.nombre', 'usuarios.apellido', 'profesores.nombre', 'profesores.apellido', 'profesores.especialidad', 'tutores.nombre', 'tutores.apellido', 'tutores.direccion', 'tutores.ocupacion', 'alumnos.nombre', 'alumnos.apellido', 'alumnos.direccion', 'fichas_medicas.contacto_emergencia', 'fichas_medicas.alergias', 'noticias.titulo', 'noticias.resumen', 'inscripciones_transporte.parada'];
  col text;
  i int;
begin
  foreach col in array columnas loop
    for i in 1 .. array_length(pares, 1) loop
      execute format('update %I set %I = $2 where %I = $1', split_part(col, '.', 1), split_part(col, '.', 2), split_part(col, '.', 2))
        using pares[i][1], pares[i][2];
    end loop;
  end loop;
end;
$$;

commit;
