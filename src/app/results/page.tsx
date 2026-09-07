"use client";

import { useEffect, useState } from "react";
import type { SurveyResponse } from "@/types/survey";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResultsPage() {
  const router = useRouter();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAdminAndLoadResponses() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin");
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch("/api/responses", {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Kunde inte hämta resultaten");
        }

        const data: SurveyResponse[] = await response.json();

        setResponses(data);
      } catch (error) {
        console.error(error);
        setError("Kunde inte hämta resultaten.");
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminAndLoadResponses();
  }, [router]);

  // ----- eNPS -----

  const enpsScores = responses
    .map((response) => Number(response.answers["enps"]))
    .filter((score) => !Number.isNaN(score));

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

  // ----- Genomsnitt -----

  function calculateAverage(questionId: string) {
    const scores = responses
      .map((response) => Number(response.answers[questionId]))
      .filter((score) => !Number.isNaN(score));

    if (scores.length === 0) {
      return 0;
    }

    const total = scores.reduce((sum, score) => sum + score, 0);

    return total / scores.length;
  }

  const averages = [
    {
      id: "satisfaction",
      title: "Nöjdhet med arbetsplatsen",
      value: calculateAverage("satisfaction"),
    },
    {
      id: "work-environment",
      title: "Arbetsmiljö",
      value: calculateAverage("work-environment"),
    },
    {
      id: "workload",
      title: "Arbetsbelastning",
      value: calculateAverage("workload"),
    },
    {
      id: "leadership",
      title: "Ledarskap",
      value: calculateAverage("leadership"),
    },
    {
      id: "support",
      title: "Stöd",
      value: calculateAverage("support"),
    },
    {
      id: "development",
      title: "Utveckling",
      value: calculateAverage("development"),
    },
  ];

  // ----- Kommentarer -----

  const improvementComments = responses
    .map((response) => response.answers?.["comment"])
    .filter(
      (comment): comment is string =>
        typeof comment === "string" && comment.trim().length > 0,
    );

  const positiveComments = responses
    .map((response) => response.answers?.["positive"])
    .filter(
      (comment): comment is string =>
        typeof comment === "string" && comment.trim().length > 0,
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

            <p className="mt-2 text-4xl font-bold text-slate-900">{enps}</p>
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

        {/* Genomsnitt */}

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Genomsnitt per område
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Genomsnittligt betyg från 0 till 10.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {averages.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">
                  {item.title}
                </p>

                <div className="mt-3 flex items-end gap-2">
                  <p className="text-3xl font-bold text-slate-900">
                    {item.value.toFixed(1)}
                  </p>

                  <p className="pb-1 text-sm text-slate-400">/ 10</p>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{
                      width: `${(item.value / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Kommentarer */}

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Kommentarer</h2>

            <p className="mt-1 text-sm text-slate-500">
              Fritextsvar från medarbetarna.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Förbättringar */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                Vad kan vi förbättra?
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {improvementComments.length} svar
              </p>

              <div className="mt-5 space-y-3">
                {improvementComments.length > 0 ? (
                  improvementComments.map((comment, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm leading-6 text-slate-700">
                        &ldquo;{comment}&rdquo;
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

            {/* Positiva svar */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                Vad fungerar särskilt bra?
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {positiveComments.length} svar
              </p>

              <div className="mt-5 space-y-3">
                {positiveComments.length > 0 ? (
                  positiveComments.map((comment, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm leading-6 text-slate-700">
                        &ldquo;{comment}&rdquo;
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
          </div>
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
