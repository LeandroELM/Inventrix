import { useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, View } from "react-native";
import { Boton } from "@/components/Boton";
import { useAuth } from "@/features/auth/AuthProvider";
import { enviarPregunta, MAX_CARACTERES, type MensajeChat } from "@/features/soporte/api";
import { enlaceWhatsApp } from "@/features/soporte/whatsapp";
import { Texto } from "@/components/Texto";
import { EntradaTexto } from "@/components/EntradaTexto";

const SALUDO = "¡Hola! Soy el asistente virtual del sistema de inventarios. ¿En qué puedo ayudarte?";

const SUGERENCIAS_OPERATIVO = ["¿Cómo registro una entrada?", "¿Cómo registro una salida?", "¿Cómo veo el historial de movimientos?"];
const SUGERENCIAS_ADMIN = [...SUGERENCIAS_OPERATIVO, "¿Cómo registro un producto nuevo?", "¿Cómo genero un reporte?"];

function numeroWhatsApp(): string {
  return process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP ?? "";
}

export default function Soporte() {
  const { perfil } = useAuth();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [mostrarWhatsApp, setMostrarWhatsApp] = useState(false);
  const [errorWhatsApp, setErrorWhatsApp] = useState<string | null>(null);
  const ultimaPregunta = useRef("");
  const sugerencias = perfil?.rol === "admin" ? SUGERENCIAS_ADMIN : SUGERENCIAS_OPERATIVO;
  const numero = numeroWhatsApp();
  const hayNumero = numero.replace(/\D/g, "").length > 0;

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || escribiendo) return;
    const historial: MensajeChat[] = [...mensajes, { rol: "usuario", texto: limpia }];
    ultimaPregunta.current = limpia;
    setMensajes(historial);
    setTexto("");
    setMostrarWhatsApp(false);
    setErrorWhatsApp(null);
    setEscribiendo(true);
    const r = await enviarPregunta(historial);
    setMensajes([...historial, { rol: "asistente", texto: r.respuesta }]);
    setMostrarWhatsApp(!r.resuelto);
    setEscribiendo(false);
  }

  async function abrirWhatsApp() {
    setErrorWhatsApp(null);
    try {
      await Linking.openURL(enlaceWhatsApp(numero, ultimaPregunta.current));
    } catch {
      setErrorWhatsApp("No se pudo abrir WhatsApp.");
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ borderWidth: 1, padding: 12, alignSelf: "flex-start", maxWidth: "85%" }}>
          <Texto>{SALUDO}</Texto>
        </View>
        {mensajes.length === 0 &&
          sugerencias.map((s) => (
            <Pressable key={s} accessibilityRole="button" accessibilityLabel={s} onPress={() => void enviar(s)} style={{ borderWidth: 1, padding: 10 }}>
              <Texto>{s}</Texto>
            </Pressable>
          ))}
        {mensajes.map((m, i) => (
          <View
            key={i}
            style={{ borderWidth: 1, padding: 12, maxWidth: "85%", alignSelf: m.rol === "usuario" ? "flex-end" : "flex-start" }}
          >
            <Texto>{m.texto}</Texto>
          </View>
        ))}
        {escribiendo && <Texto>escribiendo…</Texto>}
        {mostrarWhatsApp &&
          (hayNumero ? (
            <Boton titulo="Contactar soporte por WhatsApp" onPress={() => void abrirWhatsApp()} />
          ) : (
            <Texto>El contacto por WhatsApp no está disponible por ahora.</Texto>
          ))}
        {errorWhatsApp && <Texto accessibilityRole="alert" tono="peligro">{errorWhatsApp}</Texto>}
      </ScrollView>
      <View style={{ padding: 12, gap: 8, borderTopWidth: 1 }}>
        <EntradaTexto
          accessibilityLabel="Escribe tu pregunta"
          placeholder="Escribe tu pregunta"
          value={texto}
          onChangeText={setTexto}
          maxLength={MAX_CARACTERES}
          multiline
          style={{ borderWidth: 1, padding: 8 }}
        />
        <Boton titulo="Enviar" onPress={() => void enviar(texto)} disabled={texto.trim().length === 0 || escribiendo} />
      </View>
    </KeyboardAvoidingView>
  );
}
