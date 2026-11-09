# Mamá en movimiento — App móvil

App móvil (React Native + Expo) del centro de fisioterapia de
suelo pélvico + su backend en `backend/` (Next.js 16, solo API,
+ PostgreSQL), en el mismo repositorio. La app **no reimplementa
ninguna regla de negocio**: viven en `backend/server/motor.ts`.

## Backend (`backend/`, reconstruido el 9 nov 2026)

- Proyecto aparte con su `package.json` (Metro lo ignora por
  `metro.config.js`; el `tsconfig` de la app lo excluye).
- `server/motor.ts` — reglas (cuota, mes de la clase, ventana,
  cancelación, lista de espera, saldo, fijas, RGPD). Cambios en
  transacción (`sql.begin`) con `FOR UPDATE` de sesión→usuaria;
  avisos (push+email) siempre DESPUÉS del commit.
- `server/vistas.ts` — forma del JSON = `src/lib/tipos.ts`.
- `app/api/**/route.ts` — rutas (mismas que el modo demo).
- `GET /api/cron/recordatorios` (Bearer `CRON_SECRET`, Vercel
  Cron en `vercel.json`, 17:00 UTC): push + email la víspera.
- Emails con Resend (`RESEND_API_KEY`); sin clave, a consola.
- Imágenes en BYTEA (JPG/PNG/WebP ≤3 MB, sin `sharp`).
- `npm test` (con base y servidor arrancados): 16 pruebas de
  las reglas (§13 del relevo) contra la API real; se limpian solas.

## Stack

- Expo SDK 58 (managed), `expo-router` con rutas tipadas,
  TypeScript estricto, React Compiler activado.
- Estilos: `StyleSheet` propio + paleta en
  `src/constants/theme.ts` (rosa/burdeos, tarjetas redondeadas
  — look&feel del MVP).
- Token de sesión en `expo-secure-store` (`src/lib/token.ts`),
  enviado como `Authorization: Bearer` por `src/lib/api.ts`.

## Desarrollo

```bash
# 1) Base de datos (terminal aparte, dejar abierta):
cd backend && npm run db       # Postgres embebido :55432
npm run db:init                # 1.ª vez: esquema + datos de prueba
# 2) Backend:
cd backend && npm run dev      # Next.js :3000 (también en la IP LAN)
# 3) App (raíz del repo):
npm start                      # Expo dev server :8081
```

- `.env.local` (raíz) define `EXPO_PUBLIC_API_URL` con la IP
  LAN del Mac (`http://<ip>:3000`); vacío o `demo` = modo demo.
- `backend/.env` (copiar de `backend/.env.example`):
  `DATABASE_URL`, `TZ=Europe/Madrid`, `CRON_SECRET`, Resend,
  `GOOGLE_CLIENT_IDS`.
- Credenciales seed: `laura@test.com` / `Password123`
  (usuaria), `admin@test.com` / `Admin12345` (admin).
- Typecheck: `npx tsc --noEmit` (las rutas tipadas se
  regeneran con `expo start`).

## Arquitectura de rutas

- `src/app/(usuaria)/` — pestañas usuaria (NativeTabs):
  inicio, clases (calendario semanal), reservas, perfil.
- `src/app/admin/` — pestañas admin (mismo binario, se monta
  si `usuario.rol === "ADMIN"`): dashboard, usuarias,
  calendario, horario base.
- `src/app/clase/`, `login`, `invitada`, `mas`, `tarifas` —
  pantallas fuera de pestañas.
- `src/app/_layout.tsx` — guard por rol: redirige a `/login`,
  `/(usuaria)/inicio` o `/admin` según sesión.

## Reglas de negocio (viven en el backend)

- Mensualidad: 55€ (1 día/sem) o 90€ (2 días/sem), cuota
  semanal que **no acumula** entre semanas.
- Reservas: ventana de 3 días; cancelar ≥1h recupera la
  sesión; <1h la pierde. Lista de espera con promoción
  automática (se cierra 1h antes).
- Horario base (`plantilla_horario`) → sesiones
  materializadas perezosamente en cada consulta de rango.
- **Clases fijas** (`asignaciones_fijas`): la admin asigna
  plaza fija usuaria↔hueco; se reserva automáticamente cada
  semana si la mensualidad del mes de la sesión está ACTIVA
  (`asegurarReservasFijas` en `server/plantilla.ts`, corre en
  cada `asegurarSesiones`). La usuaria "libera su plaza" con
  el mismo flujo de cancelación (recupera cuota y puede
  volver si hay hueco; si no, cola de espera). Flags en la
  API: `miReservaFija` (sesiones) y `fija` (reservas).
- Asistencia: `POST /api/admin/sesiones/[id]/asistencia`
  (ASISTIDA/NO_SHOW, ambas consumen cuota — "si no libera y
  no va, pierde").
- Saldo de compensación (`reservas.origen=COMPENSACION`):
  clases adeudadas (parto/pausa) que no consumen cuota y
  sirven en cualquier programa.
- Push: `push_tokens` + `POST /api/push-token`; el servidor
  dispara Expo Push (`server/notificaciones.ts`) en
  promoción de lista y cancelación de clase.

- Eliminar cuenta: `DELETE /api/me` con `{ confirmar: true }`
  (anonimiza en el backend). Botón en el perfil con
  confirmación en pantalla (no `Alert`: no funciona en web).
  Requisito de Apple para publicar.
- Login con 5 fallos en 15 min → 429 con mensaje propio.
- **Copia sin conexión** (`src/lib/copiaOffline.ts`): `api.ts`
  guarda cada GET bueno de `/api/me`, `/api/reservas`,
  `/api/sesiones*`, `/api/info`, `/api/programas` (ficheros
  JSON con `expo-file-system` en nativo, `localStorage` en
  web). Si falla la red devuelve la copia y marca "sin
  conexión" → franja `<AvisoSinConexion />` (dentro de
  `Pantalla`). Las acciones (POST/PATCH/DELETE) sin red
  lanzan `ErrorApi(MENSAJE_SIN_CONEXION, 0)`. La copia se
  borra al iniciar y al cerrar sesión (`auth.tsx`).
  Nunca se guarda `/api/admin` ni `/api/auth`.
- Imágenes: `Miniatura` (imagen del programa o icono
  estándar 🤰/🤱/🧘‍♀️) y `Avatar` (foto de la profesional o
  inicial) reciben rutas relativas de la API
  (`programaImagen`, `profesionalFoto`) y las completan con
  `API_URL`. Se suben desde la web admin (`/admin/imagenes`).

- Recuperar contraseña: `src/app/recuperar.tsx` (ruta
  pública, enlace "¿Olvidaste tu contraseña?" en el login) →
  `POST /api/auth/recuperar`. El enlace del email abre la
  página web `/login/restablecer` del backend (en dev la API
  devuelve `enlaceDev` y se muestra en pantalla).
- Admin · Fotos e imágenes: `src/app/admin/imagenes.tsx`
  (botón "Fotos" en el panel). `expo-image-picker` (galería
  y cámara, recorte 1:1) → `api.subir()` (multipart) →
  `POST /api/admin/imagenes/<profesional|programa>/<id>`.
  Textos de permisos de fotos/cámara en `app.json`
  (requisito de Apple).
- Admin · Eliminar cuenta (RGPD) al final de la ficha de la
  usuaria → `DELETE /api/admin/usuarios/[id]`.

## Reconstrucción (9 nov 2026)

- La app se **recreó desde cero** a partir de `RELEVO_IA_APP_EMBARAZO.md`
  y `MVP_0.png` (el código anterior de `fv2` no se pudo copiar).
- Las formas de las respuestas de la API están en `src/lib/tipos.ts`
  (deducidas del documento): si el backend devuelve otra forma, se
  ajusta ahí.
- **Modo demostración** (`src/lib/demo.ts`): si `EXPO_PUBLIC_API_URL`
  está vacío o vale `demo`, `api.ts` no llama a la red y usa un
  servidor de mentira en memoria con las reglas principales. Sirve
  para ver la app sin backend. NO es la fuente de verdad.
- Pestañas con `expo-router/js-tabs` (no NativeTabs). Guard por rol
  con `Stack.Protected` en `src/app/_layout.tsx`.
- `react-native-nitro-google-signin` y `react-native-nitro-modules`
  quitados (no se usaban). Botón de Google aún no recreado.
- `package-lock.json` regenerado contra el registro público de npm
  (el anterior apuntaba al Nexus corporativo).

## Pendiente

- Google Sign-In: cableado (`src/lib/google.ts` con
  `expo-auth-session`, `BotonGoogle` en la portada y en el acceso;
  en modo demo entra como "Usuaria Google"). `POST /api/auth/google` crea la usuaria si no
  existe (programa por defecto, sin plan) para que el admin la
  gestione. Falta crear los client IDs en Google Cloud y
  ponerlos en `EXPO_PUBLIC_GOOGLE_*` (app) y `GOOGLE_CLIENT_IDS`
  (backend). En móvil requiere development build (no Expo Go).
- Recordatorios: hechos en el backend (push + email la víspera).
  Falta decidir la hora definitiva y un interruptor en el perfil
  (la columna `usuarios.recordatorios` ya existe).
- Resend + dominio verificado para emails reales.
- Producción: API → Vercel con raíz `backend/`, BD → Neon
  (Frankfurt), `npm run db:init -- --sin-datos` contra Neon.
- Build EAS (`eas build`) + despliegue de producción
  (API → Vercel, BD → Neon).
