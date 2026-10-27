-- =====================================================================
-- Datos de demostracion para la presentacion.
-- Como usarlo: Supabase -> SQL Editor -> New snippet -> pegar TODO -> Run.
-- No borra nada. Si se ejecuta dos veces, no duplica los datos.
-- =====================================================================

begin;

-- ----- Docentes -----
insert into profesores (dni, nombre, apellido, email, telefono, especialidad, fecha_ingreso) values
  ('29444111', 'Valeria',   'Sánchez',  'vsanchez@educar.com',  '3624-410011', 'Prácticas del lenguaje', '2027-02-01'),
  ('31555222', 'Gustavo',   'Medina',   'gmedina@educar.com',   '3624-410022', 'Ciencias',               '2027-02-01'),
  ('33666333', 'Lucía',     'Duarte',   'lduarte@educar.com',   '3624-410033', 'Portugués',              '2027-02-01'),
  ('26777444', 'Andrés',    'Villalba', 'avillalba@educar.com', '3624-410044', 'Historia',               '2027-02-01'),
  ('34888555', 'Florencia', 'Ortiz',    'fortiz@educar.com',    '3624-410055', 'Nivel Inicial',          '2027-02-01'),
  ('30999666', 'Rodrigo',   'Cabrera',  'rcabrera@educar.com',  '3624-410066', 'Educación física',       '2027-02-01')
on conflict (dni) do nothing;

update materias set nombre = 'Juego y expresión' where nombre = 'Juego y expresion';

-- Asigna cada materia sin docente al profesor de esa especialidad.
update cursos_materias cm set profesor_id = p.id
from materias m, profesores p
where cm.materia_id = m.id and cm.profesor_id is null
  and p.dni = case
    when m.nombre in ('Matemática')                                 then '27333444'
    when m.nombre in ('Inglés')                                     then '30222333'
    when m.nombre in ('Portugués')                                  then '33666333'
    when m.nombre in ('Prácticas del lenguaje', 'Lengua y literatura') then '29444111'
    when m.nombre in ('Ciencias naturales', 'Biología', 'Tecnología') then '31555222'
    when m.nombre in ('Ciencias sociales', 'Historia')              then '26777444'
    when m.nombre in ('Juego y expresión')                          then '34888555'
    when m.nombre in ('Educación física')                           then '30999666'
  end;

-- Comisiones de Secundario a cargo del segundo profesor de educacion fisica.
update comisiones co set profesor_id = (select id from profesores where dni = '30999666')
where co.nivel_id = (select id from niveles_educativos where nombre = 'Secundario');

-- ----- Familias -----
insert into tutores (dni, nombre, apellido, email, telefono, direccion, ocupacion) values
  ('27111001', 'Mariana',   'Gómez',     'mgomez@mail.com',     '3624-501001', 'Av. Alvear 1820, Resistencia',          'Docente'),
  ('25111002', 'Pablo',     'Romero',    'promero@mail.com',    '3624-501002', 'Calle Ameghino 450, Barranqueras',      'Ingeniero'),
  ('28111003', 'Natalia',   'Acuña',     'nacuna@mail.com',     '3624-501003', 'Av. 25 de Mayo 1350, Resistencia',      'Abogada'),
  ('26111004', 'Diego',     'Fernández', 'dfernandez@mail.com', '3624-501004', 'Av. Sarmiento 3120, Resistencia',       'Comerciante'),
  ('29111005', 'Silvina',   'Ruiz',      'sruiz@mail.com',      '3624-501005', 'Calle French 980, Resistencia',         'Enfermera'),
  ('24111006', 'Hernán',    'Morales',   'hmorales@mail.com',   '3624-501006', 'Av. San Martín 2210, Barranqueras',     'Contador'),
  ('30111007', 'Romina',    'Aguirre',   'raguirre@mail.com',   '3624-501007', 'Villa Libertad, Mz. 12 casa 4',         'Psicóloga'),
  ('27111008', 'Javier',    'Ledesma',   'jledesma@mail.com',   '3624-501008', 'Av. Alvear 1620, Resistencia',          'Médico')
on conflict (dni) do nothing;

-- ----- Alumnos -----
insert into alumnos (dni, nombre, apellido, fecha_nacimiento, genero, direccion, nivel_id)
select x.dni, x.nombre, x.apellido, x.nac::date, x.genero, x.dir, n.id
from (values
  ('55100001', 'Martina',   'Gómez',     '2022-05-14', 'Femenino',  'Av. Alvear 1820, Resistencia',      'Inicial'),
  ('54100002', 'Benjamín',  'Romero',    '2021-08-02', 'Masculino', 'Calle Ameghino 450, Barranqueras',  'Inicial'),
  ('53100003', 'Emma',      'Acuña',     '2020-11-20', 'Femenino',  'Av. 25 de Mayo 1350, Resistencia',  'Primario'),
  ('51100004', 'Thiago',    'Fernández', '2018-03-09', 'Masculino', 'Av. Sarmiento 3120, Resistencia',   'Primario'),
  ('50100005', 'Valentina', 'Ruiz',      '2016-07-25', 'Femenino',  'Calle French 980, Resistencia',     'Primario'),
  ('50100006', 'Joaquín',   'Morales',   '2016-01-30', 'Masculino', 'Av. San Martín 2210, Barranqueras', 'Primario'),
  ('49100007', 'Catalina',  'Aguirre',   '2015-10-11', 'Femenino',  'Villa Libertad, Mz. 12 casa 4',     'Primario'),
  ('51100008', 'Mateo',     'Gómez',     '2018-12-05', 'Masculino', 'Av. Alvear 1820, Resistencia',      'Primario'),
  ('47100009', 'Lautaro',   'Romero',    '2013-06-18', 'Masculino', 'Calle Ameghino 450, Barranqueras',  'Secundario'),
  ('46100010', 'Abril',     'Fernández', '2012-04-22', 'Femenino',  'Av. Sarmiento 3120, Resistencia',   'Secundario'),
  ('45100011', 'Santino',   'Ledesma',   '2011-09-14', 'Masculino', 'Av. Alvear 1620, Resistencia',      'Secundario'),
  ('44100012', 'Julieta',   'Morales',   '2010-02-03', 'Femenino',  'Av. San Martín 2210, Barranqueras', 'Secundario'),
  ('43100013', 'Bautista',  'Aguirre',   '2009-12-19', 'Masculino', 'Villa Libertad, Mz. 12 casa 4',     'Secundario'),
  ('47100014', 'Mía',       'Ledesma',   '2013-08-27', 'Femenino',  'Av. Alvear 1620, Resistencia',      'Secundario')
) as x (dni, nombre, apellido, nac, genero, dir, nivel)
join niveles_educativos n on n.nombre = x.nivel
on conflict (dni) do nothing;

insert into alumnos_tutores (alumno_id, tutor_id, parentesco, es_responsable)
select a.id, t.id, x.parentesco, true
from (values
  ('55100001', '27111001', 'Madre'), ('51100008', '27111001', 'Madre'),
  ('54100002', '25111002', 'Padre'), ('47100009', '25111002', 'Padre'),
  ('53100003', '28111003', 'Madre'),
  ('51100004', '26111004', 'Padre'), ('46100010', '26111004', 'Padre'),
  ('50100005', '29111005', 'Madre'),
  ('50100006', '24111006', 'Padre'), ('44100012', '24111006', 'Padre'),
  ('49100007', '30111007', 'Madre'), ('43100013', '30111007', 'Madre'),
  ('45100011', '27111008', 'Padre'), ('47100014', '27111008', 'Padre')
) as x (alumno, tutor, parentesco)
join alumnos a on a.dni = x.alumno
join tutores t on t.dni = x.tutor
on conflict do nothing;

-- ----- Matriculas -----
insert into matriculas (alumno_id, curso_id, ciclo_id)
select a.id, c.id, c.ciclo_id
from (values
  ('55100001', 'Sala de 5'), ('54100002', 'Sala de 5'),
  ('53100003', '1.º grado'), ('51100004', '3.º grado'), ('50100005', '5.º grado'),
  ('50100006', '5.º grado'), ('49100007', '6.º grado'), ('51100008', '3.º grado'),
  ('47100009', '2.º año'),   ('46100010', '3.º año'),   ('45100011', '4.º año'),
  ('44100012', '5.º año'),   ('43100013', '6.º año'),   ('47100014', '2.º año')
) as x (alumno, anio)
join alumnos a on a.dni = x.alumno
join cursos c on c.anio = x.anio and c.division = 'A'
join ciclos_lectivos cl on cl.id = c.ciclo_id and cl.activo
where not exists (select 1 from matriculas m where m.alumno_id = a.id and m.ciclo_id = c.ciclo_id and m.estado <> 'Baja');

-- ----- Fichas medicas (dos con el apto vencido para la demostracion) -----
insert into fichas_medicas (alumno_id, grupo_sanguineo, alergias, obra_social, contacto_emergencia, telefono_emergencia, apto_fisico_emision, apto_fisico_vence)
select a.id, x.grupo, x.alergias, x.os, x.contacto, x.tel, x.emision::date, x.vence::date
from (values
  ('55100001', '0+',  'Ninguna',     'OSDE',          'Mariana Gómez',    '3624-501001', '2027-02-05', '2028-02-05'),
  ('54100002', 'A+',  'Ninguna',     'Swiss Medical', 'Pablo Romero',     '3624-501002', '2027-02-06', '2028-02-06'),
  ('53100003', 'A-',  'Maní',        'IOSFA',         'Natalia Acuña',    '3624-501003', '2027-02-07', '2028-02-07'),
  ('51100004', '0+',  'Ninguna',     'OSDE',          'Diego Fernández',  '3624-501004', '2027-02-08', '2028-02-08'),
  ('50100005', 'B+',  'Lactosa',     'Insssep',       'Silvina Ruiz',     '3624-501005', '2027-02-09', '2028-02-09'),
  ('50100006', '0-',  'Ninguna',     'Galeno',        'Hernán Morales',   '3624-501006', '2025-02-10', '2026-02-10'),
  ('49100007', 'A+',  'Picadura de abeja', 'Insssep', 'Romina Aguirre',   '3624-501007', '2027-02-11', '2028-02-11'),
  ('51100008', '0+',  'Ninguna',     'OSDE',          'Mariana Gómez',    '3624-501001', '2027-02-05', '2028-02-05'),
  ('47100009', 'A+',  'Ninguna',     'Swiss Medical', 'Pablo Romero',     '3624-501002', '2027-02-06', '2028-02-06'),
  ('46100010', 'AB+', 'Gluten (celiaquía)', 'OSDE',   'Diego Fernández',  '3624-501004', '2027-02-08', '2028-02-08'),
  ('45100011', '0+',  'Ninguna',     'Medifé',        'Javier Ledesma',   '3624-501008', '2027-02-12', '2028-02-12'),
  ('44100012', 'B-',  'Ninguna',     'Galeno',        'Hernán Morales',   '3624-501006', '2025-03-01', '2026-03-01'),
  ('43100013', 'A+',  'Ninguna',     'Insssep',       'Romina Aguirre',   '3624-501007', '2027-02-11', '2028-02-11'),
  ('47100014', '0+',  'Penicilina',  'Medifé',        'Javier Ledesma',   '3624-501008', '2027-02-12', '2028-02-12')
) as x (alumno, grupo, alergias, os, contacto, tel, emision, vence)
join alumnos a on a.dni = x.alumno
on conflict (alumno_id) do nothing;

-- ----- Transporte (los 4 recorridos) -----
insert into inscripciones_transporte (alumno_id, recorrido_id, ciclo_id, parada)
select a.id, x.recorrido, cl.id, x.parada
from (values
  ('55100001', 1, 'Av. Alvear 1800'), ('51100008', 1, 'Av. Alvear 1800'), ('45100011', 1, 'Av. Alvear 1600'),
  ('54100002', 2, 'Av. San Martín 2000'), ('47100009', 2, 'Av. San Martín 2000'), ('50100006', 2, 'Barranqueras centro'),
  ('53100003', 3, 'Av. 25 de Mayo 1200'), ('50100005', 3, 'Parque 2 de Febrero'),
  ('51100004', 4, 'Av. Sarmiento 3000'), ('46100010', 4, 'Av. Sarmiento 3000'), ('49100007', 4, 'Villa Libertad'), ('43100013', 4, 'Villa Libertad')
) as x (alumno, recorrido, parada)
join alumnos a on a.dni = x.alumno
cross join ciclos_lectivos cl
where cl.activo and not exists (select 1 from inscripciones_transporte t where t.alumno_id = a.id and t.activa);

-- ----- Comedor -----
insert into inscripciones_comedor (alumno_id, ciclo_id, modalidad, dias, dieta_especial)
select a.id, cl.id, x.modalidad, x.dias::smallint[], x.dieta
from (values
  ('55100001', 'Almuerzo y merienda', '{1,2,3,4,5}', null),
  ('54100002', 'Almuerzo y merienda', '{1,2,3,4,5}', null),
  ('53100003', 'Almuerzo',            '{1,2,3,4,5}', 'Sin maní'),
  ('51100004', 'Almuerzo',            '{1,3,5}',     null),
  ('50100005', 'Almuerzo',            '{1,2,3,4,5}', 'Sin lactosa'),
  ('49100007', 'Vianda propia',       '{2,4}',       null),
  ('46100010', 'Almuerzo',            '{1,2,3,4,5}', 'Menú para celíacos'),
  ('44100012', 'Almuerzo',            '{1,2,3}',     null)
) as x (alumno, modalidad, dias, dieta)
join alumnos a on a.dni = x.alumno
cross join ciclos_lectivos cl
where cl.activo and not exists (select 1 from inscripciones_comedor c where c.alumno_id = a.id and c.ciclo_id = cl.id and c.activa);

-- ----- Deportes (combinaciones sin superposicion horaria y con apto vigente) -----
insert into inscripciones_deporte (alumno_id, comision_id)
select a.id, co.id
from (values
  ('53100003', 'Fútbol',    'Primario A'),   ('53100003', 'Básquet',   'Primario A'),
  ('51100004', 'Fútbol',    'Primario A'),   ('51100004', 'Hockey',    'Primario A'),
  ('50100005', 'Natación',  'Primario A'),   ('50100005', 'Básquet',   'Primario A'),
  ('49100007', 'Hockey',    'Primario A'),   ('49100007', 'Básquet',   'Primario A'),
  ('51100008', 'Fútbol',    'Primario A'),
  ('47100009', 'Fútbol',    'Secundario A'), ('47100009', 'Vóley',     'Secundario A'),
  ('46100010', 'Vóley',     'Secundario A'), ('46100010', 'Natación',  'Secundario A'),
  ('45100011', 'Fútbol',    'Secundario A'), ('45100011', 'Atletismo', 'Secundario A'),
  ('43100013', 'Atletismo', 'Secundario A'),
  ('47100014', 'Vóley',     'Secundario A')
) as x (alumno, deporte, comision)
join alumnos a on a.dni = x.alumno
join deportes d on d.nombre = x.deporte
join comisiones co on co.deporte_id = d.id and co.nombre = x.comision
where not exists (select 1 from inscripciones_deporte i where i.alumno_id = a.id and i.comision_id = co.id and i.activa);

-- ----- Usuario de una segunda familia (Mariana Gómez: mariana@educar.com / familia123) -----
insert into usuarios (email, password_hash, nombre, apellido, rol_id)
select 'mariana@educar.com', extensions.crypt('familia123', extensions.gen_salt('bf', 10)), 'Mariana', 'Gómez', r.id
from roles r where r.codigo = 'TUTOR'
on conflict (email) do nothing;

update tutores set usuario_id = (select id from usuarios where email = 'mariana@educar.com')
where dni = '27111001' and usuario_id is null;

-- ----- Sitio web: noticias, pre-inscripciones y mensajes -----
insert into noticias (titulo, resumen, categoria)
select x.titulo, x.resumen, x.categoria
from (values
  ('Presentamos el equipo docente 2027', 'Conocé a los profesores de idiomas, ciencias y educación física que acompañarán el primer ciclo lectivo.', 'Institucional'),
  ('Recorridos de transporte confirmados', 'Los cuatro recorridos cubren Resistencia y Barranqueras. Las familias ya pueden adherirse desde la web o la app.', 'Inscripciones'),
  ('Torneo intercolegial de vóley', 'Las alumnas y alumnos de Secundario participarán del torneo provincial en mayo.', 'Deportes')
) as x (titulo, resumen, categoria)
where not exists (select 1 from noticias n where n.titulo = x.titulo);

insert into solicitudes_inscripcion (tutor_nombre, tutor_email, tutor_telefono, alumno_nombre, alumno_fecha_nac, nivel_id, anio_solicitado, servicios, comentarios, estado)
select x.tutor, x.email, x.tel, x.alumno, x.nac::date, n.id, x.anio, x.servicios::text[], x.coment, x.estado
from (values
  ('Laura Paz',      'lpaz@mail.com',      '3624-600101', 'Felipe Paz',      '2019-04-10', 'Primario',   '2.º grado', '{Transporte,Comedor}', 'Venimos de Corrientes.',            'Pendiente'),
  ('Marcelo Quiroga','mquiroga@mail.com',  '3624-600102', 'Agustina Quiroga','2012-09-01', 'Secundario', '3.º año',   '{Deportes}',            'Le interesa el hockey.',            'Contactada'),
  ('Paola Ibarra',   'pibarra@mail.com',   '3624-600103', 'León Ibarra',     '2023-01-15', 'Inicial',    'Sala de 4', '{Comedor}',             null,                                'Pendiente'),
  ('Sergio Benítez', 'sbenitez@mail.com',  '3624-600104', 'Ana Benítez',     '2017-06-30', 'Primario',   '4.º grado', '{Transporte}',          'Hermana de un alumno del centro.',  'Aceptada')
) as x (tutor, email, tel, alumno, nac, nivel, anio, servicios, coment, estado)
join niveles_educativos n on n.nombre = x.nivel
where not exists (select 1 from solicitudes_inscripcion s where s.tutor_email = x.email);

insert into mensajes_contacto (nombre, email, telefono, asunto, mensaje)
select x.nombre, x.email, x.tel, x.asunto, x.mensaje
from (values
  ('Claudia Ramírez', 'cramirez@mail.com', '3624-700201', 'Consulta por aranceles', '¿Cuál es el valor de la cuota mensual para el Nivel Primario?'),
  ('Ezequiel Torres', 'etorres@mail.com',  null,          'Trabajo docente',       'Soy profesor de música y me gustaría acercar mi CV.'),
  ('Gabriela Núñez',  'gnunez@mail.com',   '3624-700203', 'Jornada de puertas abiertas', '¿Qué día se realiza la visita a las instalaciones?')
) as x (nombre, email, tel, asunto, mensaje)
where not exists (select 1 from mensajes_contacto m where m.email = x.email);

commit;
