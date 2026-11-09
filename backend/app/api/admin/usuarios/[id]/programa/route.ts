// Cambio de programa (p. ej. Embarazo → Postparto). Las reservas futuras se mantienen.
import { apuntarHistorial, usuariaParaAdmin } from "@/server/admin";
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, entero, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";

export const PATCH = ruta<CtxId>(async (req, ctx) => {
  const admin = await requerirAdmin(req);
  const u = await usuariaParaAdmin(sql, await idDe(ctx));
  const b = await cuerpo(req);
  const programaId = entero(b.programaId, "programaId");
  const progs = await sql<{ id: number; nombre: string }[]>`SELECT id, nombre FROM programas WHERE id IN (${u.programaId}, ${programaId})`;
  const nuevo = progs.find((p) => p.id === programaId);
  if (!nuevo) throw new ErrorHttp(400, "Programa no válido.");
  if (programaId === u.programaId) return { ok: true };
  const antes = progs.find((p) => p.id === u.programaId)?.nombre;
  const motivo = String(b.motivo ?? "").trim();
  await sql.begin(async (tx) => {
    await tx`UPDATE usuarios SET programa_id = ${programaId} WHERE id = ${u.id}`;
    await apuntarHistorial(tx, { usuarioId: u.id, adminId: admin.id, tipo: "CAMBIO_PROGRAMA", motivo: `${antes} → ${nuevo.nombre}${motivo ? " · " + motivo : ""}`, antes: { programaId: u.programaId }, despues: { programaId } });
  });
  return { ok: true };
});
