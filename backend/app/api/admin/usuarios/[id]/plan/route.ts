// Activar la mensualidad de un mes (la usuaria ha pagado en la clínica).
import { apuntarHistorial, usuariaParaAdmin } from "@/server/admin";
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { DIA } from "@/server/fechas";
import { cuerpo, entero, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";
import { asegurarSesiones } from "@/server/motor";

export const POST = ruta<CtxId>(async (req, ctx) => {
  const admin = await requerirAdmin(req);
  const u = await usuariaParaAdmin(sql, await idDe(ctx));
  const b = await cuerpo(req);
  const anio = entero(b.anio, "anio");
  const mes = entero(b.mes, "mes");
  const tarifaId = entero(b.tarifaId, "tarifaId");
  if (mes > 12) throw new ErrorHttp(400, "Mes no válido.");
  const [t] = await sql<{ nombre: string }[]>`SELECT nombre FROM tarifas WHERE id = ${tarifaId} AND activa`;
  if (!t) throw new ErrorHttp(400, "Tarifa no válida.");
  await sql.begin(async (tx) => {
    const [m] = await tx<{ id: number }[]>`
      INSERT INTO suscripciones_mensuales (usuario_id, tarifa_id, anio, mes, estado)
      VALUES (${u.id}, ${tarifaId}, ${anio}, ${mes}, 'ACTIVA')
      ON CONFLICT (usuario_id, anio, mes) DO UPDATE
        SET tarifa_id = EXCLUDED.tarifa_id, estado = 'ACTIVA', fecha_activacion = now(), fecha_pausa = NULL, motivo_pausa = NULL
      RETURNING id`;
    await apuntarHistorial(tx, { usuarioId: u.id, adminId: admin.id, tipo: "ACTIVACION", suscripcionId: m.id, motivo: `${mes}/${anio} · ${t.nombre}`, despues: { anio, mes, tarifaId } });
  });
  // Con el plan activo, sus clases fijas de ese mes se reservan solas.
  const inicioMes = new Date(anio, mes - 1, 1);
  const desde = new Date(Math.max(Date.now(), inicioMes.getTime()));
  const hasta = new Date(Math.min(new Date(anio, mes, 1).getTime(), desde.getTime() + 21 * DIA));
  if (hasta > desde) await asegurarSesiones(sql, desde, hasta);
  return { ok: true };
});
