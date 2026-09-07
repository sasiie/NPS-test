"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Fel mejladress eller lösenord.");
      setIsLoading(false);
      return;
    }

    router.push("/results");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-indigo-600">
          Medarbetarpuls
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Admin
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          Logga in för att se resultaten.
        </p>

        <div className="mt-6">
          <label
            htmlFor="email"
            className="text-sm font-medium text-slate-700"
          >
            Mejladress
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="din@email.se"
          />
        </div>

        <div className="mt-4">
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleLogin();
              }
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="Skriv lösenord"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Loggar in..." : "Logga in"}
        </button>
      </div>
    </main>
  );
}