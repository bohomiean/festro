"use client";

import { useEffect, useRef, useState } from "react";
import { answer } from "@/lib/answer";
import type { FestEvent } from "@/lib/types";
import { useFest } from "./FestProvider";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  text: "Hi! I'm Festro, your guide to ORACLE 2026. Ask me about the schedule, venues, coordinators, delays, what's on now or next, or tap a suggestion below.",
};

export function Chat({ focus }: { focus: FestEvent | null }) {
  const { events, favs } = useFest();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);

    let reply: string;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, eventId: focus?.id ?? null, saved: [...favs], history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { answer?: string };
      reply = data.answer || answer(question, events, { saved: [...favs], focus });
    } catch {
      // Offline or server error: answer from the data already on screen.
      reply = answer(question, events, { saved: [...favs], focus });
    }

    setMessages((m) => [...m, { role: "assistant", text: reply }]);
    setBusy(false);
  }

  const suggestions = focus
    ? ["Is it delayed?", "What time is it?", "Which day is it?", "Where is it?", "Who do I call?", "Add it to my calendar"]
    : [
        "What's on Day 1?",
        "What's on Day 2?",
        "What's on Day 3?",
        "What's happening now?",
        "What's next?",
        "Is anything delayed?",
        "Where is BGMI?",
        "Who coordinates Treasure Hunt?",
        "What's in the Main Auditorium?",
        "Show Cultural events",
        "How many events are there?",
        "How do I add events to my calendar?",
        "Is there food or lunch?",
        "How do I register?",
        "Contact the helpdesk",
        "My saved events",
      ];

  return (
    <div className="chat">
      <div className="chat-ctx">Chatting about: {focus ? focus.name : "all events"}</div>
      <div id="log" ref={logRef} aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "me" : "bot"}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="msg bot typing">Festro is typing…</div>}
      </div>
      <div className="chips">
        {suggestions.map((s) => (
          <button key={s} onClick={() => void send(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="inp"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="q" className="sr-only">
          Ask Festro
        </label>
        <input
          id="q"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about timing, delays, venues…"
          autoComplete="off"
          maxLength={500}
        />
        <button type="submit" aria-label="Send" disabled={busy}>
          →
        </button>
      </form>
    </div>
  );
}
