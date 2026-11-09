import { View } from "react-native";

import { Cabecera, CajaMensaje, Cargando, Pantalla, T, Tarjeta } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import { euros } from "@/lib/fechas";
import type { Info } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function Tarifas() {
  const { datos, cargando } = useDatos(() => api.get<Info>("/api/info"));
  return (
    <Pantalla>
      <Cabecera titulo="Tarifas" subtitulo="Mensualidad por días a la semana" volver />
      {cargando && !datos ? <Cargando /> : null}
      {datos?.tarifas.map((t) => (
        <Tarjeta key={t.id}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T variante="fuerte">{t.sesionesSemana === 1 ? "1 día por semana" : `${t.sesionesSemana} días por semana`}</T>
              <T variante="tenue">{t.sesionesSemana === 1 ? "Ideal si puedes venir una vez por semana" : "Perfecto para mantener la constancia"}</T>
            </View>
            <T variante="grande" estilo={{ color: colores.burdeos }}>{euros(t.precioCentimos)}<T variante="tenue">/mes</T></T>
          </View>
        </Tarjeta>
      ))}
      <View style={{ height: espacio.s }} />
      <CajaMensaje texto="Se paga en la clínica. Cuando pagues, la profesora activa tu plan del mes y ya puedes reservar." />
      <T variante="seccion">Cómo funciona</T>
      <Tarjeta>
        {[
          "La mensualidad te da derecho a venir 1 o 2 días cada semana. Cuesta lo mismo si el mes tiene 4 o 5 semanas.",
          "La semana va de lunes a domingo. Lo que no uses una semana no se acumula para la siguiente.",
          "Para reservar una clase, tiene que estar activado el plan del mes de esa clase.",
          "Puedes reservar desde 3 días antes de la clase (a las 00:00).",
          "Si cancelas con 1 hora o más de antelación, recuperas la sesión para otro día de esa semana.",
          "Si la clase está completa, apúntate a la lista de espera: si se libera una plaza te la damos y te avisamos.",
        ].map((t, i) => (
          <View key={i} style={{ flexDirection: "row", gap: espacio.s, marginBottom: espacio.s }}>
            <T estilo={{ color: colores.rosa }}>•</T>
            <T estilo={{ flex: 1 }}>{t}</T>
          </View>
        ))}
      </Tarjeta>
    </Pantalla>
  );
}
