"use client";

import { useState } from "react";
import { surveySections } from "@/lib/questions";
import type { SurveyAnswers } from "@/types/survey";
import Link from "next/link";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const currentSection = surveySections[currentStep];
  const [showErrors, setShowErrors] = useState(false);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === surveySections.length - 1;

  const allRequiredAnswered = currentSection.questions.every((question) => {
    const answer = answers[question.id];
    return answer !== undefined && answer.trim() !== "";
  });

  function nextStep() {
    if (!allRequiredAnswered) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (!isLastStep) {
      setCurrentStep((step) => step + 1);
    }
  }

  function previousStep() {
    setShowErrors(false);
    if (!isFirstStep) {
      setCurrentStep((step) => step - 1);
    }
  }
  async function submitSurvey() {
    if (!allRequiredAnswered) {
      setShowErrors(true);
      return;
    }
    try {
      setIsSubmitting(true);
      setShowErrors(false);

      const response = await fetch("/api/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        throw new Error("Kunde inte skicka svaren");
      }

      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Något gick fel när svaren skulle skickas.");
    } finally {
      setIsSubmitting(false);
    }
  }
  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl">
            ✓
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Tack för ditt svar!
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            Ditt svar har skickats in.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-end">
  <Link
    href="/results"
    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
  >
    Visa resultat
  </Link>
</div>
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-indigo-700">
              Steg {currentStep + 1}
            </p>

            <p className="text-sm text-slate-500">
              {currentStep + 1} av {surveySections.length}
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / surveySections.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {currentSection.title}
          </h1>

          {currentSection.description && (
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              {currentSection.description}
            </p>
          )}
        </header>

        <div className="space-y-5">
          {currentSection.questions.map((question) => {
            const answer = answers[question.id];
            const hasError =
              showErrors && (answer === undefined || answer.trim() === "");

            return (
              <section
                key={question.id}
                className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${
                  hasError ? "border-red-400" : "border-slate-200"
                }`}
              >
                <h2 className="text-base font-semibold leading-6 text-slate-900">
                  {question.text}
                  <span className="ml-1 text-indigo-600">*</span>
                </h2>
                {hasError && (
                  <p
                    role="alert"
                    className="mt-2 text-sm font-medium text-red-600"
                  >
                    Du behöver svara på den här frågan.
                  </p>
                )}

                {question.type === "scale" && (
                  <div className="mt-6">
                    <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
                      {Array.from({ length: 11 }, (_, number) => {
                        const selected =
                          answers[question.id] === String(number);

                        return (
                          <button
                            key={number}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setAnswers((previous) => ({
                                ...previous,
                                [question.id]: String(number),
                              }))
                            }
                            className={`aspect-square rounded-xl border text-sm font-semibold transition ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                : hasError
                                  ? "border-red-300 bg-white text-slate-700 hover:bg-red-50"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                            }`}
                          >
                            {number}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                      <span>Inte alls</span>
                      <span>I mycket hög grad</span>
                    </div>
                  </div>
                )}

                {question.type === "text" && (
                  <textarea
                    value={answers[question.id] ?? ""}
                    onChange={(event) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [question.id]: event.target.value,
                      }))
                    }
                    className={`mt-5 min-h-36 w-full resize-y rounded-xl border bg-white p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                      hasError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                    placeholder="Skriv ditt svar här..."
                  />
                )}
              </section>
            );
          })}
        </div>
        {showErrors && !allRequiredAnswered && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            Du behöver svara på alla frågor innan du kan gå vidare.
          </div>
        )}
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
          {!isFirstStep ? (
            <button
              type="button"
              onClick={previousStep}
              className="rounded-xl px-5 py-3 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              ← Tillbaka
            </button>
          ) : (
            <div />
          )}

          {!isLastStep ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              Nästa
              <span className="ml-2">→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={submitSurvey}
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Skickar..." : "Skicka svar"}
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          * Obligatorisk fråga
        </p>
      </div>
    </main>
  );
}
