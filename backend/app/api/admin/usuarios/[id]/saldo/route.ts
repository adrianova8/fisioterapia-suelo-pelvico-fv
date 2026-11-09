// Ajuste manual del saldo de clases adeudadas (motivo obligatorio). Saldo 0 = reembolso.
import { apuntarHistorial, usuariaParaAdmin } from "@/server/admin";
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";

export const POST = ruta<CtxId>(async (req, ctx) => {
  const admin = await requerirAdmin(req);
  const u = await usuariaParaAdmin(sql, await idDe(ctx));
  const b = await cuerpo(req);
  const motivo = String(b.motivo ?? "").trim();
  if (!motivo) throw new ErrorHttp(400, "El motivo es obligatorio.");
  const saldo = Math.floor(Number(b.saldo));
  if (!Number.isFinite(saldo) || saldo < 0) throw new ErrorHttp(400, "El saldo debe ser 0 o más.");
  await sql.begin(async (tx) => {
    await tx`UPDATE usuarios SET saldo_compensacion = ${saldo} WHERE id = ${u.id}`;
    await apuntarHistorial(tx, { usuarioId: u.id, adminId: admin.id, tipo: "AJUSTE", motivo: `Saldo ${u.saldoCompensacion} → ${saldo} · ${motivo}`, antes: { saldo: u.saldoCompensacion }, despues: { saldo } });
  });
  return { ok: true };
});
