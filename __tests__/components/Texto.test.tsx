import { render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Texto } from "@/components/Texto";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("oscuro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function renderOscuro(ui: React.ReactElement) {
  await render(<TemaProvider>{ui}</TemaProvider>);
}

describe("Texto", () => {
  it("usa el color de texto del tema", async () => {
    await renderOscuro(<Texto>Hola</Texto>);
    await waitFor(() => {
      const estilo = StyleSheet.flatten(screen.getByText("Hola").props.style);
      expect(estilo.color).toBe("#E6EDF7");
    });
  });

  it("tono peligro", async () => {
    await renderOscuro(<Texto tono="peligro">Hola</Texto>);
    await waitFor(() => {
      const estilo = StyleSheet.flatten(screen.getByText("Hola").props.style);
      expect(estilo.color).toBe("#FF8A93");
    });
  });

  it("variante titulo", async () => {
    await renderOscuro(<Texto variante="titulo">Hola</Texto>);
    const estilo = StyleSheet.flatten((await screen.findByText("Hola")).props.style);
    expect(estilo.fontSize).toBe(20);
    expect(estilo.fontFamily).toBe("Inter_700Bold");
  });
});
