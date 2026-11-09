import { requerirUsuario } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, ruta } from "@/server/http";
import { eliminarCuenta, mensualidadDelMes, usadasSemana } from "@/server/motor";
import { avisarPromociones } from "@/server/notificaciones";
import { verMensualidad, verUsuario } from "@/server/vistas";

export const GET = ruta(async (req) => {
  const u = await requerirUsuario(req);
  const ahora = new Date();
  const m = await mensualidadDelMes(sql, u.id, ahora);
  return {
    usuario: await verUsuario(sql, u),
    mensualidad: verMensualidad(m),
    usoSemanal: {
      usadas: await usadasSemana(sql, u.id, ahora),
      limite: m?.estado === "ACTIVA" ? m.tarifa.sesionesSemana : 0,
    },
    saldoCompensacion: u.saldoCompensacion,
  };
});

/** Eliminar mi cuenta (RGPD). Requisito de Apple. */
export const DELETE = ruta(async (req) => {
  const u = await requerirUsuario(req);
  if ((await cuerpo(req)).confirmar !== true) throw new ErrorHttp(400, "Falta confirmar la eliminación.");
  const promos = await sql.begin((tx) => eliminarCuenta(tx, u.id));
  avisarPromociones(promos);
  return { ok: true };
});
