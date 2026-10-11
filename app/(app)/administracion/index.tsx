import { Link, type Href } from "expo-router";
import { Text } from "react-native";
import { Pantalla } from "@/components/Pantalla";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede, type Accion } from "@/features/auth/permisos";

const OPCIONES: { titulo: string; ruta: Href; accion: Accion }[] = [
  { titulo: "Existencias", ruta: "/administracion/existencias", accion: "ver_existencias" },
  { titulo: "Productos a pedir", ruta: "/administracion/pedir", accion: "ver_a_pedir" },
  { titulo: "Reportes", ruta: "/administracion/reportes", accion: "ver_reportes" },
  { titulo: "Dar de baja producto", ruta: "/administracion/baja", accion: "dar_baja" },
];

export default function Administracion() {
  const { perfil } = useAuth();
  if (!perfil) return null;
  return (
    <Pantalla>
      {OPCIONES.filter((o) => puede(perfil.rol, o.accion)).map((o) => (
        <Link key={o.titulo} href={o.ruta} accessibilityRole="link">
          <Text>{o.titulo}</Text>
        </Link>
      ))}
    </Pantalla>
  );
}
