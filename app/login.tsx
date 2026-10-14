import { useRef, useState, type ComponentRef } from "react";
import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Icono } from "@/components/Icono";
import { LogoMarca } from "@/components/Marca";
import { Pantalla } from "@/components/Pantalla";
import { Texto } from "@/components/Texto";
import { useAuth } from "@/features/auth/AuthProvider";
import { mensajeDeError } from "@/lib/errores";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

export default function Login() {
  const { colores } = useTema();
  const { iniciarSesion } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);
  const campoPassword = useRef<ComponentRef<typeof Campo>>(null);

  const incompleto = usuario.trim() === "" || password === "";

  async function enviar() {
    if (incompleto || enCurso.current) return;
    enCurso.current = true;
    setCargando(true);
    setError(null);
    try {
      await iniciarSesion(usuario.trim(), password);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  }

  return (
    <Pantalla scroll bordeSuperior centrado>
      <View style={{ gap: ESPACIO.l }}>
        <View style={{ alignItems: "center", gap: ESPACIO.xs, marginBottom: ESPACIO.l }}>
          <LogoMarca tamano={56} />
          <Texto variante="titulo">Inventrix</Texto>
          <Texto tono="secundario">Control de inventario</Texto>
        </View>
        <Campo
          label="Usuario"
          iconoInicio="usuario"
          value={usuario}
          onChangeText={(t) => {
            setUsuario(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => campoPassword.current?.focus()}
        />
        <Campo
          ref={campoPassword}
          label="Contraseña"
          iconoInicio="candado"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void enviar()}
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
        {error ? <AvisoAdvertencia tono="peligro" alerta texto={error} /> : null}
        <Boton titulo="Iniciar sesión" onPress={() => void enviar()} disabled={incompleto} loading={cargando} />
        <Texto variante="pequeno" tono="secundario" style={{ textAlign: "center" }}>
          ¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.
        </Texto>
      </View>
    </Pantalla>
  );
}
