import { useRouter } from "expo-router";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";

export default function Movimientos() {
  const router = useRouter();
  return (
    <Pantalla>
      <Boton titulo="Registrar entrada" onPress={() => router.push("/movimientos/entrada")} />
      <Boton titulo="Registrar salida" onPress={() => router.push("/movimientos/salida")} />
      <Boton titulo="Historial" onPress={() => router.push("/movimientos/historial")} />
    </Pantalla>
  );
}
