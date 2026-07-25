import OpenAI from "openai";
import { NextResponse } from "next/server";
import { businessKnowledge } from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const messages: ChatMessage[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Debes enviar una conversación válida." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clave de OpenAI no está configurada." },
        { status: 500 }
      );
    }

    const validMessages = messages
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim() !== ""
      )
      .slice(-20);

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

      input: validMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const reply = response.output_text?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "OpenAI no generó una respuesta." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Error en /api/chat:", error);

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al generar la respuesta. Revisa la terminal del proyecto.",
      },
      { status: 500 }
    );
  }
}