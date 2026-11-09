# Documento de relevo para IA — "Mamá en movimiento" (Clínica Fátima Veiga)

**Estado del documento:** 8 de noviembre de 2026 (reescrito completo).
**Para qué sirve:** que otra IA (o la misma en otra sesión) pueda **continuar** el desarrollo o **rehacer la aplicación desde cero** sin perder ninguna decisión tomada. Recoge el producto, TODAS las reglas de negocio, las decisiones de arquitectura (y por qué), el estado real del código en los dos proyectos, el entorno de desarrollo, los errores ya encontrados y lo que queda por hacer.

> **IMPORTANTE PARA LA IA QUE CONTINÚE**
> - No inventes requisitos. Si una regla no está aquí, **pregunta**.
> - Este documento distingue **HECHO**, **DECIDIDO** y **PENDIENTE**. No des por hecho nada de PENDIENTE.
> - El usuario habla español, no es programador profesional y valora explicaciones claras, sinceras y sin jerga. Prefiere que se le pregunte antes de decisiones de negocio.
> - Hay **dos proyectos** (§4). La lógica de negocio vive SOLO en el backend (`fisioterapia_suelo_pelvico_fv`). La app móvil (`fisioterapia_suelo_pelvico_fv2`) solo pinta y llama a la API. El usuario quiere que **las mejoras de pantalla se hagan en la app móvil `fv2`** (y, si aplica, también en la web).

---

## Índice

1. Producto y contexto
2. Reglas de negocio (completas)
3. Decisiones de arquitectura y por qué
4. Arquitectura actual: dos proyectos
5. Esquema de base de datos (PostgreSQL)
6. Backend `fv`: módulos y API
7. Web `fv`: páginas
8. App móvil `fv2`: pantallas y librerías
9. Funcionalidades transversales (notificaciones, seguridad, RGPD, imágenes, sin conexión, PWA, zona horaria)
10. Textos, marca y decisiones de interfaz
11. Entorno de desarrollo (cómo arrancarlo todo)
12. Errores ya encontrados y lecciones
13. Casos de prueba que hay que mantener
14. Estado: qué está HECHO y qué queda PENDIENTE (hoja de ruta)
15. Si hubiera que empezar de cero: orden recomendado
16. Instrucciones para la IA que tome el relevo

---

## 1. Producto y contexto

- **Cliente:** Clínica Fátima Veiga — Fisioterapia de suelo pélvico, Santander (España).
- **Marca de la app:** "Mamá en movimiento". El nombre de la clínica aparece como pie: "Clínica Fátima Veiga · Suelo Pélvico Santander".
- **Qué hace:** gestiona clases presenciales de ejercicio terapéutico en grupo. Cada clienta pertenece a **un único programa**:
  - **Embarazo**
  - **Postparto**
  - **+50**
- **Objetivo final del usuario:** una **app nativa en App Store y Google Play** que las clientas tengan instalada, con **notificaciones**, para reservar sus clases y gestionar cambios sin tener que pedírselo a la profesora. La web sigue existiendo (y la administración debe poder usarse desde PC).
- **Roles:**
  - **USUARIO (clienta):** ve su plan, sus clases, reserva/cancela/libera plaza, lista de espera, sus reservas, su perfil.
  - **ADMIN (Fátima / la profesora):** gestiona usuarias, programas, mensualidades, clases fijas, horario, calendario, asistencia, fotos. **No es una clienta**: no ve las pantallas de usuaria; al iniciar sesión va directa a administración. Una usuaria nunca puede entrar en administración.
- **No hay pagos online.** Se paga en la clínica (efectivo/presencial) y la admin activa la mensualidad. No implementar Stripe, tarjeta, facturas ni cambio de tarifa por la usuaria salvo que el negocio lo pida explícitamente.
- Profesionales actuales: **Ana** y **Ángela**. Sala única: **Sala de Movimiento** (en algún texto antiguo "Sala de Entrenamiento").
- Modo **invitada**: sin cuenta se puede ver el calendario de los próximos 14 días (solo lectura).

---

## 2. Reglas de negocio (completas)

### 2.1 Mensualidad y cuota semanal

- Tarifas: **1 día/semana = 55 €/mes** y **2 días/semana = 90 €/mes**.
- **No son bonos de créditos.** La mensualidad da derecho a ir N veces **por semana**. Un mes con 4 o 5 semanas cuesta lo mismo.
- La cuota semanal **no se acumula** entre semanas: lo no usado una semana se pierde (salvo pausa justificada, §2.8).
- **Semana** = lunes 00:00 a lunes siguiente 00:00.
- Consumen la cuota semanal las reservas en estado `CONFIRMADA`, `CANCELADA_SIN_CREDITO` (cancelación tardía), `ASISTIDA` y `NO_SHOW`. **No** la consume `CANCELADA_CON_CREDITO` (cancelación a tiempo). (Los nombres `*_CREDITO` son herencia de un modelo antiguo; podrían renombrarse a `CANCELADA_A_TIEMPO` / `CANCELADA_TARDIA`.)

### 2.2 El mes de la clase manda

- Una clase solo se puede reservar si existe una mensualidad `ACTIVA` **del mes al que pertenece la clase** (no del mes actual).
- Ejemplo: semana 26 oct – 1 nov; octubre activo y noviembre no → la clase del 31 oct se puede reservar; la del 1 nov **no**, aunque sea la misma semana.
- Por eso la admin puede activar **meses futuros** (cobra noviembre a finales de octubre).
- Estados de mensualidad: `ACTIVA`, `PAUSADA`, `FINALIZADA`. Única por usuaria + año + mes.
- Flujo de cobro: la usuaria paga en la clínica → la admin abre su ficha → elige mes y tarifa → confirma → `ACTIVA` (queda en el historial como `ACTIVACION`).

### 2.3 Ventana de reserva

- Una clase se puede reservar desde **3 días naturales antes a las 00:00** (clase el jueves 18:00 → abre el lunes 00:00).
- Antes de abrir, la clase se ve en el calendario pero no se puede reservar (se indica cuándo abre).

### 2.4 Cancelación

- Con **1 hora o más** de antelación → `CANCELADA_CON_CREDITO`: recupera la sesión para otro día de esa semana.
- Con **menos de 1 hora** → `CANCELADA_SIN_CREDITO`: la sesión cuenta como usada y no puede volver a reservar esa clase.

### 2.5 Lista de espera

- Solo cuando la clase está completa. Se cierra cuando falta menos de 1 hora.
- Al liberarse una plaza, se **promociona automáticamente** a la primera de la cola, siempre que siga cumpliendo programa, mensualidad y cuota (o tenga saldo, §2.8). Se le avisa (push + email).

### 2.6 Clases fijas (asignación por la profesora)

Cómo funciona realmente la clínica: cada clienta tiene **sus días fijos** (p. ej. María, martes 18:00 y jueves 19:00). La app sirve sobre todo para que, si un día no puede ir, **libere su plaza** y se apunte otro día sin pedírselo a la profesora.

- La admin asigna a cada usuaria huecos del **horario base** (tabla `asignaciones_fijas`).
- Cada semana esas clases se le **reservan solas** (`CONFIRMADA`, con `asignacion_fija_id`), **si la mensualidad del mes de la clase está ACTIVA**. Sin mensualidad, no se reserva (primero paga y la admin activa).
- La clase fija **consume la cuota semanal** siempre. **Si no libera y no va, pierde la sesión** (NO_SHOW).
- **Liberar plaza** = mismo flujo que cancelar (≥1h recupera la sesión para otro día de la semana). La plaza queda libre para otras; si la usuaria quiere volver y hay hueco, puede; si está llena, a la lista de espera.
- Las clases fijas son siempre de **su programa**.

### 2.7 Programas y cambio de programa

- La usuaria solo puede reservar clases de **su programa**.
- La admin puede cambiar el programa (caso típico: Embarazo → parto → Postparto). Se registra `CAMBIO_PROGRAMA` en el historial (con admin, motivo opcional y datos antes/después).
- Decidido: al cambiar de programa, las reservas futuras confirmadas **se mantienen**, la mensualidad continúa igual, y desde el cambio solo reserva clases del nuevo programa.

### 2.8 Pausa por parto / baja y saldo de clases adeudadas

- La admin puede **pausar** la mensualidad (p. ej. entra en parto) y **reactivarla** al volver, incluso con otra tarifa/programa.
- Mientras está `PAUSADA` **no puede reservar** (decisión: la pausa es una baja deliberada; aunque tenga saldo, el saldo se usa al volver).
- Las clases ya pagadas y no gastadas **no se pierden**: al pausar, el sistema **propone** cuántas son (cuota restante de la semana actual + cuota × semanas restantes del mes) y la admin confirma o corrige. Se suman al **saldo de compensación** de la usuaria (`usuarios.saldo_compensacion`).
- El saldo **no caduca** y vale para **cualquier programa** (vuelve del parto y lo gasta en Postparto antes de pagar).
- Las reservas pagadas con saldo tienen `origen = COMPENSACION`: no consumen cuota semanal ni exigen mensualidad activa. Si ya tiene saldo, una clase sale DISPONIBLE aunque no tenga mensualidad o haya agotado la cuota.
- Cancelación a tiempo de una reserva de saldo, o cancelación de la clase por el centro → la clase vuelve al saldo.
- La admin puede **ajustar** el saldo manualmente con motivo obligatorio (`AJUSTE` en el historial), incluido **reembolso** (saldo a 0).

### 2.9 Horario base y calendario

- **Horario Base** (UI: "Horario Base — Clases con recurrencia semanal"): plantilla semanal (día, hora, duración, programa, profesional, sala, aforo). Las clases concretas se crean solas para cualquier semana que se consulte (**materialización perezosa**, sin cron). Los cambios del horario base afectan a semanas **futuras aún no materializadas**; las ya creadas (pueden tener reservas) no cambian.
- **Calendario:** clases concretas. La admin puede **añadir** una clase suelta, **editar** una clase de un día concreto o **cancelarla** (solo afecta a ese día).
- **Cancelar una clase** (por el centro): nunca se borra; pasa a `CANCELADA`, las reservas se liberan como `CANCELADA_CON_CREDITO` (recuperan la sesión), las de saldo devuelven el saldo, la lista de espera se cierra y **se avisa** a las afectadas. Una clase cancelada no se vuelve a generar desde el horario base.
- No puede haber dos clases solapadas en la misma sala ni para la misma profesional.

### 2.10 Asistencia

- La admin marca en cada clase quién vino: `ASISTIDA` o `NO_SHOW`. Ambas consumen la cuota ("si no libera y no va, pierde").

### 2.11 Cuentas

- Registro con nombre, email, contraseña y programa; o **Google** (si el email no existe se crea la usuaria con el programa por defecto y sin plan, para que la admin la gestione).
- **Recuperar contraseña** por email (enlace de un solo uso, 1 hora).
- **Eliminar cuenta** (RGPD): desde el perfil de la usuaria o por la admin. Se **anonimiza** (ver §9.4).

---

## 3. Decisiones de arquitectura y por qué

| Decisión | Motivo | Descartado |
|---|---|---|
| **Desarrollo a medida** | Las reglas (cuota semanal, mes de la clase, compensación por parto, clases fijas) no encajan bien en SaaS genéricos; propiedad de datos de salud | SaaS tipo Mindbody/TeamUp/Momence (viable y más barato a corto plazo, pero rígido) |
| **Backend + web: Next.js 16 (App Router) + TypeScript** | Ya construido; API y web en un mismo proyecto | — |
| **PostgreSQL gestionado en región UE** | Datos reales de salud: backups automáticos, restauración, no perder datos. SQLite era de pruebas | Firebase (NoSQL, reescribir el motor), AWS (demasiado complejo para esta escala) |
| **Hosting: Vercel + Neon (Frankfurt)** | Entorno natural de Next.js, despliegue con push, HTTPS, Neon se integra desde Vercel | VPS propio (mantenimiento) |
| **App móvil: React Native + Expo** (proyecto `fv2`) | Mismo lenguaje (TS/React), EAS compila en la nube (no hace falta Mac), publicación en las dos stores, push nativas | Capacitor (Apple rechaza apps "web metida en caja"), nativo puro (dos apps) |
| **Flutter/Dart** como **segundo proyecto de comparación** (pendiente) | El usuario quiere comparar; usará el mismo backend; al final elegirá uno | — |
| **La app móvil no reimplementa reglas**: todo vía API | Una sola fuente de verdad; web y móvil coherentes | — |
| **Admin en la misma app** (modo profesora según rol) + también en web para PC | Fátima gestiona desde el móvil y desde el PC | App separada para admin |
| **PWA en la web** | Puente mientras llega la app de tiendas; instalable | — |
| **Imágenes en la propia BD** (BYTEA, WebP pequeño) | No depender de otro servicio de ficheros | S3/Vercel Blob (más piezas) |

**Aviso de costes/licencias ya comunicado al usuario:** el plan **Hobby (gratis) de Vercel es solo para uso no comercial**; para la clínica en producción hace falta **Pro (~20 $/mes)** o una alternativa con plan comercial (Railway, Render, Netlify). Cuentas de tiendas: Apple ~99 $/año, Google ~25 $ una vez.

---

## 4. Arquitectura actual: dos proyectos

```
C:\Users\n371414\git\proyectos_personales\
├── fisioterapia_suelo_pelvico_fv    ← BACKEND (API) + WEB  (Next.js 16 + PostgreSQL)
└── fisioterapia_suelo_pelvico_fv2   ← APP MÓVIL (Expo SDK 58, React Native 0.88)
```

- `fv2` llama a la API de `fv` (`EXPO_PUBLIC_API_URL`). No tiene base de datos.
- **Autenticación:** sesiones propias en BD (`sesiones_auth`, token aleatorio guardado **hasheado** SHA-256, 30 días).
  - Web: cookie `session_token` httpOnly.
  - App: el login devuelve también `token` en el JSON; la app lo guarda en `expo-secure-store` y lo envía como `Authorization: Bearer`. `server/auth.ts` acepta ambos.
- `proxy.ts` (equivalente al antiguo middleware en Next 16): CORS para `/api/*` **solo en desarrollo** (la app Expo en web va desde otro puerto).
- El backend es la autoridad: el frontend puede deshabilitar botones, pero todas las reglas se comprueban en el servidor.
- **Git:** ninguno de los dos proyectos tiene remoto (no están en GitHub). `fv` tiene commits antiguos y muchos cambios sin commitear; `fv2` solo tiene el commit inicial y todo el trabajo sin commitear. **Pendiente commitear** (pedir OK al usuario).

---

## 5. Esquema de base de datos (PostgreSQL)

Creación completa: `scripts/init-db-pg.mjs` (idempotente: `CREATE … IF NOT EXISTS`, `ALTER … ADD COLUMN IF NOT EXISTS`, seed con `ON CONFLICT DO NOTHING`, realinea secuencias IDENTITY). Fechas como **texto ISO** (UTC). Booleanos como INTEGER 0/1.

| Tabla | Columnas (`?` = nullable) |
|---|---|
| `programas` | id, nombre (UNIQUE), imagen?, imagen_actualizada? |
| `profesionales` | id, nombre, activo, foto?, foto_actualizada? |
| `salas` | id, nombre, activo |
| `tarifas` | id, nombre, sesiones_semana, precio_centimos, activa |
| `usuarios` | id, nombre, email (UNIQUE), programa_id, rol (`USUARIO`/`ADMIN`), saldo_compensacion, eliminada_en? |
| `credenciales` | id, usuario_id (UNIQUE), password_hash (`salt:hash` scrypt) |
| `sesiones_auth` | id, usuario_id, token_hash (UNIQUE), fecha_creacion, fecha_expiracion |
| `tokens_recuperacion` | id, usuario_id, token_hash (UNIQUE), fecha_creacion, fecha_expiracion, usado |
| `intentos_login` | id, email, fecha (índice email+fecha) |
| `push_tokens` | id, usuario_id, token (UNIQUE), plataforma, fecha_creacion |
| `suscripciones_mensuales` | id, usuario_id, tarifa_id, anio, mes, estado (`ACTIVA`/`PAUSADA`/`FINALIZADA`), fecha_activacion, fecha_pausa?, motivo_pausa? — UNIQUE(usuario_id, anio, mes) |
| `historial_suscripciones` | id, usuario_id, suscripcion_id?, admin_id, tipo (`ACTIVACION`/`PAUSA`/`REACTIVACION`/`CAMBIO_PROGRAMA`/`AJUSTE`), fecha, motivo?, datos_anteriores?, datos_nuevos? (JSON texto) |
| `plantilla_horario` | id, dia_semana (1=lunes…7), hora_inicio (`HH:MM` local), duracion_minutos, programa_id, profesional_id, sala_id, capacidad, activa |
| `sesiones` | id, programa_id, profesional_id, sala_id, fecha_hora_inicio, fecha_hora_fin, capacidad, plantilla_id?, slot_inicio?, estado (`ACTIVA`/`CANCELADA`) — índice único parcial (plantilla_id, slot_inicio) |
| `asignaciones_fijas` | id, usuario_id, plantilla_id, activa, fecha_creacion — UNIQUE(usuario_id, plantilla_id) |
| `reservas` | id, usuario_id, sesion_id, suscripcion_mensual_id?, estado, fecha_reserva, fecha_cancelacion?, origen (`SEMANAL`/`COMPENSACION`), asignacion_fija_id? — UNIQUE(usuario_id, sesion_id) |
| `lista_espera` | id, usuario_id, sesion_id, fecha_entrada, estado (`ESPERANDO`/`PROMOCIONADA`/`CANCELADA`) — UNIQUE(usuario_id, sesion_id) |

Seed de desarrollo: programas 1 Embarazo / 2 Postparto / 3 +50; tarifas 1 (55 €) y 2 (90 €); profesionales Ana y Ángela; sala 1; usuarias Laura (1), Marta (2), Carmen (3), Lucía (4), Administrador (5).

---

## 6. Backend `fv`: módulos y API

### 6.1 Módulos `server/`

- **`db.ts`** — wrapper async sobre `postgres@3.4.7` con API tipo SQLite: `const db = await obtenerDb()`, `db.prepare(sql).get/all/run(...)`, `db.exec("BEGIN"/"COMMIT"/"ROLLBACK")`. Traduce `?`→`$n` y `BEGIN IMMEDIATE`→`BEGIN`. **Cada `obtenerDb()` reserva UNA conexión del pool (máx. 5): es obligatorio `db.close()` en `finally`** (si no, el pool se agota y toda la app se cuelga, ver §12). No hay `lastInsertRowid`: usar `INSERT … RETURNING id` + `.get()`.
- **`reservas.ts`** — motor: `calcularAperturaReserva`, `calcularLimitesSemana`, `contarSesionesUsadasSemana` (solo `SEMANAL`), `buscarSuscripcionActiva` (**año/mes de la sesión**), `crearReserva`, `cancelarReserva`, `unirseListaEspera`, `salirListaEspera`, `promocionarListaEspera` (devuelve a quién promocionó; **el aviso se manda después del COMMIT** con `avisarPromocion`), `cancelarSesion`, `obtenerSaldoCompensacion`, `sugerirCompensacionPausa`, `eliminarCuenta` (anonimización RGPD). Operaciones críticas en transacción.
- **`plantilla.ts`** — `asegurarSesiones(db, desde, hasta)` (materializa el horario base, `INSERT … ON CONFLICT DO NOTHING`) y `asegurarReservasFijas` (reserva las clases fijas si la mensualidad del mes está activa). Se llaman en cada GET de sesiones.
- **`auth.ts`** — `obtenerTokenSesion` (cookie o Bearer), `obtenerUsuarioActualId`, `obtenerUsuarioActual`, `obtenerAdministradorActual`.
- **`password.ts`** — scrypt + `timingSafeEqual`.
- **`seguridad.ts`** — límite de login (5 fallos/15 min por email → 429) y de recuperación (3 enlaces/hora por usuaria).
- **`email.ts`** — `enviarEmail()`: Resend si hay `RESEND_API_KEY` (+`EMAIL_FROM`), si no lo escribe en la consola del servidor.
- **`notificaciones.ts`** — `enviarPush` (Expo Push API a los `push_tokens`), `enviarEmailUsuarias`, **`notificar()` = push + email**, `formatearFechaPush` (siempre `Europe/Madrid`). Nunca lanzan error (se llaman con `void`).
- **`imagenes.ts`** — `guardarImagen` (sharp: rota según EXIF, recorte cuadrado 512, WebP q82, máx. 8 MB, rechaza no-imágenes), `leerImagen`, `borrarImagen`, `urlImagen(tipo,id,actualizada)` → `/api/imagenes/<tipo>/<id>?v=<fecha>`.

### 6.2 API

**Auth / cuenta**
- `POST /api/auth/login` (cookie + `token` en JSON; límite de intentos), `POST /api/auth/logout`, `POST /api/auth/registro`, `POST /api/auth/google` (`idToken`; valida contra `GOOGLE_CLIENT_IDS`), `POST /api/auth/recuperar` (`{email}`, siempre ok; `enlaceDev` en desarrollo), `POST /api/auth/restablecer` (`{token,password}`, ≥8 caracteres; cierra todas las sesiones).
- `GET /api/me` (usuaria, programa, mensualidad del mes actual con cualquier estado, uso semanal, `saldoCompensacion`), `DELETE /api/me` (`{confirmar:true}`, elimina/anonimiza).
- `POST /api/push-token` (registra el token Expo del dispositivo).

**Usuaria**
- `GET /api/sesiones?desde&hasta` — sesiones de su programa con elegibilidad por sesión: `estado` ∈ `DISPONIBLE | FINALIZADA | RESERVADA | EN_LISTA_ESPERA | NO_ABIERTA | SIN_MENSUALIDAD | MENSUALIDAD_NO_ACTIVA | LIMITE_SEMANAL | LISTA_ESPERA_CERRADA | COMPLETA` (+ `CANCELADA`), `puedeReservar`, `puedeUnirseListaEspera`, `mensualidad` del mes de la sesión, `miReservaFija`, `programaImagen`, `profesionalId`, `profesionalFoto`; y `mensualidades[]` por mes presente en el rango.
- `GET /api/sesiones/[id]` (detalle con lo mismo), `GET /api/sesiones/invitada` (pública, 14 días).
- `GET /api/reservas` (con `origen`, `fija`, `sesion.*` incl. imágenes), `POST /api/reservas` (`{sesionId}`), `PATCH /api/reservas` (`{reservaId}` cancelar/liberar).
- `POST /api/lista-espera` (unirse), `PATCH /api/lista-espera` (salir).
- `GET /api/info` (tarifas activas, profesionales con `foto`, programas con `imagen`), `GET /api/programas`.
- `GET /api/imagenes/[tipo]/[id]` (pública, `Cache-Control: immutable`).

**Admin** (todas exigen rol ADMIN)
- `/api/admin/usuarios` (GET listado, excluye eliminadas), `/api/admin/usuarios/[id]` (GET ficha con `saldoCompensacion` + `sugerenciaCompensacion` por `?anio&mes`; PATCH datos; DELETE eliminar/anonimizar).
- `/api/admin/usuarios/[id]/plan` (POST activar mes+tarifa), `/plan/estado` (PATCH `PAUSAR` con `clasesCompensadas` / `REACTIVAR`), `/plan/historial` (GET), `/programa` (PATCH), `/saldo` (POST `{saldo,motivo}`), `/fijas` (GET/POST/PATCH clases fijas).
- `/api/admin/tarifas`, `/api/admin/calendario-opciones` (programas, profesionales, salas).
- `/api/admin/sesiones` (GET rango / POST crear), `/api/admin/sesiones/[id]` (GET, PATCH editar con control de solapes, DELETE = **cancelar** con `cancelarSesion`), `/sesiones/[id]/reservas` (asistentes), `/sesiones/[id]/asistencia` (POST ASISTIDA/NO_SHOW).
- `/api/admin/plantilla` (GET/POST), `/api/admin/plantilla/[id]` (PATCH/DELETE).
- `/api/admin/imagenes` (GET listado), `/api/admin/imagenes/[tipo]/[id]` (POST multipart campo `imagen` / DELETE).

### 6.3 Scripts (`scripts/`)

- `dev-db.mjs` — **Postgres local embebido** (`embedded-postgres`, PG 18, datos en `data/pg`, puerto **55432**, usuario/clave `postgres`, base `app` creada en **UTF8**).
- `init-db-pg.mjs` — esquema + seed (lee `DATABASE_URL` del entorno o `.env`).
- `migrar-sqlite-a-pg.mjs` — copia todo `data/app.db` (SQLite antiguo) a PG conservando ids.
- `generar-iconos.mjs` — iconos PWA con sharp.
- Legacy SQLite (no usar contra PG): `init-db.mjs`, `migrar-02/03/04-*.mjs`, `delete-db.mjs`, `codemod-pg.mjs`, `codemod-await.mjs`.

### 6.4 Variables de entorno (`.env`, ver `.env.example`)

`DATABASE_URL`, `TZ=Europe/Madrid`, `RESEND_API_KEY` y `EMAIL_FROM` (opcionales), `GOOGLE_CLIENT_IDS` (lista separada por comas: web, android, ios).

---

## 7. Web `fv`: páginas

- **Usuaria:** `/` Inicio (saludo, plan con anillo de uso semanal, próxima clase con foto de la profesional, aviso "Te debemos N clases", aviso "Instala la app"), `/clases` (selector de día, navegador de mes, tira de mensualidad solo del mes del día elegido, tarjetas con miniatura del programa, ocupación `N/capacidad`), `/clases/[id]` (detalle, botón fijo, compartir), `/clases/[id]/confirmada` (con `.ics`), `/clases/[id]/lista-espera`, `/reservas` (Próximas/Historial, "Clase compensada", "Clase cancelada por el centro"), `/perfil` (+ "Eliminar mi cuenta"), `/perfil/datos`, `/tarifas`, `/mas` (centro, equipo, FAQ, legal — **datos de ejemplo**).
- **Acceso:** `/login` (portada), `/login/acceso` (+ "¿Olvidaste tu contraseña?"), `/login/recuperar`, `/login/restablecer?token=`, `/registro`, `/invitada`.
- **Admin:** `/admin` (Usuarios, Horario Base, Calendario, Fotos e imágenes), `/admin/usuarios`, `/admin/usuarios/[id]` (mensualidades por mes, pausar con "Clases a compensar", reactivar, historial, "Clases adeudadas"), `/admin/horario` (edición dentro de la propia tarjeta), `/admin/calendario`, `/admin/calendario/nueva_clase`, `/admin/calendario/[id]` (editar, cancelar), `/admin/imagenes`.
- **Guards:** `AuthGuard` (usuaria; ADMIN → `/admin`), `AdminGuard` en `app/admin/layout.tsx`.
- ⚠️ **El admin web va por detrás del admin de la app:** **marcar asistencia**, **asignar clases fijas** y **eliminar usuaria** solo tienen pantalla en `fv2` (en web existe la API, no la interfaz).

---

## 8. App móvil `fv2`: pantallas y librerías

- **Stack:** Expo SDK 58 (managed), `expo-router` (rutas tipadas, `src/app`), TypeScript estricto, React Compiler, `StyleSheet` propio + paleta `src/constants/theme.ts`, `expo-image`, `expo-secure-store`, `expo-notifications`, `expo-file-system`, `expo-image-picker`, `expo-auth-session` (Google), `react-native-svg`.
- **Rutas:**
  - `(usuaria)/` pestañas: `inicio`, `clases`, `reservas`, `perfil` (+ eliminar cuenta).
  - `admin/(tabs)/`: `index` (panel: hoy, estadísticas, botones "Fotos" y "Salir"), `usuarias`, `calendario`, `horario`. Apiladas: `usuaria/[id]` (mensualidad, pausa/compensación, programa, **clases fijas**, **eliminar cuenta RGPD**), `sesion/[id]` (asistentes, **asistencia**, cancelar), `nueva-clase`, `editar-horario`, `imagenes` (galería/cámara).
  - Fuera de pestañas: `clase/[id]`, `clase/confirmada`, `clase/lista-espera`, `login` (+ "¿Olvidaste tu contraseña?" y Google), `registro`, `recuperar`, `invitada`, `mas`, `tarifas`.
  - `_layout.tsx`: guard por rol (públicas: login, registro, recuperar, invitada).
- **Librerías propias (`src/lib`):** `api.ts` (cliente, Bearer, copia sin conexión, `api.subir` multipart, `MENSAJE_SIN_CONEXION`), `auth.tsx` (contexto; borra la copia al entrar/salir; registra push token), `copiaOffline.ts`, `token.ts` (SecureStore / localStorage en web), `google.ts`, `notificaciones.ts`, `dialogos.ts` (`alerta` multiplataforma: en web usa confirm/alert), `fechas.ts`, `navegacion.ts`, `tipos.ts`.
- **Componentes:** `ui.tsx` (`Pantalla` incluye `<AvisoSinConexion/>`, `Boton` con prop `deshabilitado`, `Tarjeta`, `Campo`…), `usuaria-ui.tsx` (`Anillo`, `Miniatura` con imagen o icono 🤰/🤱/🧘‍♀️, `Avatar` con foto o inicial), `admin-ui.tsx`, `aviso-sin-conexion.tsx`.
- `app.json`: nombre "Mamá en movimiento", bundle/package `es.clinicafatimaveiga.mamaenmovimiento`, scheme `mamaenmovimiento`, textos de permisos de fotos/cámara (requisito de Apple). **Iconos/splash todavía los de plantilla de Expo.**
- `.env.local`: `EXPO_PUBLIC_API_URL=http://192.168.1.132:3000` (IP wifi del PC). `.env.example` documenta también `EXPO_PUBLIC_GOOGLE_*`.

---

## 9. Funcionalidades transversales

### 9.1 Notificaciones
- Eventos: **"¡Tienes plaza!"** (promoción de lista) y **"Clase cancelada"** (el centro cancela). Push (Expo) + email.
- Emails reales requieren cuenta **Resend** + dominio verificado; hoy se escriben en la consola del servidor.
- Push en Android requiere **development build + FCM** (no funciona en Expo Go). Pendiente: recordatorios programados.

### 9.2 Recuperar contraseña
- Token aleatorio, guardado hasheado, 1 hora, un solo uso, anti-enumeración, máx. 3/hora. El enlace del email abre la página **web** `/login/restablecer`.

### 9.3 Seguridad
- 5 intentos fallidos en 15 min por email → bloqueo (429) aunque la contraseña sea correcta; en BD para funcionar en serverless.
- Contraseñas scrypt; tokens de sesión y de recuperación solo hasheados en BD.
- Cabeceras `X-Content-Type-Options` y `Referrer-Policy` (`next.config.ts`).

### 9.4 RGPD — eliminar cuenta
- **Se anonimiza, no se borran filas** (contabilidad e historial se conservan): reservas futuras → `CANCELADA_CON_CREDITO` y la plaza pasa a la lista de espera (con aviso), lista de espera → `CANCELADA`, clases fijas → `activa=0`, nombre "Usuaria eliminada", email `eliminada-<id>@anonimizada.invalid`, saldo 0, `eliminada_en`; se borran credenciales, sesiones, push y tokens. Las cuentas ADMIN no se pueden eliminar por esta vía. Apple exige poder eliminar la cuenta desde la app (hecho en `fv2`).

### 9.5 Imágenes
- Foto de cada profesional y, opcional, imagen de cada programa. Sin imagen: inicial de la profesional e icono estándar del programa (🤰 Embarazo, 🤱 Postparto, 🧘‍♀️ +50) sobre su color.
- Se suben desde `/admin/imagenes` (web) o "Fotos" (app). URLs con `?v=` → caché permanente.

### 9.6 Sin conexión (pedido expresamente por el usuario)
- **Web (service worker `public/sw.js`, v3):** consultas de la usuaria (`/api/me`, `/api/reservas`, `/api/sesiones*`, `/api/info`, `/api/programas`) y sus páginas van "red primero" y guardan copia; sin red se muestra la copia con la franja "Sin conexión". Estáticos e imágenes "copia primero". Nunca se guarda `/admin`, `/api/admin`, `/api/auth` ni nada que no sea GET. En desarrollo el SW se registra como `/sw.js?modo=dev`. La copia se borra al iniciar/cerrar sesión y al eliminar cuenta (`lib/copiaOffline.ts`).
- **App (`fv2`):** igual en `src/lib/api.ts` + `copiaOffline.ts` (ficheros JSON con `expo-file-system`; `localStorage` en web). Al abrir sin red la usuaria sigue con su sesión y sus datos.
- **Reservar/cancelar/liberar SIEMPRE exigen conexión** (evita reservar plazas que ya no existen).

### 9.7 PWA (web)
- `app/manifest.ts`, iconos en `public/icons/`, metadatos `appleWebApp`, `themeColor` `#c97878`, aviso "Instala la app" (Android: botón; iPhone: instrucciones de Safari). Requiere HTTPS. Web push (VAPID) pendiente.

### 9.8 Zona horaria
- `TZ=Europe/Madrid` en el servidor (también hay que ponerla en Vercel). Las horas del horario base se interpretan como hora del centro.

---

## 10. Textos, marca y decisiones de interfaz

- Estética del MVP: cálida, femenina, fondo blanco/rosa suave, acentos burdeos `#8b1553` y rosa `#c97878`, tarjetas grandes redondeadas, navegación inferior.
- Login: "Mamá en movimiento" como marca principal, corazón rosa centrado, tagline "Clases y apoyo para cada etapa de tu embarazo", pie morado "Clínica Fátima Veiga · Suelo Pélvico Santander".
- Admin cabecera: "Clínica Fátima Veiga · Suelo Pélvico Santander" sobre "Administración".
- "**Horario Base**" con subtítulo "**Clases con recurrencia semanal**" (se descartaron "semana tipo" y "horario fijo").
- Pastillas de clase: disponible → `ocupadas/capacidad →` (p. ej. `5/8`); aún no abierta → ocupación en gris con tooltip de apertura (nada de "Pronto"); sin mensualidad → "**Plan no activado**"; completa → "Completo" + "Lista de espera" (pendiente decidir si mostrar `8/8`).
- Reservar y unirse a la lista son flujos de **dos toques** (plazas → "Reservar"/"Unirme" + ✕).
- No mostrar créditos mensuales ni "plan 8 sesiones" (modelo antiguo del mockup).
- Confirmaciones destructivas siempre explican consecuencias y no se pueden hacer por error (dos pasos).

---

## 11. Entorno de desarrollo

```bash
# Terminal 1 — base de datos (dejar abierta)
cd fisioterapia_suelo_pelvico_fv
node scripts/dev-db.mjs          # PostgreSQL :55432

# Terminal 2 — backend + web
cd fisioterapia_suelo_pelvico_fv
npm run dev                      # http://localhost:3000 (y IP wifi)

# Terminal 3 — app móvil
cd fisioterapia_suelo_pelvico_fv2
npx expo start --lan             # :8081 ; web: tecla w
```

- **Móvil físico con Expo Go:** misma wifi, en Expo Go "Enter URL manually" → `exp://192.168.1.132:8081`. Si el PC tiene varias redes (hay una de empresa 180.101.x), arrancar Expo con `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.132`. Si no conecta: **cortafuegos de Windows** (permitir Node.js en redes privadas, puertos 3000 y 8081).
- En Expo Go funciona todo salvo **Google** y **push en Android** (necesitan development build).
- **Credenciales seed:** admin `admin@test.com` / `Admin12345`; usuarias `laura@test.com`, `lucia@test.com`, `marta@test.com`, `carmen@test.com` / `Password123`.
- **pgAdmin:** host `localhost`, puerto **55432** (ojo: en el PC hay otro Postgres en 5432 con la base `floriculture`), usuario/clave `postgres`, base `app`.
- **Verificación:** `npx tsc --noEmit` en ambos proyectos; `npx eslint <ficheros>` en `fv` (aviso conocido `react-hooks/set-state-in-effect` en páginas antiguas).
- **Particularidades del equipo de desarrollo (corporativo):**
  - La red corporativa intercepta SSL ("self-signed certificate"): fallan `expo-doctor`, `expo lint` (descarga de config) y fallarán `eas login/build`. Hacer esas tareas desde otra red.
  - Una política corporativa **bloquea la automatización de Chrome/Edge** (puppeteer): las pruebas de interfaz se hacen a mano.
  - El editor **quita imports no usados al guardar**: al editar, escribir primero el código que usa el import y después el import.
  - En Git Bash, `2>nul` crea un fichero llamado `nul`: usar `2>/dev/null`.

---

## 12. Errores ya encontrados y lecciones

- **Pool de conexiones agotado:** una ruta (`/api/info`) no hacía `db.close()` → tras 5 visitas toda la app se colgaba (peticiones de 35-90 s, "No se pudieron cargar las reservas"). Regla: `try/finally { db.close() }` siempre.
- **Aviso antes del COMMIT:** la promoción de lista avisaba dentro de la transacción; si había ROLLBACK se avisaba de una plaza inexistente. Ahora se avisa después del COMMIT.
- **Codificación:** en Windows el cluster de PG nace en WIN1252; la base `app` se crea con `ENCODING 'UTF8'` desde `template0`. Datos antiguos tenían `U+FFFD` ("Luc�a") por guardar tildes desde la terminal; corregidos.
- **`inline-flex` en un `div` contenedor** hacía que pastillas se pusieran en la misma línea que "← Volver".
- **Fechas:** fechas mal formadas antiguas (`"2026-09-29 T19:00:00"`); usar siempre ISO.
- `page.tsx` y `route.ts` no pueden convivir en la misma ruta; las páginas no van dentro de `/api`.
- `Alert.alert` con botones no funciona en react-native-web → usar `alerta()` de `src/lib/dialogos.ts`.
- Next 16 cambia APIs: leer `node_modules/next/dist/docs/` antes de usar algo nuevo (p. ej. `proxy.ts`, `viewport` separado de `metadata`, `params` como Promise).
- Recargar con Ctrl+Mayús+R cuando el usuario ve "lo de antes" (caché/SW).

---

## 13. Casos de prueba que hay que mantener

1. **Tarifa 1/semana:** 1.ª reserva OK; 2.ª misma semana rechazada; cancelar ≥1h → puede volver a reservar; <1h → no recupera.
2. **Tarifa 2/semana:** 1.ª y 2.ª OK; 3.ª rechazada.
3. **Ventana 3 días:** clase jueves → domingo visible pero cerrada; lunes 00:00 reservable.
4. **Cruce de mes:** octubre activo, noviembre no → 31 oct reservable, 1 nov bloqueada; activar noviembre → reservable.
5. **Pausa:** activa → reserva OK; pausa → rechazada; reactiva → OK; historial conserva ambas.
6. **Cambio de programa:** Embarazo → Postparto: ya no reserva Embarazo; sí Postparto con plan.
7. **Solapes:** dos clases en la misma sala/profesional a la vez → rechazo.
8. **Compensación:** pausar con sugerencia N → saldo N; reserva sin plan → `COMPENSACION`, saldo −1; cancelar a tiempo → saldo +1; el centro cancela la clase → saldo devuelto; ajuste a 0 con motivo → `AJUSTE`.
9. **Lista de espera + aviso:** clase de 1 plaza, A reserva, B en lista, A cancela → B `CONFIRMADA`, email/push "¡Tienes plaza!".
10. **Cancelación por el centro:** reservas liberadas, aviso "Clase cancelada", no se regenera.
11. **Clases fijas:** asignada + mensualidad activa → reservada sola cada semana; sin mensualidad → no; liberar ≥1h → recupera cuota.
12. **Recuperar contraseña:** recuperar → restablecer → login nueva OK; token reutilizado rechazado; contraseña vieja rechazada.
13. **Límite de login:** 5 fallos → 6.º (aunque correcto) 429; otra usuaria no afectada.
14. **Eliminar cuenta:** anonimizada, su token deja de valer, su plaza pasa a la lista con aviso; ADMIN no se puede eliminar.
15. **Imágenes:** subir foto → aparece en sus clases; no-imagen rechazada; usuaria no puede subir (403).
16. **Sin conexión:** con red se ven datos; sin red se ven los guardados con franja; reservar sin red → mensaje de que hace falta conexión; al cerrar sesión no queda copia.

---

## 14. Estado: HECHO y PENDIENTE (hoja de ruta)

### HECHO (backend + web + app, salvo indicación)
Motor completo (cuota semanal, mes de la clase, ventana 3 días, cancelación 1 h, lista de espera con promoción), mensualidades por mes (activar futuro, pausar, reactivar, historial), cambio de programa auditado, saldo de compensación + ajuste/reembolso, horario base con materialización perezosa, calendario (crear/editar/cancelar con solapes), clases fijas, asistencia, invitada, migración a PostgreSQL, notificaciones push + email (consola), recuperar contraseña, límite de login, eliminar cuenta RGPD, fotos de profesionales e imágenes de programa, modo sin conexión (web y app), PWA, zona horaria, app móvil Expo con modo usuaria y modo admin.

### PENDIENTE — Fase 1: producción (por orden)
1. **Commitear** los dos proyectos (pedir OK) y **subir a GitHub en repositorios privados**.
2. **Vercel + Neon (Frankfurt)**: cuenta del usuario (GitHub → Vercel; Neon desde Storage de Vercel), env vars (`DATABASE_URL`, `TZ`, `RESEND_*`, `GOOGLE_CLIENT_IDS`), `init-db-pg.mjs` contra Neon, revisar pool `max:5` en serverless (usar el host `-pooler` de Neon). Plan **Pro** antes de uso real.
3. **Resend** + dominio verificado → emails reales.
4. **Datos reales del centro** en `/mas` y textos legales (términos, privacidad RGPD), decisión final de marca.
5. **Igualar el admin web** con el de la app: asistencia, clases fijas y eliminar usuaria.
6. Monitorización (UptimeRobot + Sentry), backups verificados (los de Neon + volcado periódico), migraciones versionadas en vez de scripts sueltos.
7. Alta de usuarias reales.

### PENDIENTE — Fase 2: app en las tiendas (`fv2`)
1. Iconos y splash con la marca (hoy los de Expo).
2. Quitar la dependencia no usada `react-native-nitro-google-signin`.
3. `eas.json` + cuenta Expo; **development build** (Google, push) y APK de prueba para Fátima.
4. Google Cloud: client IDs web/android/iOS.
5. Firebase (FCM) para push en Android; credenciales APNs para iOS.
6. Recordatorios push programados (p. ej. la víspera).
7. Abrir el enlace de restablecer contraseña dentro de la app (deep link `mamaenmovimiento://`), hoy abre la web.
8. Cuentas Apple Developer (~99 $/año) y Google Play (~25 $); fichas, política de privacidad, EAS Submit. Apple revisa con lupa (guideline 4.2): la app debe aportar valor nativo (push, etc.).

### PENDIENTE — Fase 3: proyecto Flutter/Dart de comparación
Mismo producto sobre el mismo backend (API no cambia), en carpeta propia. Al final se elige uno.

### Deuda técnica / ideas
Tests automatizados de las reglas; estadísticas de ocupación/asistencia para la profesora; gestión de profesionales y salas desde admin; renombrar estados `*_CREDITO`; `react-hooks/set-state-in-effect`; web push (VAPID) en la PWA; texto de completa (`Completo` vs `8/8`); concurrencia en la última plaza (revisar bloqueo de fila).

---

## 15. Si hubiera que empezar de cero: orden recomendado

1. **Base de datos PostgreSQL desde el día 1** (esquema §5) con migraciones versionadas; nada de SQLite.
2. **Backend/API** con el motor de reglas (§2) y tests de los casos §13 **antes** de cualquier pantalla. Autenticación con cookie (web) **y** Bearer (móvil) desde el principio.
3. **App móvil Expo** (usuaria + admin por rol) consumiendo la API; la web admin para PC después (o la propia app en web).
4. Notificaciones (push + email), recuperar contraseña, límite de login y eliminación de cuenta **antes** de usuarias reales.
5. Despliegue temprano (Vercel/Neon UE) para probar en móviles reales fuera de la wifi.
6. Clases fijas como modelo principal (así trabaja la clínica) y reservas sueltas como complemento.
7. Iconos/marca, development build, stores.

---

## 16. Instrucciones para la IA que tome el relevo

1. Lee este documento y los `AGENTS.md` de ambos proyectos antes de tocar nada. En `fv`, lee la guía de Next 16 en `node_modules/next/dist/docs/` antes de usar APIs nuevas.
2. Reglas que **no** se pueden romper: no volver a créditos mensuales; no pagos online; no mezclar ADMIN y USUARIO; la mensualidad es la **del mes de la clase**; mantener límite semanal y ventana de 3 días; el backend es la autoridad; nunca confiar en un `usuarioId` enviado por el cliente.
3. La lógica va en `fv` (backend); las pantallas, **en `fv2`** (y en la web si aplica). Cuando una pantalla exista en uno solo, dilo.
4. Siempre `db.close()` en `finally`; transacciones para cambios atómicos; avisos (push/email) **después** del COMMIT y sin poder romper la operación.
5. Tras cada cambio: `tsc`, prueba concreta contra la API real y limpiar los datos de prueba creados.
6. No borrar archivos/datos que no hayas creado sin confirmación; no hacer push ni commits sin permiso.
7. Si una regla de negocio no está aquí, **pregunta**. Explica al usuario en lenguaje sencillo qué has hecho, qué has probado y qué no.

**Resumen de una frase:** app móvil (y web) para que las clientas de una clínica de suelo pélvico (Embarazo, Postparto, +50) gestionen sus clases fijas y reservas con mensualidades pagadas en la clínica que dan 1 o 2 clases por semana, con lista de espera, compensación por parto, notificaciones y un modo administración para la profesora.
