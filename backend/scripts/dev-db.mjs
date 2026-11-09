// PostgreSQL local embebido para desarrollo (no hace falta instalar nada).
// Datos en backend/data/pg, puerto 55432, usuario/clave postgres, base "app".
// Déjalo abierto en una terminal mientras desarrollas. Ctrl+C para pararlo.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../data/pg", import.meta.url));
const nuevo = !existsSync(dir);
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "postgres",
  password: "postgres",
  port: 55432,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (nuevo) await pg.initialise();
await pg.start();
if (nuevo) {
  await pg.createDatabase("app");
  console.log("Base de datos 'app' creada. Ahora ejecuta: npm run db:init");
}
console.log("PostgreSQL listo en postgres://postgres:postgres@localhost:55432/app (Ctrl+C para parar)");

const parar = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", parar);
process.on("SIGTERM", parar);
