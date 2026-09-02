import { NextResponse } from "next/server";
import { getResponses, saveResponse  } from "@/lib/storage";
import { activeRound } from "@/lib/round";
import type { SurveyAnswers, SurveyResponse } from "@/types/survey";

export async function POST(request: Request) {
  try {
    const answers: SurveyAnswers = await request.json();

    const response: SurveyResponse = {
      id: crypto.randomUUID(),
      roundId: activeRound.id,
      submittedAt: new Date().toISOString(),
      answers,
    };

    saveResponse(response);

    return NextResponse.json(
      {
        success: true,
        message: "Tack för ditt svar!",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Kunde inte spara svaret.",
      },
      { status: 400 },
    );
  }
}

export async function GET() {
    const responses = getResponses();
    return NextResponse.json(responses);
}