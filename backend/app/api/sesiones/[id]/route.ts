import { requerirUsuaria } from "@/server/auth";
import { sql } from "@/server/db";
import { idDe, ruta, type CtxId } from "@/server/http";
import { asegurarReservasFijas, sesionPorId } from "@/server/motor";
import { verSesionesUsuaria } from "@/server/vistas";

export const GET = ruta<CtxId>(async (req, ctx) => {
  const u = await requerirUsuaria(req);
  const s = await sesionPorId(sql, await idDe(ctx));
  await asegurarReservasFijas(sql, s.fechaHoraInicio, s.fechaHoraFin);
  const [vista] = await verSesionesUsuaria(sql, u, [s]);
  return vista;
});
