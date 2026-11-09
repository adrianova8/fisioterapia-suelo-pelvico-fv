// Tipos de las respuestas de la API (proyecto backend `fv`).
// Si el backend devuelve otra forma, se ajusta aquí y en api.ts.

export type Rol = "USUARIO" | "ADMIN";

export interface Programa {
  id: number;
  nombre: string;
  imagen?: string | null;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  programa: Programa | null;
}

export interface Tarifa {
  id: number;
  nombre: string;
  sesionesSemana: number;
  precioCentimos: number;
  activa?: boolean;
}

export type EstadoMensualidad = "ACTIVA" | "PAUSADA" | "FINALIZADA";

export interface Mensualidad {
  id: number;
  anio: number;
  mes: number; // 1-12
  estado: EstadoMensualidad;
  tarifa: Tarifa;
  fechaActivacion?: string;
  fechaPausa?: string | null;
  motivoPausa?: string | null;
}

export interface Me {
  usuario: Usuario;
  mensualidad: Mensualidad | null; // la del mes actual, en cualquier estado
  usoSemanal: { usadas: number; limite: number };
  saldoCompensacion: number;
}

export type EstadoSesion =
  | "DISPONIBLE"
  | "FINALIZADA"
  | "RESERVADA"
  | "EN_LISTA_ESPERA"
  | "NO_ABIERTA"
  | "SIN_MENSUALIDAD"
  | "MENSUALIDAD_NO_ACTIVA"
  | "LIMITE_SEMANAL"
  | "LISTA_ESPERA_CERRADA"
  | "COMPLETA"
  | "CANCELADA";

export interface Sesion {
  id: number;
  programaId: number;
  programa: string;
  programaImagen?: string | null;
  profesionalId: number;
  profesional: string;
  profesionalFoto?: string | null;
  sala: string;
  fechaHoraInicio: string; // ISO UTC
  fechaHoraFin: string;
  capacidad: number;
  ocupadas: number;
  estado: EstadoSesion;
  puedeReservar: boolean;
  puedeUnirseListaEspera: boolean;
  aperturaReserva?: string | null; // ISO, cuándo abre
  miReservaId?: number | null;
  miReservaFija?: boolean;
  mensualidad?: Mensualidad | null; // la del mes de la sesión
  descripcion?: string | null;
}

export interface RespuestaSesiones {
  sesiones: Sesion[];
  mensualidades: { anio: number; mes: number; mensualidad: Mensualidad | null }[];
}

export type EstadoReserva =
  | "CONFIRMADA"
  | "CANCELADA_CON_CREDITO"
  | "CANCELADA_SIN_CREDITO"
  | "ASISTIDA"
  | "NO_SHOW";

export interface Reserva {
  id: number;
  estado: EstadoReserva;
  origen: "SEMANAL" | "COMPENSACION";
  fija: boolean;
  fechaReserva: string;
  fechaCancelacion?: string | null;
  sesion: {
    id: number;
    programa: string;
    programaImagen?: string | null;
    profesional: string;
    profesionalFoto?: string | null;
    sala: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    estado: "ACTIVA" | "CANCELADA";
  };
}

export interface Profesional {
  id: number;
  nombre: string;
  foto?: string | null;
  activo?: boolean;
}

export interface Sala {
  id: number;
  nombre: string;
}

export interface Info {
  tarifas: Tarifa[];
  profesionales: Profesional[];
  programas: Programa[];
}

// ---------- Admin ----------

export interface UsuariaListado {
  id: number;
  nombre: string;
  email: string;
  programa: Programa | null;
  mensualidadActual: Mensualidad | null;
  saldoCompensacion: number;
}

export interface AsignacionFija {
  id: number;
  plantillaId: number;
  activa: boolean;
  diaSemana: number;
  horaInicio: string;
  programa: string;
  profesional: string;
}

export interface FichaUsuaria {
  usuario: Usuario;
  mensualidades: Mensualidad[];
  saldoCompensacion: number;
  sugerenciaCompensacion: number;
}

export interface MovimientoHistorial {
  id: number;
  tipo: "ACTIVACION" | "PAUSA" | "REACTIVACION" | "CAMBIO_PROGRAMA" | "AJUSTE";
  fecha: string;
  motivo?: string | null;
  admin?: string | null;
  datosAnteriores?: string | null;
  datosNuevos?: string | null;
}

export interface PlantillaHueco {
  id: number;
  diaSemana: number; // 1 = lunes … 7 = domingo
  horaInicio: string; // HH:MM
  duracionMinutos: number;
  programaId: number;
  programa: string;
  profesionalId: number;
  profesional: string;
  salaId: number;
  sala: string;
  capacidad: number;
  activa: boolean;
}

export interface OpcionesCalendario {
  programas: Programa[];
  profesionales: Profesional[];
  salas: Sala[];
}

export interface AsistenteSesion {
  reservaId: number;
  usuarioId: number;
  nombre: string;
  estado: EstadoReserva;
  origen: "SEMANAL" | "COMPENSACION";
  fija: boolean;
}

export interface SesionAdmin extends Omit<Sesion, "estado" | "puedeReservar" | "puedeUnirseListaEspera"> {
  estado: "ACTIVA" | "CANCELADA";
  enEspera: number;
}
