import { crearSesion, respuestaLogin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, ruta } from "@/server/http";
import { hashPassword, PASSWORD_MINIMA } from "@/server/password";
import { verUsuario } from "@/server/vistas";

export const POST = ruta(async (req) => {
  const b = await cuerpo(req);
  const nombre = String(b.nombre ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const programaId = Number(b.programaId) || 1;
  if (nombre.length < 2) throw new ErrorHttp(400, "Escribe tu nombre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorHttp(400, "El email no es válido.");
  if (password.length < PASSWORD_MINIMA) throw new ErrorHttp(400, `La contraseña debe tener al menos ${PASSWORD_MINIMA} caracteres.`);
  const [prog] = await sql`SELECT id FROM programas WHERE id = ${programaId}`;
  if (!prog) throw new ErrorHttp(400, "Elige un programa válido.");
  const hash = await hashPassword(password);
  const u = await sql.begin(async (tx) => {
    const [existe] = await tx`SELECT id FROM usuarios WHERE email = ${email}`;
    if (existe) throw new ErrorHttp(409, "Ya existe una cuenta con ese email.");
    const [nuevo] = await tx<{ id: number; nombre: string; email: string; rol: string; programaId: number }[]>`
      INSERT INTO usuarios (nombre, email, programa_id) VALUES (${nombre}, ${email}, ${programaId})
      RETURNING id, nombre, email, rol, programa_id`;
    await tx`INSERT INTO credenciales (usuario_id, password_hash) VALUES (${nuevo.id}, ${hash})`;
    return nuevo;
  });
  return respuestaLogin(await crearSesion(u.id), await verUsuario(sql, u));
});
