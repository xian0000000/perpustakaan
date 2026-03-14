"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Track { title: string; url: string; }

const TRACKS: Track[] = [
  { title: "Gymnopédie No.1 – Satie",        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Clair de Lune – Debussy",         url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Moonlight Sonata – Beethoven",    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { title: "Nocturne Op.9 – Chopin",          url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
];

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const track = TRACKS[trackIdx];

  // Init audio
  useEffect(() => {
    const audio = new Audio();
    audio.loop = false;
    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => setProgress(audio.currentTime));
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("ended", () => next());

    return () => { audio.pause(); audio.src = ""; };
  }, []); // eslint-disable-line

  // Change track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const wasPlaying = playing;
    audio.src = track.url;
    audio.load();
    if (wasPlaying) audio.play().catch(() => setPlaying(false));
  }, [trackIdx]); // eslint-disable-line

  // Volume
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  }, [playing]);

  const next = useCallback(() => setTrackIdx(i => (i + 1) % TRACKS.length), []);
  const prev = useCallback(() => setTrackIdx(i => (i - 1 + TRACKS.length) % TRACKS.length), []);

  function seekTo(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current; if (!audio) return;
    audio.currentTime = Number(e.target.value);
    setProgress(Number(e.target.value));
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 100,
      background: "rgba(12,8,22,.96)", border: "1px solid #2d1f3a",
      borderRadius: expanded ? 12 : 40, backdropFilter: "blur(16px)",
      boxShadow: "0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(192,132,252,.08)",
      transition: "all .35s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden",
      width: expanded ? 280 : 48,
      minHeight: 48,
    }}>
      {/* Collapsed: just the note icon */}
      {!expanded && (
        <button onClick={() => setExpanded(true)} style={{ width: 48, height: 48, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {playing ? "🎵" : "🎹"}
        </button>
      )}

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: "14px 16px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "#a78bfa", letterSpacing: ".12em" }}>♪ Musik Perpustakaan</div>
            <button onClick={() => setExpanded(false)} style={{ background: "transparent", border: "none", color: "#5a4f6a", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
          </div>

          {/* Track title */}
          <div style={{ fontFamily: "'IM Fell English',Georgia,serif", fontSize: 12, color: "#c9b99a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#3d2f4a", marginBottom: 10 }}>Lagu {trackIdx + 1} / {TRACKS.length}</div>

          {/* Progress bar */}
          <div style={{ marginBottom: 8 }}>
            <input type="range" min={0} max={duration || 100} value={progress} onChange={seekTo}
              style={{ width: "100%", accentColor: "#a78bfa", height: 3, cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 9, color: "#3d2f4a", marginTop: 2 }}>
              <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10 }}>
            <button onClick={prev} style={btnStyle}>⏮</button>
            <button onClick={togglePlay} style={{ ...btnStyle, fontSize: 22, width: 40, height: 40, borderColor: "#a78bfa55", color: "#a78bfa", background: "rgba(167,139,250,.12)" }}>
              {playing ? "⏸" : "▶"}
            </button>
            <button onClick={next} style={btnStyle}>⏭</button>
          </div>

          {/* Volume */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11 }}>🔈</span>
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#a78bfa", height: 3, cursor: "pointer" }} />
            <span style={{ fontSize: 11 }}>🔊</span>
          </div>

          {/* Equalizer animation */}
          {playing && (
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, marginTop: 12, height: 16 }}>
              {[1, 3, 2, 4, 2, 3, 1].map((h, i) => (
                <div key={i} style={{
                  width: 3, background: "#a78bfa", borderRadius: 2, opacity: 0.7,
                  animation: `eq-bar ${0.4 + i * 0.12}s ease-in-out infinite alternate`,
                  height: h * 3,
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes eq-bar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
      `}</style>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid #2d1f3a", borderRadius: 6,
  color: "#7a6e60", cursor: "pointer", fontSize: 16, width: 32, height: 32,
  display: "flex", alignItems: "center", justifyContent: "center",
};
