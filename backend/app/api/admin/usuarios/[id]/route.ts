import { usuariaParaAdmin } from "@/server/admin";
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";
import { eliminarCuenta, mensualidadesDe, sugerenciaCompensacion } from "@/server/motor";
import { avisarPromociones } from "@/server/notificaciones";
import { verMensualidad, verUsuario } from "@/server/vistas";

/** Ficha: datos, mensualidades, saldo y sugerencia de compensación para ?anio&mes. */
export const GET = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const u = await usuariaParaAdmin(sql, await idDe(ctx));
  const q = req.nextUrl.searchParams;
  const hoy = new Date();
  const anio = Number(q.get("anio")) || hoy.getFullYear();
  const mes = Number(q.get("mes")) || hoy.getMonth() + 1;
  return {
    usuario: await verUsuario(sql, u),
    mensualidades: (await mensualidadesDe(sql, u.id)).map(verMensualidad),
    saldoCompensacion: u.saldoCompensacion,
    sugerenciaCompensacion: await sugerenciaCompensacion(sql, u.id, anio, mes),
  };
});

/** Editar nombre / email. */
export const PATCH = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const u = await usuariaParaAdmin(sql, await idDe(ctx));
  const b = await cuerpo(req);
  const nombre = typeof b.nombre === "string" ? b.nombre.trim() : u.nombre;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : u.email;
  if (nombre.length < 2) throw new ErrorHttp(400, "El nombre no es válido.");
  const [otra] = await sql`SELECT id FROM usuarios WHERE email = ${email} AND id <> ${u.id}`;
  if (otra) throw new ErrorHttp(409, "Ya existe otra cuenta con ese email.");
  await sql`UPDATE usuarios SET nombre = ${nombre}, email = ${email} WHERE id = ${u.id}`;
  return { ok: true };
});

/** Eliminar cuenta (RGPD): anonimiza. */
export const DELETE = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const u = await usuariaParaAdmin(sql, await idDe(ctx));
  const promos = await sql.begin((tx) => eliminarCuenta(tx, u.id));
  avisarPromociones(promos);
  return { ok: true };
});
