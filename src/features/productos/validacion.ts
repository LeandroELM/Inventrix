import { z } from "zod";
import { UNIDADES, type Unidad } from "./unidades";

const MAXIMO = 9999999999.99;
const UNIDADES_VALIDAS = Object.keys(UNIDADES) as [Unidad, ...Unidad[]];

export type ResultadoCantidad = { ok: true; valor: number } | { ok: false; error: string };

export function validarCantidad(
  valor: string,
  unidad: Unidad,
  { permitirCero }: { permitirCero: boolean },
): ResultadoCantidad {
  const texto = valor.trim().replace(",", ".");
  if (texto === "") return { ok: false, error: "Ingresa una cantidad." };
  if (!/^\d+(\.\d+)?$/.test(texto)) return { ok: false, error: "Ingresa un número válido." };
  const numero = Number(texto);
  if (!Number.isFinite(numero) || numero > MAXIMO) {
    return { ok: false, error: "Cantidad demasiado grande." };
  }
  if (UNIDADES[unidad].entera && texto.includes(".")) {
    return { ok: false, error: "Esta unidad solo admite números enteros." };
  }
  if ((texto.split(".")[1] ?? "").length > 2) return { ok: false, error: "Máximo 2 decimales." };
  if (numero === 0 && !permitirCero) {
    return { ok: false, error: "La cantidad debe ser mayor que 0." };
  }
  return { ok: true, valor: numero };
}

export const esquemaProducto = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Ingresa el nombre.")
    .max(120, "El nombre admite máximo 120 caracteres."),
  unidad: z.enum(UNIDADES_VALIDAS, { error: "Selecciona una unidad válida." }),
  codigo: z
    .string()
    .regex(
      /^[A-Za-z0-9-]{4,64}$/,
      "El código debe tener entre 4 y 64 caracteres: letras, números o guiones.",
    ),
  cantidadInicial: z
    .number({ error: "Ingresa la cantidad inicial." })
    .min(0, "La cantidad inicial no puede ser negativa.")
    .max(MAXIMO, "Cantidad demasiado grande."),
  puntoPedido: z
    .number({ error: "Ingresa el punto de pedido." })
    .min(0, "El punto de pedido no puede ser negativo.")
    .max(MAXIMO, "Cantidad demasiado grande."),
});

export type DatosProducto = z.infer<typeof esquemaProducto>;

export type ValoresFormulario = {
  nombre: string;
  unidad: Unidad;
  codigo: string;
  cantidadInicial: string;
  puntoPedido: string;
};
export type ErroresFormulario = Partial<Record<keyof ValoresFormulario, string>>;
export type ResultadoFormulario =
  | { ok: true; datos: DatosProducto }
  | { ok: false; errores: ErroresFormulario };

// Valida el formulario de producto: cantidades según la unidad y el resto con zod.
export function validarFormularioProducto(v: ValoresFormulario): ResultadoFormulario {
  const errores: ErroresFormulario = {};
  const inicial = validarCantidad(v.cantidadInicial, v.unidad, { permitirCero: true });
  const pedido = validarCantidad(v.puntoPedido, v.unidad, { permitirCero: true });
  if (!inicial.ok) errores.cantidadInicial = inicial.error;
  if (!pedido.ok) errores.puntoPedido = pedido.error;
  const r = esquemaProducto.safeParse({
    nombre: v.nombre,
    unidad: v.unidad,
    codigo: v.codigo.trim(),
    cantidadInicial: inicial.ok ? inicial.valor : 0,
    puntoPedido: pedido.ok ? pedido.valor : 0,
  });
  if (!r.success) {
    for (const i of r.error.issues) {
      const campo = i.path[0] as keyof ValoresFormulario;
      if (!errores[campo]) errores[campo] = i.message;
    }
  }
  if (Object.keys(errores).length > 0 || !r.success) return { ok: false, errores };
  return { ok: true, datos: r.data };
}
