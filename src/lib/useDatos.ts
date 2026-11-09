// Carga datos de la API y los recarga al volver a la pantalla.
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { mensajeError } from "./api";

export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const vivo = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ejecutar = useCallback(cargar, deps);

  const recargar = useCallback(
    async (manual = false) => {
      if (manual) setRefrescando(true);
      try {
        const d = await ejecutar();
        if (vivo.current) {
          setDatos(d);
          setError(null);
        }
      } catch (e) {
        if (vivo.current) setError(mensajeError(e));
      } finally {
        if (vivo.current) {
          setCargando(false);
          setRefrescando(false);
        }
      }
    },
    [ejecutar],
  );

  useFocusEffect(
    useCallback(() => {
      vivo.current = true;
      void recargar();
      return () => {
        vivo.current = false;
      };
    }, [recargar]),
  );

  return { datos, error, cargando, refrescando, recargar, refrescar: () => void recargar(true), setDatos };
}
