import { crearSesion, respuestaLogin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, ruta } from "@/server/http";
import { comprobarPassword } from "@/server/password";
import { comprobarLimiteLogin, limpiarFallos, registrarFallo } from "@/server/seguridad";
import { verUsuario } from "@/server/vistas";

export const POST = ruta(async (req) => {
  const b = await cuerpo(req);
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  if (!email || !password) throw new ErrorHttp(400, "Escribe tu email y tu contraseña.");
  await comprobarLimiteLogin(email);
  const [u] = await sql<{ id: number; nombre: string; email: string; rol: string; programaId: number; passwordHash: string | null }[]>`
    SELECT u.id, u.nombre, u.email, u.rol, u.programa_id, c.password_hash
    FROM usuarios u LEFT JOIN credenciales c ON c.usuario_id = u.id
    WHERE u.email = ${email} AND u.eliminada_en IS NULL`;
  if (!u || !u.passwordHash || !(await comprobarPassword(password, u.passwordHash))) {
    await registrarFallo(email);
    throw new ErrorHttp(401, "Email o contraseña incorrectos.");
  }
  await limpiarFallos(email);
  return respuestaLogin(await crearSesion(u.id), await verUsuario(sql, u));
});
