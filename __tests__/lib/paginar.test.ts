import { TAMANO_LOTE, traerTodo } from "@/lib/paginar";

function fuente(total: number) {
  const fetchPage = jest.fn(async (desde: number, hasta: number) =>
    Array.from({ length: Math.max(0, Math.min(hasta + 1, total) - desde) }, (_, i) => desde + i),
  );
  return fetchPage;
}

describe("traerTodo", () => {
  it("con 0 filas hace una sola llamada", async () => {
    const f = fuente(0);
    await expect(traerTodo(f)).resolves.toEqual([]);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledWith(0, TAMANO_LOTE - 1);
  });

  it("con un múltiplo exacto pide una página vacía extra", async () => {
    const f = fuente(2000);
    const r = await traerTodo(f);
    expect(r).toHaveLength(2000);
    expect(f).toHaveBeenCalledTimes(3);
    expect(f).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(f).toHaveBeenNthCalledWith(3, 2000, 2999);
  });

  it("con 1000 + n une las páginas en orden", async () => {
    const f = fuente(1237);
    const r = await traerTodo(f);
    expect(r).toHaveLength(1237);
    expect(r[1236]).toBe(1236);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("propaga el error de una página", async () => {
    const f = jest.fn().mockRejectedValue(new Error("boom"));
    await expect(traerTodo(f)).rejects.toThrow("boom");
  });
});
