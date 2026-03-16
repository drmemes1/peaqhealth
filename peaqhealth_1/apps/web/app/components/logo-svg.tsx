import Image from "next/image";

interface LogoSvgProps {
  size?: number;   // controls height; width scales proportionally
  color?: string;  // used to detect light vs dark background context
  className?: string;
}

/**
 * Peaq logo component.
 * Uses the actual PNG asset with CSS blend modes to handle both
 * light and dark backgrounds without the logo's white background showing.
 *
 * Light bg (color is dark):  mix-blend-mode: multiply  → white PNG bg disappears
 * Dark bg  (color is light): filter: invert(1) + mix-blend-mode: screen → white marks show
 */
export function LogoSvg({
  size = 48,
  color = "#141410",
  className,
}: LogoSvgProps) {
  const width = Math.round(size * (240 / 200));

  // If the caller passes a light/white color it means we're on a dark background
  const onDarkBg =
    color.startsWith("rgba(250") ||
    color.startsWith("rgba(255") ||
    color === "white" ||
    color === "#fff" ||
    color === "#ffffff";

  return (
    <Image
      src="/images/peaq_logo.png"
      alt="Peaq Health"
      width={width}
      height={size}
      className={className}
      style={{
        objectFit: "contain",
        ...(onDarkBg
          ? { filter: "invert(1)", mixBlendMode: "screen" }
          : { mixBlendMode: "multiply" }),
      }}
    />
  );
}
