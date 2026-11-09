import { sql } from "@/server/db";
import { ruta } from "@/server/http";
import { urlImagen } from "@/server/vistas";

export const GET = ruta(async () => {
  const [tarifas, profesionales, programas] = await Promise.all([
    sql<{ id: number; nombre: string; sesionesSemana: number; precioCentimos: number; activa: boolean }[]>`
      SELECT id, nombre, sesiones_semana, precio_centimos, activa FROM tarifas WHERE activa ORDER BY sesiones_semana`,
    sql<{ id: number; nombre: string; activo: boolean; fotoActualizada: Date | null }[]>`
      SELECT id, nombre, activo, foto_actualizada FROM profesionales WHERE activo ORDER BY id`,
    sql<{ id: number; nombre: string; imagenActualizada: Date | null }[]>`SELECT id, nombre, imagen_actualizada FROM programas ORDER BY id`,
  ]);
  return {
    tarifas,
    profesionales: profesionales.map((p) => ({ id: p.id, nombre: p.nombre, activo: p.activo, foto: urlImagen("profesional", p.id, p.fotoActualizada) })),
    programas: programas.map((p) => ({ id: p.id, nombre: p.nombre, imagen: urlImagen("programa", p.id, p.imagenActualizada) })),
  };
});
