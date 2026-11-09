// Crea (o actualiza la contraseña de) una cuenta de ADMINISTRACIÓN.
//   npm run crear-admin
// Pregunta nombre, email y contraseña (la contraseña no se ve al escribirla).
import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

// Con terminal: preguntas normales y contraseña oculta con asteriscos.
// Sin terminal (respuestas por tubería): se leen línea a línea.
const tty = Boolean(stdin.isTTY);
const rl = createInterface({ input: stdin, output: stdout, terminal: tty });
const cola = [];
const esperando = [];
if (!tty) rl.on("line", (l) => (esperando.length ? esperando.shift()(l) : cola.push(l)));

async function preguntar(texto) {
  if (tty) return rl.question(texto);
  stdout.write(texto + "\n");
  return cola.length ? cola.shift() : new Promise((r) => esperando.push(r));
}

// Contraseña oculta: se leen las teclas una a una (modo "raw") y se pintan asteriscos.
async function preguntarOculto(texto) {
  if (!tty) return preguntar(texto);
  rl.pause();
  stdout.write(texto);
  return new Promise((resolver) => {
    let valor = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const alPulsar = (trozo) => {
      for (const c of trozo) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.removeListener("data", alPulsar);
          stdout.write("\n");
          rl.resume();
          return resolver(valor);
        }
        if (c === "\u0003") process.exit(1); // Ctrl+C
        if (c === "\u007f" || c === "\b") {
          if (valor.length) {
            valor = valor.slice(0, -1);
            stdout.write("\b \b");
          }
        } else if (c >= " ") {
          valor += c;
          stdout.write("*");
        }
      }
    };
    stdin.on("data", alPulsar);
  });
}

const nombre = (await preguntar("Nombre (p. ej. Fátima Veiga): ")).trim();
const email = (await preguntar("Email: ")).trim().toLowerCase();
const pass = await preguntarOculto("Contraseña (mín. 8): ");
const pass2 = await preguntarOculto("Repite la contraseña: ");
rl.close();

if (nombre.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Nombre o email no válidos.");
  process.exit(1);
}
if (pass.length < 8 || pass !== pass2) {
  console.error("La contraseña es demasiado corta o no coincide.");
  process.exit(1);
}

const sal = randomBytes(16).toString("hex");
const hash = `${sal}:${scryptSync(pass, sal, 64).toString("hex")}`;
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    const [u] = await tx`
      INSERT INTO usuarios (nombre, email, programa_id, rol)
      VALUES (${nombre}, ${email}, (SELECT min(id) FROM programas), 'ADMIN')
      ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre, rol = 'ADMIN'
      RETURNING id`;
    await tx`INSERT INTO credenciales (usuario_id, password_hash) VALUES (${u.id}, ${hash})
             ON CONFLICT (usuario_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`;
  });
  console.log(`Cuenta de administración lista: ${email}`);
} finally {
  await sql.end();
}
