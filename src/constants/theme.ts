// Paleta y medidas comunes: estética cálida del MVP
// (fondo blanco/rosa suave, acentos burdeos y rosa, tarjetas redondeadas).

export const colores = {
  fondo: "#FBF4F1",
  fondoTarjeta: "#FFFFFF",
  rosa: "#C97878",
  rosaClaro: "#F6E3E0",
  rosaSuave: "#FCEFEC",
  burdeos: "#8B1553",
  morado: "#6B4E8C",
  verde: "#4F9C7A",
  verdeClaro: "#E5F3EC",
  ambar: "#B7791F",
  ambarClaro: "#FDF3E1",
  rojo: "#B42318",
  rojoClaro: "#FDECEA",
  texto: "#2E2326",
  textoSuave: "#7A6A6E",
  textoTenue: "#A8999C",
  borde: "#EEDFDB",
  gris: "#E9E3E1",
  blanco: "#FFFFFF",
};

export const radios = { s: 10, m: 16, l: 22, pastilla: 999 };

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export const sombra = {
  shadowColor: "#8B1553",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

// Colores e iconos estándar de cada programa (si no hay imagen subida).
export const estiloPrograma: Record<string, { color: string; icono: string }> = {
  Embarazo: { color: "#F3D9D6", icono: "🤰" },
  Postparto: { color: "#E6DDF0", icono: "🤱" },
  "+50": { color: "#DCEBE3", icono: "🧘‍♀️" },
};

export function estiloDePrograma(nombre?: string | null) {
  return (nombre && estiloPrograma[nombre]) || { color: colores.rosaClaro, icono: "🌸" };
}
