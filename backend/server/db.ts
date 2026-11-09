// Conexión a PostgreSQL (librería `postgres`).
// - Una sola "piscina" de conexiones por proceso (se reutiliza entre peticiones).
// - Las columnas llegan en camelCase (fecha_hora_inicio → fechaHoraInicio).
// - prepare:false para funcionar con el pooler de Neon (PgBouncer).
// Para cambios que deben ir juntos: `await sql.begin(async (tx) => { ... })`.
import postgres from "postgres";

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

export const sql: Db = global_.__sql ?? (global_.__sql = crear());
