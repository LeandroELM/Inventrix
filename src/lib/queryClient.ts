import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

let alNoAutorizado: (() => void) | null = null;

/** Registra qué hacer cuando cualquier query/mutación falla con NO_AUTORIZADO. */
export function configurarCierrePorNoAutorizado(cerrarSesion: (() => void) | null) {
  alNoAutorizado = cerrarSesion;
}

function revisar(error: unknown) {
  if (mensajeCrudo(error).includes("NO_AUTORIZADO")) alNoAutorizado?.();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: revisar }),
  mutationCache: new MutationCache({ onError: revisar }),
  defaultOptions: {
    queries: {
      retry: (cantidad, error) =>
        cantidad < 1 && !(error instanceof Error ? error.message : mensajeCrudo(error)).includes("NO_AUTORIZADO"),
    },
    mutations: { retry: false },
  },
});

function mensajeCrudo(e: unknown): string {
  return typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : String(e);
}
