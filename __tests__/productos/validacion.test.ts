import { esquemaProducto, validarCantidad } from "@/features/productos/validacion";

const no = { permitirCero: false };
const si = { permitirCero: true };

describe("validarCantidad", () => {
  it("errores del brief", () => {
    expect(validarCantidad("2.5", "caja", no)).toEqual({ ok: false, error: "Esta unidad solo admite números enteros." });
    expect(validarCantidad("2.555", "libra", no)).toEqual({ ok: false, error: "Máximo 2 decimales." });
    expect(validarCantidad("0", "unidad", si)).toEqual({ ok: true, valor: 0 });
    expect(validarCantidad("0", "unidad", no)).toEqual({ ok: false, error: "La cantidad debe ser mayor que 0." });
  });
  it("vacío", () => {
    expect(validarCantidad("", "unidad", no)).toEqual({ ok: false, error: "Ingresa una cantidad." });
    expect(validarCantidad("   ", "unidad", no)).toEqual({ ok: false, error: "Ingresa una cantidad." });
  });
  it("acepta coma decimal y espacios", () => {
    expect(validarCantidad(" 2,5 ", "kilogramo", no)).toEqual({ ok: true, valor: 2.5 });
  });
  it("rechaza no numéricos, Infinity y negativos", () => {
    for (const v of ["abc", "NaN", "Infinity", "1e3", "-1", "1.2.3", "--"]) {
      expect(validarCantidad(v, "libra", si).ok).toBe(false);
    }
  });
  it("rechaza muy grande", () => {
    expect(validarCantidad("10000000000", "libra", no)).toEqual({ ok: false, error: "Cantidad demasiado grande." });
    expect(validarCantidad("9999999999.99", "libra", no)).toEqual({ ok: true, valor: 9999999999.99 });
  });
  it("entero válido", () => expect(validarCantidad("12", "caja", no)).toEqual({ ok: true, valor: 12 }));
});

describe("esquemaProducto", () => {
  const base = { nombre: "Arroz", unidad: "libra", codigo: "ARR-001", cantidadInicial: 10, puntoPedido: 5 };
  it("acepta válido", () => expect(esquemaProducto.safeParse(base).success).toBe(true));
  const msg = (d: object) => {
    const r = esquemaProducto.safeParse({ ...base, ...d });
    return r.success ? null : r.error.issues[0].message;
  };
  it("nombre", () => {
    expect(msg({ nombre: "" })).toBe("Ingresa el nombre.");
    expect(msg({ nombre: "a".repeat(121) })).toBe("El nombre admite máximo 120 caracteres.");
  });
  it("unidad", () => expect(msg({ unidad: "galon" })).toBe("Selecciona una unidad válida."));
  it("codigo", () => {
    expect(msg({ codigo: "ab" })).toBe("El código debe tener entre 4 y 64 caracteres: letras, números o guiones.");
    expect(msg({ codigo: "ab cd" })).toBe("El código debe tener entre 4 y 64 caracteres: letras, números o guiones.");
  });
  it("cantidades", () => {
    expect(msg({ cantidadInicial: -1 })).toBe("La cantidad inicial no puede ser negativa.");
    expect(msg({ puntoPedido: -1 })).toBe("El punto de pedido no puede ser negativo.");
  });
});
