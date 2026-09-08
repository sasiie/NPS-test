"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SurveyRound = {
  id: string;
  created_at: string;
  name: string;
  active: boolean;
};

export default function RoundsPage() {
  const router = useRouter();

  const [rounds, setRounds] = useState<SurveyRound[]>([]);
  const [newRoundName, setNewRoundName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRounds() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin");
        return;
      }

      const { data, error } = await supabase
        .from("survey-rounds")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Kunde inte hämta pulserna.");
        setIsLoading(false);
        return;
      }

      setRounds((data ?? []) as SurveyRound[]);
      setIsLoading(false);
    }

    loadRounds();
  }, [router]);

  async function createRound() {
    const trimmedName = newRoundName.trim();

    if (!trimmedName) {
      setError("Du behöver skriva ett namn på pulsen.");
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
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setRounds((previous) => [data as SurveyRound, ...previous]);
      setNewRoundName("");
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
        <div className="mb-8">
          <p className="text-sm font-semibold text-indigo-600">
            Admin → Inställningar
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Enkätomgångar
          </h1>

          <p className="mt-2 text-slate-600">
            Skapa nya medarbetarpulser och välj vilken som är aktiv.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Skapa ny puls
          </h2>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newRoundName}
              onChange={(event) => setNewRoundName(event.target.value)}
              placeholder="Till exempel Medarbetarpuls december 2026"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <button
              type="button"
              onClick={createRound}
              disabled={isCreating}
              className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Skapar..." : "Skapa puls"}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Dina pulser
            </h2>

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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
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
                  </div>

                  {round.active ? (
                    <button
                      type="button"
                      onClick={() => closeRound(round)}
                      disabled={isUpdating}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Avsluta puls
                    </button>
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