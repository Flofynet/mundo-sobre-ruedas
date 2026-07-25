"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const welcomeMessage: Message = {
  role: "assistant",
  content:
    "¡Hola! 👋 Bienvenido a Mundo Sobre Ruedas. Soy el asistente virtual y estoy aquí para ayudarte con horarios, precios, ubicación, menú, cumpleaños y demás informaciones. ¿Cuál es tu nombre?",
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (!cleanMessage || loading) {
      return;
    }

    const updatedMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: cleanMessage,
      },
    ];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo obtener una respuesta.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.";

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Error: ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111111",
        color: "#ffffff",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "34px",
              marginBottom: "8px",
            }}
          >
            Mundo Sobre Ruedas
          </h1>

          <p
            style={{
              color: "#cccccc",
              margin: 0,
            }}
          >
            Prueba del asistente virtual
          </p>
        </header>

        <section
          style={{
            minHeight: "450px",
            background: "#1b1b1b",
            border: "1px solid #333333",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                style={{
                  alignSelf:
                    item.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background:
                    item.role === "user" ? "#ffffff" : "#2a2a2a",
                  color:
                    item.role === "user" ? "#111111" : "#ffffff",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {item.content}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "#2a2a2a",
                  color: "#cccccc",
                }}
              >
                Pensando...
              </div>
            )}
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escribe tu respuesta..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #444444",
              background: "#1b1b1b",
              color: "#ffffff",
              fontSize: "16px",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loading || message.trim() === ""}
            style={{
              padding: "14px 22px",
              borderRadius: "12px",
              border: "none",
              background: "#ffffff",
              color: "#111111",
              fontWeight: "bold",
              cursor:
                loading || message.trim() === ""
                  ? "not-allowed"
                  : "pointer",
              opacity:
                loading || message.trim() === "" ? 0.5 : 1,
            }}
          >
            Enviar
          </button>
        </form>
      </div>
    </main>
  );
}