import { fireEvent, render, screen } from "@testing-library/react-native";
import { createRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AvatarProducto, iniciales } from "@/components/AvatarProducto";
import { EspacioInferiorContext } from "@/components/BarraInferior";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Etiqueta } from "@/components/Etiqueta";
import { FilaLista } from "@/components/FilaLista";
import { Pantalla } from "@/components/Pantalla";
import { Segmentado } from "@/components/Segmentado";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function conTema(ui: React.ReactElement) {
  return render(<TemaProvider>{ui}</TemaProvider>);
}

// Relleno del contenido: el primer ancestro del hijo que declara paddingBottom (en el style o en
// el contentContainerStyle del ScrollView).
function rellenoDelContenido() {
  for (let nodo = screen.getByTestId("hijo").parent; nodo; nodo = nodo.parent) {
    const estilo = StyleSheet.flatten(nodo.props.contentContainerStyle ?? nodo.props.style) ?? {};
    if (estilo.paddingBottom !== undefined) return estilo;
  }
  throw new Error("Ningún ancestro declara paddingBottom");
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

  it("Campo con iconoInicio y accesorioFin", async () => {
    await conTema(
      <Campo label="Usuario" iconoInicio="usuario" accesorioFin={<Boton titulo="X" onPress={() => {}} />} />,
    );
    expect(screen.getByRole("button", { name: "X" })).toBeTruthy();
    expect(screen.getByLabelText("Usuario").type).toBe("TextInput");
  });

  it("Campo sin extras conserva su estilo", async () => {
    await conTema(<Campo label="Nombre" />);
    const estilo = StyleSheet.flatten(screen.getByLabelText("Nombre").props.style);
    expect(estilo.borderWidth).toBe(1.5);
    expect(estilo.minHeight).toBe(48);
  });

  it("Campo reenvía la referencia", async () => {
    const ref = createRef<TextInput>();
    await conTema(<Campo ref={ref} label="Nombre" />);
    expect(ref.current).not.toBeNull();
  });

  it("Boton peligro sigue siendo botón accesible", async () => {
    await conTema(<Boton titulo="Dar de baja" variante="peligro" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeTruthy();
  });

  it("Pantalla con scroll suma el espacio inferior en las pestañas", async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 24 } }}
      >
        <TemaProvider>
          <EspacioInferiorContext.Provider value={true}>
            <Pantalla scroll>
              <View testID="hijo" />
            </Pantalla>
          </EspacioInferiorContext.Provider>
        </TemaProvider>
      </SafeAreaProvider>,
    );
    const estilo = rellenoDelContenido();
    expect(estilo.paddingBottom).toBe(16 + 162);
  });

  it("Pantalla fuera de las pestañas conserva su relleno", async () => {
    await conTema(
      <Pantalla scroll>
        <View testID="hijo" />
      </Pantalla>,
    );
    const estilo = rellenoDelContenido();
    expect(estilo.paddingBottom).toBe(16);
  });
});
