"use client";

interface AltitudeProfileProps {
  altitudes: number[];
  maxAlt?: number;
}

export function AltitudeProfile({ altitudes, maxAlt }: AltitudeProfileProps) {
  if (altitudes.length < 2) return null;

  const W = 600;
  const H = 56;
  const min = Math.min(...altitudes);
  const max = maxAlt ?? Math.max(...altitudes);
  const range = max - min || 1;
  const n = altitudes.length;

  const pts = altitudes
    .map((alt, i) => {
      const x = (i / (n - 1)) * W;
      const y = H - ((alt - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const area = `0,${H} ${pts} ${W},${H}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id="altFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0071e3" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0071e3" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#altFill)" />
      <polyline
        points={pts}
        fill="none"
        stroke="#0071e3"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
