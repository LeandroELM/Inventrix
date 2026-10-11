import { Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { UNIDADES, type Unidad } from "@/features/productos/unidades";

type Props = { valor: string; unidad: Unidad; onChange: (valor: string) => void };

export function Cantidad({ valor, unidad, onChange }: Props) {
  const { entera, abreviatura } = UNIDADES[unidad];
  const minimo = entera ? 1 : 0.01;
  const actual = Number(valor.trim().replace(",", "."));
  const base = Number.isFinite(actual) && valor.trim() !== "" ? actual : 0;
  const cambiar = (n: number) => onChange(String(Math.round(n * 100) / 100));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Boton titulo="Disminuir" disabled={base <= minimo} onPress={() => cambiar(Math.max(minimo, base - 1))} />
        <View style={{ flex: 1 }}>
          <Campo
            label="Cantidad"
            value={valor}
            onChangeText={onChange}
            keyboardType={entera ? "number-pad" : "decimal-pad"}
          />
        </View>
        <Boton titulo="Aumentar" onPress={() => cambiar(Math.max(minimo, base + 1))} />
      </View>
      <Text>{abreviatura}</Text>
    </View>
  );
}
