import { useRef, useState } from "react";
import { ScrollView } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { HojaInferior } from "@/components/HojaInferior";
import { Icono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { validarContrasenaNueva } from "@/features/configuracion/contrasena";
import { mensajeDeError } from "@/lib/errores";
import { supabase } from "@/lib/supabase";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = { onCerrar: () => void; onGuardada: () => void };

export function HojaContrasena({ onCerrar, onGuardada }: Props) {
  const { colores } = useTema();
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  async function guardar() {
    if (enCurso.current) return;
    const invalido = validarContrasenaNueva(nueva, confirmacion);
    if (invalido) {
      setError(invalido);
      return;
    }
    enCurso.current = true;
    setError(null);
    setGuardando(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password: nueva });
      if (e) {
        setError(mensajeDeError(e));
        return;
      }
      onGuardada();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }

  return (
    <HojaInferior bloqueado={guardando} onCerrar={onCerrar}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: ESPACIO.xl, paddingTop: ESPACIO.s, paddingBottom: ESPACIO.l, gap: ESPACIO.m }}
      >
        <Texto variante="subtitulo" accessibilityRole="header">
          Cambiar contraseña
        </Texto>
        <Campo
          label="Nueva contraseña"
          iconoInicio="candado"
          value={nueva}
          onChangeText={(t) => {
            setNueva(t);
            setError(null);
          }}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          accesorioFin={
            <Presionable
              accessibilityRole="button"
              accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              onPress={() => setVisible((v) => !v)}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Icono nombre={visible ? "ojoTachado" : "ojo"} tamano={20} color={colores.textoSecundario} />
            </Presionable>
          }
        />
        <Campo
          label="Confirmar contraseña"
          iconoInicio="candado"
          value={confirmacion}
          onChangeText={(t) => {
            setConfirmacion(t);
            setError(null);
          }}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? <AvisoAdvertencia tono="peligro" alerta texto={error} /> : null}
        <Boton titulo="Guardar contraseña" onPress={() => void guardar()} loading={guardando} />
      </ScrollView>
    </HojaInferior>
  );
}
