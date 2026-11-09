// Pide un enlace para cambiar la contraseña. Siempre responde ok (no revela
// si el email existe). En desarrollo devuelve también el enlace (enlaceDev).
import { randomBytes } from "node:crypto";

import { hashToken } from "@/server/auth";
import { sql } from "@/server/db";
import { enviarEmail } from "@/server/email";
import { cuerpo, ruta } from "@/server/http";
import { puedeRecuperar } from "@/server/seguridad";

export const POST = ruta(async (req) => {
  const email = String((await cuerpo(req)).email ?? "").trim().toLowerCase();
  const [u] = await sql<{ id: number; nombre: string }[]>`SELECT id, nombre FROM usuarios WHERE email = ${email} AND eliminada_en IS NULL`;
  if (!u || !(await puedeRecuperar(u.id))) return { ok: true };
  const token = randomBytes(32).toString("hex");
  await sql`INSERT INTO tokens_recuperacion (usuario_id, token_hash, fecha_expiracion)
            VALUES (${u.id}, ${hashToken(token)}, now() + interval '1 hour')`;
  const base = process.env.URL_PUBLICA ?? req.nextUrl.origin;
  const enlace = `${base}/restablecer?token=${token}`;
  await enviarEmail(
    email,
    "Cambia tu contraseña",
    `Hola, ${u.nombre.split(" ")[0]}:\n\nPara elegir una contraseña nueva abre este enlace (vale 1 hora y solo una vez):\n\n${enlace}\n\nSi no lo has pedido tú, ignora este email.`,
  );
  return process.env.NODE_ENV === "production" ? { ok: true } : { ok: true, enlaceDev: enlace };
});
