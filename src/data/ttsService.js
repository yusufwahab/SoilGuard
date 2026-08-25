// -----------------------------------------------------------------------
// HAUSA AUDIO -- routed through backend/ (the ElevenLabs API key is a
// credential that shouldn't reach the browser). Calls POST /api/tts,
// which synthesizes speech via ElevenLabs' eleven_v3 model. See
// backend/src/ttsService.js + backend/README.md for the send side.
// -----------------------------------------------------------------------

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";

export async function fetchHausaAudio(text) {
  const res = await fetch(`${BACKEND_URL}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `TTS request failed (HTTP ${res.status})`);
  }
  return res.blob();
}
