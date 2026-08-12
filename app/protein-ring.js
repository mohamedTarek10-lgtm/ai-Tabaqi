"use client";

export default function ProteinRing({ proteinGrams = 0, targetGrams = 50, size = 180, strokeWidth = 14 }) {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  // Percentage calculated relative to standard recommended daily target or meal target (default 50g)
  const pct = Math.min(100, Math.max(0, (proteinGrams / targetGrams) * 100));
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="protein-ring-wrap">
      <div style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center" }}>
        <svg width={size} height={size} className="protein-ring-svg" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            className="protein-ring-track"
          />

          {/* Animated Fill Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="protein-ring-fill"
            filter="url(#glow)"
          />
        </svg>

        {/* Center Text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            البروتين / Protein
          </span>
          <span
            className="font-english"
            style={{
              fontSize: "42px",
              fontWeight: 800,
              lineHeight: 1,
              background: "linear-gradient(135deg, var(--color-protein), #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "2px 0",
            }}
          >
            {Math.round(proteinGrams)}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
            جرام / g
          </span>
        </div>
      </div>
    </div>
  );
}
