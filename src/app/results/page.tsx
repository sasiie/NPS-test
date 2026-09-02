"use client";

import { useEffect, useState } from "react";
import type { SurveyResponse } from "@/types/survey";

export default function ResultsPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResponses() {
      try {
        const response = await fetch("/api/responses");

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

    loadResponses();
  }, []);

  const enpsScores = responses
    .map((response) => Number(response.answers["enps-score"]))
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
        <header className="mb-10">
          <p className="text-sm font-semibold text-indigo-600">
            Medarbetarpuls
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Resultat
          </h1>

          <p className="mt-3 text-slate-600">
            Här visas resultaten från undersökningen.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Antal svar</p>

          <p className="mt-2 text-4xl font-bold text-slate-900">
            {responses.length}
          </p>
        </section>
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
        {responses.length === 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-slate-600">
              Det finns inga inskickade svar ännu.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
