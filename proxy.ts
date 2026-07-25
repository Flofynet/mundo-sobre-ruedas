import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function createSessionValue(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function safeCompare(firstValue: string, secondValue: string) {
  const firstBuffer = Buffer.from(firstValue);
  const secondBuffer = Buffer.from(secondValue);

  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const sessionSecret = process.env.RESULTADOS_SESSION_SECRET;

  if (!sessionSecret) {
    return new NextResponse(
      "El acceso al panel no está configurado.",
      {
        status: 500,
      }
    );
  }

  const currentSession =
    request.cookies.get("resultados_session")?.value ?? "";

  const expectedSession = createSessionValue(sessionSecret);

  const authenticated = safeCompare(
    currentSession,
    expectedSession
  );

  const isLoginPage = pathname === "/resultados/login";
  const isLoginApi = pathname === "/api/resultados/login";

  if (authenticated && isLoginPage) {
    return NextResponse.redirect(
      new URL("/resultados", request.url)
    );
  }

  if (isLoginPage || isLoginApi) {
    return NextResponse.next();
  }

  if (!authenticated) {
    if (pathname.startsWith("/api/statistics")) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    return NextResponse.redirect(
      new URL("/resultados/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/resultados/:path*",
    "/api/statistics/:path*",
    "/api/resultados/login",
  ],
};