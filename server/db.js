// Capa de persistencia: pool de conexiones a PostgreSQL (Supabase).
import pg from 'pg';

// bigint -> number y date -> 'YYYY-MM-DD' (evita corrimientos por zona horaria).
pg.types.setTypeParser(20, (value) => Number(value));
pg.types.setTypeParser(1082, (value) => value);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL no esta definida: la API no podra conectarse a la base de datos.');
}

const isLocal = /localhost|127\.0\.0\.1|\/var\/run/.test(connectionString ?? '');

export const pool = new pg.Pool({
  connectionString,
  ssl: connectionString && !isLocal ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DB_POOL_MAX ?? 5),
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

// Ejecuta fn dentro de una transaccion y registra el usuario para la auditoria.
export async function transaction(usuarioId, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (usuarioId) {
      await client.query("select set_config('app.usuario_id', $1, true)", [String(usuarioId)]);
    }
    const tx = {
      query: async (text, params = []) => (await client.query(text, params)).rows,
      queryOne: async (text, params = []) => (await client.query(text, params)).rows[0] ?? null,
    };
    const result = await fn(tx);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
