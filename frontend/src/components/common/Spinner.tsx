const blades = Array.from({ length: 8 }, (_, index) => ({
  transform: `rotate(${index * 45} 12 12)`,
  animationDelay: `${index / 8 - 1}s`,
}));

export default function Spinner() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="app-spinner h-4 w-4 shrink-0 text-current"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      {blades.map(({ transform, animationDelay }) => (
        <rect
          key={transform}
          x="10.5"
          y="1"
          width="3"
          height="7"
          rx="1.5"
          transform={transform}
          style={{ animationDelay }}
        />
      ))}
    </svg>
  );
}
