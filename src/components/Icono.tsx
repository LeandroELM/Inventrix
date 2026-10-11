import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  House,
  LayoutGrid,
  MessageCircle,
  Minus,
  Moon,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react-native";
import { useTema } from "@/tema/TemaProvider";

export const ICONOS = {
  inicio: House,
  buscar: Search,
  mas: Plus,
  menos: Minus,
  administracion: LayoutGrid,
  movimientos: ArrowLeftRight,
  configuracion: SlidersHorizontal,
  campana: Bell,
  atras: ChevronLeft,
  flecha: ChevronRight,
  lapiz: Pencil,
  camara: Camera,
  enviar: ArrowRight,
  cerrar: X,
  whatsapp: MessageCircle,
  check: Check,
  luna: Moon,
  alerta: TriangleAlert,
};

export type NombreIcono = keyof typeof ICONOS;

export function Icono({
  nombre,
  tamano = 20,
  color,
}: {
  nombre: NombreIcono;
  tamano?: number;
  color?: string;
}) {
  const { colores } = useTema();
  const Componente = ICONOS[nombre];
  return <Componente size={tamano} color={color ?? colores.texto} strokeWidth={1.75} />;
}
