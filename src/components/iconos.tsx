// Iconos de línea sencillos (SVG), estilo del MVP.
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colores } from "@/constants/theme";

export type NombreIcono =
  | "inicio" | "clases" | "reservas" | "perfil" | "chevron" | "volver" | "reloj" | "persona"
  | "ubicacion" | "plazas" | "check" | "compartir" | "corazon" | "calendario" | "info" | "salir"
  | "equipo" | "pregunta" | "documento" | "candado" | "euro" | "mas" | "cerrar" | "camara"
  | "panel" | "usuarias" | "horario" | "foto" | "alerta" | "lista";

export function Icono({ nombre, tam = 22, color = colores.textoSuave, grosor = 1.8 }: { nombre: NombreIcono; tam?: number; color?: string; grosor?: number }) {
  const p = { stroke: color, strokeWidth: grosor, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      {(() => {
        switch (nombre) {
          case "inicio":
            return <><Path d="M3 10.5 12 3l9 7.5" {...p} /><Path d="M5 9.5V20h5v-6h4v6h5V9.5" {...p} /></>;
          case "clases":
            return <><Path d="M12 20c-4 0-7-3-8-7 3 0 6 1.5 8 4 2-2.5 5-4 8-4-1 4-4 7-8 7Z" {...p} /><Path d="M12 17c-1.6-2.4-2-5.3 0-9 2 3.7 1.6 6.6 0 9Z" {...p} /></>;
          case "reservas":
          case "calendario":
            return <><Rect x="3.5" y="5" width="17" height="15" rx="2.5" {...p} /><Path d="M3.5 10h17M8 3v4M16 3v4" {...p} />{nombre === "reservas" ? <Path d="m9 15 2 2 4-4" {...p} /> : null}</>;
          case "perfil":
          case "persona":
            return <><Circle cx="12" cy="8" r="4" {...p} /><Path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" {...p} /></>;
          case "usuarias":
          case "equipo":
            return <><Circle cx="9" cy="8" r="3.5" {...p} /><Path d="M2.5 20c.9-3.4 3.4-5.2 6.5-5.2s5.6 1.8 6.5 5.2" {...p} /><Path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.6c1.8.7 3 2.5 3.5 5.4" {...p} /></>;
          case "chevron":
            return <Path d="m9 6 6 6-6 6" {...p} />;
          case "volver":
            return <Path d="M19 12H5m6-6-6 6 6 6" {...p} />;
          case "reloj":
          case "horario":
            return <><Circle cx="12" cy="12" r="8.5" {...p} /><Path d="M12 7.5V12l3 2" {...p} /></>;
          case "ubicacion":
            return <><Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" {...p} /><Circle cx="12" cy="10" r="2.3" {...p} /></>;
          case "plazas":
            return <><Circle cx="9" cy="9" r="3" {...p} /><Circle cx="16.5" cy="10" r="2.3" {...p} /><Path d="M3.5 19c.7-3 2.8-4.6 5.5-4.6s4.8 1.6 5.5 4.6M15 14.6c2.4-.3 4.6 1 5.3 4.4" {...p} /></>;
          case "check":
            return <Path d="m5 12.5 4.5 4.5L19 7.5" {...p} />;
          case "compartir":
            return <><Path d="M12 15V3.5m-4 4 4-4 4 4" {...p} /><Path d="M5 12v7.5h14V12" {...p} /></>;
          case "corazon":
            return <Path d="M12 20s-7.5-4.5-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.5 12 20 12 20Z" fill={color} stroke={color} strokeWidth={1} />;
          case "info":
            return <><Circle cx="12" cy="12" r="8.5" {...p} /><Path d="M12 11v5.5M12 7.8v.2" {...p} /></>;
          case "alerta":
            return <><Path d="M12 3.5 21.5 20h-19L12 3.5Z" {...p} /><Path d="M12 10v4.5M12 17.2v.2" {...p} /></>;
          case "salir":
            return <><Path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" {...p} /><Path d="M10 8l-4 4 4 4M6 12h10" {...p} /></>;
          case "pregunta":
            return <><Circle cx="12" cy="12" r="8.5" {...p} /><Path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.2" {...p} /></>;
          case "documento":
          case "lista":
            return <><Path d="M7 3h7l4 4v14H7z" {...p} /><Path d="M14 3v4h4M9.5 12h6M9.5 15.5h6" {...p} /></>;
          case "candado":
            return <><Rect x="5" y="10.5" width="14" height="10" rx="2" {...p} /><Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...p} /></>;
          case "euro":
            return <><Path d="M17 6.5a6.5 6.5 0 1 0 0 11" {...p} /><Path d="M4.5 10.5h8M4.5 13.5h8" {...p} /></>;
          case "mas":
            return <Path d="M12 5v14M5 12h14" {...p} />;
          case "cerrar":
            return <Path d="M6 6l12 12M18 6 6 18" {...p} />;
          case "camara":
          case "foto":
            return <><Path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" {...p} /><Circle cx="12" cy="13" r="3.5" {...p} /></>;
          case "panel":
            return <><Rect x="3.5" y="3.5" width="7" height="7" rx="1.5" {...p} /><Rect x="13.5" y="3.5" width="7" height="7" rx="1.5" {...p} /><Rect x="3.5" y="13.5" width="7" height="7" rx="1.5" {...p} /><Rect x="13.5" y="13.5" width="7" height="7" rx="1.5" {...p} /></>;
        }
      })()}
    </Svg>
  );
}
