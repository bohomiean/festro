"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chat } from "@/components/Chat";
import { useFest } from "@/components/FestProvider";

export default function AskPage() {
  return (
    <Suspense>
      <Ask />
    </Suspense>
  );
}

function Ask() {
  const { events } = useFest();
  const router = useRouter();
  const params = useSearchParams();
  const focusId = params.get("event");
  const focus = events.find((e) => e.id === focusId) ?? null;

  const select = (id: string | null) => router.replace(id ? `/ask?event=${id}` : "/ask", { scroll: false });

  return (
    <section className="wrap">
      <div className="ask">
        <div>
          <h2>Ask Festro</h2>
          <p style={{ margin: "0 0 14px", fontSize: 17 }}>Pick an event to chat about, or ask anything about the fest.</p>
          <label htmlFor="event-pick" className="sr-only">
            Choose an event
          </label>
          <select id="event-pick" className="pick-select" value={focus?.id ?? ""} onChange={(ev) => select(ev.target.value || null)}>
            <option value="">Select an event…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <Chat focus={focus} />
      </div>
    </section>
  );
}
