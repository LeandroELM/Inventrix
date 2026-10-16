export const DOMINIO_USUARIOS = "usuarios.inventrix.app";

export type Rol = "admin" | "operativo";

export type Solicitud =
  | { accion: "crear"; usuario: string; nombre: string; rol: Rol }
  | { accion: "restablecer"; id: string };

export const PATRON_USUARIO = /^[a-z0-9._-]{3,30}$/;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sin caracteres que se confunden al dictarla o copiarla a mano (0 O o 1 I l i L).
export const ALFABETO_CONTRASENA = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export const LARGO_CONTRASENA = 10;

export function validarSolicitud(input: unknown): Solicitud {
  if (typeof input !== "object" || input === null) throw new Error("DATOS_INVALIDOS");
  const datos = input as Record<string, unknown>;
  if (datos.accion === "crear") {
    const { usuario, nombre, rol } = datos;
    const limpio = typeof nombre === "string" ? nombre.trim() : "";
    if (
      typeof usuario !== "string" || !PATRON_USUARIO.test(usuario) ||
      limpio === "" || limpio.length > 120 ||
      (rol !== "admin" && rol !== "operativo")
    ) {
      throw new Error("DATOS_INVALIDOS");
    }
    return { accion: "crear", usuario, nombre: limpio, rol };
  }
  if (datos.accion === "restablecer" && typeof datos.id === "string" && PATRON_UUID.test(datos.id)) {
    // En minúsculas: index.ts lo compara tal cual con el id del llamador.
    return { accion: "restablecer", id: datos.id.toLowerCase() };
  }
  throw new Error("DATOS_INVALIDOS");
}

// Descarta los bytes por encima del último múltiplo del alfabeto: así cada carácter es equiprobable.
export function generarContrasena(): string {
  const limite = 256 - (256 % ALFABETO_CONTRASENA.length);
  let salida = "";
  while (salida.length < LARGO_CONTRASENA) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) {
      if (b < limite && salida.length < LARGO_CONTRASENA) {
        salida += ALFABETO_CONTRASENA[b % ALFABETO_CONTRASENA.length];
      }
    }
  }
  return salida;
}

export function emailDeUsuario(usuario: string): string {
  return `${usuario}@${DOMINIO_USUARIOS}`;
}
