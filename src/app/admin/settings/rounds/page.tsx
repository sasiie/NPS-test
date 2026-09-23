"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import AdminNav from "@/components/AdminNav";

type SurveyRound = {
  id: string;
  created_at: string;
  name: string;
  active: boolean;
  rotating_sections: string[];
  open_question_ids: string[];
};

type OpenQuestion = {
  question_id: string;
  text: string;
};

const rotatingSectionOptions = [
  { value: "leadership", label: "Ledarskap" },
  { value: "communication", label: "Kommunikation" },
  { value: "collaboration", label: "Samarbete" },
  { value: "development", label: "Utveckling" },
];

export default function RoundsPage() {
  const router = useRouter();

  const [rounds, setRounds] = useState<SurveyRound[]>([]);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);

  const [newRoundName, setNewRoundName] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedOpenQuestions, setSelectedOpenQuestions] = useState<string[]>(
    [],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);

  useEffect(() => {
    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin");
        return;
      }

      const [
        { data: roundsData, error: roundsError },
        { data: questionsData, error: questionsError },
      ] = await Promise.all([
        supabase
          .from("survey-rounds")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("survey-questions")
          .select("question_id, text, section, type, active, position")
          .eq("section", "comments")
          .eq("type", "text")
          .eq("active", true)
          .order("position", { ascending: true }),
      ]);

      if (roundsError) {
        console.error(roundsError);
        setError("Kunde inte hämta pulserna.");
        setIsLoading(false);
        return;
      }

      if (questionsError) {
        console.error(questionsError);
        setError("Kunde inte hämta de öppna frågorna.");
        setIsLoading(false);
        return;
      }

      const normalizedRounds = (roundsData ?? []).map((round) => ({
        ...round,
        rotating_sections: round.rotating_sections ?? [],
        open_question_ids: round.open_question_ids ?? [],
      })) as SurveyRound[];

      const normalizedOpenQuestions = (questionsData ?? []).map((question) => ({
        question_id: question.question_id,
        text: question.text,
      })) as OpenQuestion[];

      setRounds(normalizedRounds);
      setOpenQuestions(normalizedOpenQuestions);
      setIsLoading(false);
    }

    loadPage();
  }, [router]);

  function toggleSection(section: string) {
    setSelectedSections((previous) =>
      previous.includes(section)
        ? previous.filter((item) => item !== section)
        : [...previous, section],
    );
  }

  function toggleOpenQuestion(questionId: string) {
    setError("");

    setSelectedOpenQuestions((previous) => {
      if (previous.includes(questionId)) {
        return previous.filter((item) => item !== questionId);
      }

      if (previous.length >= 2) {
        setError("Du kan välja max 2 öppna frågor per puls.");
        return previous;
      }

      return [...previous, questionId];
    });
  }

  async function createRound() {
    const trimmedName = newRoundName.trim();

    if (!trimmedName) {
      setError("Du behöver skriva ett namn på pulsen.");
      return;
    }

    if (selectedOpenQuestions.length > 2) {
      setError("Du kan välja max 2 öppna frågor per puls.");
      return;
    }

    try {
      setIsCreating(true);
      setError("");

      const { data, error } = await supabase
        .from("survey-rounds")
        .insert({
          name: trimmedName,
          active: false,
          rotating_sections: selectedSections,
          open_question_ids: selectedOpenQuestions,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const createdRound = {
        ...(data as SurveyRound),
        rotating_sections: data.rotating_sections ?? [],
        open_question_ids: data.open_question_ids ?? [],
      };

      setRounds((previous) => [createdRound, ...previous]);

      setNewRoundName("");
      setSelectedSections([]);
      setSelectedOpenQuestions([]);
    } catch (error) {
      console.error(error);
      setError("Kunde inte skapa pulsen.");
    } finally {
      setIsCreating(false);
    }
  }

  async function activateRound(round: SurveyRound) {
    if (round.active || isUpdating) return;

    try {
      setIsUpdating(true);
      setError("");

      const activeRound = rounds.find((item) => item.active);

      if (activeRound) {
        const { error: deactivateError } = await supabase
          .from("survey-rounds")
          .update({ active: false })
          .eq("id", activeRound.id);

        if (deactivateError) {
          throw deactivateError;
        }
      }

      const { error: activateError } = await supabase
        .from("survey-rounds")
        .update({ active: true })
        .eq("id", round.id);

      if (activateError) {
        throw activateError;
      }

      setRounds((previous) =>
        previous.map((item) => ({
          ...item,
          active: item.id === round.id,
        })),
      );
    } catch (error) {
      console.error(error);
      setError("Kunde inte aktivera pulsen.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function copySurveyLink() {
    const surveyUrl = window.location.origin;

    try {
      await navigator.clipboard.writeText(surveyUrl);
      alert("Enkätlänken har kopierats!");
    } catch {
      alert("Kunde inte kopiera länken.");
    }
  }

  async function closeRound(round: SurveyRound) {
    if (!round.active || isUpdating) return;

    try {
      setIsUpdating(true);
      setError("");

      const { error } = await supabase
        .from("survey-rounds")
        .update({ active: false })
        .eq("id", round.id);

      if (error) {
        throw error;
      }

      setRounds((previous) =>
        previous.map((item) =>
          item.id === round.id
            ? {
                ...item,
                active: false,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);
      setError("Kunde inte avsluta pulsen.");
    } finally {
      setIsUpdating(false);
    }
  }

  function getOpenQuestionText(questionId: string) {
    return (
      openQuestions.find((question) => question.question_id === questionId)
        ?.text ?? questionId
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Laddar pulser...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <AdminNav />

        <div className="mb-8">
          <p className="text-sm font-semibold text-indigo-600">
            Admin → Inställningar
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Enkätomgångar
          </h1>

          <p className="mt-2 text-slate-600">
            Skapa nya medarbetarpulser, välj roterande frågeområden och bestäm
            vilka öppna frågor som ska ingå.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Skapa ny puls</h2>

          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-700">
              Namn på pulsen
            </label>

            <input
              type="text"
              value={newRoundName}
              onChange={(event) => setNewRoundName(event.target.value)}
              placeholder="Till exempel Medarbetarpuls december 2026"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* ROTERANDE OMRÅDEN */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700">
              Roterande frågeområden
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Välj vilka extra frågeområden som ska ingå i den här pulsen.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {rotatingSectionOptions.map((section) => {
                const selected = selectedSections.includes(section.value);

                return (
                  <label
                    key={section.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSection(section.value)}
                      className="h-4 w-4"
                    />

                    <span className="font-medium text-slate-800">
                      {section.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ÖPPNA FRÅGOR */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Öppna frågor
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Välj vilka öppna frågor som ska ingå. Max 2 per puls.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {selectedOpenQuestions.length} / 2 valda
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {openQuestions.length > 0 ? (
                openQuestions.map((question) => {
                  const selected = selectedOpenQuestions.includes(
                    question.question_id,
                  );

                  const limitReached =
                    selectedOpenQuestions.length >= 2 && !selected;

                  return (
                    <label
                      key={question.question_id}
                      className={`flex items-start gap-3 rounded-xl border p-4 transition ${
                        selected
                          ? "cursor-pointer border-indigo-500 bg-indigo-50"
                          : limitReached
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                            : "cursor-pointer border-slate-200 bg-white hover:border-indigo-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={limitReached}
                        onChange={() =>
                          toggleOpenQuestion(question.question_id)
                        }
                        className="mt-1 h-4 w-4"
                      />

                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {question.text}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {question.question_id}
                        </p>
                      </div>
                    </label>
                  );
                })
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Det finns inga aktiva öppna frågor i sektionen Avslutande
                  frågor.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={createRound}
            disabled={isCreating}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? "Skapar..." : "Skapa puls"}
          </button>
        </section>

        {/* BEFINTLIGA PULSER */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Dina pulser</h2>

            <p className="mt-1 text-sm text-slate-500">
              Bara en puls kan vara aktiv åt gången.
            </p>
          </div>

          <div className="space-y-4">
            {rounds.map((round) => (
              <div
                key={round.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {round.name}
                      </h3>

                      {round.active && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Aktiv
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Skapad{" "}
                      {new Date(round.created_at).toLocaleDateString("sv-SE")}
                    </p>

                    {/* Valda roterande områden */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Roterande områden
                      </p>

                      {round.rotating_sections.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {round.rotating_sections.map((sectionValue) => {
                            const section = rotatingSectionOptions.find(
                              (item) => item.value === sectionValue,
                            );

                            return (
                              <span
                                key={sectionValue}
                                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                              >
                                {section?.label ?? sectionValue}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          Inga roterande områden valda.
                        </p>
                      )}
                    </div>

                    {/* Valda öppna frågor */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Öppna frågor
                      </p>

                      {round.open_question_ids.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {round.open_question_ids.map((questionId) => (
                            <div
                              key={questionId}
                              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
                            >
                              {getOpenQuestionText(questionId)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          Inga öppna frågor valda.
                        </p>
                      )}
                    </div>
                  </div>

                  {round.active ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={copySurveyLink}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        Kopiera enkätlänk
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowQrCode((previous) => !previous)}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        {showQrCode ? "Dölj QR-kod" : "Visa QR-kod"}
                      </button>

                      {showQrCode && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                          <QRCodeSVG
                            value={
                              typeof window !== "undefined"
                                ? window.location.origin
                                : ""
                            }
                            size={180}
                            className="mx-auto"
                          />
                          <p className="mt-3 text-xs text-slate-500">
                            Skanna för att öppna enkäten
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => closeRound(round)}
                        disabled={isUpdating}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Avsluta puls
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => activateRound(round)}
                      disabled={isUpdating}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Gör aktiv
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
