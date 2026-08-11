import { neon, Pool } from '@neondatabase/serverless';

let client;
let pool;

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está configurada en las variables de entorno de Vercel');
  }
  return process.env.DATABASE_URL;
}

export function sql(strings, ...values) {
  if (!client) client = neon(requireDatabaseUrl());
  return client(strings, ...values);
}

export function getSqlClient() {
  if (!client) client = neon(requireDatabaseUrl());
  return client;
}

// Para transacciones interactivas (BEGIN/COMMIT con lectura intermedia) el driver
// HTTP de neon() no sirve: cada query es una petición HTTP independiente. Se necesita
// una sesión real vía Pool (WebSocket).
export function getPool() {
  if (!pool) pool = new Pool({ connectionString: requireDatabaseUrl() });
  return pool;
}
