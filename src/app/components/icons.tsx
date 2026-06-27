// Small stroke icon set. currentColor, consistent geometry, no emoji.

type IconProps = { size?: number; className?: string; strokeWidth?: number };

function svg(size: number, sw: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

/** Brand mark — an audio waveform, evoking call audio. */
export function Waveform({ size = 20, className, strokeWidth = 1.9 }: IconProps) {
  return (
    <svg {...svg(size, strokeWidth, className)}>
      <path d="M3 12h2.2" />
      <path d="M8 7.5v9" />
      <path d="M12 4.5v15" />
      <path d="M16 8.5v7" />
      <path d="M20.8 12H19" />
    </svg>
  );
}

export function Check({ size = 14, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...svg(size, strokeWidth, className)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function Cross({ size = 14, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...svg(size, strokeWidth, className)}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function Dash({ size = 14, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...svg(size, strokeWidth, className)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function AlertTriangle({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svg(size, strokeWidth, className)}>
      <path d="M12 4.5l8.5 14.5H3.5L12 4.5z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function ArrowRight({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svg(size, strokeWidth, className)}>
      <path d="M5 12h13" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function ExternalLink({ size = 13, className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...svg(size, strokeWidth, className)}>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 13.5V19a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5.5" />
    </svg>
  );
}
