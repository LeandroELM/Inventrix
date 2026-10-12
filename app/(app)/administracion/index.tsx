import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Pantalla } from "@/components/Pantalla";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede, type Accion } from "@/features/auth/permisos";

const OPCIONES: { titulo: string; ruta: Href; accion: Accion; icono: NombreIcono }[] = [
  { titulo: "Reportes", ruta: "/administracion/reportes", accion: "ver_reportes", icono: "administracion" },
  { titulo: "Dar de baja producto", ruta: "/administracion/baja", accion: "dar_baja", icono: "alerta" },
];

export default function Administracion() {
  const { perfil } = useAuth();
  const router = useRouter();
  if (!perfil) return null;
  return (
    <Pantalla>
      <View style={{ gap: 12 }}>
        {OPCIONES.filter((o) => puede(perfil.rol, o.accion)).map((o) => (
          <Tarjeta key={o.titulo} onPress={() => router.push(o.ruta)} accessibilityLabel={o.titulo}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Icono nombre={o.icono} />
              <Texto variante="subtitulo" style={{ flex: 1 }}>
                {o.titulo}
              </Texto>
              <Icono nombre="flecha" />
            </View>
          </Tarjeta>
        ))}
      </View>
    </Pantalla>
  );
}
