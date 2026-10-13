import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TarjetaIndicador } from "@/components/TarjetaIndicador";
import { TarjetaPrincipal, VELO_CLARO } from "@/components/TarjetaPrincipal";
import { contraste } from "@/tema/contraste";
import { PALETAS, type Esquema } from "@/tema/tokens";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

// Sin animacion: el conteo de NumeroAnimado actualizaria estado fuera de act().
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

async function montar(ui: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>{ui}</TemaProvider>
    </SafeAreaProvider>,
  );
}

const accesos = (a: () => void, b: () => void, c: () => void) => [
  { titulo: "Escanear", icono: "escanear" as const, onPress: a, destacado: true },
  { titulo: "Entrada", icono: "entrada" as const, onPress: b },
  { titulo: "Salida", icono: "salida" as const, onPress: c },
];

describe("TarjetaPrincipal", () => {
  it("sin chips no renderiza chips", async () => {
    await montar(<TarjetaPrincipal titulo="Valor" valor={5} accesos={accesos(jest.fn(), jest.fn(), jest.fn())} />);
    expect(screen.queryByTestId("chip-principal")).toBeNull();
  });

  it("con dos chips los muestra", async () => {
    await montar(
      <TarjetaPrincipal
        titulo="Valor"
        valor={5}
        chips={[
          { texto: "12 productos", tono: "neutro" },
          { texto: "+3 hoy", tono: "exito" },
        ]}
        accesos={accesos(jest.fn(), jest.fn(), jest.fn())}
      />,
    );
    expect(screen.getAllByTestId("chip-principal")).toHaveLength(2);
    expect(screen.getByText("12 productos")).toBeTruthy();
    expect(screen.getByText("+3 hoy")).toBeTruthy();
  });

  it("cada acceso es un boton que llama su onPress", async () => {
    const [a, b, c] = [jest.fn(), jest.fn(), jest.fn()];
    await montar(<TarjetaPrincipal titulo="Valor" valor={5} accesos={accesos(a, b, c)} />);
    await fireEvent.press(screen.getByRole("button", { name: "Escanear" }));
    await fireEvent.press(screen.getByRole("button", { name: "Entrada" }));
    await fireEvent.press(screen.getByRole("button", { name: "Salida" }));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledTimes(1);
  });
});

describe("TarjetaIndicador", () => {
  it("alerta es un boton con valor y texto en la etiqueta", async () => {
    const onPress = jest.fn();
    await montar(<TarjetaIndicador variante="alerta" valor={4} texto="Productos en punto de pedido" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "4 Productos en punto de pedido" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("lista muestra cada fila", async () => {
    await montar(
      <TarjetaIndicador
        variante="lista"
        titulo="Hoy"
        filas={[
          { valor: "8", etiqueta: "Entradas" },
          { valor: "3", etiqueta: "Salidas" },
        ]}
      />,
    );
    expect(screen.getByText("Hoy")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("Entradas")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Salidas")).toBeTruthy();
  });
});

describe.each(["claro", "oscuro"] as Esquema[])("contraste de las tarjetas (%s)", (esquema) => {
  const c = PALETAS[esquema];

  it("acceso destacado y chip de exito: sobreAcento oscura sobre marcaAcento", () => {
    expect(contraste(c.sobreAcento, c.marcaAcento)).toBeGreaterThanOrEqual(4.5);
  });

  it("indicador alerta: textoAdvertencia sobre advertenciaSuave", () => {
    expect(contraste(c.textoAdvertencia, c.advertenciaSuave, c.fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it("insignia del indicador: icono oscuro sobre advertencia", () => {
    expect(contraste(c.sobreAcento, c.advertencia)).toBeGreaterThanOrEqual(4.5);
  });

  it("texto claro sobre el degradado y sobre accesos/chips translucidos", () => {
    for (const extremo of c.encabezado) {
      expect(contraste(c.sobrePrimario, extremo)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c.sobrePrimario, VELO_CLARO, extremo)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
