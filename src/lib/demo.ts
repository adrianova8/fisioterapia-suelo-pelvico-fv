// MODO DEMOSTRACIÓN
// Servidor de mentira, en memoria, para poder ver y probar la app en el móvil
// sin el backend. Se activa cuando EXPO_PUBLIC_API_URL está vacío o vale "demo".
// Imita las reglas principales del documento (cuota semanal, mes de la clase,
// ventana de 3 días, cancelación 1 h, lista de espera, saldo, clases fijas)
// pero NO es la fuente de verdad: la de verdad es el backend `fv`.
// Los datos se pierden al cerrar la app.

import type {
  EstadoReserva,
  EstadoSesion,
  Mensualidad,
  MovimientoHistorial,
  PlantillaHueco,
  Tarifa,
} from "./tipos";

type Metodo = "GET" | "POST" | "PATCH" | "DELETE";
interface Resp {
  status: number;
  datos: unknown;
}

// ---------------- Datos semilla ----------------

const programas = [
  { id: 1, nombre: "Embarazo", imagen: null },
  { id: 2, nombre: "Postparto", imagen: null },
  { id: 3, nombre: "+50", imagen: null },
];
const profesionales = [
  { id: 1, nombre: "Ana", foto: null, activo: true },
  { id: 2, nombre: "Ángela", foto: null, activo: true },
];
const salas = [{ id: 1, nombre: "Sala de Movimiento" }];
const tarifas: Tarifa[] = [
  { id: 1, nombre: "1 día por semana", sesionesSemana: 1, precioCentimos: 5500, activa: true },
  { id: 2, nombre: "2 días por semana", sesionesSemana: 2, precioCentimos: 9000, activa: true },
];

interface UDemo {
  id: number;
  nombre: string;
  email: string;
  password: string;
  rol: "USUARIO" | "ADMIN";
  programaId: number;
  saldo: number;
  eliminada?: boolean;
}
const usuarios: UDemo[] = [
  { id: 1, nombre: "Laura Martínez", email: "laura@test.com", password: "Password123", rol: "USUARIO", programaId: 1, saldo: 0 },
  { id: 2, nombre: "Marta Gómez", email: "marta@test.com", password: "Password123", rol: "USUARIO", programaId: 2, saldo: 0 },
  { id: 3, nombre: "Carmen Ruiz", email: "carmen@test.com", password: "Password123", rol: "USUARIO", programaId: 3, saldo: 0 },
  { id: 4, nombre: "Lucía Fernández", email: "lucia@test.com", password: "Password123", rol: "USUARIO", programaId: 2, saldo: 3 },
  { id: 5, nombre: "Administrador", email: "admin@test.com", password: "Admin12345", rol: "ADMIN", programaId: 1, saldo: 0 },
];
// Clientas de relleno para que las clases tengan ocupación.
for (let i = 0; i < 12; i++) {
  usuarios.push({
    id: 100 + i,
    nombre: ["Sara", "Paula", "Irene", "Nuria", "Elena", "Raquel", "Bea", "Clara", "Noelia", "Silvia", "Rocío", "Alba"][i] + " (ejemplo)",
    email: `relleno${i}@demo.es`,
    password: "x",
    rol: "USUARIO",
    programaId: (i % 3) + 1,
    saldo: 0,
  });
}

const hoy = new Date();
const anioAct = hoy.getFullYear();
const mesAct = hoy.getMonth() + 1;

interface MDemo {
  id: number;
  usuarioId: number;
  tarifaId: number;
  anio: number;
  mes: number;
  estado: Mensualidad["estado"];
  fechaActivacion: string;
  fechaPausa?: string | null;
  motivoPausa?: string | null;
}
let sigId = 1000;
const nuevoId = () => ++sigId;

const mensualidades: MDemo[] = [
  { id: 1, usuarioId: 1, tarifaId: 2, anio: anioAct, mes: mesAct, estado: "ACTIVA", fechaActivacion: hoy.toISOString() },
  { id: 2, usuarioId: 2, tarifaId: 1, anio: anioAct, mes: mesAct, estado: "ACTIVA", fechaActivacion: hoy.toISOString() },
  { id: 3, usuarioId: 3, tarifaId: 2, anio: anioAct, mes: mesAct, estado: "ACTIVA", fechaActivacion: hoy.toISOString() },
  { id: 4, usuarioId: 4, tarifaId: 1, anio: anioAct, mes: mesAct, estado: "PAUSADA", fechaActivacion: hoy.toISOString(), fechaPausa: hoy.toISOString(), motivoPausa: "Parto" },
];
for (let i = 0; i < 12; i++) {
  mensualidades.push({ id: 10 + i, usuarioId: 100 + i, tarifaId: 2, anio: anioAct, mes: mesAct, estado: "ACTIVA", fechaActivacion: hoy.toISOString() });
}

const historial: (MovimientoHistorial & { usuarioId: number })[] = [
  { id: 1, usuarioId: 4, tipo: "ACTIVACION", fecha: hoy.toISOString(), motivo: null, admin: "Administrador" },
  { id: 2, usuarioId: 4, tipo: "PAUSA", fecha: hoy.toISOString(), motivo: "Parto · 3 clases a compensar", admin: "Administrador" },
];

const P = (id: number, dia: number, h: string, prog: number, prof: number, cap = 8): PlantillaHueco => ({
  id,
  diaSemana: dia,
  horaInicio: h,
  duracionMinutos: 60,
  programaId: prog,
  programa: programas[prog - 1].nombre,
  profesionalId: prof,
  profesional: profesionales[prof - 1].nombre,
  salaId: 1,
  sala: salas[0].nombre,
  capacidad: cap,
  activa: true,
});
const plantilla: PlantillaHueco[] = [
  P(1, 1, "18:00", 1, 1),
  P(2, 2, "18:00", 1, 2),
  P(3, 3, "10:00", 1, 1),
  P(4, 4, "18:00", 1, 1),
  P(5, 4, "19:00", 1, 2, 6),
  P(6, 1, "10:00", 2, 2),
  P(7, 3, "18:00", 2, 2),
  P(8, 5, "10:00", 2, 1),
  P(9, 2, "10:00", 3, 1),
  P(10, 4, "10:00", 3, 2),
  P(11, 6, "10:00", 1, 1),
];

interface SDemo {
  id: number;
  programaId: number;
  profesionalId: number;
  salaId: number;
  inicio: Date;
  fin: Date;
  capacidad: number;
  plantillaId: number | null;
  estado: "ACTIVA" | "CANCELADA";
}
const sesiones: SDemo[] = [];

interface RDemo {
  id: number;
  usuarioId: number;
  sesionId: number;
  estado: EstadoReserva;
  origen: "SEMANAL" | "COMPENSACION";
  fija: boolean;
  fechaReserva: string;
  fechaCancelacion?: string | null;
}
const reservas: RDemo[] = [];

interface EDemo {
  id: number;
  usuarioId: number;
  sesionId: number;
  fecha: string;
  estado: "ESPERANDO" | "PROMOCIONADA" | "CANCELADA";
}
const espera: EDemo[] = [];

const fijas: { id: number; usuarioId: number; plantillaId: number; activa: boolean }[] = [
  { id: 1, usuarioId: 1, plantillaId: 2, activa: true },
];

const tokens = new Map<string, number>();

// ---------------- Reglas ----------------

const CONSUMEN: EstadoReserva[] = ["CONFIRMADA", "CANCELADA_SIN_CREDITO", "ASISTIDA", "NO_SHOW"];
const OCUPAN: EstadoReserva[] = ["CONFIRMADA", "ASISTIDA", "NO_SHOW"];
const HORA = 3600_000;

function lunes(d: Date) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

function asegurarSesiones(desde: Date, hasta: Date) {
  const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  while (d < hasta) {
    const dia = ((d.getDay() + 6) % 7) + 1;
    for (const p of plantilla.filter((x) => x.activa && x.diaSemana === dia)) {
      const [hh, mm] = p.horaInicio.split(":").map(Number);
      const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
      if (sesiones.some((s) => s.plantillaId === p.id && s.inicio.getTime() === inicio.getTime())) continue;
      const s: SDemo = {
        id: nuevoId(),
        programaId: p.programaId,
        profesionalId: p.profesionalId,
        salaId: p.salaId,
        inicio,
        fin: new Date(inicio.getTime() + p.duracionMinutos * 60000),
        capacidad: p.capacidad,
        plantillaId: p.id,
        estado: "ACTIVA",
      };
      sesiones.push(s);
      // Relleno de ocupación (las del jueves 19:00 se llenan para ver la lista de espera).
      const rellenoPrograma = usuarios.filter((u) => u.id >= 100 && u.programaId === p.programaId);
      const cuantas = p.id === 5 ? p.capacidad : (s.id * 7) % Math.min(6, p.capacidad);
      for (let i = 0; i < cuantas; i++) {
        const u = rellenoPrograma[i % rellenoPrograma.length] ?? usuarios[100];
        reservas.push({
          id: nuevoId(),
          usuarioId: u.id + i * 1000, // ids ficticios: no cuentan para nadie real
          sesionId: s.id,
          estado: s.inicio < new Date() ? "ASISTIDA" : "CONFIRMADA",
          origen: "SEMANAL",
          fija: false,
          fechaReserva: new Date().toISOString(),
        });
      }
    }
    d.setDate(d.getDate() + 1);
  }
  asegurarFijas();
}

function mensualidadDe(usuarioId: number, fecha: Date) {
  return mensualidades.find((m) => m.usuarioId === usuarioId && m.anio === fecha.getFullYear() && m.mes === fecha.getMonth() + 1) ?? null;
}

function verMensualidad(m: MDemo | null): Mensualidad | null {
  if (!m) return null;
  return { ...m, tarifa: tarifas.find((t) => t.id === m.tarifaId)! };
}

function ocupadas(sesionId: number) {
  return reservas.filter((r) => r.sesionId === sesionId && OCUPAN.includes(r.estado)).length;
}

function usadasSemana(usuarioId: number, fecha: Date) {
  const l = lunes(fecha).getTime();
  const fin = l + 7 * 24 * HORA;
  return reservas.filter((r) => {
    if (r.usuarioId !== usuarioId || r.origen !== "SEMANAL" || !CONSUMEN.includes(r.estado)) return false;
    const s = sesiones.find((x) => x.id === r.sesionId)!;
    return s.inicio.getTime() >= l && s.inicio.getTime() < fin;
  }).length;
}

function apertura(s: SDemo) {
  const a = new Date(s.inicio.getFullYear(), s.inicio.getMonth(), s.inicio.getDate());
  a.setDate(a.getDate() - 3);
  return a;
}

function asegurarFijas() {
  const ahora = new Date();
  for (const f of fijas.filter((x) => x.activa)) {
    for (const s of sesiones.filter((x) => x.plantillaId === f.plantillaId && x.estado === "ACTIVA" && x.inicio > ahora)) {
      if (reservas.some((r) => r.usuarioId === f.usuarioId && r.sesionId === s.id)) continue;
      const m = mensualidadDe(f.usuarioId, s.inicio);
      if (!m || m.estado !== "ACTIVA") continue;
      if (ocupadas(s.id) >= s.capacidad) continue;
      reservas.push({
        id: nuevoId(), usuarioId: f.usuarioId, sesionId: s.id, estado: "CONFIRMADA",
        origen: "SEMANAL", fija: true, fechaReserva: ahora.toISOString(),
      });
    }
  }
}

function elegibilidad(u: UDemo, s: SDemo): { estado: EstadoSesion; puedeReservar: boolean; puedeUnirse: boolean; origen?: "SEMANAL" | "COMPENSACION" } {
  const ahora = new Date();
  const mia = reservas.find((r) => r.usuarioId === u.id && r.sesionId === s.id);
  const no = (estado: EstadoSesion) => ({ estado, puedeReservar: false, puedeUnirse: false });
  if (s.estado === "CANCELADA") return no("CANCELADA");
  if (s.inicio <= ahora) return no("FINALIZADA");
  if (mia && mia.estado === "CONFIRMADA") return no("RESERVADA");
  if (espera.some((e) => e.usuarioId === u.id && e.sesionId === s.id && e.estado === "ESPERANDO")) return no("EN_LISTA_ESPERA");
  if (ahora < apertura(s)) return no("NO_ABIERTA");
  if (mia && mia.estado === "CANCELADA_SIN_CREDITO") return no("LIMITE_SEMANAL");

  let origen: "SEMANAL" | "COMPENSACION" = "SEMANAL";
  const m = mensualidadDe(u.id, s.inicio);
  if (m?.estado === "PAUSADA") return no("MENSUALIDAD_NO_ACTIVA");
  const semanalOk = m?.estado === "ACTIVA" && usadasSemana(u.id, s.inicio) < tarifas.find((t) => t.id === m.tarifaId)!.sesionesSemana;
  if (!semanalOk) {
    if (u.saldo > 0) origen = "COMPENSACION";
    else if (!m) return no("SIN_MENSUALIDAD");
    else if (m.estado !== "ACTIVA") return no("MENSUALIDAD_NO_ACTIVA");
    else return no("LIMITE_SEMANAL");
  }
  if (ocupadas(s.id) >= s.capacidad) {
    if (s.inicio.getTime() - ahora.getTime() < HORA) return no("LISTA_ESPERA_CERRADA");
    return { estado: "COMPLETA", puedeReservar: false, puedeUnirse: true };
  }
  return { estado: "DISPONIBLE", puedeReservar: true, puedeUnirse: false, origen };
}

function verSesion(s: SDemo, u?: UDemo) {
  const prog = programas.find((p) => p.id === s.programaId)!;
  const prof = profesionales.find((p) => p.id === s.profesionalId)!;
  const base = {
    id: s.id,
    programaId: s.programaId,
    programa: prog.nombre,
    programaImagen: null,
    profesionalId: s.profesionalId,
    profesional: prof.nombre,
    profesionalFoto: null,
    sala: salas.find((x) => x.id === s.salaId)!.nombre,
    fechaHoraInicio: s.inicio.toISOString(),
    fechaHoraFin: s.fin.toISOString(),
    capacidad: s.capacidad,
    ocupadas: ocupadas(s.id),
    aperturaReserva: apertura(s).toISOString(),
  };
  if (!u) {
    return { ...base, estado: s.estado === "CANCELADA" ? "CANCELADA" : s.inicio <= new Date() ? "FINALIZADA" : "NO_ABIERTA", puedeReservar: false, puedeUnirseListaEspera: false };
  }
  const e = elegibilidad(u, s);
  const mia = reservas.find((r) => r.usuarioId === u.id && r.sesionId === s.id && r.estado === "CONFIRMADA");
  return {
    ...base,
    estado: e.estado,
    puedeReservar: e.puedeReservar,
    puedeUnirseListaEspera: e.puedeUnirse,
    miReservaId: mia?.id ?? null,
    miReservaFija: !!mia?.fija,
    mensualidad: verMensualidad(mensualidadDe(u.id, s.inicio)),
  };
}

function promocionar(sesionId: number) {
  const s = sesiones.find((x) => x.id === sesionId)!;
  if (s.inicio.getTime() - Date.now() < HORA) return;
  for (const e of espera.filter((x) => x.sesionId === sesionId && x.estado === "ESPERANDO").sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (ocupadas(sesionId) >= s.capacidad) return;
    const u = usuarios.find((x) => x.id === e.usuarioId)!;
    e.estado = "CANCELADA"; // la quitamos para evaluar elegibilidad sin "EN_LISTA_ESPERA"
    const el = elegibilidad(u, s);
    if (el.puedeReservar) {
      e.estado = "PROMOCIONADA";
      crearReservaInterna(u, s, el.origen ?? "SEMANAL");
    } else {
      e.estado = "ESPERANDO";
    }
  }
}

function crearReservaInterna(u: UDemo, s: SDemo, origen: "SEMANAL" | "COMPENSACION") {
  const previa = reservas.find((r) => r.usuarioId === u.id && r.sesionId === s.id);
  if (origen === "COMPENSACION") u.saldo -= 1;
  if (previa) {
    Object.assign(previa, { estado: "CONFIRMADA", origen, fechaReserva: new Date().toISOString(), fechaCancelacion: null });
    return previa;
  }
  const r: RDemo = { id: nuevoId(), usuarioId: u.id, sesionId: s.id, estado: "CONFIRMADA", origen, fija: false, fechaReserva: new Date().toISOString() };
  reservas.push(r);
  return r;
}

function cancelarReservaInterna(r: RDemo, porCentro = false) {
  const s = sesiones.find((x) => x.id === r.sesionId)!;
  const aTiempo = porCentro || s.inicio.getTime() - Date.now() >= HORA;
  r.estado = aTiempo ? "CANCELADA_CON_CREDITO" : "CANCELADA_SIN_CREDITO";
  r.fechaCancelacion = new Date().toISOString();
  if (aTiempo && r.origen === "COMPENSACION") {
    const u = usuarios.find((x) => x.id === r.usuarioId);
    if (u) u.saldo += 1;
  }
  return aTiempo;
}

// ---------------- Router ----------------

const ok = (datos: unknown): Resp => ({ status: 200, datos });
const err = (status: number, error: string): Resp => ({ status, datos: { error } });

function verUsuario(u: UDemo) {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    programa: programas.find((p) => p.id === u.programaId) ?? null,
  };
}

export async function peticionDemo(metodo: Metodo, rutaCompleta: string, cuerpo: unknown, token: string | null): Promise<Resp> {
  await new Promise((r) => setTimeout(r, 150)); // simula la red
  const [ruta, qs] = rutaCompleta.split("?");
  const q = new URLSearchParams(qs ?? "");
  const b = (cuerpo ?? {}) as Record<string, unknown>;
  // Token "demo-<id>": sobrevive a recargar la app (los datos sí se reinician).
  const idToken = token ? (tokens.get(token) ?? (token.startsWith("demo-") ? Number(token.slice(5)) : undefined)) : undefined;
  const yo = idToken ? usuarios.find((u) => u.id === idToken && !u.eliminada) : undefined;
  if (yo) asegurarSesiones(new Date(Date.now() - 35 * 24 * HORA), new Date(Date.now() + 14 * 24 * HORA));
  const seg = ruta.split("/").filter(Boolean); // ["api", ...]
  const k = `${metodo} /${seg.map((s) => (/^\d+$/.test(s) ? ":id" : s)).join("/")}`;
  const ids = seg.filter((s) => /^\d+$/.test(s)).map(Number);

  // ---- Públicas ----
  switch (k) {
    case "POST /api/auth/login": {
      const u = usuarios.find((x) => x.email === String(b.email ?? "").toLowerCase() && !x.eliminada);
      if (!u || u.password !== b.password) return err(401, "Email o contraseña incorrectos.");
      const t = `demo-${u.id}`;
      tokens.set(t, u.id);
      return ok({ token: t, usuario: verUsuario(u) });
    }
    case "POST /api/auth/registro": {
      const email = String(b.email ?? "").toLowerCase();
      if (usuarios.some((x) => x.email === email)) return err(409, "Ya existe una cuenta con ese email.");
      if (String(b.password ?? "").length < 8) return err(400, "La contraseña debe tener al menos 8 caracteres.");
      const u: UDemo = { id: nuevoId(), nombre: String(b.nombre), email, password: String(b.password), rol: "USUARIO", programaId: Number(b.programaId) || 1, saldo: 0 };
      usuarios.push(u);
      const t = `demo-${u.id}`;
      tokens.set(t, u.id);
      return ok({ token: t, usuario: verUsuario(u) });
    }
    case "POST /api/auth/logout":
      if (token) tokens.delete(token);
      return ok({ ok: true });
    case "POST /api/auth/recuperar":
      return ok({ ok: true });
    case "GET /api/info":
      return ok({ tarifas: tarifas.filter((t) => t.activa), profesionales, programas });
    case "GET /api/programas":
      return ok(programas);
    case "GET /api/sesiones/invitada": {
      const desde = new Date();
      const hasta = new Date(desde.getTime() + 14 * 24 * HORA);
      asegurarSesiones(desde, hasta);
      return ok({
        sesiones: sesiones.filter((s) => s.inicio >= desde && s.inicio < hasta && s.estado === "ACTIVA").sort((a, c) => +a.inicio - +c.inicio).map((s) => verSesion(s)),
        mensualidades: [],
      });
    }
  }

  if (!yo) return err(401, "Tu sesión ha caducado. Vuelve a entrar.");

  // ---- Usuaria ----
  switch (k) {
    case "GET /api/me": {
      const m = mensualidadDe(yo.id, new Date());
      return ok({
        usuario: verUsuario(yo),
        mensualidad: verMensualidad(m),
        usoSemanal: { usadas: usadasSemana(yo.id, new Date()), limite: m && m.estado === "ACTIVA" ? tarifas.find((t) => t.id === m.tarifaId)!.sesionesSemana : 0 },
        saldoCompensacion: yo.saldo,
      });
    }
    case "DELETE /api/me": {
      if (yo.rol === "ADMIN") return err(400, "Las cuentas de administración no se pueden eliminar así.");
      eliminar(yo);
      return ok({ ok: true });
    }
    case "POST /api/push-token":
      return ok({ ok: true });
    case "GET /api/sesiones": {
      const desde = new Date(q.get("desde") ?? Date.now());
      const hasta = new Date(q.get("hasta") ?? Date.now() + 7 * 24 * HORA);
      asegurarSesiones(desde, hasta);
      const lista = sesiones
        .filter((s) => s.inicio >= desde && s.inicio < hasta && s.programaId === yo.programaId)
        .sort((a, c) => +a.inicio - +c.inicio)
        .map((s) => verSesion(s, yo));
      const meses = new Map<string, { anio: number; mes: number }>();
      for (let d = new Date(desde); d < hasta; d.setDate(d.getDate() + 1)) meses.set(`${d.getFullYear()}-${d.getMonth()}`, { anio: d.getFullYear(), mes: d.getMonth() + 1 });
      return ok({
        sesiones: lista,
        mensualidades: [...meses.values()].map((x) => ({ ...x, mensualidad: verMensualidad(mensualidadDe(yo.id, new Date(x.anio, x.mes - 1, 1))) })),
      });
    }
    case "GET /api/sesiones/:id": {
      const s = sesiones.find((x) => x.id === ids[0]);
      if (!s) return err(404, "Clase no encontrada.");
      return ok(verSesion(s, yo));
    }
    case "GET /api/reservas": {
      return ok(
        reservas
          .filter((r) => r.usuarioId === yo.id)
          .map((r) => {
            const s = sesiones.find((x) => x.id === r.sesionId)!;
            const v = verSesion(s);
            return {
              id: r.id, estado: r.estado, origen: r.origen, fija: r.fija, fechaReserva: r.fechaReserva, fechaCancelacion: r.fechaCancelacion ?? null,
              sesion: { id: s.id, programa: v.programa, programaImagen: null, profesional: v.profesional, profesionalFoto: null, sala: v.sala, fechaHoraInicio: v.fechaHoraInicio, fechaHoraFin: v.fechaHoraFin, estado: s.estado },
            };
          })
          .sort((a, c) => a.sesion.fechaHoraInicio.localeCompare(c.sesion.fechaHoraInicio)),
      );
    }
    case "POST /api/reservas": {
      const s = sesiones.find((x) => x.id === Number(b.sesionId));
      if (!s) return err(404, "Clase no encontrada.");
      if (s.programaId !== yo.programaId) return err(400, "Esta clase no es de tu programa.");
      const e = elegibilidad(yo, s);
      if (!e.puedeReservar) return err(400, mensajeEstado(e.estado));
      const r = crearReservaInterna(yo, s, e.origen ?? "SEMANAL");
      return ok({ ok: true, reservaId: r.id, origen: r.origen });
    }
    case "PATCH /api/reservas": {
      const r = reservas.find((x) => x.id === Number(b.reservaId) && x.usuarioId === yo.id);
      if (!r || r.estado !== "CONFIRMADA") return err(400, "No se puede cancelar esta reserva.");
      const s = sesiones.find((x) => x.id === r.sesionId)!;
      if (s.inicio <= new Date()) return err(400, "La clase ya ha empezado.");
      const aTiempo = cancelarReservaInterna(r);
      promocionar(s.id);
      return ok({ ok: true, recuperaSesion: aTiempo });
    }
    case "POST /api/lista-espera": {
      const s = sesiones.find((x) => x.id === Number(b.sesionId));
      if (!s) return err(404, "Clase no encontrada.");
      const e = elegibilidad(yo, s);
      if (!e.puedeUnirse) return err(400, mensajeEstado(e.estado));
      const previa = espera.find((x) => x.usuarioId === yo.id && x.sesionId === s.id);
      if (previa) Object.assign(previa, { estado: "ESPERANDO", fecha: new Date().toISOString() });
      else espera.push({ id: nuevoId(), usuarioId: yo.id, sesionId: s.id, fecha: new Date().toISOString(), estado: "ESPERANDO" });
      const pos = espera.filter((x) => x.sesionId === s.id && x.estado === "ESPERANDO").length;
      return ok({ ok: true, posicion: pos });
    }
    case "PATCH /api/lista-espera": {
      const e = espera.find((x) => x.usuarioId === yo.id && x.sesionId === Number(b.sesionId) && x.estado === "ESPERANDO");
      if (e) e.estado = "CANCELADA";
      return ok({ ok: true });
    }
  }

  // ---- Admin ----
  if (!ruta.startsWith("/api/admin")) return err(404, "Ruta no encontrada (demo).");
  if (yo.rol !== "ADMIN") return err(403, "No tienes permiso.");
  const uid = ids[0];
  const usuaria = usuarios.find((x) => x.id === uid && x.rol === "USUARIO" && !x.eliminada);

  switch (k) {
    case "GET /api/admin/usuarios":
      return ok(
        usuarios
          .filter((u) => u.rol === "USUARIO" && !u.eliminada)
          .map((u) => ({ ...verUsuario(u), mensualidadActual: verMensualidad(mensualidadDe(u.id, new Date())), saldoCompensacion: u.saldo }))
          .sort((a, c) => a.nombre.localeCompare(c.nombre)),
      );
    case "GET /api/admin/usuarios/:id": {
      if (!usuaria) return err(404, "Usuaria no encontrada.");
      const anio = Number(q.get("anio")) || anioAct;
      const mes = Number(q.get("mes")) || mesAct;
      return ok({
        usuario: verUsuario(usuaria),
        mensualidades: mensualidades.filter((m) => m.usuarioId === usuaria.id).map(verMensualidad).sort((a, c) => c!.anio * 12 + c!.mes - (a!.anio * 12 + a!.mes)),
        saldoCompensacion: usuaria.saldo,
        sugerenciaCompensacion: sugerencia(usuaria, anio, mes),
      });
    }
    case "PATCH /api/admin/usuarios/:id": {
      if (!usuaria) return err(404, "Usuaria no encontrada.");
      if (typeof b.nombre === "string") usuaria.nombre = b.nombre;
      if (typeof b.email === "string") usuaria.email = b.email.toLowerCase();
      return ok({ ok: true });
    }
    case "DELETE /api/admin/usuarios/:id": {
      if (!usuaria) return err(404, "Usuaria no encontrada.");
      eliminar(usuaria);
      return ok({ ok: true });
    }
    case "POST /api/admin/usuarios/:id/plan": {
      if (!usuaria) return err(404, "Usuaria no encontrada.");
      const anio = Number(b.anio), mes = Number(b.mes), tarifaId = Number(b.tarifaId);
      let m = mensualidades.find((x) => x.usuarioId === usuaria.id && x.anio === anio && x.mes === mes);
      if (m) Object.assign(m, { tarifaId, estado: "ACTIVA", fechaActivacion: new Date().toISOString() });
      else mensualidades.push((m = { id: nuevoId(), usuarioId: usuaria.id, tarifaId, anio, mes, estado: "ACTIVA", fechaActivacion: new Date().toISOString() }));
      historial.push({ id: nuevoId(), usuarioId: usuaria.id, tipo: "ACTIVACION", fecha: new Date().toISOString(), motivo: `${mes}/${anio} · ${tarifas.find((t) => t.id === tarifaId)?.nombre}`, admin: yo.nombre });
      asegurarFijas();
      return ok({ ok: true });
    }
    case "PATCH /api/admin/usuarios/:id/plan/estado": {
      if (!usuaria) return err(404, "Usuaria no encontrada.");
      const m = mensualidades.find((x) => x.usuarioId === usuaria.id && x.anio === Number(b.anio) && x.mes === Number(b.mes));
      if (!m) return err(404, "No hay mensualidad ese mes.");
      if (b.accion === "PAUSAR") {
        m.estado = "PAUSADA";
        m.fechaPausa = new Date().toISOString();
        m.motivoPausa = String(b.motivo ?? "") || null;
        const n = Math.max(0, Number(b.clasesCompensadas) || 0);
        usuaria.saldo += n;
        historial.push({ id: nuevoId(), usuarioId: usuaria.id, tipo: "PAUSA", fecha: new Date().toISOString(), motivo: `${m.motivoPausa ?? "Pausa"} · ${n} clases a compensar`, admin: yo.nombre });
      } else {
        m.estado = "ACTIVA";
        if (b.tarifaId) m.tarifaId = Number(b.tarifaId);
        historial.push({ id: nuevoId(), usuarioId: usuaria.id, tipo: "REACTIVACION", fecha: new Date().toISOString(), motivo: null, admin: yo.nombre });
        asegurarFijas();
      }
      return ok({ ok: true });
    }
    case "GET /api/admin/usuarios/:id/plan/historial":
      return ok(historial.filter((h) => h.usuarioId === uid).sort((a, c) => c.fecha.localeCompare(a.fecha)));
    case "PATCH /api/admin/usuarios/:id/programa": {
      if (!usuaria) return err(404, "Usuaria no encontrada.");
      const antes = programas.find((p) => p.id === usuaria.programaId)?.nombre;
      usuaria.programaId = Number(b.programaId);
      historial.push({ id: nuevoId(), usuarioId: usuaria.id, tipo: "CAMBIO_PROGRAMA", fecha: new Date().toISOString(), motivo: `${antes} → ${programas.find((p) => p.id === usuaria.programaId)?.nombre}${b.motivo ? " · " + b.motivo : ""}`, admin: yo.nombre });
      return ok({ ok: true });
    }
    case "POST /api/admin/usuarios/:id/saldo": {
      if (!usuaria) return err(404, "Usuaria no encontrada.");
      if (!String(b.motivo ?? "").trim()) return err(400, "El motivo es obligatorio.");
      const antes = usuaria.saldo;
      usuaria.saldo = Math.max(0, Number(b.saldo) || 0);
      historial.push({ id: nuevoId(), usuarioId: usuaria.id, tipo: "AJUSTE", fecha: new Date().toISOString(), motivo: `Saldo ${antes} → ${usuaria.saldo} · ${b.motivo}`, admin: yo.nombre });
      return ok({ ok: true });
    }
    case "GET /api/admin/usuarios/:id/fijas":
      return ok(
        fijas.filter((f) => f.usuarioId === uid).map((f) => {
          const p = plantilla.find((x) => x.id === f.plantillaId)!;
          return { id: f.id, plantillaId: p.id, activa: f.activa, diaSemana: p.diaSemana, horaInicio: p.horaInicio, programa: p.programa, profesional: p.profesional };
        }),
      );
    case "POST /api/admin/usuarios/:id/fijas": {
      const previa = fijas.find((f) => f.usuarioId === uid && f.plantillaId === Number(b.plantillaId));
      if (previa) previa.activa = true;
      else fijas.push({ id: nuevoId(), usuarioId: uid, plantillaId: Number(b.plantillaId), activa: true });
      asegurarFijas();
      return ok({ ok: true });
    }
    case "PATCH /api/admin/usuarios/:id/fijas": {
      const f = fijas.find((x) => x.id === Number(b.asignacionId) && x.usuarioId === uid);
      if (f) f.activa = !!b.activa;
      return ok({ ok: true });
    }
    case "GET /api/admin/tarifas":
      return ok(tarifas);
    case "GET /api/admin/calendario-opciones":
      return ok({ programas, profesionales, salas });
    case "GET /api/admin/sesiones": {
      const desde = new Date(q.get("desde") ?? Date.now());
      const hasta = new Date(q.get("hasta") ?? Date.now() + 7 * 24 * HORA);
      asegurarSesiones(desde, hasta);
      return ok(
        sesiones.filter((s) => s.inicio >= desde && s.inicio < hasta).sort((a, c) => +a.inicio - +c.inicio).map(verSesionAdmin),
      );
    }
    case "POST /api/admin/sesiones": {
      const inicio = new Date(String(b.fechaHoraInicio));
      const fin = new Date(inicio.getTime() + (Number(b.duracionMinutos) || 60) * 60000);
      const s: SDemo = { id: nuevoId(), programaId: Number(b.programaId), profesionalId: Number(b.profesionalId), salaId: Number(b.salaId) || 1, inicio, fin, capacidad: Number(b.capacidad) || 8, plantillaId: null, estado: "ACTIVA" };
      const sol = solape(s);
      if (sol) return err(400, sol);
      sesiones.push(s);
      return ok({ ok: true, id: s.id });
    }
    case "GET /api/admin/sesiones/:id": {
      const s = sesiones.find((x) => x.id === ids[0]);
      return s ? ok(verSesionAdmin(s)) : err(404, "Clase no encontrada.");
    }
    case "PATCH /api/admin/sesiones/:id": {
      const s = sesiones.find((x) => x.id === ids[0]);
      if (!s) return err(404, "Clase no encontrada.");
      const nuevo = { ...s };
      if (b.fechaHoraInicio) {
        const dur = s.fin.getTime() - s.inicio.getTime();
        nuevo.inicio = new Date(String(b.fechaHoraInicio));
        nuevo.fin = new Date(nuevo.inicio.getTime() + (Number(b.duracionMinutos) * 60000 || dur));
      }
      if (b.profesionalId) nuevo.profesionalId = Number(b.profesionalId);
      if (b.capacidad) nuevo.capacidad = Number(b.capacidad);
      const sol = solape(nuevo);
      if (sol) return err(400, sol);
      Object.assign(s, nuevo);
      return ok({ ok: true });
    }
    case "DELETE /api/admin/sesiones/:id": {
      const s = sesiones.find((x) => x.id === ids[0]);
      if (!s) return err(404, "Clase no encontrada.");
      s.estado = "CANCELADA";
      reservas.filter((r) => r.sesionId === s.id && r.estado === "CONFIRMADA").forEach((r) => cancelarReservaInterna(r, true));
      espera.filter((e) => e.sesionId === s.id && e.estado === "ESPERANDO").forEach((e) => (e.estado = "CANCELADA"));
      return ok({ ok: true });
    }
    case "GET /api/admin/sesiones/:id/reservas":
      return ok(
        reservas
          .filter((r) => r.sesionId === ids[0] && r.estado !== "CANCELADA_CON_CREDITO")
          .map((r) => {
            const u = usuarios.find((x) => x.id === r.usuarioId) ?? usuarios.find((x) => x.id === r.usuarioId % 1000);
            return { reservaId: r.id, usuarioId: r.usuarioId, nombre: u?.nombre ?? "Clienta", estado: r.estado, origen: r.origen, fija: r.fija };
          }),
      );
    case "POST /api/admin/sesiones/:id/asistencia": {
      const r = reservas.find((x) => x.id === Number(b.reservaId) && x.sesionId === ids[0]);
      if (!r) return err(404, "Reserva no encontrada.");
      r.estado = b.estado === "NO_SHOW" ? "NO_SHOW" : "ASISTIDA";
      return ok({ ok: true });
    }
    case "GET /api/admin/plantilla":
      return ok([...plantilla].sort((a, c) => a.diaSemana - c.diaSemana || a.horaInicio.localeCompare(c.horaInicio)));
    case "POST /api/admin/plantilla": {
      const p = P(nuevoId(), Number(b.diaSemana), String(b.horaInicio), Number(b.programaId), Number(b.profesionalId), Number(b.capacidad) || 8);
      p.duracionMinutos = Number(b.duracionMinutos) || 60;
      plantilla.push(p);
      return ok({ ok: true, id: p.id });
    }
    case "PATCH /api/admin/plantilla/:id": {
      const p = plantilla.find((x) => x.id === ids[0]);
      if (!p) return err(404, "Hueco no encontrado.");
      if (b.diaSemana) p.diaSemana = Number(b.diaSemana);
      if (b.horaInicio) p.horaInicio = String(b.horaInicio);
      if (b.duracionMinutos) p.duracionMinutos = Number(b.duracionMinutos);
      if (b.capacidad) p.capacidad = Number(b.capacidad);
      if (b.programaId) { p.programaId = Number(b.programaId); p.programa = programas[p.programaId - 1].nombre; }
      if (b.profesionalId) { p.profesionalId = Number(b.profesionalId); p.profesional = profesionales[p.profesionalId - 1].nombre; }
      if (typeof b.activa === "boolean") p.activa = b.activa;
      return ok({ ok: true });
    }
    case "DELETE /api/admin/plantilla/:id": {
      const p = plantilla.find((x) => x.id === ids[0]);
      if (p) p.activa = false;
      return ok({ ok: true });
    }
  }
  return err(404, "Ruta no encontrada (demo).");
}

function verSesionAdmin(s: SDemo) {
  const v = verSesion(s);
  return { ...v, estado: s.estado, enEspera: espera.filter((e) => e.sesionId === s.id && e.estado === "ESPERANDO").length };
}

function solape(s: SDemo): string | null {
  const choca = sesiones.find(
    (x) => x.id !== s.id && x.estado === "ACTIVA" && x.inicio < s.fin && s.inicio < x.fin && (x.salaId === s.salaId || x.profesionalId === s.profesionalId),
  );
  return choca ? "Ya hay otra clase a esa hora en la misma sala o con la misma profesional." : null;
}

function sugerencia(u: UDemo, anio: number, mes: number): number {
  const m = mensualidadDe(u.id, new Date(anio, mes - 1, 1));
  if (!m) return 0;
  const cuota = tarifas.find((t) => t.id === m.tarifaId)!.sesionesSemana;
  const ahora = new Date();
  const restanteSemana = Math.max(0, cuota - usadasSemana(u.id, ahora));
  const finMes = new Date(anio, mes, 1);
  let semanas = 0;
  for (let l = lunes(ahora); ; ) {
    l = new Date(l.getFullYear(), l.getMonth(), l.getDate() + 7);
    if (l >= finMes) break;
    semanas++;
  }
  return restanteSemana + cuota * semanas;
}

function eliminar(u: UDemo) {
  const ahora = new Date();
  reservas.filter((r) => r.usuarioId === u.id && r.estado === "CONFIRMADA").forEach((r) => {
    const s = sesiones.find((x) => x.id === r.sesionId)!;
    if (s.inicio > ahora) {
      r.estado = "CANCELADA_CON_CREDITO";
      promocionar(s.id);
    }
  });
  espera.filter((e) => e.usuarioId === u.id).forEach((e) => (e.estado = "CANCELADA"));
  fijas.filter((f) => f.usuarioId === u.id).forEach((f) => (f.activa = false));
  u.nombre = "Usuaria eliminada";
  u.email = `eliminada-${u.id}@anonimizada.invalid`;
  u.saldo = 0;
  u.eliminada = true;
  for (const [t, id] of tokens) if (id === u.id) tokens.delete(t);
  // (en demo, el token "demo-<id>" deja de valer porque la usuaria queda marcada como eliminada)
}

function mensajeEstado(e: EstadoSesion): string {
  switch (e) {
    case "NO_ABIERTA": return "Esta clase todavía no está abierta para reservar.";
    case "SIN_MENSUALIDAD": return "No tienes activado el plan del mes de esta clase.";
    case "MENSUALIDAD_NO_ACTIVA": return "Tu plan de ese mes no está activo.";
    case "LIMITE_SEMANAL": return "Ya has usado tus clases de esta semana.";
    case "COMPLETA": return "La clase está completa.";
    case "LISTA_ESPERA_CERRADA": return "La lista de espera se cierra 1 hora antes de la clase.";
    case "RESERVADA": return "Ya tienes plaza en esta clase.";
    case "EN_LISTA_ESPERA": return "Ya estás en la lista de espera.";
    default: return "No se puede reservar esta clase.";
  }
}
