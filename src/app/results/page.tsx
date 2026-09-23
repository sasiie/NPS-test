"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminNav from "@/components/AdminNav";

type Answers = Record<string, string>;

type ResponseRow = {
  id: string;
  created_at: string;
  round_id: string;
  answers: Answers;
};

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

const BACKGROUND_QUESTIONS = {
  department: {
    questionId: "custom-fb075db4-90e6-4328-b0cf-dcacc3c42b56",
    label: "Avdelning/roll",
  },
  tenure: {
    questionId: "custom-0de9bb66-8b42-47f9-a67f-5296fbf90552",
    label: "Anställningstid",
  },
  employment: {
    questionId: "custom-41473b06-d9b6-48f2-b577-6738f1131448",
    label: "Anställningsform",
  },
};

const MIN_GROUP_SIZE = 5;

export default function ResultsPage() {
  const router = useRouter();

  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [allResponses, setAllResponses] = useState<ResponseRow[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [rounds, setRounds] = useState<SurveyRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [tenureFilter, setTenureFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");

  const [trendQuestionId, setTrendQuestionId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // HÄMTA FRÅGOR + PULSER
  // --------------------------------------------------

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

        const activeRound = loadedRounds.find((round) => round.active);
        const initialRound = activeRound ?? loadedRounds[0];

        if (initialRound) {
          setSelectedRoundId(initialRound.id);
        }

        const firstTrendQuestion = loadedQuestions.find(
          (question) =>
            question.type === "scale" &&
            !question.is_rotating &&
            question.section !== "background",
        );

        if (firstTrendQuestion) {
          setTrendQuestionId(firstTrendQuestion.question_id);
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

  // --------------------------------------------------
  // HÄMTA SVAR FÖR VALD PULS
  // --------------------------------------------------

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

        const data: ResponseRow[] = await response.json();

        setResponses(data);

        setDepartmentFilter("");
        setTenureFilter("");
        setEmploymentFilter("");
      } catch (error) {
        console.error(error);
        setError("Kunde inte hämta resultaten.");
      } finally {
        setIsLoadingResponses(false);
      }
    }

    loadResponses();
  }, [selectedRoundId, router]);

  // --------------------------------------------------
  // HÄMTA ALLA HISTORISKA SVAR FÖR TREND
  // --------------------------------------------------

  useEffect(() => {
    async function loadAllResponses() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return;
        }

        const response = await fetch("/api/responses", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Kunde inte hämta trenddata.");
        }

        const data: ResponseRow[] = await response.json();

        setAllResponses(data);
      } catch (error) {
        console.error("Trenddata error:", error);
      }
    }

    loadAllResponses();
  }, []);

  const selectedRound = rounds.find((round) => round.id === selectedRoundId);

  // --------------------------------------------------
  // FRÅGOR SOM INGICK I VALD PULS
  // --------------------------------------------------

  const roundQuestions = selectedRound
    ? questions.filter((question) => {
        if (question.section === "comments") {
          return selectedRound.open_question_ids.includes(question.question_id);
        }

        if (!question.is_rotating) {
          return true;
        }

        return selectedRound.rotating_sections.includes(question.section);
      })
    : [];

  // --------------------------------------------------
  // SEGMENTERING
  // --------------------------------------------------

  function getUniqueAnswers(questionId: string) {
    return Array.from(
      new Set(
        responses
          .map((response) => response.answers[questionId])
          .filter(
            (answer): answer is string =>
              typeof answer === "string" &&
              answer.trim().length > 0 &&
              answer.trim() !== "-",
          ),
      ),
    ).sort((a, b) => a.localeCompare(b, "sv"));
  }

  const departmentOptions = getUniqueAnswers(
    BACKGROUND_QUESTIONS.department.questionId,
  );

  const tenureOptions = getUniqueAnswers(
    BACKGROUND_QUESTIONS.tenure.questionId,
  );

  const employmentOptions = getUniqueAnswers(
    BACKGROUND_QUESTIONS.employment.questionId,
  );

  const hasActiveFilter =
    departmentFilter !== "" || tenureFilter !== "" || employmentFilter !== "";

  const filteredResponses = responses.filter((response) => {
    if (
      departmentFilter &&
      response.answers[BACKGROUND_QUESTIONS.department.questionId] !==
        departmentFilter
    ) {
      return false;
    }

    if (
      tenureFilter &&
      response.answers[BACKGROUND_QUESTIONS.tenure.questionId] !== tenureFilter
    ) {
      return false;
    }

    if (
      employmentFilter &&
      response.answers[BACKGROUND_QUESTIONS.employment.questionId] !==
        employmentFilter
    ) {
      return false;
    }

    return true;
  });

  const groupIsTooSmall =
    hasActiveFilter && filteredResponses.length < MIN_GROUP_SIZE;

  const resultResponses = hasActiveFilter ? filteredResponses : responses;

  // --------------------------------------------------
  // eNPS
  // --------------------------------------------------

  const enpsQuestion = roundQuestions.find(
    (question) =>
      question.question_id === "enps" ||
      (question.type === "scale" && question.scale_max === 10),
  );

  const enpsQuestionId = enpsQuestion?.question_id ?? "enps";

  const enpsScores = resultResponses
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

  // --------------------------------------------------
  // HJÄLPFUNKTIONER
  // --------------------------------------------------

  function getScores(questionId: string) {
    return resultResponses
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

  function getScoreDistribution(questionId: string, scaleMax: number) {
    const scores = getScores(questionId);

    return Array.from({ length: scaleMax }, (_, index) => {
      const score = index + 1;
      const count = scores.filter((value) => value === score).length;

      return {
        score,
        count,
        percentage: scores.length > 0 ? (count / scores.length) * 100 : 0,
      };
    });
  }

  function getTextAnswers(questionId: string) {
    return resultResponses
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

  // --------------------------------------------------
  // TREND ÖVER TID
  // --------------------------------------------------

  const trendQuestions = questions.filter(
    (question) =>
      question.type === "scale" &&
      !question.is_rotating &&
      question.section !== "background",
  );

  const selectedTrendQuestion = trendQuestions.find(
    (question) => question.question_id === trendQuestionId,
  );

  const trendData = selectedTrendQuestion
    ? rounds
        .map((round) => {
          const roundResponses = allResponses.filter(
            (response) => response.round_id === round.id,
          );

          // Visa inte trendresultat för grupper med färre än 5 svar.
          if (roundResponses.length < MIN_GROUP_SIZE) {
            return null;
          }

          const scores = roundResponses
            .map((response) =>
              Number(response.answers[selectedTrendQuestion.question_id]),
            )
            .filter((score) => Number.isFinite(score));

          // Extra skydd om färre än 5 personer har svarat på just frågan.
          if (scores.length < MIN_GROUP_SIZE) {
            return null;
          }

          if (scores.length === 0) {
            return null;
          }

          // eNPS ska räknas som eNPS, inte som vanligt medelvärde.
          if (selectedTrendQuestion.scale_max === 10) {
            const roundPromoters = scores.filter((score) => score >= 9).length;

            const roundDetractors = scores.filter((score) => score <= 6).length;

            const score = Math.round(
              (roundPromoters / scores.length) * 100 -
                (roundDetractors / scores.length) * 100,
            );

            return {
              roundId: round.id,
              name: round.name,
              createdAt: round.created_at,
              value: score,
              answerCount: scores.length,
            };
          }

          const average =
            scores.reduce((sum, score) => sum + score, 0) / scores.length;

          return {
            roundId: round.id,
            name: round.name,
            createdAt: round.created_at,
            value: average,
            answerCount: scores.length,
          };
        })
        .filter(
          (
            item,
          ): item is {
            roundId: string;
            name: string;
            createdAt: string;
            value: number;
            answerCount: number;
          } => item !== null,
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
    : [];

  function getTrendBarHeight(value: number) {
    if (!selectedTrendQuestion) {
      return 0;
    }

    if (selectedTrendQuestion.scale_max === 10) {
      // eNPS går från -100 till +100.
      return Math.max(5, ((value + 100) / 200) * 100);
    }

    return Math.max(
      5,
      Math.min((value / selectedTrendQuestion.scale_max) * 100, 100),
    );
  }

  function formatTrendValue(value: number) {
    if (!selectedTrendQuestion) {
      return "";
    }

    if (selectedTrendQuestion.scale_max === 10) {
      return `${value > 0 ? "+" : ""}${Math.round(value)}`;
    }

    return `${value.toFixed(1)} / ${selectedTrendQuestion.scale_max}`;
  }

  // --------------------------------------------------
  // CSV
  // --------------------------------------------------

  function exportToCsv() {
    if (!selectedRound || resultResponses.length === 0 || groupIsTooSmall) {
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

    const rows = resultResponses.map((response) => [
      new Date(response.created_at).toLocaleString("sv-SE"),
      ...roundQuestions.map(
        (question) => response.answers[question.question_id] ?? "",
      ),
    ]);

    const csvContent = [
      headers.map(escapeCsvValue).join(";"),
      ...rows.map((row) => row.map((value) => escapeCsvValue(value)).join(";")),
    ].join("\n");

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

  function resetFilters() {
    setDepartmentFilter("");
    setTenureFilter("");
    setEmploymentFilter("");
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

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

        {/* RUBRIK */}

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

        {/* VÄLJ PULS */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  disabled={
                    resultResponses.length === 0 ||
                    isLoadingResponses ||
                    groupIsTooSmall
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓ Exportera CSV
                </button>
              </div>
            )}
          </div>
        </section>

        {/* SEGMENTERING */}

        {selectedRoundId && !isLoadingResponses && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Filtrera resultat
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Segmentera resultatet med hjälp av de frivilliga
                  bakgrundsfrågorna.
                </p>
              </div>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Rensa filter
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="department-filter"
                  className="text-sm font-semibold text-slate-700"
                >
                  Avdelning/roll
                </label>

                <select
                  id="department-filter"
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  disabled={departmentOptions.length === 0}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Alla</option>

                  {departmentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tenure-filter"
                  className="text-sm font-semibold text-slate-700"
                >
                  Anställningstid
                </label>

                <select
                  id="tenure-filter"
                  value={tenureFilter}
                  onChange={(event) => setTenureFilter(event.target.value)}
                  disabled={tenureOptions.length === 0}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Alla</option>

                  {tenureOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="employment-filter"
                  className="text-sm font-semibold text-slate-700"
                >
                  Anställningsform
                </label>

                <select
                  id="employment-filter"
                  value={employmentFilter}
                  onChange={(event) => setEmploymentFilter(event.target.value)}
                  disabled={employmentOptions.length === 0}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Alla</option>

                  {employmentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                🔒 Segmenterade resultat visas endast när gruppen innehåller
                minst {MIN_GROUP_SIZE} svar.
              </p>
            </div>
          </section>
        )}

        {isLoadingResponses ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-600">Laddar pulsens resultat...</p>
          </div>
        ) : selectedRoundId ? (
          groupIsTooSmall ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                🔒
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Resultatet är dolt
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                Den valda gruppen innehåller färre än {MIN_GROUP_SIZE} svar.
                Resultatet visas därför inte för att skydda medarbetarnas
                anonymitet.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
              >
                Visa alla svar
              </button>
            </section>
          ) : (
            <>
              {/* DASHBOARD */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Antal svar
                  </p>

                  <p className="mt-2 text-4xl font-bold text-slate-900">
                    {resultResponses.length}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {hasActiveFilter
                      ? "Svar i vald grupp"
                      : "Inskickade svar i denna puls"}
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

              {/* eNPS-FÖRDELNING */}

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

              {/* TREND ÖVER TID */}

              <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Trend över tid
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Jämför samma kärnfråga mellan olika pulser.
                    </p>
                  </div>

                  <div className="w-full sm:max-w-sm">
                    <label
                      htmlFor="trend-question"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Välj fråga
                    </label>

                    <select
                      id="trend-question"
                      value={trendQuestionId}
                      onChange={(event) =>
                        setTrendQuestionId(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                      {trendQuestions.map((question) => (
                        <option
                          key={question.question_id}
                          value={question.question_id}
                        >
                          {question.text}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedTrendQuestion && (
                  <div className="mt-7">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold leading-6 text-slate-800">
                        {selectedTrendQuestion.text}
                      </p>
                    </div>

                    {trendData.length > 0 ? (
                      <>
                        <div className="mt-8 flex min-h-64 items-end gap-4 overflow-x-auto border-b border-slate-200 pb-0">
                          {trendData.map((item) => (
                            <div
                              key={item.roundId}
                              className="flex min-w-28 flex-1 flex-col items-center justify-end"
                            >
                              <p className="mb-2 text-sm font-bold text-slate-900">
                                {formatTrendValue(item.value)}
                              </p>

                              <div className="flex h-40 w-full max-w-20 items-end rounded-t-lg bg-slate-100">
                                <div
                                  className="w-full rounded-t-lg bg-indigo-600 transition-all"
                                  style={{
                                    height: `${getTrendBarHeight(item.value)}%`,
                                  }}
                                />
                              </div>

                              <div className="min-h-20 w-full px-1 pt-3 text-center">
                                <p className="text-xs font-semibold leading-5 text-slate-700">
                                  {item.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {item.answerCount} svar
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {trendData.length === 1 && (
                          <p className="mt-4 text-sm text-slate-500">
                            När fler pulser har svar kommer utvecklingen mellan
                            pulserna att visas här.
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
                        <p className="text-sm text-slate-500">
                          Det finns ännu inga historiska svar för den här
                          frågan.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* GENOMSNITT */}

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

                    const distribution = getScoreDistribution(
                      question.question_id,
                      question.scale_max,
                    );

                    return (
                      <div
                        key={question.id}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                      >
                        <p className="text-sm font-medium leading-6 text-slate-600">
                          {question.text}
                        </p>

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

                            <div className="mt-6 border-t border-slate-100 pt-5">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Svarsfördelning
                              </p>

                              <div className="space-y-2">
                                {distribution.map((item) => (
                                  <div
                                    key={item.score}
                                    className="grid grid-cols-[20px_1fr_55px] items-center gap-3"
                                  >
                                    <span className="text-sm font-semibold text-slate-700">
                                      {item.score}
                                    </span>

                                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className="h-full rounded-full bg-indigo-500"
                                        style={{
                                          width: `${item.percentage}%`,
                                        }}
                                      />
                                    </div>

                                    <span className="text-right text-xs text-slate-500">
                                      {item.count} svar
                                    </span>
                                  </div>
                                ))}
                              </div>
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
              </section>

              {/* KOMMENTARER */}

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
                    const questionAnswers = getTextAnswers(
                      question.question_id,
                    );

                    return (
                      <div
                        key={question.id}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                      >
                        <h3 className="font-semibold leading-6 text-slate-900">
                          {question.text}
                        </h3>

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
          )
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
