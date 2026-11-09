// Calendario de la usuaria: sesiones de SU programa con lo que puede hacer en cada una,
// y la mensualidad de cada mes que aparece en el rango.
import { requerirUsuaria } from "@/server/auth";
import { sql } from "@/server/db";
import { claveMes, DIA, fechaParam } from "@/server/fechas";
import { ruta } from "@/server/http";
import { asegurarSesiones, mensualidadesDe, sesionesDonde } from "@/server/motor";
import { verMensualidad, verSesionesUsuaria } from "@/server/vistas";

export const GET = ruta(async (req) => {
  const u = await requerirUsuaria(req);
  const q = req.nextUrl.searchParams;
  const desde = fechaParam(q.get("desde"), new Date());
  const hasta = fechaParam(q.get("hasta"), new Date(desde.getTime() + 7 * DIA));
  await asegurarSesiones(sql, desde, hasta);
  const sesiones = await sesionesDonde(
    sql,
    sql`s.programa_id = ${u.programaId} AND s.fecha_hora_inicio >= ${desde} AND s.fecha_hora_inicio < ${hasta}`,
  );
  const todas = await mensualidadesDe(sql, u.id);
  const meses = new Map<string, { anio: number; mes: number }>();
  for (let d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()); d < hasta; d.setDate(d.getDate() + 1)) {
    meses.set(claveMes(d.getFullYear(), d.getMonth() + 1), { anio: d.getFullYear(), mes: d.getMonth() + 1 });
  }
  return {
    sesiones: await verSesionesUsuaria(sql, u, sesiones),
    mensualidades: [...meses.values()].map((x) => ({
      ...x,
      mensualidad: verMensualidad(todas.find((m) => m.anio === x.anio && m.mes === x.mes)),
    })),
  };
});
