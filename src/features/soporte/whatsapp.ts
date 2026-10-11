const BASE = "Hola, necesito asistencia técnica con el sistema de control de inventarios. Mi consulta es: ";

export function enlaceWhatsApp(numero: string, consulta?: string): string {
  const digitos = numero.replace(/\D/g, "");
  if (digitos.length === 0) throw new Error("NUMERO_WHATSAPP_VACIO");
  return `https://wa.me/${digitos}?text=${encodeURIComponent(BASE + (consulta ?? ""))}`;
}
