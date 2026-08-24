import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";

// -----------------------------------------------------------------------
// AI PROVIDER CHAIN: Gemini (primary) -> Groq -> Claude (fallbacks)
// Each provider is asked for the SAME strict-JSON output; the first one
// that answers successfully (and parses) wins. If Gemini fails or has no
// key set, Groq is tried; if that also fails, Claude is tried last.
// -----------------------------------------------------------------------

// Several of these SDKs validate their API key eagerly at construction
// time and throw if it's missing (Groq/Anthropic do; Gemini just warns) --
// so an unconfigured provider would otherwise crash the whole process at
// import time. A placeholder lets construction succeed for providers that
// aren't set up yet; PROVIDERS[].hasKey() below gates them from actually
// being called, so the placeholder is never used to make a real request.
const genAI     = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "unset" });
const groq      = new Groq({ apiKey: process.env.GROQ_API_KEY || "unset" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "unset" });

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  return response.text;
}

async function callGroq(prompt) {
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

async function callClaude(prompt) {
  const model = process.env.CLAUDE_MODEL || "claude-opus-5";
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    output_config: { effort: "medium" }, // routine structured task, not deep reasoning
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

// Strips markdown code fences if the model wrapped its JSON in one,
// then parses. Every provider is asked for raw JSON, but not all of
// them reliably skip the fences, so this is a shared safety net.
function extractJSON(text) {
  if (!text) throw new Error("empty response");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = (fenced ? fenced[1] : text).trim();
  return JSON.parse(jsonStr);
}

const PROVIDERS = [
  { name: "gemini", call: callGemini, hasKey: () => Boolean(process.env.GEMINI_API_KEY) },
  { name: "groq",   call: callGroq,   hasKey: () => Boolean(process.env.GROQ_API_KEY) },
  { name: "claude", call: callClaude, hasKey: () => Boolean(process.env.ANTHROPIC_API_KEY) },
];

// Tries each provider in order, returning the first successfully-parsed
// JSON response. Throws only if every provider is unconfigured or failed.
export async function getAIAnalysis(prompt) {
  const notes = [];

  for (const provider of PROVIDERS) {
    if (!provider.hasKey()) {
      notes.push(`${provider.name}: skipped (no API key set)`);
      continue;
    }
    try {
      const raw = await provider.call(prompt);
      const data = extractJSON(raw);
      console.log(`[AI] ${provider.name} answered successfully.`);
      return { provider: provider.name, data };
    } catch (err) {
      console.error(`[AI] ${provider.name} failed:`, err.message);
      notes.push(`${provider.name}: ${err.message}`);
    }
  }

  throw new Error(`All AI providers failed or are unconfigured -- ${notes.join(" | ")}`);
}
