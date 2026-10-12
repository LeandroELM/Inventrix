import { useState } from "react";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Pantalla } from "@/components/Pantalla";
import { useAuth } from "@/features/auth/AuthProvider";
import { mensajeDeError } from "@/lib/errores";
import { Texto } from "@/components/Texto";

export default function Login() {
  const { iniciarSesion } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incompleto = usuario.trim() === "" || password === "";

  async function enviar() {
    setCargando(true);
    setError(null);
    try {
      await iniciarSesion(usuario.trim(), password);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pantalla>
      <Texto>Inventrix</Texto>
      <Campo label="Usuario" value={usuario} onChangeText={setUsuario} autoCapitalize="none" autoCorrect={false} />
      <Campo
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Boton titulo={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onPress={() => setVisible((v) => !v)} />
      {error ? <Texto accessibilityRole="alert" tono="peligro">{error}</Texto> : null}
      <Boton titulo="Iniciar sesión" onPress={enviar} disabled={incompleto} loading={cargando} />
    </Pantalla>
  );
}
