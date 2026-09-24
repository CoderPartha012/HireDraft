"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export default function CinematicBackground() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPlaying(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (playing) video.current?.play().catch(() => setPlaying(false));
    else video.current?.pause();
  }, [playing]);
  return (
    <>
      <div className="cinematic-background" aria-hidden="true">
        {!failed && (
          <video
            ref={video}
            loop
            muted
            playsInline
            preload="none"
            onError={() => setFailed(true)}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4"
          />
        )}
        <div className="cinematic-overlay" />
      </div>
      <div className="cinematic-guides" aria-hidden="true" />
      {!failed && (
        <button
          type="button"
          className="background-control"
          onClick={() => setPlaying(!playing)}
          aria-label={
            playing ? "Pause background animation" : "Play background animation"
          }
          title={
            playing ? "Pause background animation" : "Play background animation"
          }
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
      )}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="headline-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0"
            />
            <feComposite in2="SourceGraphic" operator="in" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
        </defs>
      </svg>
    </>
  );
}
