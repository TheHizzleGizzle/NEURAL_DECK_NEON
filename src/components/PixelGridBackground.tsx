import React, { useEffect, useRef } from "react";
import type { ThemeMode } from "../types/deck";

interface PixelGridBackgroundProps {
  theme: ThemeMode;
  visible: boolean;
}

export const PixelGridBackground: React.FC<PixelGridBackgroundProps> = ({
  theme,
  visible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const isDark = theme === "dark";

      // Base void/paper fill
      ctx.fillStyle = isDark ? "#080A12" : "#EEF2F8";
      ctx.fillRect(0, 0, w, h);

      const step = 22;
      const dotSize = 2;

      // Grid lines
      ctx.fillStyle = isDark
        ? "rgba(0, 240, 255, 0.08)"
        : "rgba(3, 105, 161, 0.08)";
      for (let x = step / 2; x < w; x += step) {
        ctx.fillRect(Math.floor(x), 0, 1, h);
      }
      for (let y = step / 2; y < h; y += step) {
        ctx.fillRect(0, Math.floor(y), w, 1);
      }

      // Intersection dots
      ctx.fillStyle = isDark
        ? "rgba(0, 240, 255, 0.19)"
        : "rgba(3, 105, 161, 0.18)";
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, dotSize, dotSize);
        }
      }

      // Subtle scanlines in dark mode only
      if (isDark) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.095)";
        const scanStep = 4;
        for (let y = 0; y < h; y += scanStep) {
          ctx.fillRect(0, y, w, 1);
        }
      }
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [theme, visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
};
