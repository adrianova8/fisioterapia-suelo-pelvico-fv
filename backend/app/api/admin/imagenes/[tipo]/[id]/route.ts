// Subir (multipart, campo "imagen") o quitar la foto de una profesional / imagen de un programa.
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { ErrorHttp, ruta } from "@/server/http";
import { borrarImagen, guardarImagen, tipoImagen } from "@/server/imagenes";

type Ctx = { params: Promise<{ tipo: string; id: string }> };

export const POST = ruta<Ctx>(async (req, ctx) => {
  await requerirAdmin(req);
  const { tipo, id } = await ctx.params;
  const form = await req.formData().catch(() => null);
  const fichero = form?.get("imagen");
  if (!fichero || typeof fichero === "string") throw new ErrorHttp(400, "Falta la imagen.");
  await guardarImagen(sql, tipoImagen(tipo), Number(id), new Uint8Array(await fichero.arrayBuffer()));
  return { ok: true };
});

export const DELETE = ruta<Ctx>(async (req, ctx) => {
  await requerirAdmin(req);
  const { tipo, id } = await ctx.params;
  await borrarImagen(sql, tipoImagen(tipo), Number(id));
  return { ok: true };
});
