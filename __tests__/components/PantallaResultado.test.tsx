import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { EspacioInferiorContext } from "@/components/BarraInferior";
import { PantallaResultado } from "@/components/PantallaResultado";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

const mockStatusBar = jest.fn((_props: { style: string }) => null);
jest.mock("expo-status-bar", () => ({ StatusBar: (p: { style: string }) => mockStatusBar(p) }));

jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

async function montar(props: Partial<React.ComponentProps<typeof PantallaResultado>> = {}, enPestanas = false, inferior = 0) {
  const principal = { titulo: "Registrar otra salida", onPress: jest.fn() };
  const secundario = { titulo: "Volver al inicio", onPress: jest.fn() };
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: inferior } }}
    >
      <TemaProvider>
        <EspacioInferiorContext.Provider value={enPestanas}>
        <PantallaResultado
          titulo="¡Salida registrada!"
          frase="El inventario se actualizó correctamente."
          producto={{ nombre: "Frijol rojo", detalle: "Motivo: Venta · 09:15" }}
          datos={[
            { etiqueta: "Cantidad retirada", valor: "−5 lb" },
            { etiqueta: "Existencias finales", valor: "55 lb" },
          ]}
          principal={principal}
          secundario={secundario}
          {...props}
        />
        </EspacioInferiorContext.Provider>
      </TemaProvider>
    </SafeAreaProvider>,
  );
  return { principal, secundario };
}

describe("PantallaResultado", () => {
  it("usa íconos claros en la barra de estado", async () => {
    await montar();
    expect(mockStatusBar).toHaveBeenCalledWith({ style: "light" });
  });

  it("anuncia el título como alerta", async () => {
    await montar();
    expect(screen.getByRole("alert")).toHaveTextContent("¡Salida registrada!");
  });

  it("muestra los dos datos y el detalle", async () => {
    await montar();
    expect(screen.getByText("Cantidad retirada")).toBeTruthy();
    expect(screen.getByText("−5 lb")).toBeTruthy();
    expect(screen.getByText("Existencias finales")).toBeTruthy();
    expect(screen.getByText("55 lb")).toBeTruthy();
    expect(screen.getByText("Motivo: Venta · 09:15")).toBeTruthy();
    expect(screen.getByText("El inventario se actualizó correctamente.")).toBeTruthy();
  });

  it("el aviso es opcional", async () => {
    await montar({ aviso: "El producto alcanzó su punto de pedido." });
    expect(screen.getByText("El producto alcanzó su punto de pedido.")).toBeTruthy();
  });

  it("sin aviso no se muestra", async () => {
    await montar();
    expect(screen.queryByText(/punto de pedido/)).toBeNull();
  });

  it("los botones llaman a su acción", async () => {
    const { principal, secundario } = await montar();
    await fireEvent.press(screen.getByRole("button", { name: "Registrar otra salida" }));
    await fireEvent.press(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(principal.onPress).toHaveBeenCalledTimes(1);
    expect(secundario.onPress).toHaveBeenCalledTimes(1);
  });

  it("nombre largo en dos líneas como máximo", async () => {
    const nombre = "Nombre muy largo ".repeat(10).trim();
    await montar({ producto: { nombre, detalle: "Código 1" } });
    expect(screen.getByText(nombre).props.numberOfLines).toBe(2);
  });

  it("los botones quedan sobre la barra en las pestañas", async () => {
    await montar({}, true, 24);
    const estilo = StyleSheet.flatten(screen.getByTestId("acciones-resultado").props.style);
    expect(estilo.paddingBottom).toBe(16 + 162);
  });
});
