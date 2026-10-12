import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { AvatarProducto, iniciales } from "@/components/AvatarProducto";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Etiqueta } from "@/components/Etiqueta";
import { FilaLista } from "@/components/FilaLista";
import { Segmentado } from "@/components/Segmentado";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function conTema(ui: React.ReactElement) {
  await render(<TemaProvider>{ui}</TemaProvider>);
}

describe("iniciales", () => {
  it("toma las letras de las dos primeras palabras", () => {
    expect(iniciales("Arroz blanco")).toBe("AB");
    expect(iniciales("Detergente")).toBe("DE");
    expect(iniciales("  aceite  900 ml ")).toBe("A9");
  });
});

describe("componentes de presentación", () => {
  it("AvatarProducto usa el mismo color para el mismo nombre", async () => {
    await conTema(
      <>
        <AvatarProducto nombre="Arroz blanco" />
        <AvatarProducto nombre="Arroz blanco" />
      </>,
    );
    const avatares = screen.getAllByTestId("avatar-producto");
    const [a, b] = avatares.map((n) => StyleSheet.flatten(n.props.style).backgroundColor);
    expect(a).toBe(b);
    expect(a).toBeTruthy();
  });

  it("Etiqueta muestra el texto por defecto", async () => {
    await conTema(<Etiqueta tipo="pedir" />);
    expect(screen.getByText("Pedir")).toBeTruthy();
  });

  it("FilaLista presionable expone botón con el título", async () => {
    const onPress = jest.fn();
    await conTema(<FilaLista titulo="Arroz" detalle="kg" valor="5" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "Arroz" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("Segmentado marca la opción activa y avisa el cambio", async () => {
    const onCambio = jest.fn();
    await conTema(
      <Segmentado
        opciones={[
          { valor: "entradas", titulo: "Entradas" },
          { valor: "salidas", titulo: "Salidas" },
        ]}
        valor="entradas"
        onCambio={onCambio}
      />,
    );
    expect(screen.getByRole("tab", { name: "Entradas" })).toBeSelected();
    fireEvent.press(screen.getByRole("tab", { name: "Salidas" }));
    expect(onCambio).toHaveBeenCalledWith("salidas");
  });

  it("Campo con error muestra la alerta", async () => {
    await conTema(<Campo label="Nombre" error="Requerido" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Requerido");
  });

  it("Boton peligro sigue siendo botón accesible", async () => {
    await conTema(<Boton titulo="Dar de baja" variante="peligro" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeTruthy();
  });

});
