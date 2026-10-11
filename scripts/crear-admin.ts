// Crea el primer admin de un cliente.
// Uso: npx tsx --env-file=.env scripts/crear-admin.ts <usuario> <nombre> <password>
// Requiere SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";

const DOMINIO_USUARIOS = "usuarios.inventrix.app";

// Misma regla que supabase/functions/admin-usuarios/logica.ts (runtimes distintos: duplicada).
function validar(usuario: string, nombre: string, password: string): void {
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario) || nombre.trim() === "" || password.length < 8) {
    throw new Error("DATOS_INVALIDOS");
  }
}

async function main(): Promise<void> {
  const [usuario, nombre, password] = process.argv.slice(2);
  if (!usuario || !nombre || !password) {
    console.error("Uso: crear-admin.ts <usuario> <nombre> <password>");
    process.exit(1);
  }
  try {
    validar(usuario, nombre, password);
  } catch {
    console.error("DATOS_INVALIDOS: usuario [a-z0-9._-]{3,30}, nombre no vacío, password >= 8");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) {
    console.error("Faltan SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, clave, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email: `${usuario}@${DOMINIO_USUARIOS}`,
    password,
    email_confirm: true,
    user_metadata: { usuario, nombre, rol: "admin" },
  });
  if (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  console.log(`Admin creado: ${usuario} (${data.user.id})`);
}

void main();
