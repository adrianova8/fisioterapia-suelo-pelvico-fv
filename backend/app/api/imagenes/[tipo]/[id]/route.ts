// Imagen pública de un programa o foto de una profesional (guardadas en la base).
// La URL lleva ?v=<fecha> y por eso se puede guardar en caché para siempre.
import { sql } from "@/server/db";
import { ErrorHttp, ruta } from "@/server/http";
import { leerImagen, tipoImagen } from "@/server/imagenes";

type Ctx = { params: Promise<{ tipo: string; id: string }> };

export const GET = ruta<Ctx>(async (_req, ctx) => {
  const { tipo, id } = await ctx.params;
  const datos = await leerImagen(sql, tipoImagen(tipo), Number(id));
  if (!datos) throw new ErrorHttp(404, "Sin imagen.");
  return new Response(new Uint8Array(datos.bytes), {
    headers: { "Content-Type": datos.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
});
