import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { idDe, ruta, type CtxId } from "@/server/http";

export const GET = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const id = await idDe(ctx);
  const filas = await sql<{ id: number; tipo: string; fecha: Date; motivo: string | null; admin: string | null; datosAnteriores: string | null; datosNuevos: string | null }[]>`
    SELECT h.id, h.tipo, h.fecha, h.motivo, a.nombre AS admin, h.datos_anteriores, h.datos_nuevos
    FROM historial_suscripciones h LEFT JOIN usuarios a ON a.id = h.admin_id
    WHERE h.usuario_id = ${id} ORDER BY h.fecha DESC, h.id DESC`;
  return filas.map((h) => ({ ...h, fecha: h.fecha.toISOString() }));
});
