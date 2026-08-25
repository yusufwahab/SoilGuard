// -----------------------------------------------------------------------
// HAUSA TEXT-TO-SPEECH (via ElevenLabs, model: eleven_v3)
// Checked directly before landing here: Azure, Google Cloud TTS, and
// Chatterbox (the one TTS model actually live on HF's Inference
// Providers) don't support Hausa. ElevenLabs' `eleven_v3` model does
// (confirmed in their published language list) and has a genuine free
// tier (10k credits/month, no card required to start).
//
// Yoruba was the original ask, but no free/working option was found for
// it (facebook/mms-tts-yor exists on the Hub but isn't actually deployed
// on any Inference Provider; YarnGPT only does Nigerian-accented English,
// not the Yoruba language) -- Hausa-only for now, by explicit choice.
//
// Runs server-side ONLY -- the API key shouldn't reach the browser. The
// frontend calls this backend's POST /api/tts instead of ElevenLabs
// directly.
// -----------------------------------------------------------------------

const API_KEY   = process.env.ELEVENLABS_API_KEY;
const VOICE_ID  = process.env.ELEVENLABS_VOICE_ID;
const MODEL_ID  = process.env.ELEVENLABS_MODEL_ID || "eleven_v3";

export function isTtsConfigured() {
  return Boolean(API_KEY && VOICE_ID);
}

// Returns a Buffer of MP3 audio bytes for the given text, spoken in Hausa.
export async function synthesizeHausa(text) {
  if (!isTtsConfigured()) {
    throw new Error("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID not set -- cannot generate Hausa audio");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      language_code: "ha",
      output_format: "mp3_44100_128",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (HTTP ${res.status}): ${errBody.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
