import { hashToken } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, ruta } from "@/server/http";
import { hashPassword, PASSWORD_MINIMA } from "@/server/password";

export const POST = ruta(async (req) => {
  const b = await cuerpo(req);
  const token = String(b.token ?? "");
  const password = String(b.password ?? "");
  if (password.length < PASSWORD_MINIMA) throw new ErrorHttp(400, `La contraseña debe tener al menos ${PASSWORD_MINIMA} caracteres.`);
  const hash = await hashPassword(password);
  await sql.begin(async (tx) => {
    const [t] = await tx<{ id: number; usuarioId: number }[]>`
      SELECT id, usuario_id FROM tokens_recuperacion
      WHERE token_hash = ${hashToken(token)} AND NOT usado AND fecha_expiracion > now() FOR UPDATE`;
    if (!t) throw new ErrorHttp(400, "El enlace no es válido o ha caducado. Pide uno nuevo.");
    await tx`UPDATE tokens_recuperacion SET usado = TRUE WHERE id = ${t.id}`;
    await tx`INSERT INTO credenciales (usuario_id, password_hash) VALUES (${t.usuarioId}, ${hash})
             ON CONFLICT (usuario_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`;
    await tx`DELETE FROM sesiones_auth WHERE usuario_id = ${t.usuarioId}`; // cierra todas las sesiones
  });
  return { ok: true };
});
