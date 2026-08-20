"use client";

export default function ProteinRing({
  proteinGrams = 0,
  targetGrams = 50,
  size = 196,
  strokeWidth = 12,
}) {
  const center = size / 2;
  const radius = center - 27;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (Number(proteinGrams) / targetGrams) * 100));
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const tickCount = 48;

  return (
    <div className="protein-ring-wrap" role="img" aria-label={`${Math.round(proteinGrams)}g protein`}>
      <div
        className="protein-ring-stage"
        style={{ width: size, height: size, maxWidth: "100%" }}
      >
        <svg
          width={size}
          height={size}
          className="protein-ring-svg"
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--ring-start)" />
              <stop offset="52%" stopColor="var(--ring-mid)" />
              <stop offset="100%" stopColor="var(--ring-end)" />
            </linearGradient>
            <filter id="proteinGlow" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx={center} cy={center} r={center - 9} className="protein-ring-halo" />

          <g className="protein-ring-ticks">
            {Array.from({ length: tickCount }, (_, index) => {
              const angle = (index / tickCount) * 360 - 90;
              const radians = (angle * Math.PI) / 180;
              const inner = center - 14;
              const outer = center - 23;
              const x1 = center + Math.cos(radians) * inner;
              const y1 = center + Math.sin(radians) * inner;
              const x2 = center + Math.cos(radians) * outer;
              const y2 = center + Math.sin(radians) * outer;
              return (
                <line
                  key={index}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={index / tickCount <= pct / 100 ? "protein-ring-tick is-active" : "protein-ring-tick"}
                />
              );
            })}
          </g>

          <circle cx={center} cy={center} r={radius} className="protein-ring-track" strokeWidth={strokeWidth} />
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="protein-ring-fill"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#proteinGlow)"
          />
        </svg>

        <div className="protein-ring-center">
          <span className="protein-ring-label">PROTEIN</span>
          <span className="protein-ring-number english-font">{Math.round(proteinGrams)}</span>
          <span className="protein-ring-unit">g</span>
        </div>
      </div>
    </div>
  );
}
