import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("last_30_days_statistics")
      .select("*")
      .single();

    if (error) {
      console.error("Error obteniendo estadísticas:", error);

      return NextResponse.json(
        { error: "No se pudieron obtener las estadísticas." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversationsReceived: Number(data?.conversations_received ?? 0),
      conversationsAnswered: Number(
        data?.conversations_answered_by_nexo ?? 0
      ),
      conversationsNotAnswered: Number(
        data?.conversations_not_answered_by_nexo ?? 0
      ),
      automaticAttentionPercentage: Number(
        data?.automatic_attention_percentage ?? 0
      ),
      averageResponseSeconds: Number(
        data?.average_response_seconds ?? 0
      ),
      uniqueCustomers: Number(data?.unique_customers ?? 0),
    });
  } catch (error) {
    console.error("Error en /api/statistics:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al cargar las estadísticas." },
      { status: 500 }
    );
  }
}