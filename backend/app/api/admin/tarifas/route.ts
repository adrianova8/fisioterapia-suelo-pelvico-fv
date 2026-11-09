import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { ruta } from "@/server/http";

export const GET = ruta(async (req) => {
  await requerirAdmin(req);
  return sql`SELECT id, nombre, sesiones_semana, precio_centimos, activa FROM tarifas ORDER BY sesiones_semana`;
});
