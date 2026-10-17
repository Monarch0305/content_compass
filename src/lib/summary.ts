// AI summary of a saved video (build step 3), using Claude Haiku (D-008).
//
// Works with or without a key:
//   - ANTHROPIC_API_KEY set  -> Claude Haiku writes a 2-3 line summary.
//   - no key                 -> fall back to the user's note, else the title,
//                               so the saved item is still recognisable.
//
// For Reels we have no caption (D-009), so the note carries the context — the
// same prompt handles that because the note is passed in.

import Anthropic from "@anthropic-ai/sdk";
import type { Platform } from "./types";

export interface SummariseInput {
  platform: Platform;
  title: string;
  channel: string;
  note: string | null;
  caption?: string | null; // e.g. an Instagram Reel caption (D-009)
}

export async function summarise(input: SummariseInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No key configured yet — graceful fallback, no network call.
  if (!apiKey) {
    if (input.note && input.note.trim()) return input.note.trim();
    return input.channel ? `${input.title} — ${input.channel}` : input.title;
  }

  const client = new Anthropic({ apiKey });

  const context = [
    `Platform: ${input.platform}`,
    `Title: ${input.title}`,
    input.channel ? `Channel: ${input.channel}` : null,
    input.caption ? `Caption: ${input.caption}` : null,
    input.note ? `User's note on why they saved it: ${input.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 400,
      system:
        "You write a 2-3 line summary of a short video someone saved to watch later, so they remember what it is and why they saved it. Be concrete and neutral. If the details are thin, lean on the title and the user's note. Output only the summary — no preamble, no quotes.",
      messages: [{ role: "user", content: context }],
    });

    const block = res.content.find((b) => b.type === "text");
    if (block && block.type === "text" && block.text.trim()) {
      return block.text.trim();
    }
  } catch {
    // fall through to the fallback below
  }

  // If the model call failed or returned nothing usable.
  if (input.note && input.note.trim()) return input.note.trim();
  return input.title;
}
