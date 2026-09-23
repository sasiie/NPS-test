"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSetPassword() {
    setError("");

    if (password.length < 8) {
      setError("Lösenordet måste innehålla minst 8 tecken.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(
        "Kunde inte skapa lösenordet. Länken kan ha gått ut. Försök igen.",
      );
      setIsLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-indigo-600">Medarbetarpuls</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Skapa lösenord
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          Välj ett lösenord för ditt adminkonto.
        </p>

        <div className="mt-6">
          <label
            htmlFor="password"
            className="text-sm font-medium text-slate-700"
          >
            Lösenord
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="Minst 8 tecken"
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-slate-700"
          >
            Bekräfta lösenord
          </label>

          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSetPassword();
              }
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="Skriv lösenordet igen"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSetPassword}
          disabled={isLoading}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Sparar..." : "Skapa lösenord"}
        </button>
      </div>
    </main>
  );
}
