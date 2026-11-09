// Fechas en hora del centro. El servidor corre con TZ=Europe/Madrid
// (en package.json y en Vercel), así que los métodos "locales" de Date
// (getDay, getHours…) ya son hora de Santander.
export const HORA = 3600_000;
export const DIA = 24 * HORA;
export const ZONA = "Europe/Madrid";

if (process.env.TZ !== ZONA) {
  console.warn(`[fechas] TZ es "${process.env.TZ ?? ""}" y debería ser "${ZONA}". Las horas de las clases pueden salir desplazadas.`);
}

/** Lunes 00:00 de la semana de `d`. */
export function lunes(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

/** Se puede reservar desde 3 días naturales antes, a las 00:00. */
export function aperturaReserva(inicio: Date): Date {
  const a = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  a.setDate(a.getDate() - 3);
  return a;
}

/** 1 = lunes … 7 = domingo. */
export const diaSemana = (d: Date) => ((d.getDay() + 6) % 7) + 1;

export const claveMes = (anio: number, mes: number) => `${anio}-${mes}`;
export const claveMesDe = (d: Date) => claveMes(d.getFullYear(), d.getMonth() + 1);

/** Fecha de una query (?desde=ISO). */
export function fechaParam(v: string | null, porDefecto: Date): Date {
  if (!v) return porDefecto;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? porDefecto : d;
}

const fmtFecha = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA });
const fmtHora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });

/** "martes 10 de noviembre, 18:00" */
export const fechaLegible = (d: Date) => `${fmtFecha.format(d)}, ${fmtHora.format(d)}`;
export const horaLegible = (d: Date) => fmtHora.format(d);
