"use client";

import { useEffect, useState } from "react";
import type { SurveyResponse } from "@/types/survey";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminNav from "@/components/AdminNav";

type Question = {
  id: string;
  question_id: string;
  text: string;
  type: "scale" | "text" | "multiple-choice";
  section: string;
  position: number;
  required: boolean;
  active: boolean;
  scale_max: 5 | 10;
  is_rotating: boolean;
};

type SurveyRound = {
  id: string;
  created_at: string;
  name: string;
  active: boolean;
  rotating_sections: string[];
  open_question_ids: string[];
};

export default function ResultsPage() {
  const router = useRouter();

  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rounds, setRounds] = useState<SurveyRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [error, setError] = useState("");

  // Hämta frågor + pulser
  useEffect(() => {
    async function loadAdminData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin");
        return;
      }

      try {
        setError("");

        const questionsRequest = supabase
          .from("survey-questions")
          .select("*")
          .order("position", { ascending: true });

        const roundsRequest = supabase
          .from("survey-rounds")
          .select("*")
          .order("created_at", { ascending: false });

        const [questionsResult, roundsResult] = await Promise.all([
          questionsRequest,
          roundsRequest,
        ]);

        if (questionsResult.error) {
          throw questionsResult.error;
        }

        if (roundsResult.error) {
          throw roundsResult.error;
        }

        const loadedQuestions = (questionsResult.data ?? []).map(
          (question) => ({
            ...question,
            scale_max: question.scale_max ?? 10,
            is_rotating: question.is_rotating ?? false,
          }),
        ) as Question[];

        const loadedRounds = (roundsResult.data ?? []).map((round) => ({
          ...round,
          rotating_sections: round.rotating_sections ?? [],
          open_question_ids: round.open_question_ids ?? [],
        })) as SurveyRound[];

        setQuestions(loadedQuestions);
        setRounds(loadedRounds);

        // Välj aktiv puls automatiskt.
        // Om ingen är aktiv väljs den senaste.
        const activeRound = loadedRounds.find((round) => round.active);
        const initialRound = activeRound ?? loadedRounds[0];

        if (initialRound) {
          setSelectedRoundId(initialRound.id);
        }
      } catch (error) {
        console.error(error);
        setError("Kunde inte hämta admininformationen.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, [router]);

  // Hämta svar från vald puls
  useEffect(() => {
    if (!selectedRoundId) {
      setResponses([]);
      return;
    }

    async function loadResponses() {
      try {
        setIsLoadingResponses(true);
        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/admin");
          return;
        }

        const response = await fetch(
          `/api/responses?round_id=${encodeURIComponent(selectedRoundId)}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Kunde inte hämta resultaten.");
        }

        const data: SurveyResponse[] = await response.json();

        setResponses(data);
      } catch (error) {
        console.error(error);
        setError("Kunde inte hämta resultaten.");
      } finally {
        setIsLoadingResponses(false);
      }
    }

    loadResponses();
  }, [selectedRoundId, router]);

  const selectedRound = rounds.find((round) => round.id === selectedRoundId);

  // ----- Frågor som faktiskt ingår i vald puls -----

  const roundQuestions = selectedRound
    ? questions.filter((question) => {
        // Öppna avslutande frågor styrs av open_question_ids.
        if (question.section === "comments") {
          return selectedRound.open_question_ids.includes(question.question_id);
        }

        // Kärnfrågor ingår alltid.
        if (!question.is_rotating) {
          return true;
        }

        // Roterande frågor ingår bara om området valdes för pulsen.
        return selectedRound.rotating_sections.includes(question.section);
      })
    : [];

  // ----- eNPS -----

  const enpsQuestion = roundQuestions.find(
    (question) =>
      question.question_id === "enps" ||
      (question.type === "scale" && question.scale_max === 10),
  );

  const enpsQuestionId = enpsQuestion?.question_id ?? "enps";

  const enpsScores = responses
    .map((response) => Number(response.answers[enpsQuestionId]))
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

  const scaleQuestions = roundQuestions.filter(
    (question) =>
      question.type === "scale" && question.question_id !== enpsQuestionId,
  );

  const textQuestions = roundQuestions.filter(
    (question) => question.type === "text",
  );

  // ----- Exportera CSV -----

  function exportToCsv() {
    if (!selectedRound || responses.length === 0) {
      return;
    }

    function escapeCsvValue(value: string | number | undefined | null) {
      const text = String(value ?? "").replace(/"/g, '""');

      return `"${text}"`;
    }

    const headers = [
      "Datum",
      ...roundQuestions.map((question) => question.text),
    ];

    const rows = responses.map((response) => [
      new Date(response.created_at).toLocaleString("sv-SE"),
      ...roundQuestions.map(
        (question) => response.answers[question.question_id] ?? "",
      ),
    ]);

    const csvContent = [
      headers.map(escapeCsvValue).join(";"),
      ...rows.map((row) => row.map((value) => escapeCsvValue(value)).join(";")),
    ].join("\n");

    // BOM gör att å, ä och ö fungerar bättre i Excel
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    const safeName = selectedRound.name
      .toLowerCase()
      .replace(/[^a-z0-9åäö]+/gi, "-")
      .replace(/^-|-$/g, "");

    link.href = url;
    link.download = `${safeName}-resultat.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <AdminNav />

        {/* Rubrik */}

        <div className="mb-8">
          <p className="text-sm font-semibold text-indigo-600">Admin</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Resultat
          </h1>

          <p className="mt-3 text-slate-600">
            Se och analysera resultaten från dina medarbetarpulser.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Välj puls */}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <label
                htmlFor="round"
                className="text-sm font-semibold text-slate-700"
              >
                Välj puls
              </label>

              <select
                id="round"
                value={selectedRoundId}
                onChange={(event) => setSelectedRoundId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                {rounds.length === 0 && (
                  <option value="">Inga pulser skapade</option>
                )}

                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.name}
                    {round.active ? " — Aktiv" : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedRound && (
              <div className="flex flex-wrap items-center gap-3">
                {selectedRound.active ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                    Aktiv puls
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
                    Avslutad
                  </span>
                )}

                <button
                  type="button"
                  onClick={exportToCsv}
                  disabled={responses.length === 0 || isLoadingResponses}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓ Exportera CSV
                </button>
              </div>
            )}
          </div>
        </section>

        {isLoadingResponses ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-600">Laddar pulsens resultat...</p>
          </div>
        ) : selectedRoundId ? (
          <>
            {/* Dashboard */}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Antal svar</p>

                <p className="mt-2 text-4xl font-bold text-slate-900">
                  {responses.length}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Inskickade svar i denna puls
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">eNPS</p>

                <p className="mt-2 text-4xl font-bold text-slate-900">
                  {totalEnpsResponses > 0
                    ? `${enps > 0 ? "+" : ""}${enps}`
                    : "–"}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Skala från −100 till +100
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Puls</p>

                <p className="mt-2 text-lg font-bold leading-7 text-slate-900">
                  {selectedRound?.name ?? "–"}
                </p>

                <div className="mt-3">
                  {selectedRound?.active ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Aktiv
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Avslutad
                    </span>
                  )}
                </div>
              </section>
            </div>

            {/* eNPS-fördelning */}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  eNPS-fördelning
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Fördelningen av svar på rekommendationsfrågan.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50 p-5">
                  <p className="text-sm font-semibold text-emerald-700">
                    Promoters
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-900">
                    {promoters}
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">Betyg 9–10</p>
                </div>

                <div className="rounded-xl bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-700">
                    Passives
                  </p>

                  <p className="mt-2 text-3xl font-bold text-amber-900">
                    {passives}
                  </p>

                  <p className="mt-1 text-xs text-amber-700">Betyg 7–8</p>
                </div>

                <div className="rounded-xl bg-red-50 p-5">
                  <p className="text-sm font-semibold text-red-700">
                    Detractors
                  </p>

                  <p className="mt-2 text-3xl font-bold text-red-900">
                    {detractors}
                  </p>

                  <p className="mt-1 text-xs text-red-700">Betyg 0–6</p>
                </div>
              </div>
            </section>

            {/* Genomsnitt */}

            <section className="mt-10">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  Genomsnitt per fråga
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Genomsnittligt betyg för skalfrågorna i den valda pulsen.
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

                            <p className="pb-1 text-sm text-slate-400">
                              / {question.scale_max}
                            </p>
                          </div>

                          <p className="mt-1 text-xs text-slate-400">
                            {answerCount} svar
                          </p>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{
                                width: `${Math.min(
                                  Math.max(
                                    (average / question.scale_max) * 100,
                                    0,
                                  ),
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
                    Det finns inga skalfrågor att visa för den här pulsen.
                  </p>
                </div>
              )}
            </section>

            {/* Kommentarer */}

            <section className="mt-10">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  Kommentarer
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Fritextsvar från medarbetarna.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {textQuestions.map((question) => {
                  const questionAnswers = getTextAnswers(question.question_id);

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
                        {questionAnswers.length} svar
                      </p>

                      <div className="mt-5 space-y-3">
                        {questionAnswers.length > 0 ? (
                          questionAnswers.map((answer, index) => (
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
                    Det finns inga fritextfrågor att visa för den här pulsen.
                  </p>
                </div>
              )}
            </section>

            {responses.length === 0 && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="font-medium text-slate-700">
                  Den här pulsen har inga svar ännu.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Nya svar visas här när medarbetarna skickar in enkäten.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-slate-700">
              Det finns inga pulser ännu.
            </p>

            <button
              type="button"
              onClick={() => router.push("/admin/settings/rounds")}
              className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Skapa en puls
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
