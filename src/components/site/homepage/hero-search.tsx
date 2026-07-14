"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { FormEvent } from "react";

export function HeroSearch() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = String(formData.get("q") ?? "").trim();
    router.push(q ? `/inventory?q=${encodeURIComponent(q)}` : "/inventory");
  }

  return (
    <div className="relative z-10 w-full bg-transparent p-4 md:px-[50px] md:py-5">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-[1440px] items-center gap-3 rounded-full border border-white/20 bg-white/85 px-5 py-2 backdrop-blur-md md:px-6 md:py-3"
      >
        <Search className="size-5 shrink-0 text-[#0d0d0d]/50" />
        <input
          type="text"
          name="q"
          placeholder="Buscá por marca, modelo o año"
          className="h-9 w-full min-w-0 bg-transparent text-base text-[#0d0d0d] outline-none placeholder:text-[#0d0d0d]/40 md:text-lg"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#0d0d0d] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#161616]"
        >
          Buscar
        </button>
      </form>
    </div>
  );
}
