import { crearAlmacenamientoSeguro, type StoreSeguro } from "@/lib/almacenamientoSeguro";

function storeFalso(): StoreSeguro & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItemAsync: async (k) => datos.get(k) ?? null,
    setItemAsync: async (k, v) => { datos.set(k, v); },
    deleteItemAsync: async (k) => { datos.delete(k); },
  };
}

describe("almacenamiento seguro", () => {
  it("guarda y lee valores pequeños en una sola clave", async () => {
    const s = storeFalso();
    const a = crearAlmacenamientoSeguro(s, 10);
    await a.setItem("k", "hola");
    expect(await a.getItem("k")).toBe("hola");
    expect(s.datos.get("k__n")).toBe("1");
  });
  it("parte valores grandes y los reconstruye", async () => {
    const s = storeFalso();
    const a = crearAlmacenamientoSeguro(s, 10);
    const v = "x".repeat(35);
    await a.setItem("k", v);
    expect(s.datos.get("k__n")).toBe("4");
    for (const parte of [...s.datos].filter(([k]) => k.startsWith("k__") && k !== "k__n")) {
      expect(parte[1].length).toBeLessThanOrEqual(10);
    }
    expect(await a.getItem("k")).toBe(v);
  });
  it("sobrescribir con un valor menor limpia partes viejas", async () => {
    const s = storeFalso();
    const a = crearAlmacenamientoSeguro(s, 10);
    await a.setItem("k", "y".repeat(35));
    await a.setItem("k", "corto");
    expect([...s.datos.keys()].sort()).toEqual(["k__0", "k__n"]);
  });
  it("removeItem borra todo y getItem devuelve null", async () => {
    const s = storeFalso();
    const a = crearAlmacenamientoSeguro(s, 10);
    await a.setItem("k", "z".repeat(25));
    await a.removeItem("k");
    expect(s.datos.size).toBe(0);
    expect(await a.getItem("k")).toBeNull();
  });
  it("devuelve null si falta una parte", async () => {
    const s = storeFalso();
    const a = crearAlmacenamientoSeguro(s, 10);
    await a.setItem("k", "w".repeat(25));
    s.datos.delete("k__1");
    expect(await a.getItem("k")).toBeNull();
  });
});
