import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarProducto } from "@/components/AvatarProducto";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Icono } from "@/components/Icono";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Dato = { etiqueta: string; valor: string };
type Accion = { titulo: string; onPress: () => void };

type Props = {
  titulo: string;
  frase: string;
  producto: { nombre: string; detalle: string };
  datos: [Dato, Dato];
  aviso?: string;
  principal: Accion;
  secundario: Accion;
};

export function PantallaResultado({ titulo, frase, producto, datos, aviso, principal, secundario }: Props) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const [inicio, fin] = colores.encabezado;

  return (
    <LinearGradient colors={[inicio, fin]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={{
            alignItems: "center",
            gap: ESPACIO.m,
            paddingTop: insets.top + ESPACIO.xl,
            paddingBottom: ESPACIO.xl,
            paddingHorizontal: ESPACIO.xl,
          }}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 72,
              height: 72,
              borderRadius: RADIO.completo,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colores.marcaAcento,
            }}
          >
            <Icono nombre="check" tamano={40} color={colores.sobreAcento} />
          </View>
          <Texto variante="titulo" tono="sobrePrimario" accessibilityRole="alert" style={{ textAlign: "center" }}>
            {titulo}
          </Texto>
          <Texto tono="sobrePrimario" style={{ textAlign: "center" }}>
            {frase}
          </Texto>
        </View>
        <View
          style={{
            flexGrow: 1,
            backgroundColor: colores.fondo,
            borderTopLeftRadius: RADIO.encabezado,
            borderTopRightRadius: RADIO.encabezado,
            padding: ESPACIO.l,
            paddingBottom: insets.bottom + ESPACIO.l,
            gap: ESPACIO.l,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.m }}>
            <AvatarProducto nombre={producto.nombre} tamano={48} />
            <View style={{ flex: 1 }}>
              <Texto variante="subtitulo" numberOfLines={2}>
                {producto.nombre}
              </Texto>
              <Texto tono="secundario">{producto.detalle}</Texto>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: ESPACIO.m }}>
            {datos.map((dato) => (
              <Tarjeta key={dato.etiqueta} style={{ flex: 1, gap: ESPACIO.xs }}>
                <Texto variante="etiqueta" tono="secundario">
                  {dato.etiqueta}
                </Texto>
                <Texto variante="titulo">{dato.valor}</Texto>
              </Tarjeta>
            ))}
          </View>
          {aviso ? <AvisoAdvertencia texto={aviso} icono="campana" /> : null}
          <View style={{ gap: ESPACIO.s }}>
            <Boton titulo={principal.titulo} onPress={principal.onPress} />
            <Boton titulo={secundario.titulo} onPress={secundario.onPress} variante="secundario" />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
