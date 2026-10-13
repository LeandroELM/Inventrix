import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ChipsFiltro } from "@/components/ChipsFiltro";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

const opciones = [
  { valor: "TODOS" as const, texto: "Todos" },
  { valor: "BAJO" as const, texto: "Bajo" },
  { valor: "AGOTADO" as const, texto: "Agotado" },
];

async function montar(ui: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>{ui}</TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("ChipsFiltro", () => {
  it("renderiza un grupo accesible con la etiqueta dada", async () => {
    await montar(<ChipsFiltro opciones={opciones} valor="TODOS" onCambio={jest.fn()} etiqueta="Filtrar estado" />);
    expect(screen.getByLabelText("Filtrar estado")).toBeTruthy();
  });

  it("marca como seleccionado solo el chip activo", async () => {
    await montar(<ChipsFiltro opciones={opciones} valor="BAJO" onCambio={jest.fn()} etiqueta="Filtrar estado" />);
    expect(screen.getByRole("button", { name: "Bajo" }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole("button", { name: "Todos" }).props.accessibilityState.selected).toBe(false);
  });

  it("al tocar otro chip llama onCambio con su valor", async () => {
    const onCambio = jest.fn();
    await montar(<ChipsFiltro opciones={opciones} valor="TODOS" onCambio={onCambio} etiqueta="Filtrar estado" />);
    fireEvent.press(screen.getByRole("button", { name: "Agotado" }));
    expect(onCambio).toHaveBeenCalledWith("AGOTADO");
  });

  it("cada chip mide al menos 48 dp de alto", async () => {
    await montar(<ChipsFiltro opciones={opciones} valor="TODOS" onCambio={jest.fn()} etiqueta="Filtrar estado" />);
    const chip = screen.getByRole("button", { name: "Todos" });
    expect(StyleSheetFlat(chip.props.style).minHeight).toBeGreaterThanOrEqual(48);
  });
});

function StyleSheetFlat(style: unknown): { minHeight?: number } {
  return (Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity)) : style) as { minHeight?: number };
}
