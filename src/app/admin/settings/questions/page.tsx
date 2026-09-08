"use client";

import { useEffect, useState } from "react";
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

const sectionOptions = [
  { value: "enps", label: "Din arbetsplats" },
  { value: "work-environment", label: "Arbetsmiljö" },
  { value: "leadership", label: "Ledarskap" },
  { value: "development", label: "Utveckling" },
  { value: "comments", label: "Avslutande frågor" },
];

export default function QuestionsPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editedSection, setEditedSection] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<"scale" | "text">("scale");
  const [newSection, setNewSection] = useState("enps");
  const [newRequired, setNewRequired] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadQuestions() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin");
        return;
      }

      const { data, error } = await supabase
        .from("survey-questions")
        .select("*")
        .order("position", { ascending: true });

      if (error) {
        console.error(error);
        setError("Kunde inte hämta frågorna.");
        setIsLoading(false);
        return;
      }

      setQuestions((data ?? []) as Question[]);
      setIsLoading(false);
    }

    loadQuestions();
  }, [router]);

  function startEditing(question: Question) {
    setEditingId(question.id);
    setEditedText(question.text);
    setEditedSection(question.section);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditedText("");
    setEditedSection("");
  }

  async function saveQuestion(question: Question) {
    const trimmedText = editedText.trim();

    if (!trimmedText) {
      setError("Frågetexten får inte vara tom.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const { error } = await supabase
        .from("survey-questions")
        .update({
          text: trimmedText,
          section: editedSection,
        })
        .eq("id", question.id);

      if (error) {
        throw error;
      }

      setQuestions((previous) =>
        previous.map((item) =>
          item.id === question.id
            ? {
                ...item,
                text: trimmedText,
                section: editedSection,
              }
            : item,
        ),
      );

      setEditingId(null);
      setEditedText("");
      setEditedSection("");
    } catch (error) {
      console.error(error);
      setError("Kunde inte spara frågan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(question: Question) {
    try {
      setError("");

      const newActive = !question.active;

      const { error } = await supabase
        .from("survey-questions")
        .update({
          active: newActive,
        })
        .eq("id", question.id);

      if (error) {
        throw error;
      }

      setQuestions((previous) =>
        previous.map((item) =>
          item.id === question.id
            ? {
                ...item,
                active: newActive,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);
      setError("Kunde inte ändra frågans status.");
    }
  }

  async function addQuestion() {
    const trimmedText = newText.trim();

    if (!trimmedText) {
      setError("Du behöver skriva en frågetext.");
      return;
    }

    try {
      setIsAdding(true);
      setError("");

      const nextPosition =
        questions.length > 0
          ? Math.max(...questions.map((question) => question.position)) + 1
          : 1;

      const questionId = `custom-${crypto.randomUUID()}`;

      const { data, error } = await supabase
        .from("survey-questions")
        .insert({
          question_id: questionId,
          text: trimmedText,
          type: newType,
          section: newSection,
          position: nextPosition,
          required: newRequired,
          active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setQuestions((previous) => [...previous, data as Question]);

      setNewText("");
      setNewType("scale");
      setNewSection("enps");
      setNewRequired(true);
      setShowAddForm(false);
    } catch (error) {
      console.error(error);
      setError("Kunde inte lägga till frågan.");
    } finally {
      setIsAdding(false);
    }
  }

  async function deleteQuestion() {
    if (!questionToDelete) return;

    try {
      setIsDeleting(true);
      setError("");

      const { error } = await supabase
        .from("survey-questions")
        .delete()
        .eq("id", questionToDelete.id);

      if (error) {
        throw error;
      }

      setQuestions((previous) =>
        previous.filter((question) => question.id !== questionToDelete.id),
      );

      setQuestionToDelete(null);
    } catch (error) {
      console.error(error);
      setError("Kunde inte ta bort frågan.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Laddar frågor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Admin → Inställningar
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">Frågor</h1>

            <p className="mt-2 text-slate-600">
              Hantera frågorna som visas i medarbetarpulsen.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm((previous) => !previous);
              setError("");
            }}
            className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            {showAddForm ? "Stäng" : "+ Lägg till fråga"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="mb-8 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Lägg till fråga
            </h2>

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-700">
                Frågetext
              </label>

              <textarea
                value={newText}
                onChange={(event) => setNewText(event.target.value)}
                className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Skriv frågan här..."
              />
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Frågetyp
                </label>

                <select
                  value={newType}
                  onChange={(event) =>
                    setNewType(event.target.value as "scale" | "text")
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="scale">Skala 0–10</option>
                  <option value="text">Text</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Sektion
                </label>

                <select
                  value={newSection}
                  onChange={(event) => setNewSection(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  {sectionOptions.map((section) => (
                    <option key={section.value} value={section.value}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newRequired}
                onChange={(event) => setNewRequired(event.target.checked)}
                className="h-4 w-4"
              />
              Obligatorisk fråga
            </label>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={addQuestion}
                disabled={isAdding}
                className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdding ? "Lägger till..." : "Lägg till"}
              </button>

              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                disabled={isAdding}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {questions.map((question) => {
            const isEditing = editingId === question.id;

            return (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {question.section}
                    </p>

                    {isEditing ? (
                      <div className="mt-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Frågetext
                          </label>

                          <textarea
                            value={editedText}
                            onChange={(event) =>
                              setEditedText(event.target.value)
                            }
                            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>

                        <div className="mt-4">
                          <label className="text-sm font-medium text-slate-700">
                            Sektion
                          </label>

                          <select
                            value={editedSection}
                            onChange={(event) =>
                              setEditedSection(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          >
                            {sectionOptions.map((section) => (
                              <option key={section.value} value={section.value}>
                                {section.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveQuestion(question)}
                            disabled={isSaving}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving ? "Sparar..." : "Spara"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={isSaving}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Avbryt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2 className="mt-2 font-semibold text-slate-900">
                          {question.text}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                            {question.type === "scale" ? "Skala 0–10" : "Text"}
                          </span>

                          {question.required && (
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                              Obligatorisk
                            </span>
                          )}

                          {!question.active && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                              Dold
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(question)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            Redigera
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleActive(question)}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                              question.active
                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {question.active ? "Dölj" : "Visa"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setQuestionToDelete(question)}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Ta bort
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <span className="shrink-0 text-sm text-slate-400">
                    #{question.position}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Ta bort fråga?</h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Frågan tas bort permanent:
            </p>

            <p className="mt-3 rounded-xl bg-slate-50 p-4 font-medium text-slate-900">
              {questionToDelete.text}
            </p>

            <p className="mt-3 text-sm text-amber-700">
              Om frågan redan har använts i en enkät är det oftast bättre att
              välja Dölj istället.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Avbryt
              </button>

              <button
                type="button"
                onClick={deleteQuestion}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Tar bort..." : "Ta bort permanent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
