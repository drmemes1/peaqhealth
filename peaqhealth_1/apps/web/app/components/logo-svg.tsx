"use client";

interface LogoSvgProps {
  size?: number;   // controls height; width scales proportionally
  color?: string;  // stroke / fill color
  className?: string;
}

/**
 * Inline SVG recreation of the Peaq logo.
 * Mountain-peak motif with EKG heartbeat in the centre + "peaq" wordmark.
 * No image file required — transparent background, scales at any size.
 */
export function LogoSvg({
  size = 48,
  color = "#141410",
  className,
}: LogoSvgProps) {
  // viewBox is 240 × 200; width scales from height
  const width = Math.round(size * (240 / 200));

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Peaq Health"
      className={className}
    >
      {/* Mountain peaks + EKG heartbeat */}
      <path
        d="M 14,128
           L 78,28
           L 104,80
           L 110,48
           L 116,108
           L 122,30
           L 128,76
           L 175,26
           L 226,128"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* "peaq" wordmark */}
      <text
        x="120"
        y="174"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize="46"
        fontWeight="300"
        letterSpacing="4"
        fill={color}
      >
        peaq
      </text>
    </svg>
  );
}
