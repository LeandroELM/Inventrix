export interface StoreSeguro {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

// SecureStore limita cada valor a ~2 KB; las sesiones de Supabase pueden excederlo.
export const TAMANO_PARTE = 1800;

/** Guarda `key__n` (cantidad de partes) y `key__0..k` (partes del valor). */
export function crearAlmacenamientoSeguro(store: StoreSeguro, tamanoParte = TAMANO_PARTE) {
  async function cantidadDePartes(key: string): Promise<number> {
    const n = Number(await store.getItemAsync(`${key}__n`));
    return Number.isInteger(n) && n > 0 ? n : 0;
  }

  async function borrar(key: string, desde = 0) {
    const n = await cantidadDePartes(key);
    for (let i = desde; i < n; i++) await store.deleteItemAsync(`${key}__${i}`);
    if (desde === 0) await store.deleteItemAsync(`${key}__n`);
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const n = await cantidadDePartes(key);
      if (n === 0) return null;
      let valor = "";
      for (let i = 0; i < n; i++) {
        const parte = await store.getItemAsync(`${key}__${i}`);
        if (parte === null) return null;
        valor += parte;
      }
      return valor;
    },
    async setItem(key: string, value: string): Promise<void> {
      const previas = await cantidadDePartes(key);
      const partes: string[] = [];
      for (let i = 0; i < value.length; i += tamanoParte) partes.push(value.slice(i, i + tamanoParte));
      if (partes.length === 0) partes.push("");
      for (let i = 0; i < partes.length; i++) await store.setItemAsync(`${key}__${i}`, partes[i]);
      await store.setItemAsync(`${key}__n`, String(partes.length));
      for (let i = partes.length; i < previas; i++) await store.deleteItemAsync(`${key}__${i}`);
    },
    async removeItem(key: string): Promise<void> {
      await borrar(key);
    },
  };
}
