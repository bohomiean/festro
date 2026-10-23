// Fest-wide details that rarely change. Edit these for a different fest.

export const FEST_NAME = "ORACLE 2026";

/** TODO: replace with the real helpdesk contact. */
export const HELPDESK = "Helpdesk Team · +91 98765 43210";

export const CATEGORIES = ["Technical", "Gaming", "Cultural", "General"] as const;

/** Committees from the event details doc, so the chatbot can answer "who handles certificates?". */
export const COMMITTEES: readonly { name: string; coordinator: string }[] = [
  { name: "Certificate", coordinator: "Greeshma Mam" },
  { name: "Backstage", coordinator: "Manjula Mam" },
];

/**
 * Common participant questions that aren't in the schedule data. Festro points these to the helpdesk
 * until you fill in `answer`, e.g. answer: "Lunch is available at the canteen from 1 PM."
 */
export const FAQS: readonly { topic: string; keywords: readonly string[]; answer?: string }[] = [
  { topic: "registration and fees", keywords: ["register", "registration", "registering", "sign up", "fee", "fees", "enroll", "entry"] },
  { topic: "food and refreshments", keywords: ["food", "lunch", "snack", "snacks", "canteen", "refreshment", "refreshments", "eat", "drinking water"] },
  { topic: "parking", keywords: ["parking", "park my bike", "park my car"] },
  { topic: "Wi-Fi", keywords: ["wifi", "wi-fi", "internet"] },
  { topic: "dress code", keywords: ["dress code", "what to wear", "what should i wear", "costume", "costumes"] },
  { topic: "rules and team size", keywords: ["rules", "rule", "team size", "how many members", "eligible", "eligibility", "solo"] },
  { topic: "lost and found", keywords: ["lost", "found", "missing"] },
  { topic: "first aid and medical help", keywords: ["first aid", "medical", "doctor", "emergency"] },
  { topic: "ID cards and entry", keywords: ["id card", "college id", "entry pass"] },
  { topic: "what to bring", keywords: ["what to bring", "what should i bring", "carry"] },
];

export interface ProgrammeItem {
  time: string;
  item: string;
  speaker?: string;
  /** Words a participant might use to ask about this item. */
  keywords: readonly string[];
}

export interface Programme {
  /** Must match the event name in the database. */
  event: string;
  emcees: string;
  dais: readonly string[];
  items: readonly ProgrammeItem[];
}

const DAIS = ["Sahana", "Ms. Greeshma", "Mr. Prakash V", "Rev. Fr. Dr. Thomas MJ", "Mr. Suhas", "Anandhu"];

/** Running order from "Flow of Inauguration and Valedictory". */
export const PROGRAMMES: readonly Programme[] = [
  {
    event: "Inauguration",
    emcees: "Madiha (3rd BSc)",
    dais: DAIS,
    items: [
      { time: "10:55–11:00", item: "Arrival of Dignitaries", speaker: "Madiha", keywords: ["arrival", "arrive"] },
      { time: "11:00–11:05", item: "Invocation Prayer", speaker: "Choir", keywords: ["prayer", "invocation", "choir"] },
      { time: "11:05–11:10", item: "Lighting of the Lamp", speaker: "Dignitaries on the dais", keywords: ["lamp", "lighting"] },
      { time: "11:10–11:15", item: "Welcome Address", speaker: "Sahana", keywords: ["welcome"] },
      { time: "11:15–11:20", item: "Principal's Speech", speaker: "Rev. Fr. Dr. Thomas MJ", keywords: ["principal", "speech"] },
      { time: "11:20–11:25", item: "Felicitation", keywords: ["felicitation", "facilitation", "felicitate"] },
      { time: "11:25–11:30", item: "Promo of ORACLE", speaker: "Console", keywords: ["promo", "trailer"] },
      { time: "11:30–11:35", item: "Departure of Dignitaries", keywords: ["departure"] },
      { time: "11:35–11:40", item: "Flow of ORACLE Events", speaker: "Madiha", keywords: ["flow of oracle", "overview"] },
      { time: "11:40–11:45", item: "Closing of the Inaugural Event", speaker: "Madiha", keywords: ["closing of the inaug", "end of the inaug"] },
    ],
  },
  {
    event: "Valedictory",
    emcees: "Saniya (3rd BCA) and Sahil (2nd BCA)",
    dais: DAIS,
    items: [
      { time: "12:00–12:05", item: "Arrival of Dignitaries", speaker: "Saniya and Sahil", keywords: ["arrival", "arrive"] },
      { time: "12:00–12:05", item: "Welcome Address", speaker: "Saniya and Sahil", keywords: ["welcome"] },
      { time: "12:05–12:10", item: "Badging", speaker: "Faculty coordinator", keywords: ["badging", "badge"] },
      { time: "12:10–12:15", item: "Certificate Distribution", speaker: "Saniya", keywords: ["certificate distribution", "certificates distributed", "get my certificate", "get certificates"] },
      { time: "12:15–12:20", item: "Overall Winners and Runners-up", speaker: "Rev. Fr. Dr. Thomas MJ", keywords: ["winner", "runner", "prize", "result"] },
      { time: "12:20–12:25", item: "Team Video", speaker: "Console", keywords: ["team video"] },
      { time: "12:25–12:30", item: "On-the-day Video of ORACLE", speaker: "Console", keywords: ["on the day video", "highlights", "aftermovie"] },
      { time: "12:30–12:35", item: "Vote of Thanks", speaker: "Anandhu", keywords: ["vote of thanks"] },
      { time: "12:35–12:40", item: "Withdrawal of Dignitaries", keywords: ["withdrawal"] },
    ],
  },
];

export const programmeFor = (eventName: string) =>
  PROGRAMMES.find((p) => p.event.toLowerCase() === eventName.toLowerCase());

/** Other names people use for these events. */
export const EVENT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  Inauguration: ["inaugura", "opening ceremony", "opening"],
  Valedictory: ["valedict", "closing ceremony", "prize distribution", "award ceremony"],
};
