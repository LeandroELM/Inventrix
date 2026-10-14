import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GraficoBarras, escalaGrafico, etiquetaEje } from "@/components/GraficoBarras";
import type { PuntoSerie } from "@/features/reportes/dashboard";
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

const SERIE: PuntoSerie[] = [
  { fecha: "2026-10-01", entradas: 3, salidas: 7 },
  { fecha: "2026-10-02", entradas: 5, salidas: 1 },
];

describe("escalaGrafico", () => {
  it("escalaGrafico toma el mayor valor", () => {
    expect(escalaGrafico(SERIE)).toBe(7);
  });

  it("escalaGrafico con todo en cero es 1", () => {
    expect(escalaGrafico([{ fecha: "2026-10-01", entradas: 0, salidas: 0 }])).toBe(1);
  });
});

describe("etiquetaEje", () => {
  it("etiquetaEje en 7 días usa la inicial del día", () => {
    expect(etiquetaEje("2026-10-13", 0, "7d")).toBe("M");
  });

  it("etiquetaEje en 30 días cada 5", () => {
    expect(etiquetaEje("2026-10-01", 0, "30d")).toBe("1");
    expect(etiquetaEje("2026-10-04", 3, "30d")).toBe("");
    expect(etiquetaEje("2026-10-06", 5, "30d")).toBe("6");
  });
});

describe("GraficoBarras", () => {
  it("resume entradas y salidas para el lector", async () => {
    await montar(<GraficoBarras serie={SERIE} periodo="7d" />);
    expect(screen.getByLabelText("Entradas y salidas por día: 8 entradas y 8 salidas en el periodo")).toBeTruthy();
  });

  it("sin movimientos muestra el mensaje", async () => {
    await montar(
      <GraficoBarras serie={[{ fecha: "2026-10-01", entradas: 0, salidas: 0 }]} periodo="7d" />,
    );
    expect(screen.getByText("Sin movimientos en el periodo.")).toBeTruthy();
  });

  it("muestra la leyenda", async () => {
    await montar(<GraficoBarras serie={SERIE} periodo="7d" />);
    expect(screen.getByText("Entradas")).toBeTruthy();
    expect(screen.getByText("Salidas")).toBeTruthy();
  });
});
