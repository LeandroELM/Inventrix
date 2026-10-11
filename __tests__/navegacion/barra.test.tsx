import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { ALTO_BARRA, BarraInferior, ESPACIO_TRIX, MARGEN_BARRA, espacioInferior } from "@/components/BarraInferior";
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

describe("BarraInferior", () => {
  beforeEach(() => jest.mocked(useTecladoVisible).mockReturnValue(false));

  it("admin: 4 pestañas y el botón Nuevo producto", async () => {
    await dibujar(propsBarra("admin").props);
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByLabelText("Nuevo producto")).toBeTruthy();
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
});
