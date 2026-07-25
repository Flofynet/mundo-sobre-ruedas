"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResultadosLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/resultados/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo iniciar sesión.");
      }

      router.push("/resultados");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] px-5 text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#27B7FF]/20 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#8A46FF]/20 blur-3xl" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur">
        <p className="bg-gradient-to-r from-[#27B7FF] to-[#8A46FF] bg-clip-text text-sm font-bold uppercase tracking-[0.35em] text-transparent">
          Nexo
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Panel de resultados
        </h1>

        <p className="mt-3 text-[#B8B8D0]">
          Ingresa la contraseña para consultar las estadísticas.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-[#B8B8D0]"
          >
            Contraseña
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#09091A] px-4 py-4 text-white outline-none transition focus:border-[#27B7FF]"
          />

          {error && (
            <p className="mt-4 text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#27B7FF] to-[#8A46FF] px-6 py-4 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}