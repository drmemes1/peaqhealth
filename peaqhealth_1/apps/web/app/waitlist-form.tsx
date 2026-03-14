"use client";

import { useActionState } from "react";
import { joinWaitlist } from "./actions";

export function WaitlistForm() {
  const [state, formAction, isPending] = useActionState(joinWaitlist, null);

  if (state?.ok) {
    return (
      <p className="font-display text-xl tracking-wide text-gold italic">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-3 w-full max-w-md">
      <div className="flex w-full gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-12 flex-1 border border-ink/15 bg-white px-4 font-body text-sm
                     text-ink placeholder:text-ink/35 outline-none
                     transition-colors focus:border-gold"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-12 shrink-0 bg-ink px-6 font-body text-sm font-medium
                     uppercase tracking-[0.15em] text-off-white
                     transition-colors hover:bg-gold disabled:opacity-50"
        >
          {isPending ? "Joining..." : "Join waitlist"}
        </button>
      </div>
      {state && !state.ok && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </form>
  );
}
