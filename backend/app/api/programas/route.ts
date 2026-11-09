import { sql } from "@/server/db";
import { ruta } from "@/server/http";
import { urlImagen } from "@/server/vistas";

export const GET = ruta(async () => {
  const filas = await sql<{ id: number; nombre: string; imagenActualizada: Date | null }[]>`SELECT id, nombre, imagen_actualizada FROM programas ORDER BY id`;
  return filas.map((p) => ({ id: p.id, nombre: p.nombre, imagen: urlImagen("programa", p.id, p.imagenActualizada) }));
});
