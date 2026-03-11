interface Props {
  progress: number; // 0–1
  mode: "focus" | "short_break" | "long_break";
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

const MODE_COLORS = {
  focus: "var(--accent)",
  short_break: "var(--accent-sage)",
  long_break: "var(--accent-sky, #7eb8d4)",
};

export function ProgressRing({
  progress,
  mode,
  size = 120,
  strokeWidth = 3,
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  const color = MODE_COLORS[mode];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)" }}
      />
      {/* Center content */}
      {children && (
        <foreignObject x={0} y={0} width={size} height={size}>
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {children}
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
