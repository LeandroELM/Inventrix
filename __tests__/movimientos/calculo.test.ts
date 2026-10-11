import { generaAlerta, proyectar, validarSalida } from "@/features/movimientos/calculo";

describe("calculo de movimientos", () => {
  it("proyecta existencias", () => {
    expect(proyectar(45, 10, "entrada")).toBe(55);
    expect(proyectar(24, 3, "salida")).toBe(21);
    expect(proyectar(10.1, 0.2, "salida")).toBe(9.9);
  });
  it("valida salidas contra existencias", () => {
    expect(validarSalida(5, 6)).toBe("La cantidad supera las existencias disponibles.");
    expect(validarSalida(5, 5)).toBeNull();
  });
  it("avisa cuando la salida alcanza el punto de pedido", () => {
    expect(generaAlerta(12, 2, 10)).toBe(true);
    expect(generaAlerta(9, 1, 10)).toBe(false);
    expect(generaAlerta(12, 1, 10)).toBe(false);
  });
});
