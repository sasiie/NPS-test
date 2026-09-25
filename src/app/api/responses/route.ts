import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { SurveyAnswers } from "@/types/survey";

// Skapar ett slumpmässigt 8-siffrigt kvittensnummer
function generateReceiptCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export async function POST(request: Request) {
  try {
    const body: {
      answers: SurveyAnswers;
      department: "kitchen" | "dining" | null;
    } = await request.json();

    const { answers, department } = body;

    if (!department || !["kitchen", "dining"].includes(department)) {
      return NextResponse.json(
        {
          success: false,
          message: "Du behöver välja en avdelning.",
        },
        { status: 400 },
      );
    }

    // Hämta den puls som är aktiv just nu
    const { data: activeRound, error: roundError } = await supabase
      .from("survey-rounds")
      .select("id")
      .eq("active", true)
      .single();

    if (roundError || !activeRound) {
      console.error("Active round error:", roundError);

      return NextResponse.json(
        {
          success: false,
          message: "Det finns ingen aktiv enkätomgång.",
        },
        { status: 400 },
      );
    }

    // Spara enkätsvaret
    const { error: responseError } = await supabase
      .from("survey-responses")
      .insert({
        round_id: activeRound.id,
        department,
        answers,
      });

    if (responseError) {
      console.error("Supabase POST error:", responseError);

      return NextResponse.json(
        {
          success: false,
          message: "Kunde inte spara svaret.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // SKAPA ANONYM KVITTENS
    // --------------------------------------------------

    let receiptCode = "";
    let receiptCreated = false;

    // Försök upp till 5 gånger om en kod mot förmodan redan finns.
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateCode = generateReceiptCode();

      const { error: receiptError } = await supabase
        .from("survey-receipts")
        .insert({
          receipt_code: candidateCode,
          round_id: activeRound.id,
        });

      if (!receiptError) {
        receiptCode = candidateCode;
        receiptCreated = true;
        break;
      }

      // PostgreSQL 23505 = unique constraint violation.
      // Om numret redan finns testar vi bara ett nytt.
      if (receiptError.code === "23505") {
        continue;
      }

      console.error("Receipt error:", receiptError);
      break;
    }

    // Svaret är redan sparat även om skapandet av kvittensen skulle misslyckas.
    if (!receiptCreated) {
      console.error("Kunde inte skapa anonym kvittens.");

      return NextResponse.json(
        {
          success: true,
          receiptCode: null,
          message:
            "Svaret sparades, men kvittensen kunde inte skapas. Kontakta ansvarig.",
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        receiptCode,
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

  const { searchParams } = new URL(request.url);
  const roundId = searchParams.get("round_id");

  let query = authenticatedSupabase
    .from("survey-responses")
    .select("*")
    .order("created_at", { ascending: false });

  if (roundId) {
    query = query.eq("round_id", roundId);
  }

  const { data, error } = await query;

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
