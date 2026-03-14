"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// Self-contained YouTube IFrame API types (no @types/youtube needed)
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (videoId: string) => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
}

interface YTPlayerOptions {
  height: string;
  width: string;
  videoId: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (el: HTMLDivElement, opts: YTPlayerOptions) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Track { title: string; videoId: string; }

const TRACKS: Track[] = [
  { title: "Nuansa Perpustakaan – Lo-fi Chill", videoId: "b8BfcX7RHxY" },
  { title: "Study with Me – Lo-fi Beats",       videoId: "5qap5aO4i9A" },
  { title: "Coffee Shop Ambience",               videoId: "h2zkV-l_TbY" },
  { title: "Rainy Library – Jazz Lofi",          videoId: "lP9suFoIwmQ" },
];

export function MusicPlayer() {
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(35);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  const track = TRACKS[trackIdx];

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window !== "undefined" && window.YT && window.YT.Player) {
      setApiLoaded(true);
      return;
    }
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => setApiLoaded(true);
  }, []);

  // Init player once API is loaded
  useEffect(() => {
    if (!apiLoaded || !containerRef.current || playerRef.current) return;
    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "1",
      width: "1",
      videoId: track.videoId,
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: (e: { target: YTPlayer }) => { e.target.setVolume(volume); setReady(true); },
        onStateChange: (e: { data: number }) => {
          if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
          if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false);
          if (e.data === window.YT.PlayerState.ENDED) setTrackIdx(i => (i + 1) % TRACKS.length);
        },
      },
    });
  }, [apiLoaded]); // eslint-disable-line

  // Change track
  useEffect(() => {
    if (!playerRef.current || !ready) return;
    playerRef.current.loadVideoById(track.videoId);
    if (!playing) playerRef.current.pauseVideo();
  }, [trackIdx]); // eslint-disable-line

  // Volume sync
  useEffect(() => {
    if (!playerRef.current || !ready) return;
    playerRef.current.setVolume(volume);
  }, [volume, ready]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !ready) return;
    if (playing) { playerRef.current.pauseVideo(); }
    else { playerRef.current.playVideo(); }
  }, [playing, ready]);

  const next = useCallback(() => setTrackIdx(i => (i + 1) % TRACKS.length), []);
  const prev = useCallback(() => setTrackIdx(i => (i - 1 + TRACKS.length) % TRACKS.length), []);

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
      {/* Hidden YouTube player mount point */}
      <div ref={containerRef} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

      {/* Collapsed */}
      {!expanded && (
        <button onClick={() => setExpanded(true)} style={{ width: 48, height: 48, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {playing ? "🎵" : "🎹"}
        </button>
      )}

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "#a78bfa", letterSpacing: ".12em" }}>♪ Musik Perpustakaan</div>
            <button onClick={() => setExpanded(false)} style={{ background: "transparent", border: "none", color: "#5a4f6a", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ fontFamily: "'IM Fell English',Georgia,serif", fontSize: 12, color: "#c9b99a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#3d2f4a", marginBottom: 12 }}>Lagu {trackIdx + 1} / {TRACKS.length}</div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
            <button onClick={prev} style={btnStyle}>⏮</button>
            <button onClick={togglePlay} disabled={!ready}
              style={{ ...btnStyle, fontSize: 22, width: 40, height: 40, borderColor: "#a78bfa55", color: ready ? "#a78bfa" : "#3d2f4a", background: "rgba(167,139,250,.12)", cursor: ready ? "pointer" : "default" }}>
              {!ready ? "⏳" : playing ? "⏸" : "▶"}
            </button>
            <button onClick={next} style={btnStyle}>⏭</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11 }}>🔈</span>
            <input type="range" min={0} max={100} step={1} value={volume} onChange={e => setVolume(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#a78bfa", height: 3, cursor: "pointer" }} />
            <span style={{ fontSize: 11 }}>🔊</span>
          </div>

          {playing && (
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, marginTop: 12, height: 16 }}>
              {[1, 3, 2, 4, 2, 3, 1].map((h, i) => (
                <div key={i} style={{ width: 3, background: "#a78bfa", borderRadius: 2, opacity: 0.7, animation: `eq-bar ${0.4 + i * 0.12}s ease-in-out infinite alternate`, height: h * 3 }} />
              ))}
            </div>
          )}

          {!ready && <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 9, color: "#3d2f4a", marginTop: 8 }}>memuat pemutar…</div>}
        </div>
      )}

      <style>{`@keyframes eq-bar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }`}</style>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid #2d1f3a", borderRadius: 6,
  color: "#7a6e60", cursor: "pointer", fontSize: 16, width: 32, height: 32,
  display: "flex", alignItems: "center", justifyContent: "center",
};
