import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
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
