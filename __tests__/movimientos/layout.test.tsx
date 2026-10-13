import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Layout from "../../app/(app)/movimientos/_layout";
import { TemaProvider } from "@/tema/TemaProvider";

let mockRuta = "entrada";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/productos/api", () => ({
  obtenerProducto: jest.fn(async () => null),
  listarProductos: jest.fn(async () => []),
}));
// Stack simulado: dibuja la pantalla activa con el encabezado del Stack si este no está oculto.
jest.mock("expo-router", () => {
  const React = require("react");
  const PANTALLAS: Record<string, () => { default: React.ComponentType }> = {
    entrada: () => require("../../app/(app)/movimientos/entrada"),
    salida: () => require("../../app/(app)/movimientos/salida"),
  };
  type MockOpciones = { headerShown?: boolean; title?: string; header?: (p: unknown) => React.ReactNode };
  function Screen() {
    return null;
  }
  function Stack({ screenOptions, children }: { screenOptions: MockOpciones; children: React.ReactNode }) {
    const hijos = React.Children.toArray(children) as React.ReactElement<{ name: string; options?: MockOpciones }>[];
    const pantalla = hijos.find((h) => h.props.name === mockRuta);
    if (!pantalla) return null;
    const options = { ...screenOptions, ...pantalla.props.options };
    const Componente = PANTALLAS[mockRuta]().default;
    return (
      <>
        {options.headerShown === false
          ? null
          : options.header?.({ options, navigation: { goBack: jest.fn() }, back: { title: "" } })}
        <Componente />
      </>
    );
  }
  Stack.Screen = Screen;
  return {
    Stack,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({}),
    useIsFocused: () => true,
  };
});
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

async function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <QueryClientProvider client={qc}>
          <Layout />
        </QueryClientProvider>
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("Layout de movimientos", () => {
  it.each([
    ["entrada", "Registrar entrada"],
    ["salida", "Registrar salida"],
  ])("%s muestra un solo encabezado con volver", async (ruta, titulo) => {
    mockRuta = ruta;
    await renderizar();
    await screen.findByLabelText("Buscar producto por nombre o código");
    expect(screen.getAllByRole("header", { name: titulo })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Volver" })).toHaveLength(1);
  });
});
