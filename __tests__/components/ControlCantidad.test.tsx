import { fireEvent, render, screen } from "@testing-library/react-native";
import { ControlCantidad } from "@/components/ControlCantidad";
import { TemaProvider } from "@/tema/TemaProvider";
import type { Unidad } from "@/features/productos/unidades";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function montar(props: { valor: string; unidad?: Unidad; maximo?: number }) {
  const onCambio = jest.fn();
  await render(
    <TemaProvider>
      <ControlCantidad unidad="unidad" etiqueta="Cantidad a salir" onCambio={onCambio} {...props} />
    </TemaProvider>,
  );
  return onCambio;
}

describe("ControlCantidad", () => {
  it("aumenta y disminuye de 1 en 1", async () => {
    const onCambio = await montar({ valor: "3" });
    await fireEvent.press(screen.getByLabelText("Aumentar"));
    expect(onCambio).toHaveBeenCalledWith("4");
    await fireEvent.press(screen.getByLabelText("Disminuir"));
    expect(onCambio).toHaveBeenCalledWith("2");
  });

  it("no baja del mínimo", async () => {
    await montar({ valor: "1", unidad: "caja" });
    expect(screen.getByLabelText("Disminuir").props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("no supera el máximo", async () => {
    await montar({ valor: "5", maximo: 5 });
    expect(screen.getByLabelText("Aumentar").props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("decimales redondeados", async () => {
    const onCambio = await montar({ valor: "2.25", unidad: "libra" });
    await fireEvent.press(screen.getByLabelText("Aumentar"));
    expect(onCambio).toHaveBeenCalledWith("3.25");
  });

  it("se puede escribir", async () => {
    const onCambio = await montar({ valor: "1" });
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "7");
    expect(onCambio).toHaveBeenCalledWith("7");
  });
});
