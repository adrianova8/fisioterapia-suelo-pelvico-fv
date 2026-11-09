import { Cabecera, CajaMensaje, Cargando, Pantalla, T, Tarjeta } from "@/components/ui";
import { espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import type { Me } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";
import { View } from "react-native";

export default function MisDatos() {
  const { datos: me, cargando } = useDatos(() => api.get<Me>("/api/me"));
  return (
    <Pantalla>
      <Cabecera titulo="Mis datos" volver />
      {cargando && !me ? <Cargando /> : null}
      {me ? (
        <>
          <Tarjeta>
            <Dato etiqueta="Nombre" valor={me.usuario.nombre} />
            <Dato etiqueta="Email" valor={me.usuario.email} />
            <Dato etiqueta="Programa" valor={me.usuario.programa?.nombre ?? "Sin programa"} ultimo />
          </Tarjeta>
          <CajaMensaje texto="Si necesitas cambiar algún dato o tu programa (por ejemplo, al pasar de Embarazo a Postparto), díselo a la profesora y lo cambiará por ti." />
        </>
      ) : null}
    </Pantalla>
  );
}

function Dato({ etiqueta, valor, ultimo = false }: { etiqueta: string; valor: string; ultimo?: boolean }) {
  return (
    <View style={{ marginBottom: ultimo ? 0 : espacio.m }}>
      <T variante="tenue">{etiqueta}</T>
      <T variante="fuerte" estilo={{ fontSize: 16 }}>{valor}</T>
    </View>
  );
}
