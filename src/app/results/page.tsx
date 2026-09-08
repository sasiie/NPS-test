"use client";

import { useEffect, useState } from "react";
import type { SurveyResponse } from "@/types/survey";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Question = {
  id: string;
  question_id: string;
  text: string;
  type: "scale" | "text";
  section: string;
  position: number;
  required: boolean;
  active: boolean;
};

export default function ResultsPage() {
  const router = useRouter();

  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAdminAndLoadResults() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin");
        return;
      }

      try {
        setError("");

        // Hämta enkätsvaren
        const responseRequest = fetch("/api/responses", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        // Hämta alla frågor.
        // Admin får även se dolda frågor så gamla resultat kan visas.
        const questionsRequest = supabase
          .from("survey-questions")
          .select("*")
          .order("position", { ascending: true });

        const [responseResult, questionsResult] = await Promise.all([
          responseRequest,
          questionsRequest,
        ]);

        if (!responseResult.ok) {
          throw new Error("Kunde inte hämta resultaten.");
        }

        if (questionsResult.error) {
          throw questionsResult.error;
        }

        const responseData: SurveyResponse[] = await responseResult.json();

        setResponses(responseData);
        setQuestions((questionsResult.data ?? []) as Question[]);
      } catch (error) {
        console.error(error);
        setError("Kunde inte hämta resultaten.");
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminAndLoadResults();
  }, [router]);

  // ----- eNPS -----

  const enpsScores = responses
    .map((response) => Number(response.answers["enps"]))
    .filter((score) => Number.isFinite(score));

  const promoters = enpsScores.filter((score) => score >= 9).length;

  const passives = enpsScores.filter(
    (score) => score >= 7 && score <= 8,
  ).length;

  const detractors = enpsScores.filter((score) => score <= 6).length;

  const totalEnpsResponses = enpsScores.length;

  const enps =
    totalEnpsResponses > 0
      ? Math.round(
          (promoters / totalEnpsResponses) * 100 -
            (detractors / totalEnpsResponses) * 100,
        )
      : 0;

  // ----- Hjälpfunktioner -----

  function getScores(questionId: string) {
    return responses
      .map((response) => Number(response.answers[questionId]))
      .filter((score) => Number.isFinite(score));
  }

  function calculateAverage(questionId: string) {
    const scores = getScores(questionId);

    if (scores.length === 0) {
      return null;
    }

    const total = scores.reduce((sum, score) => sum + score, 0);

    return total / scores.length;
  }

  function getTextAnswers(questionId: string) {
    return responses
      .map((response) => response.answers[questionId])
      .filter(
        (answer): answer is string =>
          typeof answer === "string" && answer.trim().length > 0,
      );
  }

  // ----- Dynamiska skalfrågor -----

  const scaleQuestions = questions.filter(
    (question) => question.type === "scale" && question.question_id !== "enps",
  );

  // ----- Dynamiska fritextfrågor -----

  const textQuestions = questions.filter(
    (question) => question.type === "text",
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-600">Laddar resultat...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Rubrik */}

        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Medarbetarpuls
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Resultat
            </h1>

            <p className="mt-3 text-slate-600">
              Här visas resultaten från undersökningen.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            Logga ut
          </button>
        </header>

        {/* Antal svar */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Antal svar</p>

          <p className="mt-2 text-4xl font-bold text-slate-900">
            {responses.length}
          </p>
        </section>

        {/* eNPS */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">eNPS</p>

            <p className="mt-2 text-4xl font-bold text-slate-900">
              {totalEnpsResponses > 0 ? enps : "–"}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Promoters</p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {promoters}
            </p>

            <p className="mt-1 text-xs text-slate-500">Betyg 9–10</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Passives</p>

            <p className="mt-2 text-3xl font-bold text-slate-900">{passives}</p>

            <p className="mt-1 text-xs text-slate-500">Betyg 7–8</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Detractors</p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {detractors}
            </p>

            <p className="mt-1 text-xs text-slate-500">Betyg 0–6</p>
          </section>
        </div>

        {/* Skalfrågor */}

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Genomsnitt per fråga
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Genomsnittligt betyg från 0 till 10.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scaleQuestions.map((question) => {
              const average = calculateAverage(question.question_id);

              const answerCount = getScores(question.question_id).length;

              return (
                <div
                  key={question.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-6 text-slate-600">
                      {question.text}
                    </p>

                    {!question.active && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        Dold
                      </span>
                    )}
                  </div>

                  {average !== null ? (
                    <>
                      <div className="mt-3 flex items-end gap-2">
                        <p className="text-3xl font-bold text-slate-900">
                          {average.toFixed(1)}
                        </p>

                        <p className="pb-1 text-sm text-slate-400">/ 10</p>
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        {answerCount} {answerCount === 1 ? "svar" : "svar"}
                      </p>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{
                            width: `${Math.min(
                              Math.max((average / 10) * 100, 0),
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      Inga svar på frågan ännu.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {scaleQuestions.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">
                Det finns inga skalfrågor att visa.
              </p>
            </div>
          )}
        </section>

        {/* Fritextsvar */}

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Kommentarer</h2>

            <p className="mt-1 text-sm text-slate-500">
              Fritextsvar från medarbetarna.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {textQuestions.map((question) => {
              const answers = getTextAnswers(question.question_id);

              return (
                <div
                  key={question.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-6 text-slate-900">
                      {question.text}
                    </h3>

                    {!question.active && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        Dold
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {answers.length} {answers.length === 1 ? "svar" : "svar"}
                  </p>

                  <div className="mt-5 space-y-3">
                    {answers.length > 0 ? (
                      answers.map((answer, index) => (
                        <div
                          key={`${question.id}-${index}`}
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <p className="text-sm leading-6 text-slate-700">
                            &ldquo;{answer}&rdquo;
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        Inga kommentarer ännu.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {textQuestions.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">
                Det finns inga fritextfrågor att visa.
              </p>
            </div>
          )}
        </section>

        {/* Inga svar */}

        {responses.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-slate-600">
              Det finns inga inskickade svar ännu.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
