"use client";

import { useCallback, useEffect, useState } from "react";

type Statistics = {
  conversationsReceived: number;
  conversationsAnswered: number;
  conversationsNotAnswered: number;
  automaticAttentionPercentage: number;
  averageResponseSeconds: number;
  uniqueCustomers: number;
};

const initialStatistics: Statistics = {
  conversationsReceived: 0,
  conversationsAnswered: 0,
  conversationsNotAnswered: 0,
  automaticAttentionPercentage: 0,
  averageResponseSeconds: 0,
  uniqueCustomers: 0,
};

export default function ResultadosPage() {
  const [statistics, setStatistics] =
    useState<Statistics>(initialStatistics);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/statistics", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "No se pudieron cargar las estadísticas."
        );
      }

      setStatistics(data);
    } catch (loadError) {
      console.error(loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las estadísticas."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  function downloadReport() {
    try {
      setDownloading(true);
      setError("");

      const canvas = document.createElement("canvas");

      canvas.width = 1080;
      canvas.height = 1350;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("No se pudo generar la imagen.");
      }

      drawReportBackground(context);

      drawGradientText(
        context,
        "NEXO",
        540,
        135,
        76,
        "#27B7FF",
        "#8A46FF"
      );

      context.textAlign = "center";

      context.fillStyle = "#FFFFFF";
      context.font = "700 58px Arial";
      context.fillText("Resultados de los", 540, 245);
      context.fillText("últimos 30 días", 540, 315);

      context.fillStyle = "#B8B8D0";
      context.font = "400 29px Arial";
      context.fillText("Mundo Sobre Ruedas Sambil", 540, 375);

      drawStatisticCard(
        context,
        70,
        440,
        455,
        210,
        "Conversaciones recibidas",
        formatNumber(statistics.conversationsReceived),
        "#27B7FF"
      );

      drawStatisticCard(
        context,
        555,
        440,
        455,
        210,
        "Respondidas por Nexo",
        formatNumber(statistics.conversationsAnswered),
        "#8A46FF"
      );

      drawStatisticCard(
        context,
        70,
        685,
        455,
        210,
        "Atención automática",
        `${formatDecimal(
          statistics.automaticAttentionPercentage
        )}%`,
        "#27B7FF"
      );

      drawStatisticCard(
        context,
        555,
        685,
        455,
        210,
        "Respuesta promedio",
        `${formatDecimal(statistics.averageResponseSeconds)} s`,
        "#8A46FF"
      );

      drawStatisticCard(
        context,
        70,
        930,
        940,
        210,
        "Clientes únicos atendidos",
        formatNumber(statistics.uniqueCustomers),
        "#27B7FF"
      );

      context.fillStyle = "#B8B8D0";
      context.font = "400 24px Arial";
      context.fillText(
        `Generado el ${formatDate(new Date())}`,
        540,
        1215
      );

      drawGradientText(
        context,
        "CONECTA. CONFÍA. CRECE.",
        540,
        1280,
        28,
        "#27B7FF",
        "#8A46FF"
      );

      const imageUrl = canvas.toDataURL("image/png", 1);

      const link = document.createElement("a");

      link.href = imageUrl;
      link.download =
        `resultados-mundo-sobre-ruedas-${getFileDate()}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (downloadError) {
      console.error(downloadError);
      setError("No se pudo descargar el reporte.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050510] px-5 py-10 text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#27B7FF]/20 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#8A46FF]/20 blur-3xl" />

      <section className="relative mx-auto max-w-6xl">
        <div className="mb-9">
          <p className="mb-3 bg-gradient-to-r from-[#27B7FF] to-[#8A46FF] bg-clip-text text-sm font-bold uppercase tracking-[0.35em] text-transparent">
            Nexo
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Resultados
          </h1>

          <p className="mt-3 text-[#B8B8D0]">
            Estadísticas de los últimos 30 días de Mundo Sobre
            Ruedas.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[#27B7FF]/20 bg-white/[0.04] p-10 text-center text-[#B8B8D0] backdrop-blur">
            Cargando estadísticas...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[#8A46FF]/40 bg-[#8A46FF]/10 p-6">
            <p className="font-semibold text-white">{error}</p>

            <button
              type="button"
              onClick={() => void loadStatistics()}
              className="mt-4 rounded-xl bg-white px-5 py-3 font-semibold text-[#050510] transition hover:opacity-90"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatisticCard
                title="Conversaciones recibidas"
                value={formatNumber(
                  statistics.conversationsReceived
                )}
                color="blue"
              />

              <StatisticCard
                title="Respondidas por Nexo"
                value={formatNumber(
                  statistics.conversationsAnswered
                )}
                color="purple"
              />

              <StatisticCard
                title="Sin respuesta automática"
                value={formatNumber(
                  statistics.conversationsNotAnswered
                )}
                color="blue"
              />

              <StatisticCard
                title="Atención automática"
                value={`${formatDecimal(
                  statistics.automaticAttentionPercentage
                )}%`}
                color="purple"
              />

              <StatisticCard
                title="Tiempo promedio"
                value={`${formatDecimal(
                  statistics.averageResponseSeconds
                )} segundos`}
                color="blue"
              />

              <StatisticCard
                title="Clientes únicos"
                value={formatNumber(statistics.uniqueCustomers)}
                color="purple"
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={downloadReport}
                disabled={downloading}
                className="rounded-2xl bg-gradient-to-r from-[#27B7FF] to-[#8A46FF] px-6 py-4 font-bold text-white shadow-[0_0_30px_rgba(85,100,255,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading
                  ? "Generando imagen..."
                  : "Descargar estadísticas"}
              </button>

              <button
                type="button"
                onClick={() => void loadStatistics()}
                className="rounded-2xl border border-[#8A46FF]/40 bg-white/[0.04] px-6 py-4 font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Actualizar datos
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function StatisticCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "blue" | "purple";
}) {
  const valueClass =
    color === "blue"
      ? "text-[#27B7FF]"
      : "text-[#8A46FF]";

  const borderClass =
    color === "blue"
      ? "border-[#27B7FF]/25"
      : "border-[#8A46FF]/25";

  const glowClass =
    color === "blue"
      ? "hover:shadow-[0_0_30px_rgba(39,183,255,0.12)]"
      : "hover:shadow-[0_0_30px_rgba(138,70,255,0.12)]";

  return (
    <article
      className={`rounded-3xl border ${borderClass} bg-white/[0.04] p-6 backdrop-blur transition ${glowClass}`}
    >
      <p className="text-sm text-[#B8B8D0]">{title}</p>

      <p className={`mt-3 text-3xl font-bold ${valueClass}`}>
        {value}
      </p>
    </article>
  );
}

function drawReportBackground(
  context: CanvasRenderingContext2D
) {
  const backgroundGradient = context.createLinearGradient(
    0,
    0,
    1080,
    1350
  );

  backgroundGradient.addColorStop(0, "#050510");
  backgroundGradient.addColorStop(0.5, "#09091A");
  backgroundGradient.addColorStop(1, "#050510");

  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, 1080, 1350);

  const blueGlow = context.createRadialGradient(
    920,
    100,
    0,
    920,
    100,
    420
  );

  blueGlow.addColorStop(0, "rgba(39, 183, 255, 0.24)");
  blueGlow.addColorStop(1, "rgba(39, 183, 255, 0)");

  context.fillStyle = blueGlow;
  context.fillRect(500, 0, 580, 520);

  const purpleGlow = context.createRadialGradient(
    120,
    1250,
    0,
    120,
    1250,
    430
  );

  purpleGlow.addColorStop(0, "rgba(138, 70, 255, 0.24)");
  purpleGlow.addColorStop(1, "rgba(138, 70, 255, 0)");

  context.fillStyle = purpleGlow;
  context.fillRect(0, 820, 600, 530);

  context.strokeStyle = "rgba(39, 183, 255, 0.45)";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(970, 100, 220, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "rgba(138, 70, 255, 0.4)";
  context.beginPath();
  context.arc(970, 100, 190, 0, Math.PI * 2);
  context.stroke();
}

function drawStatisticCard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  value: string,
  accentColor: string
) {
  const cardGradient = context.createLinearGradient(
    x,
    y,
    x + width,
    y + height
  );

  cardGradient.addColorStop(0, "rgba(255, 255, 255, 0.06)");
  cardGradient.addColorStop(1, "rgba(255, 255, 255, 0.025)");

  context.fillStyle = cardGradient;

  roundedRectangle(context, x, y, width, height, 34);
  context.fill();

  context.strokeStyle =
    accentColor === "#27B7FF"
      ? "rgba(39, 183, 255, 0.42)"
      : "rgba(138, 70, 255, 0.42)";

  context.lineWidth = 2;

  roundedRectangle(context, x, y, width, height, 34);
  context.stroke();

  context.textAlign = "center";

  context.fillStyle = "#B8B8D0";
  context.font = "400 27px Arial";
  context.fillText(title, x + width / 2, y + 70);

  context.fillStyle = accentColor;
  context.font = "700 64px Arial";
  context.fillText(value, x + width / 2, y + 150);
}

function drawGradientText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  firstColor: string,
  secondColor: string
) {
  const gradient = context.createLinearGradient(
    x - 200,
    y,
    x + 200,
    y
  );

  gradient.addColorStop(0, firstColor);
  gradient.addColorStop(1, secondColor);

  context.textAlign = "center";
  context.fillStyle = gradient;
  context.font = `700 ${fontSize}px Arial`;
  context.fillText(text, x, y);
}

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-DO").format(value);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("es-DO", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getFileDate() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}