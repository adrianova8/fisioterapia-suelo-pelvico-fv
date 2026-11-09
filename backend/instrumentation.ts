// Se ejecuta al arrancar el servidor (también en Vercel, donde la variable TZ
// está reservada y no se puede configurar). Fija la hora del centro.
export function register() {
  process.env.TZ = "Europe/Madrid";
}
