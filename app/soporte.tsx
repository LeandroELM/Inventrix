import { useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Presionable } from "@/animacion/Presionable";
import { HojaInferior } from "@/components/HojaInferior";
import { Icono } from "@/components/Icono";
import { IconoTrix } from "@/components/Marca";
import { EntradaTexto } from "@/components/EntradaTexto";
import { Texto } from "@/components/Texto";
import { useAuth } from "@/features/auth/AuthProvider";
import { enviarPregunta, MAX_CARACTERES, type MensajeChat } from "@/features/soporte/api";
import { PREGUNTAS_RAPIDAS } from "@/features/soporte/preguntas";
import { enlaceWhatsApp } from "@/features/soporte/whatsapp";
import { RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

function numeroWhatsApp(): string {
  return process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP ?? "";
}

export default function Soporte() {
  const { perfil } = useAuth();
  const { colores } = useTema();
  const router = useRouter();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [errorWhatsApp, setErrorWhatsApp] = useState<string | null>(null);
  const ultimaPregunta = useRef("");
  const numero = numeroWhatsApp();
  const hayNumero = numero.replace(/\D/g, "").length > 0;
  const saludo = perfil?.nombre
    ? `¡Hola, ${perfil.nombre}! Soy Trix. ¿En qué te ayudo?`
    : "¡Hola! Soy Trix. ¿En qué te ayudo?";
  const envioInactivo = texto.trim().length === 0 || escribiendo;

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || escribiendo) return;
    const historial: MensajeChat[] = [...mensajes, { rol: "usuario", texto: limpia }];
    ultimaPregunta.current = limpia;
    setMensajes(historial);
    setTexto("");
    setErrorWhatsApp(null);
    setEscribiendo(true);
    const r = await enviarPregunta(historial);
    setMensajes([...historial, { rol: "asistente", texto: r.respuesta }]);
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

  const burbujaAsistente = {
    alignSelf: "flex-start",
    maxWidth: "85%",
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: RADIO.tarjeta,
    borderTopLeftRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  } as const;
  const burbujaUsuario = {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: colores.primario,
    borderRadius: RADIO.tarjeta,
    borderTopRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  } as const;

  return (
    <HojaInferior onCerrar={() => router.back()}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View
          style={{
            backgroundColor: colores.primario,
            paddingTop: 20,
            paddingBottom: 14,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colores.superficie,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconoTrix tamano={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="cuerpoFuerte" tono="sobrePrimario">
              Trix
            </Texto>
            <Texto variante="pequeno" tono="sobrePrimario">
              Asistente de Inventrix
            </Texto>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar asistente"
            onPress={() => router.back()}
            hitSlop={12}
            style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Icono nombre="cerrar" tamano={18} color={colores.sobrePrimario} />
          </Pressable>
        </View>
        <ScrollView
          style={{ flex: 1, backgroundColor: colores.fondo }}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={burbujaAsistente}>
            <Texto variante="pequeno">{saludo}</Texto>
          </View>
          {mensajes.length === 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {PREGUNTAS_RAPIDAS.map((q) => (
                <Presionable
                  key={q}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                  onPress={() => void enviar(q)}
                  style={{
                    minHeight: 40,
                    justifyContent: "center",
                    paddingHorizontal: 12,
                    borderRadius: RADIO.completo,
                    borderWidth: 1,
                    borderColor: colores.linea,
                    backgroundColor: colores.superficie,
                  }}
                >
                  <Texto variante="pequeno" tono="interactivo">
                    {q}
                  </Texto>
                </Presionable>
              ))}
            </View>
          )}
          {mensajes.map((m, i) => (
            <View key={i} style={m.rol === "usuario" ? burbujaUsuario : burbujaAsistente}>
              <Texto variante="pequeno" tono={m.rol === "usuario" ? "sobrePrimario" : "texto"}>
                {m.texto}
              </Texto>
            </View>
          ))}
          {escribiendo && (
            <Texto variante="pequeno" tono="secundario">
              escribiendo…
            </Texto>
          )}
          {errorWhatsApp && (
            <Texto accessibilityRole="alert" tono="peligro">
              {errorWhatsApp}
            </Texto>
          )}
        </ScrollView>
        <View
          style={{
            paddingTop: 10,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colores.superficie,
            borderTopWidth: 1,
            borderTopColor: colores.linea,
          }}
        >
          <EntradaTexto
            accessibilityLabel="Escribe tu pregunta"
            placeholder="Escribe tu pregunta…"
            value={texto}
            onChangeText={setTexto}
            maxLength={MAX_CARACTERES}
            multiline
            style={{ flex: 1, maxHeight: 96 }}
          />
          <Presionable
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            accessibilityState={{ disabled: envioInactivo }}
            disabled={envioInactivo}
            onPress={() => void enviar(texto)}
            style={{
              width: 48,
              height: 48,
              borderRadius: RADIO.campo,
              backgroundColor: colores.primario,
              alignItems: "center",
              justifyContent: "center",
              opacity: envioInactivo ? 0.5 : 1,
            }}
          >
            <Icono nombre="enviar" tamano={18} color={colores.sobrePrimario} />
          </Presionable>
        </View>
        <View
          style={{
            paddingTop: 6,
            paddingHorizontal: 14,
            paddingBottom: 18,
            backgroundColor: colores.superficie,
          }}
        >
          {hayNumero ? (
            <Presionable
              accessibilityRole="button"
              accessibilityLabel="Contactar soporte por WhatsApp"
              onPress={() => void abrirWhatsApp()}
              style={{
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: RADIO.campo,
                borderWidth: 1,
                borderColor: colores.exito,
                backgroundColor: colores.exitoSuave,
              }}
            >
              <Icono nombre="whatsapp" tamano={16} color={colores.textoExito} />
              <Texto variante="cuerpoFuerte" tono="exito">
                Contactar soporte por WhatsApp
              </Texto>
            </Presionable>
          ) : (
            <Texto variante="pequeno" tono="secundario">
              El contacto por WhatsApp no está disponible por ahora.
            </Texto>
          )}
        </View>
      </KeyboardAvoidingView>
    </HojaInferior>
  );
}
