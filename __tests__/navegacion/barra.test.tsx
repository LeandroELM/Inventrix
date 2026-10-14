/// <reference types="node" />
import { fireEvent, render, screen } from "@testing-library/react-native";
import fs from "fs";
import path from "path";
import type { ComponentProps } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ALTO_BARRA,
  BarraInferior,
  ESPACIO_TRIX,
  EspacioInferiorContext,
  MARGEN_BARRA,
  espacioInferior,
  useEspacioInferior,
} from "@/components/BarraInferior";
import { Texto } from "@/components/Texto";
import { tabsPara } from "@/features/auth/navegacion";
import { useTecladoVisible } from "@/lib/useTecladoVisible";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("@/lib/useTecladoVisible", () => ({ useTecladoVisible: jest.fn(() => false) }));

type Props = ComponentProps<typeof BarraInferior>;

function propsBarra(rol: "admin" | "operativo", activa = 0) {
  const visibles = tabsPara(rol);
  const navigate = jest.fn();
  const emit = jest.fn((_e: unknown) => ({ defaultPrevented: false }));
  const props = {
    state: { index: activa, routes: visibles.map((name) => ({ key: name, name })) },
    navigation: { navigate, emit },
    descriptors: {},
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    visibles,
  } as unknown as Props;
  return { props, navigate, emit };
}

async function dibujar(props: Props) {
  await render(
    <TemaProvider>
      <BarraInferior {...props} />
    </TemaProvider>,
  );
}

function MuestraEspacio() {
  return <Texto>{String(useEspacioInferior())}</Texto>;
}

describe("BarraInferior", () => {
  beforeEach(() => jest.mocked(useTecladoVisible).mockReturnValue(false));

  it("admin: 4 pestañas y el botón Nuevo producto", async () => {
    await dibujar(propsBarra("admin").props);
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByLabelText("Nuevo producto")).toBeTruthy();
  });

  it("las pestañas usan nombres completos para lectores de pantalla", async () => {
    await dibujar(propsBarra("admin").props);
    expect(screen.getByRole("tab", { name: "Administración" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Configuración" })).toBeTruthy();
  });

  it("operativo: 4 pestañas y sin Nuevo producto", async () => {
    await dibujar(propsBarra("operativo").props);
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByLabelText("Nuevo producto")).toBeNull();
  });

  it("la pestaña activa está seleccionada", async () => {
    await dibujar(propsBarra("operativo", 1).props);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[1].props.accessibilityState).toMatchObject({ selected: true });
    expect(tabs[0].props.accessibilityState).toMatchObject({ selected: false });
  });

  it("presionar Buscar navega a buscar", async () => {
    const { props, navigate } = propsBarra("operativo");
    await dibujar(props);
    fireEvent.press(screen.getByRole("tab", { name: "Buscar" }));
    expect(navigate).toHaveBeenCalledWith("buscar");
  });

  it("emite tabPress con la clave de la ruta", async () => {
    const { props, emit } = propsBarra("operativo");
    await dibujar(props);
    fireEvent.press(screen.getByRole("tab", { name: "Buscar" }));
    expect(emit).toHaveBeenCalledWith({ type: "tabPress", target: "buscar", canPreventDefault: true });
  });

  it("Movimientos navega a la raíz de su stack", async () => {
    const { props, navigate } = propsBarra("operativo");
    await dibujar(props);
    fireEvent.press(screen.getByRole("tab", { name: "Movimientos" }));
    expect(navigate).toHaveBeenCalledWith("movimientos", { screen: "index", pop: true });
  });

  it("no navega si tabPress fue prevenido", async () => {
    const { props, navigate, emit } = propsBarra("operativo");
    emit.mockReturnValue({ defaultPrevented: true });
    await dibujar(props);
    fireEvent.press(screen.getByRole("tab", { name: "Buscar" }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("la barra es un tablist", async () => {
    await dibujar(propsBarra("admin").props);
    expect(screen.getByTestId("barra-inferior").props.accessibilityRole).toBe("tablist");
  });

  it("no se dibuja con el teclado visible", async () => {
    jest.mocked(useTecladoVisible).mockReturnValue(true);
    await dibujar(propsBarra("admin").props);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByLabelText("Nuevo producto")).toBeNull();
  });

  it("reserva espacio para barra y Trix", () => {
    expect(espacioInferior(24)).toBe(162);
    expect([ALTO_BARRA, MARGEN_BARRA, ESPACIO_TRIX]).toEqual([62, 12, 64]);
  });

  it("useEspacioInferior es 0 fuera de las pestañas", async () => {
    await render(
      <TemaProvider>
        <MuestraEspacio />
      </TemaProvider>,
    );
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("useEspacioInferior dentro de las pestañas suma barra, inset y Trix", async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 24 } }}
      >
        <TemaProvider>
          <EspacioInferiorContext.Provider value={true}>
            <MuestraEspacio />
          </EspacioInferiorContext.Provider>
        </TemaProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText(String(espacioInferior(24)))).toBeTruthy();
  });

  it("el layout de pestañas no reserva espacio en la escena", () => {
    const fuente = fs.readFileSync(path.join(__dirname, "../../app/(app)/_layout.tsx"), "utf8");
    expect(fuente).not.toContain("paddingBottom");
    expect(fuente).toContain("EspacioInferiorContext.Provider");
  });
});
