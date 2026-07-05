export default function CircuitLines() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <path
        d="M240 90 H620"
        stroke="#00E5FF"
        strokeOpacity="0.2"
        strokeWidth="1"
      />

      <path
        d="M240 650 H620"
        stroke="#00E5FF"
        strokeOpacity="0.2"
        strokeWidth="1"
      />

      <circle cx="240" cy="90" r="3" fill="#00E5FF" />

      <circle cx="620" cy="90" r="3" fill="#00E5FF" />

      <circle cx="240" cy="650" r="3" fill="#00E5FF" />

      <circle cx="620" cy="650" r="3" fill="#00E5FF" />
    </svg>
  );
}