"use client";

import { useState } from "react";
import { surveySections } from "@/lib/questions";
import type { SurveyAnswers } from "@/types/survey";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});

  const currentSection = surveySections[currentStep];

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === surveySections.length - 1;

  function nextStep() {
    if (!isLastStep) {
      setCurrentStep((step) => step + 1);
    }
  }

  function previousStep() {
    if (!isFirstStep) {
      setCurrentStep((step) => step - 1);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Progress */}
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

        {/* Section heading */}
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

        {/* Questions */}
        <div className="space-y-5">
          {currentSection.questions.map((question) => (
            <section
              key={question.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <h2 className="text-base font-semibold leading-6 text-slate-900">
                {question.text}

                {question.required && (
                  <span className="ml-1 text-indigo-600">*</span>
                )}
              </h2>

              {question.type === "scale" && (
                <div className="mt-6">
                  <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
                    {Array.from({ length: 11 }, (_, number) => {
                      const selected = answers[question.id] === String(number);

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
                          className={`aspect-square rounded-xl border text-sm font-semibold transition
                            ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
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
                  className="mt-5 min-h-36 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Skriv ditt svar här..."
                />
              )}
            </section>
          ))}
        </div>

        {/* Navigation */}
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
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              Skicka svar
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
