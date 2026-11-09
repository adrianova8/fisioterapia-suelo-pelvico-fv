import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { colores, espacio } from "@/constants/theme";
import { mesAnio } from "@/lib/fechas";
import type { Me } from "@/lib/tipos";

import { Anillo } from "./usuaria-ui";
import { CajaMensaje, T, Tarjeta } from "./ui";

export function TarjetaPlan({ me, titulo = "Tu plan actual" }: { me: Me; titulo?: string }) {
  const router = useRouter();
  const m = me.mensualidad;
  const hoy = new Date();
  const restantes = Math.max(0, me.usoSemanal.limite - me.usoSemanal.usadas);

  return (
    <>
      <Tarjeta>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variante="fuerte" estilo={{ fontSize: 15 }}>{titulo}</T>
            {m ? (
              <>
                <T variante="grande" estilo={{ fontSize: 19, marginTop: 4 }}>
                  {m.tarifa.sesionesSemana === 1 ? "1 día por semana" : `${m.tarifa.sesionesSemana} días por semana`}
                </T>
                <T variante="tenue">{mesAnio(m.anio, m.mes).toUpperCase()}</T>
                {m.estado === "ACTIVA" ? (
                  <Text style={{ color: colores.verde, fontSize: 14, marginTop: espacio.s }}>
                    <Text style={{ fontWeight: "700" }}>{restantes}</Text> {restantes === 1 ? "clase disponible" : "clases disponibles"} esta semana
                  </Text>
                ) : (
                  <Text style={{ color: colores.ambar, fontSize: 14, marginTop: espacio.s, fontWeight: "600" }}>
                    {m.estado === "PAUSADA" ? "Plan en pausa" : "Plan finalizado"}
                  </Text>
                )}
              </>
            ) : (
              <>
                <T variante="grande" estilo={{ fontSize: 19, marginTop: 4 }}>Plan no activado</T>
                <T variante="tenue">{mesAnio(hoy.getFullYear(), hoy.getMonth() + 1).toUpperCase()}</T>
                <T variante="tenue" estilo={{ marginTop: espacio.s }}>
                  Paga en la clínica y la profesora activará tu plan.
                </T>
              </>
            )}
            <Pressable onPress={() => router.push("/tarifas")} hitSlop={8} style={{ marginTop: espacio.s }}>
              <Text style={{ color: colores.burdeos, fontWeight: "600", fontSize: 14 }}>Ver tarifas →</Text>
            </Pressable>
          </View>
          {m?.estado === "ACTIVA" ? <Anillo usadas={me.usoSemanal.usadas} limite={me.usoSemanal.limite} /> : null}
        </View>
      </Tarjeta>
      {me.saldoCompensacion > 0 ? (
        <CajaMensaje
          tipo="ok"
          icono="corazon"
          texto={`Te debemos ${me.saldoCompensacion} ${me.saldoCompensacion === 1 ? "clase" : "clases"}. Puedes usarlas en cualquier clase de tu programa, sin gastar las de la semana.`}
        />
      ) : null}
    </>
  );
}
