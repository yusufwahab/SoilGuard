// -----------------------------------------------------------------------
// PRE-RECORDED STATUS AUDIO -- real human voice notes (Hausa + Yoruba)
// recorded by the farm team, one per common farm status. These are
// distinct from ttsService.js's fetchHausaAudio(), which synthesizes the
// AI's dynamic per-update message on the fly. These clips are static,
// bundled assets for the handful of recurring situations a farmer needs
// to recognize at a glance -- played through AudioStatusPlayer.jsx.
// -----------------------------------------------------------------------
import needsWaterHa from "../assets/audio/needs-water-ha.m4a";
import needsWaterYo from "../assets/audio/needs-water-yo.m4a";
import dontPourWaterHa from "../assets/audio/dont-pour-water-ha.m4a";
import dontPourWaterYo from "../assets/audio/dont-pour-water-yo.m4a";
import moistureDroppingHa from "../assets/audio/moisture-dropping-ha.m4a";
import moistureDroppingYo from "../assets/audio/moisture-dropping-yo.m4a";
import corrosionRiskHa from "../assets/audio/corrosion-risk-ha.m4a";
import corrosionRiskYo from "../assets/audio/corrosion-risk-yo.m4a";
import equipmentHealthyHa from "../assets/audio/equipment-healthy-ha.m4a";
import equipmentHealthyYo from "../assets/audio/equipment-healthy-yo.m4a";

export const AUDIO_CLIPS = {
  "needs-water": {
    label: "Your crops need water",
    tone: "bad",
    sources: { ha: needsWaterHa, yo: needsWaterYo },
  },
  "moisture-dropping": {
    label: "Moisture levels are dropping",
    tone: "warn",
    sources: { ha: moistureDroppingHa, yo: moistureDroppingYo },
  },
  "dont-pour-water": {
    label: "Don't pour water now",
    tone: "warn",
    sources: { ha: dontPourWaterHa, yo: dontPourWaterYo },
  },
  "corrosion-risk": {
    label: "Rising corrosion risk",
    tone: "bad",
    sources: { ha: corrosionRiskHa, yo: corrosionRiskYo },
  },
  "equipment-healthy": {
    label: "Equipment is healthy",
    tone: "good",
    sources: { ha: equipmentHealthyHa, yo: equipmentHealthyYo },
  },
};

/* ─── Status → clip mapping ──────────────────────────────────────────
   Reuses the same moisture bands as FieldDetail.jsx's qualLevel()
   (critical <20/>80, watch <30/>70) so the audio a farmer hears always
   agrees with the numbers/pills shown next to it. */
export function moistureClipKey(moisture) {
  if (moisture == null) return null;
  if (moisture < 20) return "needs-water";
  if (moisture < 30) return "moisture-dropping";
  if (moisture > 80) return "dont-pour-water";
  return null; // 30–80% is the normal range -- no clip recorded for "all fine" yet
}

// tone comes from the app's existing good/warn/bad risk classification
// (classifyRiskScore in AIDashboard.jsx / the corrosion % in FieldDetail.jsx)
export function corrosionClipKey(tone) {
  if (tone === "bad" || tone === "warn") return "corrosion-risk";
  if (tone === "good") return "equipment-healthy";
  return null; // neutral / no data yet -- nothing recorded for that either
}
