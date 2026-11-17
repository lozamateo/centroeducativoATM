-- =====================================================================
-- Actualización 004: cuotas mensuales y pagos (simulados, trabajo académico).
-- Como usarlo: Supabase -> SQL Editor -> New snippet -> pegar TODO -> Run.
-- Se puede ejecutar más de una vez sin duplicar datos.
--
-- Reglas: cuota de $40.000 por mes; con 2 o más hijos en el grupo familiar,
-- $30.000 por hijo. Se paga del 1 al 15 de cada mes (efectivo o transferencia).
-- Las cuotas de cada mes se calculan en la API; aquí solo se guardan los pagos.
-- =====================================================================

begin;

create table if not exists pagos_cuotas (
  id             bigint generated always as identity primary key,
  alumno_id      bigint      not null references alumnos (id) on delete cascade,
  periodo        text        not null check (periodo ~ '^\d{4}-\d{2}$'),
  importe        integer     not null check (importe > 0),
  metodo         text        not null check (metodo in ('Efectivo', 'Transferencia')),
  comprobante    text        not null default upper(substr(md5(random()::text), 1, 10)),
  registrado_por bigint      references usuarios (id),
  fecha          timestamptz not null default now(),
  unique (alumno_id, periodo)
);

alter table pagos_cuotas enable row level security;

create or replace trigger pagos_cuotas_auditoria
after insert or update or delete on pagos_cuotas
for each row execute function registrar_auditoria();

-- Pagos de demostración (agosto a noviembre 2026): familias al día y familias con deuda.
insert into pagos_cuotas (alumno_id, periodo, importe, metodo, fecha)
select a.id, x.periodo, f.importe, x.metodo, (x.periodo || '-05')::timestamptz
from (values
  ('50111222', '2026-08', 'Transferencia'), ('50111222', '2026-09', 'Transferencia'), ('50111222', '2026-10', 'Transferencia'),
  ('52111333', '2026-08', 'Transferencia'), ('52111333', '2026-09', 'Transferencia'),
  ('55100001', '2026-08', 'Efectivo'), ('55100001', '2026-09', 'Efectivo'), ('55100001', '2026-10', 'Efectivo'), ('55100001', '2026-11', 'Efectivo'),
  ('51100008', '2026-08', 'Efectivo'), ('51100008', '2026-09', 'Efectivo'), ('51100008', '2026-10', 'Efectivo'), ('51100008', '2026-11', 'Efectivo'),
  ('53100003', '2026-08', 'Transferencia'), ('53100003', '2026-09', 'Transferencia'), ('53100003', '2026-10', 'Transferencia'), ('53100003', '2026-11', 'Transferencia'),
  ('51100004', '2026-08', 'Efectivo'), ('51100004', '2026-09', 'Efectivo'),
  ('46100010', '2026-08', 'Efectivo'), ('46100010', '2026-09', 'Efectivo'),
  ('50100005', '2026-08', 'Transferencia'), ('50100005', '2026-09', 'Transferencia'), ('50100005', '2026-10', 'Transferencia'),
  ('54100002', '2026-08', 'Transferencia'), ('54100002', '2026-09', 'Transferencia'), ('54100002', '2026-10', 'Transferencia'), ('54100002', '2026-11', 'Transferencia'),
  ('47100009', '2026-08', 'Transferencia'), ('47100009', '2026-09', 'Transferencia'), ('47100009', '2026-10', 'Transferencia'), ('47100009', '2026-11', 'Transferencia'),
  ('49100007', '2026-08', 'Efectivo'), ('49100007', '2026-09', 'Efectivo'), ('49100007', '2026-10', 'Efectivo'), ('49100007', '2026-11', 'Efectivo'),
  ('43100013', '2026-08', 'Efectivo'), ('43100013', '2026-09', 'Efectivo'), ('43100013', '2026-10', 'Efectivo'), ('43100013', '2026-11', 'Efectivo'),
  ('45100011', '2026-08', 'Transferencia'), ('45100011', '2026-09', 'Transferencia'), ('45100011', '2026-10', 'Transferencia'), ('45100011', '2026-11', 'Transferencia'),
  ('47100014', '2026-08', 'Transferencia'), ('47100014', '2026-09', 'Transferencia'), ('47100014', '2026-10', 'Transferencia'), ('47100014', '2026-11', 'Transferencia')
) as x (dni, periodo, metodo)
join alumnos a on a.dni = x.dni
-- Importe según el grupo familiar: 2 o más hijos activos con un mismo tutor = $30.000.
cross join lateral (
  select case when count(distinct a2.id) >= 2 then 30000 else 40000 end as importe
  from alumnos_tutores t1
  join alumnos_tutores t2 on t2.tutor_id = t1.tutor_id
  join alumnos a2 on a2.id = t2.alumno_id and a2.activo
  where t1.alumno_id = a.id
) f
on conflict (alumno_id, periodo) do nothing;

commit;
