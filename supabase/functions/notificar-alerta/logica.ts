import { formatearCantidad, type Unidad } from "../_shared/unidades.ts";

export interface AlertaProducto {
  producto: string;
  existencias: number;
  puntoPedido: number;
  unidad: Unidad;
}

export interface MensajePush {
  to: string;
  title: string;
  body: string;
  sound: "default";
  channelId: "alertas";
  data: { ruta: "/administracion/pedir" };
}

export function construirMensajes(alerta: AlertaProducto, tokens: string[]): MensajePush[] {
  const punto = formatearCantidad(alerta.puntoPedido, alerta.unidad);
  // Las abreviaturas como "unid." ya terminan en punto: no duplicarlo.
  const body = `Quedan ${formatearCantidad(alerta.existencias, alerta.unidad)} y su punto de pedido es ${punto}${
    punto.endsWith(".") ? "" : "."
  }`;
  return tokens.map((to) => ({
    to,
    title: `Reabastecer: ${alerta.producto}`,
    body,
    sound: "default",
    channelId: "alertas",
    data: { ruta: "/administracion/pedir" },
  }));
}

/** Comparación de secretos en tiempo constante respecto al contenido (longitud distinta => falso). */
export function secretoValido(recibido: string | null, esperado: string | undefined): boolean {
  if (!recibido || !esperado) return false;
  const a = new TextEncoder().encode(recibido);
  const b = new TextEncoder().encode(esperado);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function enLotes<T>(items: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) lotes.push(items.slice(i, i + tamano));
  return lotes;
}

interface TicketExpo {
  status: "ok" | "error";
  details?: { error?: string };
}

/** Tokens cuyo ticket indica `DeviceNotRegistered` (tickets en el mismo orden que los mensajes). */
export function tokensNoRegistrados(mensajes: { to: string }[], tickets: TicketExpo[]): string[] {
  const out: string[] = [];
  tickets.forEach((t, i) => {
    if (t.status === "error" && t.details?.error === "DeviceNotRegistered" && mensajes[i]) {
      out.push(mensajes[i].to);
    }
  });
  return out;
}
