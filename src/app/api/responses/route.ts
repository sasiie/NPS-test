import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { activeRound } from "@/lib/round";
import type { SurveyAnswers } from "@/types/survey";

export async function POST(request: Request) {
  try {
    const answers: SurveyAnswers = await request.json();

    const { error } = await supabase.from("survey-responses").insert({
      round_id: activeRound.id,
      answers,
    });

    if (error) {
      console.error("Supabase POST error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Kunde inte spara svaret.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Tack för ditt svar!",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Kunde inte spara svaret.",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { message: "Du är inte inloggad." },
      { status: 401 },
    );
  }

  const accessToken = authorization.replace("Bearer ", "");

  const authenticatedSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await authenticatedSupabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { message: "Ogiltig inloggning." },
      { status: 401 },
    );
  }

  const { data, error } = await authenticatedSupabase
    .from("survey-responses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Kunde inte hämta resultaten.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
