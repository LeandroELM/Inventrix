import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
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
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

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
  const { colores } = useTema();
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
        <Texto accessibilityRole="alert" tono="exito">Movimiento registrado</Texto>
        <Texto>Producto: {resultado.nombre}</Texto>
        <Texto>
          {tipo === "entrada" ? "Entrada" : "Salida"}: {formatearCantidad(resultado.cantidad, resultado.unidad)}
        </Texto>
        <Texto>Existencias anteriores: {formatearCantidad(resultado.antes, resultado.unidad)}</Texto>
        <Texto>Existencias finales: {formatearCantidad(resultado.despues, resultado.unidad)}</Texto>
        {resultado.alerta ? (
          <Texto accessibilityRole="alert" tono="peligro">El producto alcanzó su punto de pedido. Se notificó al administrador.</Texto>
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
  if (isLoading || !p) return <ActivityIndicator color={colores.interactivo} />;

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
      <Texto accessibilityRole="header" variante="subtitulo">{p.nombre}</Texto>
      <Texto>Código: {p.codigo}</Texto>
      <Boton titulo="Elegir otro producto" onPress={reiniciar} />
      {!p.activo ? <Texto accessibilityRole="alert" tono="peligro">El producto está dado de baja.</Texto> : null}
      <Texto>Existencias actuales: {formatearCantidad(p.existencias, p.unidad)}</Texto>
      <Cantidad valor={texto} unidad={p.unidad} onChange={setTexto} />
      {errorCantidad ? <Texto accessibilityRole="alert" tono="peligro">{errorCantidad}</Texto> : null}
      {parseada.ok && errorSalida === null ? (
        <Texto>Existencias proyectadas: {formatearCantidad(proyectar(p.existencias, cantidad, tipo), p.unidad)}</Texto>
      ) : null}
      {tipo === "salida" ? (
        <View style={{ gap: 8 }}>
          <Texto>Motivo de la salida</Texto>
          {MOTIVOS.map((m) => (
            <Pressable
              key={m.valor}
              accessibilityRole="button"
              accessibilityLabel={m.texto}
              accessibilityState={{ selected: motivo === m.valor }}
              onPress={() => setMotivoElegido(m.valor)}
              style={{ borderWidth: 1, borderColor: colores.borde, padding: 8, opacity: motivo === m.valor ? 1 : 0.5 }}
            >
              <Texto>{m.texto}</Texto>
            </Pressable>
          ))}
        </View>
      ) : null}
      {parseada.ok && tipo === "salida" && generaAlerta(p.existencias, cantidad, p.punto_pedido) ? (
        <Texto>Esta salida dejará el producto en su punto de pedido o por debajo.</Texto>
      ) : null}
      {error ? <Texto accessibilityRole="alert" tono="peligro">{error}</Texto> : null}
      <Boton
        titulo={tipo === "entrada" ? "Registrar entrada" : "Registrar salida"}
        disabled={!valido}
        loading={registrar.isPending}
        onPress={() => void confirmar()}
      />
    </ScrollView>
  );
}
