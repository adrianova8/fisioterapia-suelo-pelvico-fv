// Imágenes guardadas en la propia base (BYTEA). La app ya las recorta 1:1 y
// las comprime antes de subirlas; aquí se comprueba que de verdad son imágenes
// (por su firma, no por lo que diga el nombre) y que no pesan demasiado.
import type { Db } from "./db";
import { ErrorHttp } from "./http";

export type TipoImagen = "programa" | "profesional";
const MAX_BYTES = 3 * 1024 * 1024;

export function tipoImagen(t: string): TipoImagen {
  if (t === "programa" || t === "profesional") return t;
  throw new ErrorHttp(404, "Tipo de imagen no válido.");
}

function mimeDe(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

const tabla = (t: TipoImagen) => (t === "programa" ? { t: "programas", c: "imagen", f: "imagen_actualizada" } : { t: "profesionales", c: "foto", f: "foto_actualizada" });

export async function guardarImagen(db: Db, tipo: TipoImagen, id: number, bytes: Uint8Array) {
  if (bytes.length > MAX_BYTES) throw new ErrorHttp(400, "La imagen pesa demasiado (máximo 3 MB).");
  if (!mimeDe(bytes)) throw new ErrorHttp(400, "El archivo no es una imagen JPG, PNG o WebP.");
  const { t, c, f } = tabla(tipo);
  const r = await db.unsafe(`UPDATE ${t} SET ${c} = $1, ${f} = now() WHERE id = $2 RETURNING id`, [Buffer.from(bytes), id]);
  if (!r.length) throw new ErrorHttp(404, "No encontrado.");
}

export async function leerImagen(db: Db, tipo: TipoImagen, id: number): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const { t, c } = tabla(tipo);
  const [fila] = await db.unsafe(`SELECT ${c} AS datos FROM ${t} WHERE id = $1`, [id]);
  const bytes = fila?.datos as Uint8Array | null | undefined;
  if (!bytes) return null;
  return { bytes, mime: mimeDe(bytes) ?? "application/octet-stream" };
}

export async function borrarImagen(db: Db, tipo: TipoImagen, id: number) {
  const { t, c, f } = tabla(tipo);
  await db.unsafe(`UPDATE ${t} SET ${c} = NULL, ${f} = NULL WHERE id = $1`, [id]);
}
