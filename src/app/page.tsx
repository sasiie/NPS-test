"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SurveyAnswers } from "@/types/survey";

type Language = "sv" | "en";

type DatabaseQuestion = {
  id: string;
  question_id: string;
  question_number: string | null;
  text: string;
  text_en: string | null;
  type: "scale" | "text" | "multiple-choice";
  section: string;
  position: number;
  required: boolean;
  active: boolean;
  scale_max: 5 | 10;
  options: string[];
  options_en: string[];
  show_if_question_id: string | null;
  show_if_values: string[];
  is_rotating: boolean;
};

type SurveySection = {
  id: string;
  questions: DatabaseQuestion[];
};

const sectionInfo = {
  sv: {
    background: {
      title: "Bakgrundsfrågor",
      description:
        "De här frågorna är frivilliga och används endast för att förstå resultaten på gruppnivå.",
    },
    enps: {
      title: "Trivsel / Engagemang",
      description:
        "Vi börjar med några övergripande frågor om trivsel och engagemang.",
    },
    "work-environment": {
      title: "Arbetsmiljö",
      description: "Nu vill vi veta hur du upplever din arbetsmiljö.",
    },
    leadership: {
      title: "Ledarskap",
      description: "Några frågor om ledarskap och stöd.",
    },
    communication: {
      title: "Kommunikation",
    },
    collaboration: {
      title: "Arbetsmiljö & samarbete",
    },
    development: {
      title: "Utveckling",
    },
    comments: {
      title: "Avslutande frågor",
      description: "Här kan du lämna egna synpunkter.",
    },
  },

  en: {
    background: {
      title: "Background questions",
      description:
        "These questions are optional and are only used to understand results at group level.",
    },
    enps: {
      title: "Job Satisfaction / Engagement",
      description:
        "We will start with a few general questions about job satisfaction and engagement.",
    },
    "work-environment": {
      title: "Work environment",
      description:
        "We would now like to know how you experience your work environment.",
    },
    leadership: {
      title: "Leadership",
      description: "A few questions about leadership and support.",
    },
    communication: {
      title: "Communication",
    },
    collaboration: {
      title: "Work Environment & Collaboration",
    },
    development: {
      title: "Development",
    },
    comments: {
      title: "Final questions",
      description: "Here you can share your own comments.",
    },
  },
} as const;

const sectionOrder = [
  "background",
  "enps",
  "leadership",
  "work-environment",
  "communication",
  "collaboration",
  "development",
  "comments",
];

export default function Home() {
  const [language, setLanguage] = useState<Language>("sv");
  const [surveySections, setSurveySections] = useState<SurveySection[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [surveyStarted, setSurveyStarted] = useState(false);

  useEffect(() => {
    async function loadSurvey() {
      setIsLoading(true);
      setLoadError("");

      const { data: activeRound, error: roundError } = await supabase
        .from("survey-rounds")
        .select("id, name, rotating_sections, open_question_ids")
        .eq("active", true)
        .maybeSingle();

      if (roundError) {
        console.error("Kunde inte hämta aktiv puls:", roundError);
        setLoadError("Kunde inte hämta den aktiva pulsen.");
        setIsLoading(false);
        return;
      }

      if (!activeRound) {
        setLoadError("Det finns ingen aktiv puls just nu.");
        setIsLoading(false);
        return;
      }

      const rotatingSections: string[] = activeRound.rotating_sections ?? [];

      const openQuestionIds: string[] = activeRound.open_question_ids ?? [];

      const { data, error } = await supabase
        .from("survey-questions")
        .select("*")
        .eq("active", true)
        .order("position", { ascending: true });

      if (error) {
        console.error("Kunde inte hämta frågor:", error);
        setLoadError("Kunde inte hämta enkäten.");
        setIsLoading(false);
        return;
      }

      const allQuestions = (data ?? []).map((question) => ({
        ...question,
        text_en: question.text_en ?? null,
        options: question.options ?? [],
        options_en: question.options_en ?? [],
        show_if_question_id: question.show_if_question_id ?? null,
        show_if_values: question.show_if_values ?? [],
        is_rotating: question.is_rotating ?? false,
      })) as DatabaseQuestion[];

      const questions = allQuestions.filter((question) => {
        if (question.section === "comments") {
          return openQuestionIds.includes(question.question_id);
        }

        if (!question.is_rotating) {
          return true;
        }

        return rotatingSections.includes(question.section);
      });

      const sections: SurveySection[] = [];

      for (const question of questions) {
        let section = sections.find(
          (existingSection) => existingSection.id === question.section,
        );

        if (!section) {
          section = {
            id: question.section,
            questions: [],
          };

          sections.push(section);
        }

        section.questions.push(question);
      }

      const sortedSections = [...sections].sort((a, b) => {
        const aIndex = sectionOrder.indexOf(a.id);
        const bIndex = sectionOrder.indexOf(b.id);

        const safeAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;

        const safeBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

        return safeAIndex - safeBIndex;
      });

      setSurveySections(sortedSections);
      setIsLoading(false);
    }

    loadSurvey();
  }, []);

  function getQuestionText(question: DatabaseQuestion) {
    if (language === "en" && question.text_en?.trim()) {
      return question.text_en;
    }

    return question.text;
  }

  function formatAnswerRange(values: string[]) {
    const numbers = values
      .map(Number)
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b);

    if (numbers.length === 0) {
      return values.join(", ");
    }

    const isContinuous = numbers.every(
      (value, index) => index === 0 || value === numbers[index - 1] + 1,
    );

    if (isContinuous && numbers.length > 1) {
      return `${numbers[0]}–${numbers[numbers.length - 1]}`;
    }

    return numbers.join(", ");
  }

  function getQuestionOptions(question: DatabaseQuestion) {
    if (
      language === "en" &&
      question.options_en &&
      question.options_en.length > 0
    ) {
      return question.options_en;
    }

    return question.options;
  }

  function getSectionInfo(sectionId: string) {
    const info =
      sectionInfo[language][
        sectionId as keyof (typeof sectionInfo)[typeof language]
      ];

    if (!info) {
      return {
        title: sectionId,
        description: undefined,
      };
    }

    return {
      title: info.title,
      description: "description" in info ? info.description : undefined,
    };
  }

  function isQuestionVisible(
    question: DatabaseQuestion,
    currentAnswers: SurveyAnswers = answers,
  ) {
    if (!question.show_if_question_id) {
      return true;
    }

    const parentAnswer = currentAnswers[question.show_if_question_id];

    return (
      parentAnswer !== undefined &&
      question.show_if_values.includes(parentAnswer)
    );
  }

  function updateAnswer(questionId: string, value: string) {
    setAnswers((previous) => {
      const nextAnswers: SurveyAnswers = {
        ...previous,
        [questionId]: value,
      };

      let changed = true;

      while (changed) {
        changed = false;

        for (const section of surveySections) {
          for (const question of section.questions) {
            if (
              question.show_if_question_id &&
              !isQuestionVisible(question, nextAnswers) &&
              nextAnswers[question.question_id] !== undefined
            ) {
              delete nextAnswers[question.question_id];
              changed = true;
            }
          }
        }
      }

      return nextAnswers;
    });
  }

  function selectMultipleChoiceAnswer(
    question: DatabaseQuestion,
    optionIndex: number,
  ) {
    // Vi sparar alltid originalvärdet på svenska.
    // Då hamnar svenska och engelska svar i samma resultatkategori.
    const originalOption =
      question.options[optionIndex] ?? question.options_en[optionIndex] ?? "";

    updateAnswer(question.question_id, originalOption);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          {language === "sv" ? "Laddar enkät..." : "Loading survey..."}
        </p>
      </main>
    );
  }

  if (loadError || surveySections.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            {language === "sv"
              ? "Enkäten kunde inte laddas"
              : "The survey could not be loaded"}
          </h1>

          <p className="mt-3 text-slate-600">
            {loadError ||
              (language === "sv"
                ? "Försök igen om en liten stund."
                : "Please try again in a moment.")}
          </p>
        </div>
      </main>
    );
  }

  if (!surveyStarted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
        <div className="w-full max-w-2xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <div className="mb-6 flex justify-end">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setLanguage("sv")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    language === "sv"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Svenska
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    language === "en"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-indigo-600">
                {language === "sv" ? "Medarbetarpuls" : "Employee survey"}
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {language === "sv"
                  ? "Vi vill höra vad du tycker"
                  : "We want to hear what you think"}
              </h1>

              <p className="mt-4 text-base leading-7 text-slate-600">
                {language === "sv"
                  ? "Den här medarbetarpulsen hjälper oss att förstå hur du upplever din arbetsplats, arbetsmiljö, ledarskap och utveckling."
                  : "This employee survey helps us understand how you experience your workplace, work environment, leadership and development."}
              </p>
            </div>

            <div className="space-y-4 rounded-2xl bg-slate-50 p-6">
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm">
                  ✓
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    {language === "sv"
                      ? "Dina svar samlas in anonymt"
                      : "Your responses are collected anonymously"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {language === "sv"
                      ? "Vi ber inte om ditt namn eller andra personuppgifter i enkäten."
                      : "We do not ask for your name or other personal information in the survey."}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm">
                  ⏱
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    {language === "sv"
                      ? "Det tar bara några minuter"
                      : "It only takes a few minutes"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {language === "sv"
                      ? "Enkäten består av korta frågor med skalfrågor, flervalsfrågor och möjlighet att lämna egna kommentarer."
                      : "The survey consists of short rating questions, multiple-choice questions and the option to leave your own comments."}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm">
                  ♥
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    {language === "sv"
                      ? "Svara så ärligt du kan"
                      : "Answer as honestly as you can"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {language === "sv"
                      ? "Det finns inga rätt eller fel svar. Dina synpunkter hjälper till att identifiera vad som fungerar bra och vad som kan förbättras."
                      : "There are no right or wrong answers. Your feedback helps identify what works well and what can be improved."}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSurveyStarted(true)}
              className="mt-8 w-full rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              {language === "sv" ? "Starta enkäten" : "Start survey"}

              <span className="ml-2">→</span>
            </button>

            <p className="mt-5 text-center text-xs leading-5 text-slate-400">
              {language === "sv"
                ? "Ditt deltagande är frivilligt."
                : "Your participation is voluntary."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const currentSection = surveySections[currentStep];
  const currentSectionInfo = getSectionInfo(currentSection.id);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === surveySections.length - 1;

  const visibleQuestions = (() => {
    const visible = currentSection.questions.filter((question) =>
      isQuestionVisible(question),
    );

    const mainQuestions = visible.filter(
      (question) => !question.show_if_question_id,
    );

    const orderedQuestions: DatabaseQuestion[] = [];

    for (const question of mainQuestions) {
      orderedQuestions.push(question);

      const followUpQuestions = visible.filter(
        (candidate) => candidate.show_if_question_id === question.question_id,
      );

      orderedQuestions.push(...followUpQuestions);
    }

    // Om en följdfråga av någon anledning inte hittar
    // sin huvudfråga i samma sektion visas den ändå.
    const addedIds = new Set(
      orderedQuestions.map((question) => question.question_id),
    );

    for (const question of visible) {
      if (!addedIds.has(question.question_id)) {
        orderedQuestions.push(question);
      }
    }

    return orderedQuestions;
  })();

  const allRequiredAnswered = visibleQuestions
    .filter((question) => question.required)
    .every((question) => {
      const answer = answers[question.question_id];

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

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  function previousStep() {
    setShowErrors(false);

    if (!isFirstStep) {
      setCurrentStep((step) => step - 1);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
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

      const visibleQuestionIds = new Set(
        surveySections
          .flatMap((section) => section.questions)
          .filter((question) => isQuestionVisible(question))
          .map((question) => question.question_id),
      );

      const answersToSubmit = Object.fromEntries(
        Object.entries(answers).filter(([questionId]) =>
          visibleQuestionIds.has(questionId),
        ),
      );

      const response = await fetch("/api/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answersToSubmit),
      });

      if (!response.ok) {
        throw new Error("Kunde inte skicka svaren");
      }

      setSubmitted(true);
    } catch (error) {
      console.error(error);

      alert(
        language === "sv"
          ? "Något gick fel när svaren skulle skickas."
          : "Something went wrong when submitting your responses.",
      );
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
            {language === "sv"
              ? "Tack för ditt svar!"
              : "Thank you for your response!"}
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            {language === "sv"
              ? "Ditt svar har skickats in."
              : "Your response has been submitted."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-end">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setLanguage("sv")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                language === "sv"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Svenska
            </button>

            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                language === "en"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-indigo-700">
              {language === "sv" ? "Steg" : "Step"} {currentStep + 1}
            </p>

            <p className="text-sm text-slate-500">
              {currentStep + 1} {language === "sv" ? "av" : "of"}{" "}
              {surveySections.length}
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
            {currentSectionInfo.title}
          </h1>

          {currentSectionInfo.description && (
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              {currentSectionInfo.description}
            </p>
          )}
        </header>

        <div className="space-y-5">
          {visibleQuestions.map((question) => {
            const answer = answers[question.question_id];

            const displayedOptions = getQuestionOptions(question);

            const isFollowUp = Boolean(question.show_if_question_id);

            const hasError =
              question.required &&
              showErrors &&
              (answer === undefined || answer.trim() === "");

            return (
              <section
                key={question.id}
                className={`rounded-2xl border p-6 shadow-sm sm:p-8 ${
                  hasError
                    ? "border-red-400 bg-white"
                    : isFollowUp
                      ? "border-indigo-200 bg-indigo-50/50"
                      : "border-slate-200 bg-white"
                }`}
              >
                {isFollowUp && (
                  <div className="mb-4">
                    <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {language === "sv" ? "Följdfråga" : "Follow-up question"}
                    </span>

                    <p className="mt-2 text-sm text-slate-600">
                      {language === "sv"
                        ? `Om du har svarat ${formatAnswerRange(
                            question.show_if_values,
                          )} på frågan ovan, svara även på följande fråga.`
                        : `If you answered ${formatAnswerRange(
                            question.show_if_values,
                          )} to the question above, please also answer the following question.`}
                    </p>
                  </div>
                )}

                <h2 className="text-base font-semibold leading-6 text-slate-900">
                  {getQuestionText(question)}

                  {question.required && (
                    <span className="ml-1 text-indigo-600">*</span>
                  )}
                </h2>

                {hasError && (
                  <p
                    role="alert"
                    className="mt-2 text-sm font-medium text-red-600"
                  >
                    {language === "sv"
                      ? "Du behöver svara på den här frågan."
                      : "You need to answer this question."}
                  </p>
                )}

                {/* SKALFRÅGA */}
                {question.type === "scale" && (
                  <div className="mt-6">
                    <div className="flex justify-center gap-4">
                      {(question.scale_max === 5
                        ? [1, 2, 3, 4, 5]
                        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                      ).map((number) => {
                        const selected =
                          answers[question.question_id] === String(number);

                        return (
                          <button
                            key={number}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              updateAnswer(question.question_id, String(number))
                            }
                            className={`flex h-12 w-12 items-center justify-center rounded-lg border text-sm font-semibold transition sm:h-12 sm:w-12 ${
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
                      <span>
                        {language === "sv"
                          ? question.scale_max === 5
                            ? "Instämmer inte alls"
                            : "Inte alls"
                          : question.scale_max === 5
                            ? "Strongly disagree"
                            : "Not at all"}
                      </span>

                      <span>
                        {language === "sv"
                          ? question.scale_max === 5
                            ? "Instämmer helt"
                            : "I mycket hög grad"
                          : question.scale_max === 5
                            ? "Strongly agree"
                            : "To a very high degree"}
                      </span>
                    </div>
                  </div>
                )}

                {/* FLERVALSFRÅGA */}
                {question.type === "multiple-choice" && (
                  <div className="mt-5 space-y-3">
                    {displayedOptions.map((option, index) => {
                      const originalOption =
                        question.options[index] ??
                        question.options_en[index] ??
                        option;

                      const selected =
                        answers[question.question_id] === originalOption;

                      return (
                        <button
                          key={`${option}-${index}`}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            selectMultipleChoiceAnswer(question, index)
                          }
                          className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600"
                              : hasError
                                ? "border-red-300 bg-white text-slate-700 hover:bg-red-50"
                                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-indigo-600 bg-indigo-600"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {selected && (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </span>

                          <span className="font-medium">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TEXTFRÅGA */}
                {question.type === "text" && (
                  <textarea
                    value={answers[question.question_id] ?? ""}
                    onChange={(event) =>
                      updateAnswer(question.question_id, event.target.value)
                    }
                    className={`mt-5 min-h-36 w-full resize-y rounded-xl border bg-white p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                      hasError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                    placeholder={
                      language === "sv"
                        ? "Skriv ditt svar här..."
                        : "Write your answer here..."
                    }
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
            {language === "sv"
              ? "Du behöver svara på alla obligatoriska frågor innan du kan gå vidare."
              : "You need to answer all required questions before you can continue."}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() => {
              if (isFirstStep) {
                setSurveyStarted(false);
              } else {
                previousStep();
              }
            }}
            className="rounded-xl px-5 py-3 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            ← {language === "sv" ? "Tillbaka" : "Back"}
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              {language === "sv" ? "Nästa" : "Next"}

              <span className="ml-2">→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={submitSurvey}
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? language === "sv"
                  ? "Skickar..."
                  : "Submitting..."
                : language === "sv"
                  ? "Skicka svar"
                  : "Submit responses"}
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          * {language === "sv" ? "Obligatorisk fråga" : "Required question"}
        </p>
      </div>
    </main>
  );
}
