import { View } from "react-native";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "";
  const texto = palabras.length === 1 ? palabras[0].slice(0, 2) : palabras[0][0] + palabras[1][0];
  return texto.toUpperCase();
}

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}

export function AvatarProducto({ nombre, tamano = 32 }: { nombre: string; tamano?: number }) {
  const { colores } = useTema();
  const fondo = colores.avatares[hash(nombre) % colores.avatares.length];
  return (
    <View
      testID="avatar-producto"
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 3,
        backgroundColor: fondo,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Texto variante="etiqueta" style={{ fontSize: Math.round(tamano * 0.38) }}>
        {iniciales(nombre)}
      </Texto>
    </View>
  );
}
