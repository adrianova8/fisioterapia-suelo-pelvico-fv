// Pasar lista: ASISTIDA o NO_SHOW (las dos consumen la cuota).
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, entero, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";

export const POST = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const id = await idDe(ctx);
  const b = await cuerpo(req);
  const estado = b.estado === "NO_SHOW" ? "NO_SHOW" : b.estado === "ASISTIDA" ? "ASISTIDA" : null;
  if (!estado) throw new ErrorHttp(400, "Estado no válido.");
  const r = await sql`
    UPDATE reservas SET estado = ${estado}
    WHERE id = ${entero(b.reservaId, "reservaId")} AND sesion_id = ${id} AND estado IN ('CONFIRMADA','ASISTIDA','NO_SHOW')
    RETURNING id`;
  if (!r.length) throw new ErrorHttp(404, "Reserva no encontrada.");
  return { ok: true };
});
