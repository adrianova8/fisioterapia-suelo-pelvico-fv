import { requerirUsuario } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, ruta } from "@/server/http";

export const POST = ruta(async (req) => {
  const u = await requerirUsuario(req);
  const b = await cuerpo(req);
  const token = String(b.token ?? "").trim();
  if (!token) throw new ErrorHttp(400, "Falta el token.");
  await sql`INSERT INTO push_tokens (usuario_id, token, plataforma) VALUES (${u.id}, ${token}, ${String(b.plataforma ?? "") || null})
            ON CONFLICT (token) DO UPDATE SET usuario_id = EXCLUDED.usuario_id, plataforma = EXCLUDED.plataforma`;
  return { ok: true };
});
