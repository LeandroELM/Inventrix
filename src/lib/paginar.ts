// PostgREST limita cada respuesta a `max_rows` (1000). Pide páginas con
// .range(desde, hasta) hasta recibir una incompleta.
export const TAMANO_LOTE = 1000;

export async function traerTodo<T>(fetchPage: (desde: number, hasta: number) => Promise<T[]>): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += TAMANO_LOTE) {
    const pagina = await fetchPage(desde, desde + TAMANO_LOTE - 1);
    todo.push(...pagina);
    if (pagina.length < TAMANO_LOTE) return todo;
  }
}
