// Conexión a PostgreSQL (librería `postgres`).
// - Una sola "piscina" de conexiones por proceso (se reutiliza entre peticiones).
// - Las columnas llegan en camelCase (fecha_hora_inicio → fechaHoraInicio).
// - prepare:false para funcionar con el pooler de Neon (PgBouncer).
// Para cambios que deben ir juntos: `await sql.begin(async (tx) => { ... })`.
import postgres from "postgres";

import "./fechas"; // fija la zona horaria antes de usar fechas

export type Db = postgres.Sql<Record<string, unknown>>;

const global_ = globalThis as unknown as { __sql?: Db };

function crear(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en el entorno (mira backend/.env.example).");
  return postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idle_timeout: 20,
    prepare: false,
    transform: postgres.camel,
    onnotice: () => {},
  }) as unknown as Db;
}

// Perezosa: la conexión se crea en la primera consulta (así `next build`
// funciona aunque aún no haya DATABASE_URL).
function real(): Db {
  return global_.__sql ?? (global_.__sql = crear());
}

export const sql: Db = new Proxy(function () {} as unknown as Db, {
  apply: (_t, _this, args) => (real() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop) => {
    const r = real() as unknown as Record<string | symbol, unknown>;
    const v = r[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(r) : v;
  },
});
