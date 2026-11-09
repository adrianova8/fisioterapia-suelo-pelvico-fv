// Pública: calendario de los próximos 14 días en solo lectura (modo invitada).
import { sql } from "@/server/db";
import { DIA } from "@/server/fechas";
import { ruta } from "@/server/http";
import { asegurarSesiones, sesionesDonde } from "@/server/motor";
import { verSesionesInvitada } from "@/server/vistas";

export const GET = ruta(async () => {
  const desde = new Date();
  const hasta = new Date(desde.getTime() + 14 * DIA);
  await asegurarSesiones(sql, desde, hasta);
  const sesiones = await sesionesDonde(sql, sql`s.estado = 'ACTIVA' AND s.fecha_hora_inicio >= ${desde} AND s.fecha_hora_inicio < ${hasta}`);
  return { sesiones: await verSesionesInvitada(sql, sesiones), mensualidades: [] };
});
