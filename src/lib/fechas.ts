// Utilidades de fechas en español (hora local del dispositivo; la clínica
// está en Europe/Madrid y las usuarias también).

export const DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"];
export const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const DIAS_ABREV = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const MESES_ABREV = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const dos = (n: number) => String(n).padStart(2, "0");

/** 1 = lunes … 7 = domingo */
export function diaSemana(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

export function inicioDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function sumarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function lunesDe(d: Date): Date {
  return sumarDias(inicioDia(d), -(diaSemana(d) - 1));
}

export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "YYYY-MM-DD" en hora local */
export function claveDia(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function hora(iso: string): string {
  const d = new Date(iso);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function minutosEntre(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

/** "Mar 8 oct" */
export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  return `${DIAS_ABREV[diaSemana(d) - 1]} ${d.getDate()} ${MESES_ABREV[d.getMonth()]}`;
}

/** "martes, 8 de octubre" */
export function fechaLarga(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${DIAS[diaSemana(d) - 1]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "Octubre 2026" */
export function mesAnio(anio: number, mes: number): string {
  const m = MESES[mes - 1];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${anio}`;
}

export function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Texto de apertura de reserva: "Se abre el lunes 9 nov a las 00:00" */
export function textoApertura(iso?: string | null): string {
  if (!iso) return "Aún no se puede reservar";
  const d = new Date(iso);
  return `Se puede reservar desde el ${DIAS[diaSemana(d) - 1]} ${d.getDate()} ${MESES_ABREV[d.getMonth()]} a las ${hora(iso)}`;
}

export function euros(centimos: number): string {
  const e = centimos / 100;
  return `${Number.isInteger(e) ? e : e.toFixed(2).replace(".", ",")} €`;
}

/** Fichero .ics para "Añadir a mi calendario" */
export function generarIcs(titulo: string, inicio: string, fin: string, lugar: string): string {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mama en movimiento//ES",
    "BEGIN:VEVENT",
    `UID:${f(inicio)}-${Math.random().toString(36).slice(2)}@mamaenmovimiento`,
    `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(inicio)}`,
    `DTEND:${f(fin)}`,
    `SUMMARY:${titulo}`,
    `LOCATION:${lugar}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
