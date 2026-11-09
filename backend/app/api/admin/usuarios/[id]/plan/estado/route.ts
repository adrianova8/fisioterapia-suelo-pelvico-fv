// Pausar (parto/baja, con clases a compensar) o reactivar la mensualidad de un mes.
import { apuntarHistorial, usuariaParaAdmin } from "@/server/admin";
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { DIA } from "@/server/fechas";
import { cuerpo, entero, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";
import { asegurarSesiones } from "@/server/motor";

export const PATCH = ruta<CtxId>(async (req, ctx) => {
  const admin = await requerirAdmin(req);
  const u = await usuariaParaAdmin(sql, await idDe(ctx));
  const b = await cuerpo(req);
  const anio = entero(b.anio, "anio");
  const mes = entero(b.mes, "mes");
  const accion = String(b.accion ?? "");
  if (accion !== "PAUSAR" && accion !== "REACTIVAR") throw new ErrorHttp(400, "Acción no válida.");

  await sql.begin(async (tx) => {
    const [m] = await tx<{ id: number; estado: string; tarifaId: number }[]>`
      SELECT id, estado, tarifa_id FROM suscripciones_mensuales WHERE usuario_id = ${u.id} AND anio = ${anio} AND mes = ${mes} FOR UPDATE`;
    if (!m) throw new ErrorHttp(404, "No hay mensualidad ese mes.");
    if (accion === "PAUSAR") {
      if (m.estado !== "ACTIVA") throw new ErrorHttp(400, "Solo se puede pausar un plan activo.");
      const motivo = String(b.motivo ?? "").trim() || null;
      const n = Math.max(0, Math.floor(Number(b.clasesCompensadas) || 0));
      await tx`UPDATE suscripciones_mensuales SET estado = 'PAUSADA', fecha_pausa = now(), motivo_pausa = ${motivo} WHERE id = ${m.id}`;
      await tx`UPDATE usuarios SET saldo_compensacion = saldo_compensacion + ${n} WHERE id = ${u.id}`;
      await apuntarHistorial(tx, { usuarioId: u.id, adminId: admin.id, tipo: "PAUSA", suscripcionId: m.id, motivo: `${motivo ?? "Pausa"} · ${n} ${n === 1 ? "clase" : "clases"} a compensar`, antes: { saldo: u.saldoCompensacion }, despues: { saldo: u.saldoCompensacion + n } });
    } else {
      const tarifaId = b.tarifaId ? entero(b.tarifaId, "tarifaId") : m.tarifaId;
      await tx`UPDATE suscripciones_mensuales SET estado = 'ACTIVA', tarifa_id = ${tarifaId}, fecha_pausa = NULL, motivo_pausa = NULL WHERE id = ${m.id}`;
      await apuntarHistorial(tx, { usuarioId: u.id, adminId: admin.id, tipo: "REACTIVACION", suscripcionId: m.id, antes: { tarifaId: m.tarifaId }, despues: { tarifaId } });
    }
  });
  if (accion === "REACTIVAR") await asegurarSesiones(sql, new Date(), new Date(Date.now() + 14 * DIA));
  return { ok: true };
});
