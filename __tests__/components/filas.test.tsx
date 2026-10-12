import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FilaMovimiento } from "@/components/FilaMovimiento";
import { FilaProducto } from "@/components/FilaProducto";
import { etiquetaMovimiento } from "@/features/movimientos/calculo";
import { contraste } from "@/tema/contraste";
import { PALETAS, type Esquema } from "@/tema/tokens";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function montar(ui: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>{ui}</TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("FilaProducto", () => {
  it("muestra la etiqueta de estado y la etiqueta de accesibilidad", async () => {
    await montar(<FilaProducto nombre="Arroz blanco" detalle="Granos" cantidad="10 lb" estado="bajo" />);
    expect(screen.getByText("Bajo inventario")).toBeTruthy();
    expect(screen.getByLabelText("Arroz blanco, 10 lb, Bajo inventario")).toBeTruthy();
  });

  it("con onPress es un boton que lo llama", async () => {
    const onPress = jest.fn();
    await montar(<FilaProducto nombre="Arroz blanco" detalle="Granos" cantidad="10 lb" estado="bajo" onPress={onPress} />);
    const boton = screen.getByRole("button", { name: "Arroz blanco, 10 lb, Bajo inventario" });
    fireEvent.press(boton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("limita el nombre a una linea", async () => {
    const nombre = "A".repeat(60);
    await montar(<FilaProducto nombre={nombre} detalle="x" cantidad="1 unid." estado="disponible" />);
    expect(screen.getByText(nombre).props.numberOfLines).toBe(1);
  });
});

describe("FilaMovimiento", () => {
  const ahora = new Date(2026, 9, 11, 12, 0, 0);
  const hoy0915 = new Date(2026, 9, 11, 9, 15, 0).toISOString();

  it("salida con motivo y usuario arma la linea secundaria y la cantidad", async () => {
    await montar(
      <FilaMovimiento
        producto="Arroz"
        tipo="salida"
        motivo="venta"
        fecha={hoy0915}
        cantidad={2}
        unidad="unidad"
        usuario="Carlos M."
        ahora={ahora}
      />,
    );
    expect(screen.getByText("Salida · Venta · Hoy 09:15 · Carlos M.")).toBeTruthy();
    expect(screen.getByText(etiquetaMovimiento("salida", 2, "unidad"))).toBeTruthy();
  });

  it("baja sin motivo no muestra null", async () => {
    await montar(
      <FilaMovimiento producto="Arroz" tipo="baja" motivo={null} fecha={hoy0915} cantidad={1} unidad="unidad" ahora={ahora} />,
    );
    expect(screen.getByText("Baja · Hoy 09:15")).toBeTruthy();
    expect(screen.queryByText(/null/)).toBeNull();
  });

  it("inicial se muestra como Entrada", async () => {
    await montar(
      <FilaMovimiento producto="Arroz" tipo="inicial" motivo={null} fecha={hoy0915} cantidad={5} unidad="unidad" ahora={ahora} />,
    );
    expect(screen.getByText("Entrada · Hoy 09:15")).toBeTruthy();
  });
});

describe.each<Esquema>(["claro", "oscuro"])("contraste del avatar de FilaProducto (%s)", (esquema) => {
  const c = PALETAS[esquema];
  it.each([
    ["disponible", c.textoExito, c.exitoSuave],
    ["bajo", c.textoAdvertencia, c.advertenciaSuave],
    ["sin", c.sobrePrimario, c.primario],
  ])("%s alcanza 4.5:1", (_estado, texto, fondo) => {
    expect(contraste(texto, fondo, c.superficie)).toBeGreaterThanOrEqual(4.5);
  });
});
