import React from "react";

interface PixelBranchConnectorProps {
  depth: number;
  accentColor: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(0, 240, 255, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const PixelBranchConnector: React.FC<PixelBranchConnectorProps> = ({
  depth,
  accentColor,
}) => {
  const clampedDepth = Math.max(0, Math.min(4, depth));
  if (clampedDepth <= 0) return null;

  const step = 18;
  const stroke = 2;
  const width = clampedDepth * step + 6;
  const activeX = (clampedDepth - 1) * step + 8;
  const midY = 24;
  const nodeHalf = 3;

  const elbowColor = hexToRgba(accentColor, 0.67); // 0xAA / 255

  return (
    <div
      className="relative shrink-0 self-stretch"
      style={{ width: `${width}px` }}
      aria-hidden="true"
    >
      {/* Faint ancestor rails (0x443B5284 -> rgba(59, 82, 132, 0.27)) */}
      {Array.from({ length: clampedDepth - 1 }).map((_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0"
          style={{
            left: `${i * step + 8}px`,
            width: `${stroke}px`,
            backgroundColor: "rgba(59, 82, 132, 0.27)",
          }}
        />
      ))}

      {/* Vertical drop of active parent elbow */}
      <div
        className="absolute top-0"
        style={{
          left: `${activeX}px`,
          width: `${stroke}px`,
          height: `${midY + stroke}px`,
          backgroundColor: elbowColor,
        }}
      />

      {/* 90-degree horizontal arm to cartridge */}
      <div
        className="absolute"
        style={{
          left: `${activeX}px`,
          top: `${midY}px`,
          width: `${width - activeX}px`,
          height: `${stroke}px`,
          backgroundColor: elbowColor,
        }}
      />

      {/* Crisp 6x6 pixel solder joint node */}
      <div
        className="absolute"
        style={{
          left: `${activeX - nodeHalf + Math.floor(stroke / 2)}px`,
          top: `${midY - nodeHalf + Math.floor(stroke / 2)}px`,
          width: `${nodeHalf * 2}px`,
          height: `${nodeHalf * 2}px`,
          backgroundColor: accentColor,
        }}
      />
    </div>
  );
};
