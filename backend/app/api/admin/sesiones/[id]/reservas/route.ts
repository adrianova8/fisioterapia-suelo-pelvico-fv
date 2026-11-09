// Asistentes de una clase (para pasar lista).
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { idDe, ruta, type CtxId } from "@/server/http";

export const GET = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const id = await idDe(ctx);
  return sql`
    SELECT r.id AS reserva_id, r.usuario_id, u.nombre, r.estado, r.origen, (r.asignacion_fija_id IS NOT NULL) AS fija
    FROM reservas r JOIN usuarios u ON u.id = r.usuario_id
    WHERE r.sesion_id = ${id} AND r.estado <> 'CANCELADA_CON_CREDITO'
    ORDER BY u.nombre`;
});
