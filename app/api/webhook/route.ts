import OpenAI from "openai";
import { NextResponse } from "next/server";
import { businessKnowledge } from "@/lib/knowledge";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MetaWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
        }>;
      };
    }>;
  }>;
};

type StoredMessage = {
  direction: "incoming" | "outgoing";
  sender_type: "customer" | "nexo" | "human";
  message_text: string | null;
  created_at: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Meta utiliza esta ruta GET para verificar el webhook.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("Falta WHATSAPP_VERIFY_TOKEN en .env.local");

    return new NextResponse("Webhook no configurado", {
      status: 500,
    });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return new NextResponse("Verificación rechazada", {
    status: 403,
  });
}

/**
 * Meta envía aquí los mensajes nuevos recibidos por WhatsApp.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MetaWebhookBody;

    const incomingMessage =
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    /*
     * Meta también envía notificaciones de estados:
     * enviado, entregado, leído, etc.
     *
     * Si no hay un mensaje nuevo, respondemos 200 para confirmar
     * que recibimos correctamente la notificación.
     */
    if (!incomingMessage) {
      return NextResponse.json({ received: true });
    }

    const customerPhone = incomingMessage.from?.trim();
    const whatsappMessageId = incomingMessage.id?.trim();
    const messageType = incomingMessage.type;
    const customerText = incomingMessage.text?.body?.trim();

    if (!customerPhone || !whatsappMessageId) {
      console.error("Mensaje de WhatsApp incompleto:", incomingMessage);
      return NextResponse.json({ received: true });
    }

    /*
     * Por ahora el asistente responderá solamente mensajes de texto.
     */
    if (messageType !== "text" || !customerText) {
      await sendWhatsAppText(
        customerPhone,
        "Por el momento puedo ayudarte mediante mensajes de texto 😊"
      );

      return NextResponse.json({ received: true });
    }

    /*
     * Evita responder dos veces si Meta reenvía el mismo webhook.
     */
    const { data: existingMessage, error: existingMessageError } =
      await supabaseAdmin
        .from("messages")
        .select("id")
        .eq("whatsapp_message_id", whatsappMessageId)
        .maybeSingle();

    if (existingMessageError) {
      throw new Error(
        `No se pudo comprobar el mensaje duplicado: ${existingMessageError.message}`
      );
    }

    if (existingMessage) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    const conversationId = await findOrCreateConversation(customerPhone);

    /*
     * Guarda el mensaje recibido.
     */
    const { error: incomingInsertError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        whatsapp_message_id: whatsappMessageId,
        direction: "incoming",
        sender_type: "customer",
        message_text: customerText,
      });

    if (incomingInsertError) {
      throw new Error(
        `No se pudo guardar el mensaje recibido: ${incomingInsertError.message}`
      );
    }

    const previousMessages = await loadConversationMessages(conversationId);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Falta OPENAI_API_KEY en las variables de entorno.");
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",

      instructions: `
${businessKnowledge}

REGLAS DE RESPUESTA

- Eres el recepcionista virtual de Mundo Sobre Ruedas.
- Habla siempre en español.
- Sé amable, natural, alegre y breve.
- Recuerda el nombre del cliente cuando este lo proporcione.
- Después de conocer su nombre, puedes dirigirte a la persona por su nombre ocasionalmente, pero no lo repitas en todas las respuestas.
- Usa únicamente la información de la base de conocimiento.
- Nunca inventes información.
- No haces reservaciones.
- No tomas pedidos.
- No procesas pagos.
- No confirmas disponibilidad.
- Todas las compras y pagos se realizan directamente en el local.
- Cuando pregunten cualquier cosa relacionada con cumpleaños, celebraciones o planes de cumpleaños, no proporciones precios, detalles, disponibilidad, condiciones ni formas de pago.
- Indica que esa información es manejada directamente por la gerente de Mundo Sobre Ruedas Sambil.
- No intentes responder parcialmente preguntas sobre cumpleaños.
- Cuando no conozcas una respuesta, indica que pueden comunicarse al 809-412-5378.
- No menciones que utilizas una base de conocimiento.

REGLA ESPECIAL SOBRE CUMPLEAÑOS

Si el cliente menciona palabras o intenciones como:

- cumpleaños
- fiesta
- celebración
- plan de cumpleaños
- reservar para cumpleaños
- precio para cumpleaños
- disponibilidad para cumpleaños
- decorar
- separar una fecha
- pagar un plan

Debes responder de forma similar a:

"¡Claro! 😊 Todo lo relacionado con los planes de cumpleaños, precios, disponibilidad, pagos y coordinación es manejado directamente por la gerente de Mundo Sobre Ruedas Sambil. Ella podrá brindarte toda la información y ayudarte con el proceso."

No muestres información antigua sobre planes de cumpleaños aunque aparezca en mensajes anteriores.

REGLAS IMPORTANTES SOBRE LAS MEDIAS

- Es obligatorio utilizar medias para patinar.
- No es obligatorio comprar las medias en Mundo Sobre Ruedas.
- Los clientes pueden llevar sus propias medias.
- Si el cliente no tiene medias, puede comprarlas en el local.

Cuando menciones sus precios, escribe claramente:

- Medias para adultos: RD$200.
- Medias para niños: RD$300.

No confundas estos precios con el precio de la entrada, los patines o cualquier otro servicio.
`,

      input: previousMessages.map((message) => ({
        role:
          message.sender_type === "customer"
            ? ("user" as const)
            : ("assistant" as const),
        content: message.message_text ?? "",
      })),
    });

    const reply = response.output_text?.trim();

    if (!reply) {
      throw new Error("OpenAI no generó una respuesta.");
    }

    /*
     * Envía la respuesta al cliente por WhatsApp.
     */
    await sendWhatsAppText(customerPhone, reply);

    /*
     * Guarda la respuesta enviada por Nexo.
     * El trigger de Supabase actualizará automáticamente:
     *
     * - responded_by_nexo
     * - first_nexo_response_at
     * - last_message_at
     */
    const { error: outgoingInsertError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        direction: "outgoing",
        sender_type: "nexo",
        message_text: reply,
      });

    if (outgoingInsertError) {
      throw new Error(
        `La respuesta se envió, pero no pudo guardarse: ${outgoingInsertError.message}`
      );
    }

    return NextResponse.json({
      received: true,
      replied: true,
    });
  } catch (error) {
    console.error("Error en /api/webhook:", error);

    /*
     * Se responde 200 para reducir el riesgo de que Meta reenvíe
     * repetidamente el mismo evento mientras revisamos el error.
     */
    return NextResponse.json({
      received: true,
      processed: false,
    });
  }
}

/**
 * Busca una conversación abierta del cliente durante las últimas 24 horas.
 * Si no existe, crea una nueva.
 */
async function findOrCreateConversation(
  customerPhone: string
): Promise<string> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: existingConversation, error: searchError } =
    await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("customer_phone", customerPhone)
      .eq("status", "open")
      .gte("last_message_at", twentyFourHoursAgo)
      .order("last_message_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (searchError) {
    throw new Error(
      `No se pudo buscar la conversación: ${searchError.message}`
    );
  }

  if (existingConversation) {
    return existingConversation.id;
  }

  const { data: newConversation, error: createError } =
    await supabaseAdmin
      .from("conversations")
      .insert({
        customer_phone: customerPhone,
        status: "open",
      })
      .select("id")
      .single();

  if (createError || !newConversation) {
    throw new Error(
      `No se pudo crear la conversación: ${
        createError?.message ?? "Respuesta vacía de Supabase"
      }`
    );
  }

  return newConversation.id;
}

/**
 * Obtiene los últimos 20 mensajes para conservar el contexto.
 */
async function loadConversationMessages(
  conversationId: string
): Promise<StoredMessage[]> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("direction, sender_type, message_text, created_at")
    .eq("conversation_id", conversationId)
    .not("message_text", "is", null)
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  if (error) {
    throw new Error(
      `No se pudo cargar el historial: ${error.message}`
    );
  }

  return ((data ?? []) as StoredMessage[]).reverse();
}

/**
 * Envía un mensaje de texto mediante WhatsApp Cloud API.
 */
async function sendWhatsAppText(
  recipientPhone: string,
  message: string
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphApiVersion =
    process.env.META_GRAPH_API_VERSION || "v23.0";

  if (!accessToken) {
    throw new Error("Falta WHATSAPP_ACCESS_TOKEN.");
  }

  if (!phoneNumberId) {
    throw new Error("Falta WHATSAPP_PHONE_NUMBER_ID.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `WhatsApp rechazó el mensaje (${response.status}): ${errorBody}`
    );
  }
}