"use client";

import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  const links = [
    {
      label: "Resultat",
      path: "/results",
    },
    {
      label: "Frågor",
      path: "/admin/settings/questions",
    },
    {
      label: "Pulser",
      path: "/admin/settings/rounds",
    },
  ];

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Medarbetarpuls
          </p>

          <p className="text-sm text-slate-500">Administration</p>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {links.map((link) => {
            const active =
              pathname === link.path || pathname.startsWith(`${link.path}/`);

            return (
              <button
                key={link.path}
                type="button"
                onClick={() => router.push(link.path)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Logga ut
          </button>
        </nav>
      </div>
    </div>
  );
}
