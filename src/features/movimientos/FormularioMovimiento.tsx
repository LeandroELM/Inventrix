import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Cantidad } from "@/components/Cantidad";
import type { MotivoSalida } from "@/features/movimientos/api";
import { generaAlerta, proyectar, validarSalida } from "@/features/movimientos/calculo";
import { useRegistrarMovimiento } from "@/features/movimientos/hooks";
import { BuscadorProducto } from "@/features/productos/BuscadorProducto";
import { useProducto } from "@/features/productos/hooks";
import { formatearCantidad, type Unidad } from "@/features/productos/unidades";
import { validarCantidad } from "@/features/productos/validacion";
import { mensajeDeError } from "@/lib/errores";

const MOTIVOS: { valor: MotivoSalida; texto: string }[] = [
  { valor: "venta", texto: "Venta" },
  { valor: "consumo_interno", texto: "Consumo interno" },
  { valor: "retiro_autorizado", texto: "Retiro autorizado" },
];

function motivoValido(v: string | undefined): MotivoSalida | null {
  return MOTIVOS.find((m) => m.valor === v)?.valor ?? null;
}

type Resultado = {
  nombre: string;
  unidad: Unidad;
  cantidad: number;
  antes: number;
  despues: number;
  alerta: boolean;
};

export function FormularioMovimiento({ tipo }: { tipo: "entrada" | "salida" }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ productoId?: string; motivo?: string }>();
  // undefined: usa el valor del parámetro; null: el usuario pidió elegir otro.
  const [elegido, setElegido] = useState<string | null | undefined>(undefined);
  const id = elegido === undefined ? (params.productoId ?? null) : elegido;
  const [motivoElegido, setMotivoElegido] = useState<MotivoSalida | null | undefined>(undefined);
  const motivo = motivoElegido === undefined ? motivoValido(params.motivo) : motivoElegido;
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const registrar = useRegistrarMovimiento();
  const { data: p, isLoading } = useProducto(id ?? "");

  function reiniciar() {
    setResultado(null);
    setElegido(null);
    setMotivoElegido(null);
    setTexto("");
    setError(null);
  }

  if (resultado) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text accessibilityRole="alert">Movimiento registrado</Text>
        <Text>Producto: {resultado.nombre}</Text>
        <Text>
          {tipo === "entrada" ? "Entrada" : "Salida"}: {formatearCantidad(resultado.cantidad, resultado.unidad)}
        </Text>
        <Text>Existencias anteriores: {formatearCantidad(resultado.antes, resultado.unidad)}</Text>
        <Text>Existencias finales: {formatearCantidad(resultado.despues, resultado.unidad)}</Text>
        {resultado.alerta ? (
          <Text accessibilityRole="alert">El producto alcanzó su punto de pedido. Se notificó al administrador.</Text>
        ) : null}
        <Boton titulo="Registrar otro movimiento" onPress={reiniciar} />
        <Boton titulo="Volver al inicio" onPress={() => router.replace("/")} />
      </ScrollView>
    );
  }

  if (!id) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <BuscadorProducto escanearDestino={tipo} onElegir={setElegido} />
      </ScrollView>
    );
  }
  if (isLoading || !p) return <ActivityIndicator />;

  const parseada = validarCantidad(texto, p.unidad, { permitirCero: false });
  const cantidad = parseada.ok ? parseada.valor : 0;
  const errorSalida = tipo === "salida" && parseada.ok ? validarSalida(p.existencias, cantidad) : null;
  const errorCantidad = texto === "" ? null : !parseada.ok ? parseada.error : errorSalida;
  const sinMotivo = tipo === "salida" && motivo === null;
  const valido = p.activo && parseada.ok && errorSalida === null && !sinMotivo;

  async function confirmar() {
    if (!p || !parseada.ok) return;
    setError(null);
    try {
      const m = await registrar.mutateAsync({
        productoId: p.id,
        tipo,
        cantidad: parseada.valor,
        ...(tipo === "salida" && motivo ? { motivo } : {}),
      });
      setResultado({
        nombre: p.nombre,
        unidad: p.unidad,
        cantidad: parseada.valor,
        antes: m.existencias_antes,
        despues: m.existencias_despues,
        alerta: tipo === "salida" && generaAlerta(m.existencias_antes, parseada.valor, p.punto_pedido),
      });
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header">{p.nombre}</Text>
      <Text>Código: {p.codigo}</Text>
      <Boton titulo="Elegir otro producto" onPress={reiniciar} />
      {!p.activo ? <Text accessibilityRole="alert">El producto está dado de baja.</Text> : null}
      <Text>Existencias actuales: {formatearCantidad(p.existencias, p.unidad)}</Text>
      <Cantidad valor={texto} unidad={p.unidad} onChange={setTexto} />
      {errorCantidad ? <Text accessibilityRole="alert">{errorCantidad}</Text> : null}
      {parseada.ok && errorSalida === null ? (
        <Text>Existencias proyectadas: {formatearCantidad(proyectar(p.existencias, cantidad, tipo), p.unidad)}</Text>
      ) : null}
      {tipo === "salida" ? (
        <View style={{ gap: 8 }}>
          <Text>Motivo de la salida</Text>
          {MOTIVOS.map((m) => (
            <Pressable
              key={m.valor}
              accessibilityRole="button"
              accessibilityLabel={m.texto}
              accessibilityState={{ selected: motivo === m.valor }}
              onPress={() => setMotivoElegido(m.valor)}
              style={{ borderWidth: 1, padding: 8, opacity: motivo === m.valor ? 1 : 0.5 }}
            >
              <Text>{m.texto}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {parseada.ok && tipo === "salida" && generaAlerta(p.existencias, cantidad, p.punto_pedido) ? (
        <Text>Esta salida dejará el producto en su punto de pedido o por debajo.</Text>
      ) : null}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Boton
        titulo={tipo === "entrada" ? "Registrar entrada" : "Registrar salida"}
        disabled={!valido}
        loading={registrar.isPending}
        onPress={() => void confirmar()}
      />
    </ScrollView>
  );
}
