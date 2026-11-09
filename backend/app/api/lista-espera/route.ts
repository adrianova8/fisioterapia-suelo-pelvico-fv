import { requerirUsuaria } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, entero, ruta } from "@/server/http";
import { salirListaEspera, unirseListaEspera } from "@/server/motor";

/** Apuntarse: { sesionId } */
export const POST = ruta(async (req) => {
  const u = await requerirUsuaria(req);
  const sesionId = entero((await cuerpo(req)).sesionId, "sesionId");
  const r = await sql.begin((tx) => unirseListaEspera(tx, u.id, sesionId));
  return { ok: true, posicion: r.posicion };
});

/** Salir: { sesionId } */
export const PATCH = ruta(async (req) => {
  const u = await requerirUsuaria(req);
  await salirListaEspera(sql, u.id, entero((await cuerpo(req)).sesionId, "sesionId"));
  return { ok: true };
});
