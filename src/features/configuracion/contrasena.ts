export const MIN_CONTRASENA = 8;

/** Devuelve el mensaje de error o null si la contraseña nueva es válida. */
export function validarContrasenaNueva(nueva: string, confirmacion: string): string | null {
  if (nueva.length < MIN_CONTRASENA) return `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres.`;
  if (nueva !== confirmacion) return "Las contraseñas no coinciden.";
  return null;
}
