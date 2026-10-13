import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { ChipsFiltro } from "@/components/ChipsFiltro";
import { ControlCantidad } from "@/components/ControlCantidad";
import { Encabezado } from "@/components/Encabezado";
import { EstadoError } from "@/components/EstadoError";
import { Etiqueta } from "@/components/Etiqueta";
import { PantallaResultado } from "@/components/PantallaResultado";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaProductoMovimiento } from "@/components/TarjetaProductoMovimiento";
import { Texto } from "@/components/Texto";
import type { MotivoSalida } from "@/features/movimientos/api";
import { generaAlerta, proyectar, validarSalida } from "@/features/movimientos/calculo";
import { useRegistrarMovimiento } from "@/features/movimientos/hooks";
import { ETIQUETAS_MOTIVO_SALIDA, MOTIVOS_SALIDA } from "@/features/movimientos/motivos";
import { BuscadorProducto } from "@/features/productos/BuscadorProducto";
import { useProducto } from "@/features/productos/hooks";
import { formatearCantidad, type Unidad } from "@/features/productos/unidades";
import { validarCantidad } from "@/features/productos/validacion";
import { mensajeDeError } from "@/lib/errores";
import { horaLocal } from "@/lib/fechaRelativa";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const MOTIVOS = MOTIVOS_SALIDA.map((valor) => ({ valor, texto: ETIQUETAS_MOTIVO_SALIDA[valor] }));

function motivoValido(v: string | undefined): MotivoSalida | null {
  return MOTIVOS_SALIDA.find((m) => m === v) ?? null;
}

type Resultado = {
  nombre: string;
  codigo: string;
  unidad: Unidad;
  cantidad: number;
  despues: number;
  alerta: boolean;
  motivo: MotivoSalida | null;
  creado: string;
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
  const enCurso = useRef(false);
  const registrar = useRegistrarMovimiento();
  const { data: p, isLoading, isError, refetch } = useProducto(id ?? "");
  const titulo = tipo === "entrada" ? "Registrar entrada" : "Registrar salida";

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  // Un error de registro deja de aplicar en cuanto el usuario cambia los datos.
  function cambiarTexto(valor: string) {
    setTexto(valor);
    setError(null);
  }

  function cambiarMotivo(valor: MotivoSalida | null) {
    setMotivoElegido(valor);
    setError(null);
  }

  function reiniciar() {
    setResultado(null);
    setElegido(null);
    setMotivoElegido(null);
    setTexto("");
    setError(null);
  }

  if (resultado) {
    const entrada = tipo === "entrada";
    return (
      <PantallaResultado
        titulo={entrada ? "¡Entrada registrada!" : "¡Salida registrada!"}
        frase="El inventario se actualizó correctamente."
        producto={{
          nombre: resultado.nombre,
          detalle: entrada
            ? `Código ${resultado.codigo}`
            : `Motivo: ${resultado.motivo ? ETIQUETAS_MOTIVO_SALIDA[resultado.motivo] : ""} · ${horaLocal(resultado.creado)}`,
        }}
        datos={[
          {
            etiqueta: entrada ? "Cantidad ingresada" : "Cantidad retirada",
            valor: `${entrada ? "+" : "−"}${formatearCantidad(resultado.cantidad, resultado.unidad)}`,
          },
          { etiqueta: "Existencias finales", valor: formatearCantidad(resultado.despues, resultado.unidad) },
        ]}
        aviso={
          resultado.alerta
            ? "El producto alcanzó su punto de pedido. Se generó una alerta de reabastecimiento."
            : undefined
        }
        principal={{ titulo: entrada ? "Registrar otra entrada" : "Registrar otra salida", onPress: reiniciar }}
        secundario={{ titulo: "Volver al inicio", onPress: () => router.replace("/") }}
      />
    );
  }

  if (!id) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <Encabezado variante="pantalla" titulo={titulo} onAtras={volver} />
        <ScrollView
          contentContainerStyle={{ padding: ESPACIO.l, gap: ESPACIO.m }}
          keyboardShouldPersistTaps="handled"
        >
          {tipo === "entrada" ? <Etiqueta tipo="disponible" texto="+ Ingreso" /> : null}
          <BuscadorProducto escanearDestino={tipo} onElegir={setElegido} />
        </ScrollView>
      </View>
    );
  }

  const encabezado = (
    <Encabezado
      variante="pantalla"
      titulo={titulo}
      onAtras={volver}
      accion={{
        icono: "escanear",
        etiqueta: "Escanear otro producto",
        onPress: () => router.push(`/escaner?destino=${tipo}`),
      }}
    />
  );

  if (isError && !p) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        {encabezado}
        <View style={{ padding: ESPACIO.l }}>
          <EstadoError mensaje="No se pudo cargar el producto." onReintentar={() => void refetch()} />
        </View>
      </View>
    );
  }

  if (isLoading || !p) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        {encabezado}
        <ActivityIndicator color={colores.interactivo} style={{ marginTop: ESPACIO.xl }} />
      </View>
    );
  }

  const parseada = validarCantidad(texto, p.unidad, { permitirCero: false });
  const cantidad = parseada.ok ? parseada.valor : 0;
  const errorSalida =
    tipo === "salida" && parseada.ok && validarSalida(p.existencias, cantidad) !== null
      ? `La cantidad supera las existencias disponibles (${formatearCantidad(p.existencias, p.unidad)}).`
      : null;
  const errorCantidad = texto === "" ? undefined : !parseada.ok ? parseada.error : (errorSalida ?? undefined);
  const sinMotivo = tipo === "salida" && motivo === null;
  const valido = p.activo && parseada.ok && errorSalida === null && !sinMotivo;
  const proyectadas = parseada.ok && errorSalida === null ? proyectar(p.existencias, cantidad, tipo) : null;

  async function confirmar() {
    if (!p || !parseada.ok || enCurso.current) return;
    enCurso.current = true;
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
        codigo: p.codigo,
        unidad: p.unidad,
        cantidad: parseada.valor,
        despues: m.existencias_despues,
        alerta: tipo === "salida" && generaAlerta(m.existencias_antes, parseada.valor, p.punto_pedido),
        motivo,
        creado: m.created_at,
      });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      enCurso.current = false;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      {encabezado}
      <ScrollView
        contentContainerStyle={{ padding: ESPACIO.l, gap: ESPACIO.m }}
        keyboardShouldPersistTaps="handled"
      >
        <TarjetaProductoMovimiento producto={p} tipo={tipo} proyectadas={proyectadas} />
        <Boton titulo="Elegir otro producto" variante="fantasma" onPress={reiniciar} />
        {!p.activo ? (
          <AvisoAdvertencia tono="peligro" alerta texto="El producto está dado de baja." />
        ) : (
          <>
            <Tarjeta style={{ gap: ESPACIO.s }}>
              <ControlCantidad
                valor={texto}
                onCambio={cambiarTexto}
                unidad={p.unidad}
                maximo={tipo === "salida" ? p.existencias : undefined}
                etiqueta={tipo === "entrada" ? "Cantidad a ingresar" : "Cantidad a salir"}
                error={errorCantidad}
              />
              {tipo === "entrada" ? (
                <Texto variante="pequeno" tono="secundario">
                  Solo se permiten cantidades positivas.
                </Texto>
              ) : null}
            </Tarjeta>
            {tipo === "salida" ? (
              <Tarjeta style={{ gap: ESPACIO.s }}>
                <Texto variante="etiqueta" tono="secundario">
                  Motivo de salida
                </Texto>
                <ChipsFiltro opciones={MOTIVOS} valor={motivo} onCambio={cambiarMotivo} etiqueta="Motivo de salida" />
              </Tarjeta>
            ) : null}
            {parseada.ok && errorSalida === null && tipo === "salida" && generaAlerta(p.existencias, cantidad, p.punto_pedido) ? (
              <AvisoAdvertencia texto="Con esta salida el producto llegará a su punto de pedido y se enviará una alerta al administrador." />
            ) : null}
            {error ? <AvisoAdvertencia tono="peligro" alerta texto={error} /> : null}
            <Boton titulo={titulo} disabled={!valido} loading={registrar.isPending} onPress={() => void confirmar()} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
