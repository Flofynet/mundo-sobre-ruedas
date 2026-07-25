import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSessionValue(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password =
      typeof body.password === "string" ? body.password : "";

    const expectedPassword = process.env.RESULTADOS_PASSWORD;
    const sessionSecret = process.env.RESULTADOS_SESSION_SECRET;

    if (!expectedPassword || !sessionSecret) {
      return NextResponse.json(
        { error: "El acceso al panel no está configurado." },
        { status: 500 }
      );
    }

    const suppliedBuffer = Buffer.from(password);
    const expectedBuffer = Buffer.from(expectedPassword);

    const validPassword =
      suppliedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(suppliedBuffer, expectedBuffer);

    if (!validPassword) {
      return NextResponse.json(
        { error: "Contraseña incorrecta." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set(
      "resultados_session",
      createSessionValue(sessionSecret),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      }
    );

    return response;
  } catch (error) {
    console.error("Error iniciando sesión:", error);

    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}