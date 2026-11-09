import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { ruta } from "@/server/http";

export const GET = ruta(async (req) => {
  await requerirAdmin(req);
  const [programas, profesionales, salas] = await Promise.all([
    sql`SELECT id, nombre FROM programas ORDER BY id`,
    sql`SELECT id, nombre, activo FROM profesionales WHERE activo ORDER BY id`,
    sql`SELECT id, nombre FROM salas WHERE activo ORDER BY id`,
  ]);
  return { programas, profesionales, salas };
});
