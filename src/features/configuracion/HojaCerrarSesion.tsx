import { useRef, useState } from "react";
import { View } from "react-native";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { HojaInferior } from "@/components/HojaInferior";
import { Texto } from "@/components/Texto";
import { mensajeDeError } from "@/lib/errores";
import { ESPACIO } from "@/tema/tokens";

type Props = { onCerrar: () => void; onConfirmar: () => Promise<void> };

export function HojaCerrarSesion({ onCerrar, onConfirmar }: Props) {
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);

  async function confirmar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setError(null);
    setCerrando(true);
    try {
      await onConfirmar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      enCurso.current = false;
      setCerrando(false);
    }
  }

  return (
    <HojaInferior bloqueado={cerrando} onCerrar={onCerrar}>
      <View style={{ paddingHorizontal: ESPACIO.xl, paddingTop: ESPACIO.s, paddingBottom: ESPACIO.l, gap: ESPACIO.m }}>
        <Texto variante="subtitulo" accessibilityRole="header">
          ¿Cerrar sesión?
        </Texto>
        <Texto tono="secundario">Tendrás que volver a escribir tu usuario y contraseña para entrar.</Texto>
        {error ? <AvisoAdvertencia tono="peligro" alerta texto={error} /> : null}
        <Boton titulo="Cerrar sesión" variante="peligro" onPress={() => void confirmar()} loading={cerrando} />
        <Boton titulo="Cancelar" variante="secundario" onPress={onCerrar} disabled={cerrando} />
      </View>
    </HojaInferior>
  );
}
