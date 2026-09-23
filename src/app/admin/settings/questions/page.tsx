"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminNav from "@/components/AdminNav";

type QuestionType = "scale" | "text" | "multiple-choice";

type Question = {
  id: string;
  question_id: string;
  question_number: string | null;
  text: string;
  text_en: string | null;
  type: QuestionType;
  section: string;
  position: number;
  required: boolean;
  active: boolean;
  scale_max: 5 | 10;
  options: string[];
  options_en: string[];
  show_if_question_id: string | null;
  show_if_values: string[];
};

const sectionOptions = [
  { value: "background", label: "Bakgrundsfrågor" },
  { value: "enps", label: "Trivsel" },
  { value: "work-environment", label: "Arbetsmiljö" },
  { value: "leadership", label: "Ledarskap" },
  { value: "communication", label: "Kommunikation" },
  { value: "collaboration", label: "Samarbete" },
  { value: "development", label: "Utveckling" },
  { value: "comments", label: "Avslutande frågor" },
];

export default function QuestionsPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Redigera fråga
  const [showHiddenQuestions, setShowHiddenQuestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editedTextEn, setEditedTextEn] = useState("");
  const [editedSection, setEditedSection] = useState("");
  const [editedScaleMax, setEditedScaleMax] = useState<5 | 10>(10);
  const [editedRequired, setEditedRequired] = useState(true);
  const [editedOptions, setEditedOptions] = useState<string[]>([]);
  const [editedOptionsEn, setEditedOptionsEn] = useState<string[]>([]);
  const [editedShowIfQuestionId, setEditedShowIfQuestionId] = useState("");
  const [editedShowIfValues, setEditedShowIfValues] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Lägg till fråga
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newTextEn, setNewTextEn] = useState("");
  const [newType, setNewType] = useState<QuestionType>("scale");
  const [newSection, setNewSection] = useState("enps");
  const [newRequired, setNewRequired] = useState(true);
  const [newScaleMax, setNewScaleMax] = useState<5 | 10>(10);
  const [newOptions, setNewOptions] = useState<string[]>(["", ""]);
  const [newOptionsEn, setNewOptionsEn] = useState<string[]>(["", ""]);
  const [newShowIfQuestionId, setNewShowIfQuestionId] = useState("");
  const [newShowIfValues, setNewShowIfValues] = useState<string[]>([]);
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

      const normalizedQuestions = (data ?? []).map((question) => ({
        ...question,
        text_en: question.text_en ?? null,
        options: question.options ?? [],
        options_en: question.options_en ?? [],
        show_if_question_id: question.show_if_question_id ?? null,
        show_if_values: question.show_if_values ?? [],
      })) as Question[];

      setQuestions(normalizedQuestions);
      setIsLoading(false);
    }

    loadQuestions();
  }, [router]);

  function startEditing(question: Question) {
    setEditingId(question.id);
    setEditedText(question.text);
    setEditedTextEn(question.text_en ?? "");
    setEditedSection(question.section);
    setEditedScaleMax(question.scale_max);
    setEditedRequired(question.required);

    setEditedOptions(
      question.type === "multiple-choice"
        ? question.options?.length
          ? question.options
          : ["", ""]
        : [],
    );

    if (question.type === "multiple-choice") {
      const optionCount = question.options?.length || 2;

      setEditedOptionsEn(
        Array.from(
          { length: optionCount },
          (_, index) => question.options_en?.[index] ?? "",
        ),
      );
    } else {
      setEditedOptionsEn([]);
    }

    setEditedShowIfQuestionId(question.show_if_question_id ?? "");
    setEditedShowIfValues(question.show_if_values ?? []);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditedText("");
    setEditedTextEn("");
    setEditedSection("");
    setEditedScaleMax(10);
    setEditedRequired(true);
    setEditedOptions([]);
    setEditedOptionsEn([]);
    setEditedShowIfQuestionId("");
    setEditedShowIfValues([]);
  }

  function updateNewOption(index: number, value: string) {
    setNewOptions((previous) =>
      previous.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  }

  function updateNewOptionEn(index: number, value: string) {
    setNewOptionsEn((previous) =>
      previous.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  }

  function removeNewOption(index: number) {
    setNewOptions((previous) =>
      previous.filter((_, optionIndex) => optionIndex !== index),
    );

    setNewOptionsEn((previous) =>
      previous.filter((_, optionIndex) => optionIndex !== index),
    );
  }

  function updateEditedOption(index: number, value: string) {
    setEditedOptions((previous) =>
      previous.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  }

  function updateEditedOptionEn(index: number, value: string) {
    setEditedOptionsEn((previous) =>
      previous.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  }

  function removeEditedOption(index: number) {
    setEditedOptions((previous) =>
      previous.filter((_, optionIndex) => optionIndex !== index),
    );

    setEditedOptionsEn((previous) =>
      previous.filter((_, optionIndex) => optionIndex !== index),
    );
  }

  function toggleValue(
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    setter((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  }

  async function saveQuestion(question: Question) {
    const trimmedText = editedText.trim();
    const trimmedTextEn = editedTextEn.trim();

    if (!trimmedText) {
      setError("Frågetexten på svenska får inte vara tom.");
      return;
    }

    const cleanedOptions =
      question.type === "multiple-choice"
        ? editedOptions.map((option) => option.trim())
        : [];

    const cleanedOptionsEn =
      question.type === "multiple-choice"
        ? editedOptionsEn.map((option) => option.trim())
        : [];

    if (
      question.type === "multiple-choice" &&
      cleanedOptions.filter((option) => option !== "").length < 2
    ) {
      setError("En flervalsfråga måste ha minst två svarsalternativ.");
      return;
    }

    if (
      question.type === "multiple-choice" &&
      cleanedOptionsEn.some((option, index) => {
        return cleanedOptions[index] && !option;
      })
    ) {
      setError(
        "Fyll i ett engelskt svarsalternativ för varje svenskt alternativ.",
      );
      return;
    }

    const finalOptions =
      question.type === "multiple-choice"
        ? cleanedOptions.filter((option) => option !== "")
        : [];

    const finalOptionsEn =
      question.type === "multiple-choice"
        ? cleanedOptionsEn.filter((_, index) => cleanedOptions[index] !== "")
        : [];

    try {
      setIsSaving(true);
      setError("");

      const { error } = await supabase
        .from("survey-questions")
        .update({
          text: trimmedText,
          text_en: trimmedTextEn || null,
          section: editedSection,
          required: editedRequired,
          scale_max: editedScaleMax,
          options: finalOptions,
          options_en: finalOptionsEn,
          show_if_question_id: editedShowIfQuestionId || null,
          show_if_values: editedShowIfQuestionId ? editedShowIfValues : [],
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
                text_en: trimmedTextEn || null,
                section: editedSection,
                required: editedRequired,
                scale_max: editedScaleMax,
                options: finalOptions,
                options_en: finalOptionsEn,
                show_if_question_id: editedShowIfQuestionId || null,
                show_if_values: editedShowIfQuestionId
                  ? editedShowIfValues
                  : [],
              }
            : item,
        ),
      );

      cancelEditing();
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
    const trimmedTextEn = newTextEn.trim();

    if (!trimmedText) {
      setError("Du behöver skriva en svensk frågetext.");
      return;
    }

    const cleanedOptions =
      newType === "multiple-choice"
        ? newOptions.map((option) => option.trim())
        : [];

    const cleanedOptionsEn =
      newType === "multiple-choice"
        ? newOptionsEn.map((option) => option.trim())
        : [];

    if (
      newType === "multiple-choice" &&
      cleanedOptions.filter((option) => option !== "").length < 2
    ) {
      setError("En flervalsfråga måste ha minst två svarsalternativ.");
      return;
    }

    if (
      newType === "multiple-choice" &&
      cleanedOptionsEn.some((option, index) => {
        return cleanedOptions[index] && !option;
      })
    ) {
      setError(
        "Fyll i ett engelskt svarsalternativ för varje svenskt alternativ.",
      );
      return;
    }

    const finalOptions =
      newType === "multiple-choice"
        ? cleanedOptions.filter((option) => option !== "")
        : [];

    const finalOptionsEn =
      newType === "multiple-choice"
        ? cleanedOptionsEn.filter((_, index) => cleanedOptions[index] !== "")
        : [];

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
          text_en: trimmedTextEn || null,
          type: newType,
          section: newSection,
          position: nextPosition,
          required: newRequired,
          scale_max: newScaleMax,
          options: finalOptions,
          options_en: finalOptionsEn,
          active: true,
          show_if_question_id: newShowIfQuestionId || null,
          show_if_values: newShowIfQuestionId ? newShowIfValues : [],
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setQuestions((previous) => [
        ...previous,
        {
          ...(data as Question),
          text_en: data.text_en ?? null,
          options: data.options ?? [],
          options_en: data.options_en ?? [],
          show_if_question_id: data.show_if_question_id ?? null,
          show_if_values: data.show_if_values ?? [],
        },
      ]);

      setNewText("");
      setNewTextEn("");
      setNewType("scale");
      setNewSection("enps");
      setNewRequired(true);
      setNewScaleMax(10);
      setNewOptions(["", ""]);
      setNewOptionsEn(["", ""]);
      setNewShowIfQuestionId("");
      setNewShowIfValues([]);
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

  function getQuestionTypeLabel(question: Question) {
    if (question.type === "scale") {
      return question.scale_max === 5 ? "Skala 1–5" : "Skala 0–10";
    }

    if (question.type === "multiple-choice") {
      return "Flerval";
    }

    return "Text";
  }

  function getSectionLabel(sectionValue: string) {
    return (
      sectionOptions.find((section) => section.value === sectionValue)?.label ??
      sectionValue
    );
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
        <AdminNav />

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Admin → Inställningar
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">Frågor</h1>

            <p className="mt-2 text-slate-600">
              Hantera svenska och engelska frågor som visas i medarbetarpulsen.
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

        <button
          type="button"
          onClick={() => setShowHiddenQuestions((previous) => !previous)}
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          {showHiddenQuestions ? "Dölj dolda frågor" : "Visa dolda frågor"}
        </button>

        {/* LÄGG TILL FRÅGA */}
        {showAddForm && (
          <div className="mb-8 mt-6 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Lägg till fråga
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  🇸🇪 Fråga på svenska
                </label>

                <textarea
                  value={newText}
                  onChange={(event) => setNewText(event.target.value)}
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Skriv frågan på svenska..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  🇬🇧 Question in English
                </label>

                <textarea
                  value={newTextEn}
                  onChange={(event) => setNewTextEn(event.target.value)}
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Write the question in English..."
                />
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Frågetyp
                </label>

                <select
                  value={newType}
                  onChange={(event) => {
                    const selectedType = event.target.value as QuestionType;

                    setNewType(selectedType);

                    if (
                      selectedType === "multiple-choice" &&
                      newOptions.length < 2
                    ) {
                      setNewOptions(["", ""]);
                      setNewOptionsEn(["", ""]);
                    }
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="scale">Skala</option>
                  <option value="text">Text</option>
                  <option value="multiple-choice">Flerval</option>
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

            {newType === "scale" && (
              <div className="mt-5">
                <p className="text-sm font-medium text-slate-700">Skala</p>

                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewScaleMax(5)}
                    className={`rounded-xl border px-5 py-3 font-semibold transition ${
                      newScaleMax === 5
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    1–5
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewScaleMax(10)}
                    className={`rounded-xl border px-5 py-3 font-semibold transition ${
                      newScaleMax === 10
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    0–10
                  </button>
                </div>
              </div>
            )}

            {newType === "multiple-choice" && (
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-900">
                  Svarsalternativ
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Svenska och engelska alternativ måste ligga på samma rad.
                </p>

                <div className="mt-3 space-y-3">
                  {newOptions.map((option, index) => (
                    <div
                      key={index}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <input
                        type="text"
                        value={option}
                        onChange={(event) =>
                          updateNewOption(index, event.target.value)
                        }
                        placeholder={`🇸🇪 Alternativ ${index + 1}`}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />

                      <input
                        type="text"
                        value={newOptionsEn[index] ?? ""}
                        onChange={(event) =>
                          updateNewOptionEn(index, event.target.value)
                        }
                        placeholder={`🇬🇧 Option ${index + 1}`}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />

                      {newOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeNewOption(index)}
                          className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Ta bort
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewOptions((previous) => [...previous, ""]);
                    setNewOptionsEn((previous) => [...previous, ""]);
                  }}
                  className="mt-3 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  + Lägg till alternativ
                </button>
              </div>
            )}

            {/* VILLKORAD FÖLJDFRÅGA */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">
                Villkorad följdfråga
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Välj en tidigare skalfråga om denna fråga bara ska visas vid
                vissa svar.
              </p>

              <select
                value={newShowIfQuestionId}
                onChange={(event) => {
                  setNewShowIfQuestionId(event.target.value);
                  setNewShowIfValues([]);
                }}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Alltid visa frågan</option>

                {questions
                  .filter((q) => q.type === "scale")
                  .map((q) => (
                    <option key={q.id} value={q.question_id}>
                      {q.question_number
                        ? `${q.question_number} – ${q.text}`
                        : `#${q.position} – ${q.text}`}
                    </option>
                  ))}
              </select>

              {newShowIfQuestionId &&
                (() => {
                  const parent = questions.find(
                    (q) => q.question_id === newShowIfQuestionId,
                  );

                  if (!parent) return null;

                  const values =
                    parent.scale_max === 5
                      ? ["1", "2", "3", "4", "5"]
                      : [
                          "0",
                          "1",
                          "2",
                          "3",
                          "4",
                          "5",
                          "6",
                          "7",
                          "8",
                          "9",
                          "10",
                        ];

                  return (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-700">
                        Visa när svaret är:
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {values.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              toggleValue(value, setNewShowIfValues)
                            }
                            className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition ${
                              newShowIfValues.includes(value)
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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

        {/* FRÅGOR */}
        <div className="mt-6 space-y-4">
          {questions
            .filter((question) => showHiddenQuestions || question.active)
            .map((question) => {
              const isEditing = editingId === question.id;

              return (
                <div
                  key={question.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {getSectionLabel(question.section)}
                      </p>

                      {isEditing ? (
                        <div className="mt-3">
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <label className="text-sm font-semibold text-slate-700">
                                🇸🇪 Fråga på svenska
                              </label>

                              <textarea
                                value={editedText}
                                onChange={(event) =>
                                  setEditedText(event.target.value)
                                }
                                className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-semibold text-slate-700">
                                🇬🇧 Question in English
                              </label>

                              <textarea
                                value={editedTextEn}
                                onChange={(event) =>
                                  setEditedTextEn(event.target.value)
                                }
                                className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder="Write the English version..."
                              />
                            </div>
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
                                <option
                                  key={section.value}
                                  value={section.value}
                                >
                                  {section.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {question.type === "scale" && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-slate-700">
                                Skala
                              </p>

                              <div className="mt-2 flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => setEditedScaleMax(5)}
                                  className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                                    editedScaleMax === 5
                                      ? "border-indigo-600 bg-indigo-600 text-white"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  1–5
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditedScaleMax(10)}
                                  className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                                    editedScaleMax === 10
                                      ? "border-indigo-600 bg-indigo-600 text-white"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  0–10
                                </button>
                              </div>
                            </div>
                          )}

                          {question.type === "multiple-choice" && (
                            <div className="mt-4">
                              <p className="text-sm font-semibold text-slate-900">
                                Svarsalternativ
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                Svenska och engelska alternativ ligger på samma
                                rad.
                              </p>

                              <div className="mt-3 space-y-3">
                                {editedOptions.map((option, index) => (
                                  <div
                                    key={index}
                                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                                  >
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(event) =>
                                        updateEditedOption(
                                          index,
                                          event.target.value,
                                        )
                                      }
                                      placeholder={`🇸🇪 Alternativ ${index + 1}`}
                                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                    />

                                    <input
                                      type="text"
                                      value={editedOptionsEn[index] ?? ""}
                                      onChange={(event) =>
                                        updateEditedOptionEn(
                                          index,
                                          event.target.value,
                                        )
                                      }
                                      placeholder={`🇬🇧 Option ${index + 1}`}
                                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                    />

                                    {editedOptions.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeEditedOption(index)
                                        }
                                        className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                      >
                                        Ta bort
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditedOptions((previous) => [
                                    ...previous,
                                    "",
                                  ]);
                                  setEditedOptionsEn((previous) => [
                                    ...previous,
                                    "",
                                  ]);
                                }}
                                className="mt-3 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                              >
                                + Lägg till alternativ
                              </button>
                            </div>
                          )}

                          {/* REDIGERA VILLKORAD FÖLJDFRÅGA */}
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <p className="font-semibold text-slate-900">
                              Villkorad följdfråga
                            </p>

                            <select
                              value={editedShowIfQuestionId}
                              onChange={(event) => {
                                setEditedShowIfQuestionId(event.target.value);
                                setEditedShowIfValues([]);
                              }}
                              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            >
                              <option value="">Alltid visa frågan</option>

                              {questions
                                .filter(
                                  (candidate) =>
                                    candidate.type === "scale" &&
                                    candidate.id !== question.id,
                                )
                                .map((candidate) => (
                                  <option
                                    key={candidate.id}
                                    value={candidate.question_id}
                                  >
                                    {candidate.question_number
                                      ? `${candidate.question_number} – ${candidate.text}`
                                      : `#${candidate.position} – ${candidate.text}`}
                                  </option>
                                ))}
                            </select>

                            {editedShowIfQuestionId &&
                              (() => {
                                const parent = questions.find(
                                  (q) =>
                                    q.question_id === editedShowIfQuestionId,
                                );

                                if (!parent) return null;

                                const values =
                                  parent.scale_max === 5
                                    ? ["1", "2", "3", "4", "5"]
                                    : [
                                        "0",
                                        "1",
                                        "2",
                                        "3",
                                        "4",
                                        "5",
                                        "6",
                                        "7",
                                        "8",
                                        "9",
                                        "10",
                                      ];

                                return (
                                  <div className="mt-4">
                                    <p className="text-sm font-medium text-slate-700">
                                      Visa när svaret är:
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {values.map((value) => (
                                        <button
                                          key={value}
                                          type="button"
                                          onClick={() =>
                                            toggleValue(
                                              value,
                                              setEditedShowIfValues,
                                            )
                                          }
                                          className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition ${
                                            editedShowIfValues.includes(value)
                                              ? "border-indigo-600 bg-indigo-600 text-white"
                                              : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                                          }`}
                                        >
                                          {value}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                          </div>

                          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={editedRequired}
                              onChange={(event) =>
                                setEditedRequired(event.target.checked)
                              }
                              className="h-4 w-4"
                            />
                            Obligatorisk fråga
                          </label>

                          <div className="mt-5 flex gap-2">
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

                          {question.text_en && (
                            <p className="mt-2 text-sm text-slate-500">
                              🇬🇧 {question.text_en}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                              {getQuestionTypeLabel(question)}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 ${
                                question.required
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {question.required ? "Obligatorisk" : "Valfri"}
                            </span>

                            {question.show_if_question_id && (
                              <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
                                Villkorad
                              </span>
                            )}

                            {!question.active && (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                                Dold
                              </span>
                            )}
                          </div>

                          {question.type === "multiple-choice" &&
                            question.options?.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {question.options.map((option, index) => (
                                  <div
                                    key={`${option}-${index}`}
                                    className="flex flex-wrap items-center gap-2 text-xs"
                                  >
                                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                                      🇸🇪 {option}
                                    </span>

                                    {question.options_en?.[index] && (
                                      <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-700">
                                        🇬🇧 {question.options_en[index]}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

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
                      {question.question_number && (
                        <span>{question.question_number} · </span>
                      )}
                      <span>#{question.position}</span>
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* TA BORT */}
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
