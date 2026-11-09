// Pruebas de las reglas de negocio contra la API real (RELEVO §13).
// Necesita la base (`npm run db`) y el servidor (`npm run dev`) arrancados.
//   npm test
// Crea usuarias y clases de prueba y las borra al terminar.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import postgres from "postgres";

const API = process.env.API_URL ?? "http://localhost:3000";
const sql = postgres(process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:55432/app", { max: 2, onnotice: () => {} });
const HORA = 3600_000;
const sufijo = randomBytes(3).toString("hex");
const creadas = { usuarios: [], sesiones: [] };
let admin;

async function api(metodo, ruta, { token, cuerpo } = {}) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const datos = await r.json().catch(() => null);
  return { status: r.status, datos };
}

async function nuevaUsuaria(nombre, { programaId = 1 } = {}) {
  const email = `test-${sufijo}-${nombre.toLowerCase()}@prueba.invalid`;
  const r = await api("POST", "/api/auth/registro", { cuerpo: { nombre, email, password: "Password123", programaId } });
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  creadas.usuarios.push(r.datos.usuario.id);
  return { id: r.datos.usuario.id, token: r.datos.token, email };
}

async function activarPlan(u, tarifaId, fecha = new Date()) {
  const r = await api("POST", `/api/admin/usuarios/${u.id}/plan`, {
    token: admin, cuerpo: { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1, tarifaId },
  });
  assert.equal(r.status, 200, JSON.stringify(r.datos));
}

/** Clase suelta en el primer hueco libre (sin solapes) a partir de `desde`. */
async function nuevaClase(desde, { capacidad = 8, programaId = 1, duracion = 30 } = {}) {
  for (let i = 0; i < 40; i++) {
    const inicio = new Date(desde.getTime() + i * 35 * 60_000);
    const r = await api("POST", "/api/admin/sesiones", {
      token: admin,
      cuerpo: { fechaHoraInicio: inicio.toISOString(), duracionMinutos: duracion, programaId, profesionalId: 1, salaId: 1, capacidad },
    });
    if (r.status === 200) {
      creadas.sesiones.push(r.datos.id);
      return r.datos.id;
    }
    assert.match(r.datos.error, /otra clase/);
  }
  throw new Error("No hay hueco libre para la clase de prueba");
}

const manana = (h) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, h, 0);
};
const estadoReserva = async (usuarioId, sesionId) =>
  (await sql`SELECT estado, origen FROM reservas WHERE usuario_id = ${usuarioId} AND sesion_id = ${sesionId}`)[0];

before(async () => {
  const r = await api("POST", "/api/auth/login", { cuerpo: { email: "admin@test.com", password: "Admin12345" } });
  assert.equal(r.status, 200, "¿Está el servidor arrancado y la base con datos de prueba?");
  admin = r.datos.token;
  // Materializa el horario base de los próximos días para que los solapes se detecten.
  await api("GET", `/api/admin/sesiones?desde=${new Date().toISOString()}&hasta=${new Date(Date.now() + 4 * 24 * HORA).toISOString()}`, { token: admin });
});

after(async () => {
  const u = creadas.usuarios;
  const s = creadas.sesiones;
  if (u.length || s.length) {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM lista_espera WHERE usuario_id = ANY(${u}) OR sesion_id = ANY(${s})`;
      await tx`DELETE FROM reservas WHERE usuario_id = ANY(${u}) OR sesion_id = ANY(${s})`;
      await tx`DELETE FROM historial_suscripciones WHERE usuario_id = ANY(${u})`;
      await tx`DELETE FROM suscripciones_mensuales WHERE usuario_id = ANY(${u})`;
      await tx`DELETE FROM asignaciones_fijas WHERE usuario_id = ANY(${u})`;
      for (const t of ["push_tokens", "tokens_recuperacion", "sesiones_auth", "credenciales"]) {
        await tx.unsafe(`DELETE FROM ${t} WHERE usuario_id = ANY($1)`, [u]);
      }
      await tx`DELETE FROM usuarios WHERE id = ANY(${u})`;
      await tx`DELETE FROM sesiones WHERE id = ANY(${s})`;
      await tx`DELETE FROM intentos_login WHERE email LIKE ${`test-${sufijo}-%`}`;
    });
  }
  await sql`UPDATE sesiones SET recordatorio_enviado = FALSE WHERE fecha_hora_inicio > now()`;
  await sql.end();
});

describe("Cuota semanal y cancelación", () => {
  test("Tarifa 1/semana: 2.ª reserva rechazada; cancelar ≥1 h recupera la sesión", async () => {
    const u = await nuevaUsuaria("Uno");
    await activarPlan(u, 1);
    const a = await nuevaClase(manana(6));
    const b = await nuevaClase(manana(6));
    assert.equal((await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: a } })).status, 200);
    const segunda = await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: b } });
    assert.equal(segunda.status, 400);
    assert.match(segunda.datos.error, /clases de esta semana/);
    const reservaA = (await api("GET", "/api/reservas", { token: u.token })).datos.find((r) => r.sesion.id === a);
    const c = await api("PATCH", "/api/reservas", { token: u.token, cuerpo: { reservaId: reservaA.id } });
    assert.equal(c.datos.recuperaSesion, true);
    assert.equal((await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: b } })).status, 200);
  });

  test("Tarifa 2/semana: 1.ª y 2.ª OK, 3.ª rechazada", async () => {
    const u = await nuevaUsuaria("Dos");
    await activarPlan(u, 2);
    const ids = [await nuevaClase(manana(6)), await nuevaClase(manana(6)), await nuevaClase(manana(6))];
    assert.equal((await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: ids[0] } })).status, 200);
    assert.equal((await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: ids[1] } })).status, 200);
    assert.equal((await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: ids[2] } })).status, 400);
  });

  test("Cancelar con menos de 1 h: la pierde (no recupera)", async () => {
    const u = await nuevaUsuaria("Tarde");
    await activarPlan(u, 1);
    const s = await nuevaClase(new Date(Date.now() + 20 * 60_000));
    const r = await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: s } });
    const c = await api("PATCH", "/api/reservas", { token: u.token, cuerpo: { reservaId: r.datos.reservaId } });
    assert.equal(c.datos.recuperaSesion, false);
    assert.equal((await estadoReserva(u.id, s)).estado, "CANCELADA_SIN_CREDITO");
    const me = await api("GET", "/api/me", { token: u.token });
    assert.equal(me.datos.usoSemanal.usadas, 1, "la cancelación tardía consume la cuota");
  });
});

describe("Mensualidad", () => {
  test("Sin plan del mes de la clase no se puede reservar", async () => {
    const u = await nuevaUsuaria("Sinplan");
    const s = await nuevaClase(manana(6));
    const r = await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: s } });
    assert.equal(r.status, 400);
    assert.match(r.datos.error, /plan del mes/);
  });

  test("Pausa: reserva rechazada; reactivar: OK; historial conserva ambas", async () => {
    const u = await nuevaUsuaria("Pausa");
    await activarPlan(u, 1);
    const s = await nuevaClase(manana(6));
    const hoy = new Date();
    const mes = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
    await api("PATCH", `/api/admin/usuarios/${u.id}/plan/estado`, { token: admin, cuerpo: { ...mes, accion: "PAUSAR", motivo: "Parto", clasesCompensadas: 0 } });
    // Si mañana es de otro mes, la clase depende del plan de ese mes: solo comprobamos cuando coincide.
    if (manana(6).getMonth() === hoy.getMonth()) {
      assert.equal((await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: s } })).status, 400);
    }
    await api("PATCH", `/api/admin/usuarios/${u.id}/plan/estado`, { token: admin, cuerpo: { ...mes, accion: "REACTIVAR" } });
    if (manana(6).getMonth() === hoy.getMonth()) {
      assert.equal((await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: s } })).status, 200);
    }
    const h = await api("GET", `/api/admin/usuarios/${u.id}/plan/historial`, { token: admin });
    const tipos = h.datos.map((x) => x.tipo);
    assert.ok(tipos.includes("PAUSA") && tipos.includes("REACTIVACION") && tipos.includes("ACTIVACION"));
  });
});

describe("Saldo de compensación", () => {
  test("Sin plan pero con saldo: reserva COMPENSACION (saldo −1); cancelar a tiempo lo devuelve", async () => {
    const u = await nuevaUsuaria("Saldo");
    await api("POST", `/api/admin/usuarios/${u.id}/saldo`, { token: admin, cuerpo: { saldo: 1, motivo: "Prueba" } });
    const s = await nuevaClase(manana(6));
    const r = await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: s } });
    assert.equal(r.status, 200);
    assert.equal(r.datos.origen, "COMPENSACION");
    assert.equal((await api("GET", "/api/me", { token: u.token })).datos.saldoCompensacion, 0);
    await api("PATCH", "/api/reservas", { token: u.token, cuerpo: { reservaId: r.datos.reservaId } });
    assert.equal((await api("GET", "/api/me", { token: u.token })).datos.saldoCompensacion, 1);
  });

  test("Ajuste sin motivo: rechazado", async () => {
    const u = await nuevaUsuaria("Ajuste");
    const r = await api("POST", `/api/admin/usuarios/${u.id}/saldo`, { token: admin, cuerpo: { saldo: 2, motivo: "" } });
    assert.equal(r.status, 400);
  });
});

describe("Lista de espera y cancelación por el centro", () => {
  test("Clase de 1 plaza: A reserva, B en lista, A cancela → B pasa a CONFIRMADA", async () => {
    const a = await nuevaUsuaria("Ana");
    const b = await nuevaUsuaria("Bea");
    await activarPlan(a, 2);
    await activarPlan(b, 2);
    const s = await nuevaClase(manana(6), { capacidad: 1 });
    const ra = await api("POST", "/api/reservas", { token: a.token, cuerpo: { sesionId: s } });
    assert.equal(ra.status, 200);
    const lleno = await api("POST", "/api/reservas", { token: b.token, cuerpo: { sesionId: s } });
    assert.equal(lleno.status, 400);
    const espera = await api("POST", "/api/lista-espera", { token: b.token, cuerpo: { sesionId: s } });
    assert.equal(espera.datos.posicion, 1);
    await api("PATCH", "/api/reservas", { token: a.token, cuerpo: { reservaId: ra.datos.reservaId } });
    assert.equal((await estadoReserva(b.id, s)).estado, "CONFIRMADA");
  });

  test("El centro cancela: reservas liberadas con la sesión recuperada", async () => {
    const u = await nuevaUsuaria("Centro");
    await activarPlan(u, 1);
    const s = await nuevaClase(manana(6));
    await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: s } });
    assert.equal((await api("DELETE", `/api/admin/sesiones/${s}`, { token: admin })).status, 200);
    assert.equal((await estadoReserva(u.id, s)).estado, "CANCELADA_CON_CREDITO");
    const v = await api("GET", `/api/sesiones/${s}`, { token: u.token });
    assert.equal(v.datos.estado, "CANCELADA");
  });

  test("Solapes: dos clases a la vez en la misma sala → rechazo", async () => {
    const s = await nuevaClase(manana(6));
    const [fila] = await sql`SELECT fecha_hora_inicio FROM sesiones WHERE id = ${s}`;
    const r = await api("POST", "/api/admin/sesiones", {
      token: admin,
      cuerpo: { fechaHoraInicio: fila.fecha_hora_inicio.toISOString(), duracionMinutos: 30, programaId: 2, profesionalId: 2, salaId: 1, capacidad: 8 },
    });
    assert.equal(r.status, 400);
  });
});

describe("Clases fijas", () => {
  test("Con plan activo se reservan solas; liberar ≥1 h recupera la cuota", async () => {
    const u = await nuevaUsuaria("Fija");
    await activarPlan(u, 2);
    const proximoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    await activarPlan(u, 2, proximoMes);
    const [hueco] = await sql`SELECT id FROM plantilla_horario WHERE activa AND programa_id = 1 ORDER BY id LIMIT 1`;
    assert.equal((await api("POST", `/api/admin/usuarios/${u.id}/fijas`, { token: admin, cuerpo: { plantillaId: hueco.id } })).status, 200);
    const reservas = (await api("GET", "/api/reservas", { token: u.token })).datos;
    const fija = reservas.find((r) => r.fija && r.estado === "CONFIRMADA");
    assert.ok(fija, "debería tener al menos una clase fija reservada");
    const c = await api("PATCH", "/api/reservas", { token: u.token, cuerpo: { reservaId: fija.id } });
    assert.equal(c.datos.recuperaSesion, true);
    // Liberada: no se vuelve a reservar sola.
    await api("GET", `/api/sesiones?desde=${new Date().toISOString()}`, { token: u.token });
    assert.equal((await estadoReserva(u.id, fija.sesion.id)).estado, "CANCELADA_CON_CREDITO");
  });
});

describe("Cuentas y seguridad", () => {
  test("Una usuaria no puede entrar en administración (403)", async () => {
    const u = await nuevaUsuaria("Curiosa");
    assert.equal((await api("GET", "/api/admin/usuarios", { token: u.token })).status, 403);
  });

  test("5 fallos de login → el 6.º da 429 aunque la contraseña sea buena", async () => {
    const u = await nuevaUsuaria("Bloqueo");
    for (let i = 0; i < 5; i++) {
      assert.equal((await api("POST", "/api/auth/login", { cuerpo: { email: u.email, password: "mala" } })).status, 401);
    }
    assert.equal((await api("POST", "/api/auth/login", { cuerpo: { email: u.email, password: "Password123" } })).status, 429);
  });

  test("Recuperar contraseña: la nueva funciona, la vieja no, el enlace no se reutiliza", async () => {
    const u = await nuevaUsuaria("Olvido");
    const r = await api("POST", "/api/auth/recuperar", { cuerpo: { email: u.email } });
    const token = new URL(r.datos.enlaceDev).searchParams.get("token");
    assert.equal((await api("POST", "/api/auth/restablecer", { cuerpo: { token, password: "Nueva12345" } })).status, 200);
    assert.equal((await api("POST", "/api/auth/restablecer", { cuerpo: { token, password: "Otra12345" } })).status, 400);
    assert.equal((await api("POST", "/api/auth/login", { cuerpo: { email: u.email, password: "Password123" } })).status, 401);
    assert.equal((await api("POST", "/api/auth/login", { cuerpo: { email: u.email, password: "Nueva12345" } })).status, 200);
    assert.equal((await api("GET", "/api/me", { token: u.token })).status, 401, "las sesiones anteriores se cierran");
  });

  test("Eliminar cuenta: anonimizada, su token deja de valer y su plaza pasa a la lista", async () => {
    const a = await nuevaUsuaria("Borrar");
    const b = await nuevaUsuaria("Espera");
    await activarPlan(a, 1);
    await activarPlan(b, 1);
    const s = await nuevaClase(manana(6), { capacidad: 1 });
    await api("POST", "/api/reservas", { token: a.token, cuerpo: { sesionId: s } });
    await api("POST", "/api/lista-espera", { token: b.token, cuerpo: { sesionId: s } });
    assert.equal((await api("DELETE", "/api/me", { token: a.token, cuerpo: { confirmar: true } })).status, 200);
    assert.equal((await api("GET", "/api/me", { token: a.token })).status, 401);
    const [fila] = await sql`SELECT nombre, email FROM usuarios WHERE id = ${a.id}`;
    assert.equal(fila.nombre, "Usuaria eliminada");
    assert.equal((await estadoReserva(b.id, s)).estado, "CONFIRMADA");
  });
});

describe("Recordatorios", () => {
  test("Avisa de las clases de mañana una sola vez", async () => {
    const u = await nuevaUsuaria("Recuerda");
    await activarPlan(u, 1, manana(6));
    const s = await nuevaClase(manana(6));
    await api("POST", "/api/reservas", { token: u.token, cuerpo: { sesionId: s } });
    const secreto = process.env.CRON_SECRET;
    assert.equal((await fetch(`${API}/api/cron/recordatorios`)).status, 401, "sin clave no se puede lanzar");
    const r1 = await fetch(`${API}/api/cron/recordatorios`, { headers: { Authorization: `Bearer ${secreto}` } }).then((r) => r.json());
    assert.ok(r1.personas >= 1);
    const [fila] = await sql`SELECT recordatorio_enviado FROM sesiones WHERE id = ${s}`;
    assert.equal(fila.recordatorio_enviado, true);
    const r2 = await fetch(`${API}/api/cron/recordatorios`, { headers: { Authorization: `Bearer ${secreto}` } }).then((r) => r.json());
    assert.equal(r2.clases, 0);
  });
});
