import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { AUDIO_CLIPS } from "../data/audioClips";

// -----------------------------------------------------------------------
// Voice-note style player for the pre-recorded status clips in
// data/audioClips.js. Built for farmers who may not read confidently:
// tap a big colored button to hear the status explained aloud, a small
// Hausa/Yoruba switch, a moving waveform while it plays, and a restart
// button to hear it again from the top. Renders nothing if there's no
// clip recorded for the given status (clipKey is null).
// -----------------------------------------------------------------------

const TONE_COLOR = { good: "#16a34a", warn: "#d97706", bad: "#dc2626", neutral: "#9a8c75" };

// Fixed pseudo-random bar heights so the idle waveform reads like a real
// voice note instead of a uniform row -- reused by every instance, each
// bar gets its own animation-delay/duration below so they don't move in
// lockstep.
const BAR_HEIGHTS = [0.4, 0.7, 0.5, 0.9, 0.6, 0.35, 0.8, 0.55, 1, 0.45, 0.65, 0.3, 0.75, 0.5, 0.9, 0.4, 0.6, 0.8, 0.5, 0.35, 0.7, 0.45];

function formatTime(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioStatusPlayer({ clipKey, className = "" }) {
  const clip = clipKey ? AUDIO_CLIPS[clipKey] : null;
  const audioRef = useRef(null);
  const resumeAfterSwitch = useRef(false);
  const [lang, setLang] = useState("ha");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  // Switching language mid-playback: pause, swap <audio src>, then resume
  // once the new source is attached (after the src attribute updates below).
  useEffect(() => {
    if (resumeAfterSwitch.current && audioRef.current) {
      resumeAfterSwitch.current = false;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [lang]);

  if (!clip) return null;

  const tone = clip.tone;
  const color = TONE_COLOR[tone] ?? TONE_COLOR.neutral;
  const progressPct = duration ? Math.min(100, (current / duration) * 100) : 0;

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  function handleRestart() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrent(0);
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function handleLangChange(next) {
    if (next === lang) return;
    resumeAfterSwitch.current = playing;
    audioRef.current?.pause();
    setPlaying(false);
    setCurrent(0);
    setLang(next);
  }

  return (
    <div
      className={`rounded-xl border border-surface-200 bg-surface-50 p-3.5 ${className}`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <audio
        ref={audioRef}
        src={clip.sources[lang]}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
      />

      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-xs font-semibold text-surface-800 leading-tight">{clip.label}</p>
        <div className="flex gap-0.5 bg-surface-100 rounded-md p-0.5 shrink-0">
          {["ha", "yo"].map((code) => (
            <button
              key={code}
              onClick={() => handleLangChange(code)}
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded transition-colors ${
                lang === code ? "bg-surface-50 text-surface-900 shadow-sm" : "text-surface-400 hover:text-surface-600"
              }`}
            >
              {code === "ha" ? "Hausa" : "Yoruba"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleRestart}
          aria-label="Restart from the beginning"
          className="shrink-0 w-7 h-7 rounded-full border border-surface-200 text-surface-400 hover:text-surface-700 hover:border-surface-300 flex items-center justify-center transition-colors"
        >
          <RotateCcw size={13} />
        </button>

        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="shrink-0 w-9 h-9 rounded-full text-white flex items-center justify-center transition-transform active:scale-95"
          style={{ backgroundColor: color }}
        >
          {playing ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
        </button>

        {/* Waveform -- bounces per-bar while playing, sits static (colored up
            to current playback position) while paused. */}
        <div className="flex-1 flex items-center gap-[2.5px] h-8 min-w-0">
          {BAR_HEIGHTS.map((h, i) => {
            const played = progressPct >= (i / BAR_HEIGHTS.length) * 100;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full ${playing ? "animate-voice-bar" : ""}`}
                style={{
                  height: `${Math.max(15, h * 100)}%`,
                  backgroundColor: played ? color : "var(--color-surface-300)",
                  transform: playing ? undefined : `scaleY(${Math.max(0.3, h * 0.6)})`,
                  transformOrigin: "center",
                  animationDelay: `${(i % 7) * 0.09}s`,
                  animationDuration: `${0.7 + (i % 5) * 0.12}s`,
                }}
              />
            );
          })}
        </div>

        <span className="shrink-0 text-[10px] font-mono text-surface-400 tabular-nums w-9 text-right">
          {formatTime(playing || current > 0 ? current : duration)}
        </span>
      </div>
    </div>
  );
}
