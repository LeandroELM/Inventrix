import { Text } from "react-native";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { useAuth } from "@/features/auth/AuthProvider";

const ROLES = { admin: "Administrador", operativo: "Operativo" } as const;

export default function Configuracion() {
  const { perfil, cerrarSesion } = useAuth();
  return (
    <Pantalla>
      <Text>Configuración</Text>
      {perfil ? (
        <>
          <Text>Nombre: {perfil.nombre}</Text>
          <Text>Usuario: {perfil.usuario}</Text>
          <Text>Rol: {ROLES[perfil.rol]}</Text>
        </>
      ) : null}
      <Boton titulo="Cerrar sesión" onPress={() => void cerrarSesion()} />
    </Pantalla>
  );
}
